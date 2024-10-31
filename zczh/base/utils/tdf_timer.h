#if !defined(_TDF_TIMER_H_)
#define _TDF_TIMER_H_
#include "../log_driver/log_driver.h"
#include <functional>

typedef std::function<void(void *_pdata)> timer_handler;

class timer_node {
    int m_sec = 0;
    timer_handler m_handler;
    void *m_pdata = nullptr;
    bool m_one_time = false;
public:
    timer_node(
        int _sec,
        const timer_handler &_handler,
        void *_pdata,
        bool _one_time) : m_sec(_sec),
        m_handler(_handler),
        m_pdata(_pdata),
        m_one_time(_one_time) {

        }
    int get_sec()
    {
        return m_sec;
    }
    bool is_one_time()
    {
        return m_one_time;
    }
    void proc_timeout()
    {
            m_handler(m_pdata);
    }

    int belong_wheel_index = -1;
    std::list<std::shared_ptr<timer_node>>::iterator belong_list;
    int last_turn = 0;
};
typedef std::shared_ptr<timer_node> timer_handle;

bool timer_wheel_init();
void timer_wheel_fini();
bool timer_wheel_schc();
timer_handle timer_wheel_add_node(int _sec, const timer_handler &_func, bool _one_time = false, void *_pdata = nullptr);
void timer_wheel_del_node(timer_handle _th);

std::string util_get_timestring(time_t _time = time(NULL));
std::string util_get_datestring(time_t _time = time(NULL));
time_t util_get_time_by_string(const std::string &_time_string);

#endif // _TDF_TIMER_H_
