#include "tdf_timer.h"
#include <vector>

#define TIMER_WHEEL_LENGTH 4

static int g_timer_fd = -1;
static int g_epoll_fd = -1;
static int g_mq_fd = -1;
static tdf_log g_timer_log("timer");

struct timer_node_opt {
    enum opt_type {ADD, DEL} m_type = DEL;
    timer_handle m_th;
};

class timer_proc_thread
{
    pthread_mutex_t self_lock = PTHREAD_MUTEX_INITIALIZER;
    pthread_cond_t self_cond = PTHREAD_COND_INITIALIZER;
    std::thread self_thread;
    std::list<timer_handle> m_ths;

public:
    timer_proc_thread() : self_thread([this]()
                                      {
        while (1)
        {
            pthread_mutex_lock(&self_lock);
            pthread_cond_wait(&self_cond, &self_lock);
            for (auto &itr:m_ths)
            {
                itr->proc_timeout();
            }
            m_ths.clear();
            pthread_mutex_unlock(&self_lock);
        } })
    {
        self_thread.detach();
    }
    void push_timeout(timer_handle _th)
    {
        pthread_mutex_lock(&self_lock);
        m_ths.push_back(_th);
        pthread_cond_signal(&self_cond);
        pthread_mutex_unlock(&self_lock);
    }
    virtual ~timer_proc_thread()
    {
    }
};

class timer_wheel_inst
{
    std::vector<std::list<timer_handle>> m_wheel;
    int m_cur = 0;
    std::vector<std::shared_ptr<timer_proc_thread>> m_proc_vec;

public:
    timer_wheel_inst()
    {
        for (auto i = 0; i < TIMER_WHEEL_LENGTH; i++)
        {
            m_wheel.push_back(std::list<timer_handle>());
            m_proc_vec.push_back(std::make_shared<timer_proc_thread>());
        }
    }
    virtual ~timer_wheel_inst()
    {
        for (auto &itr : m_wheel)
        {
            itr.clear();
        }
        m_wheel.clear();
        m_proc_vec.clear();
    }
    void push_timeout(timer_handle _th, int th_index)
    {
        m_proc_vec[th_index]->push_timeout(_th);
    }
    void add_node(timer_handle _th)
    {
        auto dest_pos = (m_cur + _th->get_sec()) % TIMER_WHEEL_LENGTH;
        m_wheel[dest_pos].push_front(_th);
        _th->belong_list = m_wheel[dest_pos].begin();
        _th->belong_wheel_index = dest_pos;
        _th->last_turn = (_th->get_sec() - 1) / TIMER_WHEEL_LENGTH;
    }
    void del_node(timer_handle _th)
    {
        if (_th)
        {
            if (_th->belong_wheel_index >= 0 && _th->belong_list != m_wheel[_th->belong_wheel_index].end())
            {
                m_wheel[_th->belong_wheel_index].erase(_th->belong_list);
                _th->belong_list = m_wheel[_th->belong_wheel_index].end();
                _th->belong_wheel_index = -1;
            }
        }
    }

    std::list<timer_handle> get_node()
    {
        return m_wheel[m_cur];
    }

    void turn_wheel()
    {
        m_cur = (m_cur + 1) % TIMER_WHEEL_LENGTH;
    }
};
static timer_wheel_inst g_wheel_inst;

bool timer_wheel_init()
{
    bool ret = false;
    mq_attr tmp_mq_attr = {
        .mq_flags = 0,
        .mq_maxmsg = 100,
        .mq_msgsize = sizeof(void *),
        .mq_curmsgs = 0};
    std::string mq_name = "/timer_" + std::to_string(getpid());
    auto mq_fd = mq_open(mq_name.c_str(), O_RDWR | O_CREAT, 0666, &tmp_mq_attr);
    if (mq_fd >= 0)
    {
        int timer_fd = timerfd_create(CLOCK_MONOTONIC, 0);
        if (timer_fd >= 0)
        {
            timespec tv = {
                .tv_sec = 1,
                .tv_nsec = 0};
            itimerspec itv = {
                .it_interval = tv,
                .it_value = tv};
            if (0 == timerfd_settime(timer_fd, 0, &itv, nullptr))
            {
                auto epoll_fd = epoll_create(100);
                if (epoll_fd >= 0)
                {
                    epoll_event event = {
                        .events = EPOLLIN,
                        .data = {.fd = mq_fd},
                    };
                    if (0 == epoll_ctl(epoll_fd, EPOLL_CTL_ADD, mq_fd, &event))
                    {
                        event.events = EPOLLIN;
                        event.data.fd = timer_fd;
                        if (0 == epoll_ctl(epoll_fd, EPOLL_CTL_ADD, timer_fd, &event))
                        {
                            g_timer_fd = timer_fd;
                            g_mq_fd = mq_fd;
                            g_epoll_fd = epoll_fd;
                            ret = true;
                        }
                        else
                        {
                            close(epoll_fd);
                            mq_close(mq_fd);
                            close(timer_fd);
                            g_timer_log.err("failed to add timer epoll:%s", strerror(errno));
                        }
                    }
                    else
                    {
                        close(epoll_fd);
                        mq_close(mq_fd);
                        close(timer_fd);
                        g_timer_log.err("failed to add mq epoll:%s", strerror(errno));
                    }
                }
                else
                {
                    mq_close(mq_fd);
                    close(timer_fd);
                    g_timer_log.err("failed to open epoll:%s", strerror(errno));
                }
            }
            else
            {
                close(timer_fd);
                mq_close(mq_fd);
                g_timer_log.err("failed to set time:%s", strerror(errno));
            }
        }
        else
        {
            mq_close(mq_fd);
            g_timer_log.err("failed to open timer fd:%s", strerror(errno));
        }
    }
    else
    {
        g_timer_log.err("failed to open mq:%s", strerror(errno));
    }

    return ret;
}
void timer_wheel_fini()
{
    if (g_timer_fd >= 0)
    {
        close(g_timer_fd);
        g_timer_fd = -1;
    }
    if (g_mq_fd >= 0)
    {
        char buf[1024] = {0};
        char file_path[1024] = {0};
        snprintf(buf, sizeof(buf), "/proc/self/fd/%d", g_mq_fd);
        readlink(buf, file_path, sizeof(file_path) - 1);
        mq_close(g_mq_fd);
        g_mq_fd = -1;
        unlink(file_path);
    }
    if (g_epoll_fd >= 0)
    {
        close(g_epoll_fd);
        g_epoll_fd = -1;
    }
}

bool timer_wheel_schc()
{
    bool ret = false;
    epoll_event evs[10] = {0};
    auto ep_ret = epoll_wait(g_epoll_fd, evs, 10, -1);
    if (ep_ret > 0)
    {
        for (auto i = 0; i < ep_ret; i++)
        {
            if (g_timer_fd == evs[i].data.fd)
            {
                unsigned long times = 0;
                if (sizeof(times) == read(g_timer_fd, &times, sizeof(times)))
                {
                    while (times--)
                    {
                        g_wheel_inst.turn_wheel();
                        auto tns = g_wheel_inst.get_node();
                        std::list<std::pair<int, timer_handle>> tmp_th;
                        for (auto &itr : tns)
                        {
                            if (itr->last_turn <= 0)
                            {
                                auto to_p = std::pair<int, timer_handle>(itr->belong_wheel_index, itr);
                                g_wheel_inst.del_node(itr);
                                if (!itr->is_one_time())
                                {
                                    g_wheel_inst.add_node(itr);
                                }
                                tmp_th.push_back(to_p);
                            }
                            else
                            {
                                itr->last_turn--;
                            }
                        }
                        for (auto &itr : tmp_th)
                        {
                            g_wheel_inst.push_timeout(itr.second, itr.first);
                        }
                    }
                }
            }
            if (g_mq_fd == evs[i].data.fd)
            {
                timer_node_opt *tmp = nullptr;
                unsigned int prio = 1;
                if (sizeof(tmp) == mq_receive(g_mq_fd, (char *)&tmp, sizeof(tmp), &prio))
                {
                    if (timer_node_opt::ADD == tmp->m_type)
                    {
                        g_wheel_inst.add_node(tmp->m_th);
                    }
                    else
                    {
                        g_wheel_inst.del_node(tmp->m_th);
                    }
                    delete tmp;
                }
                else
                {
                    g_timer_log.err("failed to recv mq:%s", strerror(errno));
                }
            }
        }
    }

    return ret;
}
timer_handle timer_wheel_add_node(int _sec, const timer_handler &_func, bool _one_time, void *_pdata)
{
    auto p_node = new timer_node(_sec, _func, _pdata, _one_time);
    auto th = timer_handle(p_node);

    auto tmp = new timer_node_opt();
    tmp->m_th = th;
    tmp->m_type = timer_node_opt::ADD;
    if (0 != mq_send(g_mq_fd, (char *)&tmp, sizeof(tmp), 1))
    {
        g_timer_log.err("failed to send mq:%s", strerror(errno));
        delete tmp;
        th.reset();
    }

    return th;
}
void timer_wheel_del_node(timer_handle _th)
{
    auto tmp = new timer_node_opt();
    tmp->m_th = _th;
    tmp->m_type = timer_node_opt::DEL;
    if (0 != mq_send(g_mq_fd, (char *)&tmp, sizeof(tmp), 1))
    {
        g_timer_log.err("failed to send mq:%s", strerror(errno));
        delete tmp;
    }
}
time_t util_get_time_by_string(const std::string &_time_string)
{
    const char *cha = _time_string.data();                                    // 将string转换成char*。
    tm tm_ = {0};                                                             // 定义tm结构体。
    int year, month, day, hour, min, sec;                                     // 定义时间的各个int临时变量。
    sscanf(cha, "%d-%d-%d %d:%d:%d", &year, &month, &day, &hour, &min, &sec); // 将string存储的日期时间，转换为int临时变量。
    tm_.tm_min = min;                                                         // 时。
    tm_.tm_sec = sec;                                                         // 时。
    tm_.tm_year = year - 1900;                                                // 年，由于tm结构体存储的是从1900年开始的时间，所以tm_year为int临时变量减去1900。
    tm_.tm_mon = month - 1;                                                   // 月，由于tm结构体的月份存储范围为0-11，所以tm_mon为int临时变量减去1。
    tm_.tm_mday = day;                                                        // 日。
    tm_.tm_hour = hour;                                                       // 时。
    tm_.tm_isdst = 0;                                                         // 非夏令时。
    time_t t_ = mktime(&tm_);                                                 // 将tm结构体转换成time_t格式。
    return t_;                                                                // 返回值。
}
std::string util_get_timestring(time_t _time)
{
    time_t cur_time = _time;

    auto st_time = localtime(&cur_time);
    char buff[512] = "";

    sprintf(buff, "%d-%02d-%02d %02d:%02d:%02d", st_time->tm_year + 1900, st_time->tm_mon + 1, st_time->tm_mday, st_time->tm_hour, st_time->tm_min, st_time->tm_sec);

    return std::string(buff);
}
std::string util_get_datestring(time_t _time)
{
    auto date_time = util_get_timestring(_time);
    return date_time.substr(0, 10);
}