#include "device_management_imp.h"
#include "rpc_include.h"
#include <wait.h>
#include <sys/prctl.h>
#include <vector>

struct driver_run_status
{
    int64_t device_id = 0;
    int pid = 0;
    unsigned short port = 0;
};

static pthread_mutex_t g_runing_lock = PTHREAD_MUTEX_INITIALIZER;
static std::map<ino64_t, driver_run_status> g_runing_map;
static unsigned short g_base_port = 31300;

static void add_status_to_map(const driver_run_status &_drs)
{
    pthread_mutex_lock(&g_runing_lock);
    g_runing_map[_drs.device_id] = _drs;
    pthread_mutex_unlock(&g_runing_lock);
}

static std::unique_ptr<driver_run_status> get_status_from_map(int64_t _device_id)
{
    std::unique_ptr<driver_run_status> ret;
    pthread_mutex_lock(&g_runing_lock);
    if (g_runing_map.find(_device_id) != g_runing_map.end())
    {
        ret.reset(new driver_run_status(g_runing_map[_device_id]));
    }
    pthread_mutex_unlock(&g_runing_lock);

    return ret;
}

static void del_status_from_map(int64_t _device_id)
{
    pthread_mutex_lock(&g_runing_lock);
    if (g_runing_map.find(_device_id) != g_runing_map.end())
    {
        g_runing_map.erase(_device_id);
    }
    pthread_mutex_unlock(&g_runing_lock);
}

static int start_daemon(const std::string &_cmd, const std::string &_args, unsigned short _port, int64_t device_id)
{
    int pid = 12;

    auto exec_args = util_split_string(_args, " ");
    exec_args.push_back("-p");
    exec_args.push_back(std::to_string(_port));
    exec_args.push_back("-i");
    exec_args.push_back(std::to_string(device_id));
    exec_args.insert(exec_args.begin(), _cmd);

    auto args_size = exec_args.size();

    pid = fork();
    if (pid <= 0)
    {
        prctl(PR_SET_PDEATHSIG, SIGTERM);
        char **argv = (char **)malloc(args_size * (sizeof(argv) + 1));
        for (size_t i = 0; i < args_size; i++)
        {
            argv[i] = (char *)malloc(exec_args[i].length() + 1);
            strcpy(argv[i], exec_args[i].c_str());
        }
        argv[args_size] = 0;
        execv(_cmd.c_str(), argv);
    }

    return pid;
}

static void stop_daemon(int64_t pid)
{
    kill(pid, 9);
    int ret_v = 0;
    waitpid(pid, &ret_v, 0);
}

device_management_handler::device_management_handler()
{
    pthread_mutexattr_t tmp;
    pthread_mutexattr_init(&tmp);
    pthread_mutexattr_settype(&tmp, PTHREAD_MUTEX_RECURSIVE);
    pthread_mutex_init(&map_lock, &tmp);
}

void device_management_handler::init_all_set()
{
    THR_DEF_CIENT(config_management);
    THR_CONNECT(config_management);
    std::vector<device_gate_set> gate_tmp;
    client->get_gate_config(gate_tmp);
    std::vector<device_scale_set> scale_tmp;
    client->get_scale_config(scale_tmp);
    TRH_CLOSE();

    for (auto &itr : gate_tmp)
    {
        start_device_no_exp(itr.gate.back.id);
        start_device_no_exp(itr.gate.front.id);
        start_device_no_exp(itr.id_reader.back.id);
        start_device_no_exp(itr.id_reader.front.id);
        start_device_no_exp(itr.led.back.id);
        start_device_no_exp(itr.led.front.id);
        start_device_no_exp(itr.plate_cam.back.id);
        start_device_no_exp(itr.plate_cam.front.id);
        start_device_no_exp(itr.qr_reader.back.id);
        start_device_no_exp(itr.qr_reader.front.id);
        start_device_no_exp(itr.speaker.back.id);
        start_device_no_exp(itr.speaker.front.id);
        start_device_no_exp(itr.video_cam.back.id);
        start_device_no_exp(itr.video_cam.front.id);
        sm_init_add(std::make_shared<gate_sm>(itr.id, this), itr.id);
    }
    for (auto &itr : scale_tmp)
    {
        start_device_no_exp(itr.gate.back.id);
        start_device_no_exp(itr.gate.front.id);
        start_device_no_exp(itr.id_reader.back.id);
        start_device_no_exp(itr.id_reader.front.id);
        start_device_no_exp(itr.led.back.id);
        start_device_no_exp(itr.led.front.id);
        start_device_no_exp(itr.plate_cam.back.id);
        start_device_no_exp(itr.plate_cam.front.id);
        start_device_no_exp(itr.qr_reader.back.id);
        start_device_no_exp(itr.qr_reader.front.id);
        start_device_no_exp(itr.speaker.back.id);
        start_device_no_exp(itr.speaker.front.id);
        start_device_no_exp(itr.video_cam.back.id);
        start_device_no_exp(itr.video_cam.front.id);
        start_device_no_exp(itr.printer.back.id);
        start_device_no_exp(itr.printer.front.id);
        start_device_no_exp(itr.scale.id);
        start_device_no_exp(itr.card_reader.id);
        sm_init_add(std::make_shared<scale_sm>(itr.id, this), itr.id);
    }
}

bool device_management_handler::device_ctrl(const int64_t device_id, const bool start)
{
    bool ret = false;

    auto dm = sqlite_orm::search_record<sql_device_meta>(device_id);
    if (!dm)
    {
        ZH_RETURN_MSG("设备不存在");
    }
    auto dr = dm->get_parent<sql_device_driver>("driver");
    if (!dr)
    {
        ZH_RETURN_MSG(dm->name + "驱动不存在");
    }

    if (start)
    {
        if (get_status_from_map(device_id))
        {
            ZH_RETURN_MSG(dm->name + "早已启动");
        }
        driver_run_status tmp;
        tmp.port = g_base_port++;
        tmp.device_id = device_id;
        tmp.pid = start_daemon(dr->path, dm->args, tmp.port, device_id);
        if (tmp.pid >= 0)
        {
            add_status_to_map(tmp);
            ret = true;
        }
        else
        {
            ZH_RETURN_MSG(dm->name + "启动失败");
        }
    }
    else
    {
        auto sp = get_status_from_map(device_id);
        if (sp)
        {
            stop_daemon(sp->pid);
            del_status_from_map(device_id);
        }
        ret = true;
    }

    return ret;
}

bool device_management_handler::device_is_started(const int64_t device_id)
{
    bool ret = false;
    if (get_status_from_map(device_id))
    {
        ret = true;
    }
    return ret;
}

void device_management_handler::gate_ctrl(const int64_t gate_id, const bool is_open)
{
    auto sp = get_status_from_map(gate_id);

    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->gate_ctrl(0, is_open);
        TRH_CLOSE();
    }
}

void device_management_handler::led_display(const int64_t led_id, const std::vector<std::string> &content)
{
    auto sp = get_status_from_map(led_id);
    std::string oem_name = "卓创智汇";
    THR_CALL_BEGIN(config_management);
    running_rule tmp;
    client->get_rule(tmp);
    if (tmp.oem_name.length() > 0)
    {
        oem_name = tmp.oem_name;
    }
    THR_CALL_END();

    std::vector<std::string> pri_con(content);
    if (content.size() == 4)
    {
        if (pri_con[0].length() == 0)
        {
            pri_con[0] = oem_name;
        }
    }

    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->led_display(0, pri_con);
        TRH_CLOSE();
    }
}

void device_management_handler::speaker_cast(const int64_t speaker_id, const std::string &content)
{
    auto sp = get_status_from_map(speaker_id);

    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->speaker_cast(0, content);
        TRH_CLOSE();
    }
}

double device_management_handler::last_scale_read(const int64_t scale_id)
{
    double ret = 0;

    auto sp = get_status_from_map(scale_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        ret = client->last_scale_read(0);
        TRH_CLOSE();
    }

    return ret;
}

void device_management_handler::last_id_read(std::string &_return, const int64_t id_reader_id)
{
    auto sp = get_status_from_map(id_reader_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->last_id_read(_return, 0);
        TRH_CLOSE();
    }
}

void device_management_handler::last_qr_read(std::string &_return, const int64_t qr_reader_id)
{
    auto sp = get_status_from_map(qr_reader_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->last_qr_read(_return, 0);
        TRH_CLOSE();
    }
}

void device_management_handler::last_plate_read(std::string &_return, const int64_t plate_cam_id)
{
    auto sp = get_status_from_map(plate_cam_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->last_plate_read(_return, 0);
        TRH_CLOSE();
    }
}

void device_management_handler::cap_picture_slow(std::string &_return, const int64_t cam_id)
{
    auto sp = get_status_from_map(cam_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->cap_picture_slow(_return, cam_id);
        TRH_CLOSE();
    }
}

void device_management_handler::video_record_slow(std::string &_return, const int64_t cam_id, const std::string &begin_date, const std::string &end_date)
{
    auto sp = get_status_from_map(cam_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->video_record_slow(_return, 0, begin_date, end_date);
        TRH_CLOSE();
    }
}

void device_management_handler::push_scale_read(const int64_t scale_id, const double weight)
{
    auto pc_device = sqlite_orm::search_record<sql_device_meta>(scale_id);
    if (pc_device)
    {
        auto set = pc_device->get_children<sql_device_set>("scale");
        if (set)
        {
            sm_trigger(
                set->get_pri_id(),
                [&](abs_state_machine &sm)
                {
                    auto &ssm = dynamic_cast<scale_sm &>(sm);
                    ssm.cur_weight = weight;
                    ssm.tft = abs_state_machine::scale;

                    return true;
                });
        }
    }
}

static std::string get_plate_no_by_id(const std::string &_id)
{
    std::string ret;
    if (_id.length() > 0)
    {
        auto vo = sqlite_orm::search_record<sql_order>("driver_id == '%s' ORDER BY PRI_ID DESC LIMIT 1", _id.c_str());
        if (vo)
        {
            ret = vo->plate_number;
        }
    }

    return ret;
}

void device_management_handler::push_id_read(const int64_t id_id, const std::string &id_number)
{
    auto id_device = sqlite_orm::search_record<sql_device_meta>(id_id);
    if (id_device)
    {
        bool enter_direct = true;
        auto set = id_device->get_children<sql_device_set>("front_id_reader");
        if (!set)
        {
            enter_direct = false;
            set.reset(id_device->get_children<sql_device_set>("back_id_reader").release());
        }
        if (set)
        {
            auto plate_no = get_plate_no_by_id(id_number);
            sm_trigger(
                set->get_pri_id(),
                [&](abs_state_machine &sm)
                {
                    bool ret = false;
                    std::string order_number;
                    std::string result = "未找到车辆信息";
                    if (!set->is_scale)
                    {
                        result = gate_proc_id_plate(id_number, plate_no, enter_direct, *set);
                        if (result.empty())
                        {
                            plate_no = "允许通过";
                        }
                    }
                    else
                    {
                        result = set->should_handle_income_plate(plate_no, order_number);
                    }
                    if (result.length() > 0)
                    {
                        led_display(get_same_side_device(id_id, "led"), {"", result, "", util_get_timestring()});
                        speaker_cast(get_same_side_device(id_id, "speaker"), result);
                    }
                    else
                    {
                        bool should_proc = true;
                        if (set->is_scale && sm.order_number.length() > 0)
                        {
                            should_proc = false;
                        }
                        if (should_proc)
                        {
                            ret = true;
                            sm.order_number = order_number;
                            sm.tft = abs_state_machine::id_reader;
                            sm.trigger_device_id = id_id;
                            sm.pass_plate_number = plate_no;
                        }
                    }

                    return ret;
                });
        }
    }
}

void device_management_handler::push_qr_read(const int64_t qr_id, const std::string &qr_content)
{
}

void device_management_handler::push_plate_read(const int64_t plate_cam_id, const std::string &plate_no)
{
    auto pc_device = sqlite_orm::search_record<sql_device_meta>(plate_cam_id);
    if (pc_device)
    {
        bool enter_direct = true;
        auto set = pc_device->get_children<sql_device_set>("front_plate_cam");
        if (!set)
        {
            enter_direct = false;
            set.reset(pc_device->get_children<sql_device_set>("back_plate_cam").release());
        }
        if (set)
        {
            sm_trigger(
                set->get_pri_id(),
                [&](abs_state_machine &sm)
                {
                    bool ret = false;
                    std::string order_number;
                    std::string result = "未找到车辆信息";
                    if (!set->is_scale)
                    {
                        result = gate_proc_id_plate("", plate_no, enter_direct, *set);
                    }
                    else
                    {
                        result = set->should_handle_income_plate(plate_no, order_number);
                    }
                    if (result.length() > 0)
                    {
                        led_display(get_same_side_device(plate_cam_id, "led"), {"", result, "", util_get_timestring()});
                        speaker_cast(get_same_side_device(plate_cam_id, "speaker"), result);
                    }
                    else
                    {
                        bool should_proc = true;
                        if (set->is_scale && sm.order_number.length() > 0)
                        {
                            should_proc = false;
                        }
                        if (should_proc)
                        {
                            ret = true;
                            sm.order_number = order_number;
                            sm.tft = abs_state_machine::plate_cam;
                            sm.trigger_device_id = plate_cam_id;
                            sm.pass_plate_number = plate_no;
                        }
                    }

                    return ret;
                });
        }
    }
}

bool device_management_handler::gate_is_close(const int64_t gate_id)
{
    bool ret = false;
    auto sp = get_status_from_map(gate_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        ret = client->gate_is_close(gate_id);
        TRH_CLOSE();
    }
    return ret;
}

void device_management_handler::printer_print(const int64_t printer_id, const std::string &content)
{
    auto sp = get_status_from_map(printer_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->printer_print(printer_id, content);
        TRH_CLOSE();
    }
}

void device_management_handler::plate_cam_cap(const int64_t plate_cam_id)
{
    auto sp = get_status_from_map(plate_cam_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->plate_cam_cap(plate_cam_id);
        TRH_CLOSE();
    }
}
void device_management_handler::get_scale_sm_info(std::vector<scale_sm_info> &_return)
{
    std::vector<device_scale_set> all_dcs;
    THR_CALL_BEGIN(config_management);
    client->get_scale_config(all_dcs);
    THR_CALL_END();
    for (auto &itr : all_dcs)
    {
        scale_sm_info tmp;
        sm_run_in_scale(
            itr.id,
            [&](abs_state_machine &_sm)
            {
                auto &ssm = dynamic_cast<scale_sm &>(_sm);
                tmp.cur_plate = ssm.pass_plate_number;
                tmp.cur_state = ssm.m_cur_state->name();
                tmp.cur_weight = ssm.cur_weight;
            });
        tmp.set_info = itr;
        THR_CALL_DM_BEGIN();
        tmp.front_gate_is_close = client->gate_is_close(tmp.set_info.gate.front.id);
        tmp.back_gate_is_close = client->gate_is_close(tmp.set_info.gate.back.id);
        THR_CALL_DM_END();
        _return.push_back(tmp);
    }
}
void device_management_handler::reset_scale_sm(const int64_t sm_id)
{
    sm_trigger(
        sm_id,
        [](abs_state_machine &_sm)
        {
            _sm.tft = abs_state_machine::manual_reset;
            return true;
        });
}
void device_management_handler::confirm_scale(const int64_t sm_id)
{
    sm_trigger(
        sm_id,
        [](abs_state_machine &_sm)
        {
            _sm.tft = abs_state_machine::manual_confirm;
            return true;
        });
}
void device_management_handler::get_device_run_time(std::vector<device_run_time> &_return)
{
    std::vector<driver_run_status> dids;
    pthread_mutex_lock(&g_runing_lock);
    for (auto itr = g_runing_map.begin(); itr != g_runing_map.end(); ++itr)
    {
        dids.push_back(itr->second);
    }
    pthread_mutex_unlock(&g_runing_lock);
    for (auto &itr : dids)
    {
        device_run_time tmp;
        tmp.id = itr.device_id;
        std::string cmd = "ps -p " + std::to_string(itr.pid) + " -o etime=";
        auto pfile = popen(cmd.c_str(), "r");
        if (pfile)
        {
            char buff[1024] = {0};
            fread(buff, 1, sizeof(buff), pfile);
            tmp.stay_time = buff;
            pclose(pfile);
        }
        auto dm = sqlite_orm::search_record<sql_device_meta>(tmp.id);
        if (dm)
        {
            tmp.name = dm->name;
        }
        _return.push_back(tmp);
    }
}
void device_management_handler::get_gate_sm_info(std::vector<gate_sm_info> &_return)
{
    std::vector<device_gate_set> all_dgs;
    THR_CALL_BEGIN(config_management);
    client->get_gate_config(all_dgs);
    THR_CALL_END();
    for (auto &itr : all_dgs)
    {
        gate_sm_info tmp;
        tmp.set_info = itr;
        _return.push_back(tmp);
    }
}
void device_management_handler::last_card_no(std::string &_return, const int64_t card_reader_id)
{
    auto sp = get_status_from_map(card_reader_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->last_card_no(_return, 0);
        TRH_CLOSE();
    }
}
void device_management_handler::push_card_no(const int64_t card_reader_id, const std::string &card_no)
{
}
void device_management_handler::clear_card_no(const int64_t card_reader_id)
{
    auto sp = get_status_from_map(card_reader_id);
    if (sp)
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DEV(device_management, sp->port);
        client->clear_card_no(0);
        TRH_CLOSE();
    }
}
static bool isZombieProcess(pid_t pid)
{
    int status;
    pid_t result = waitpid(pid, &status, WNOHANG | WUNTRACED | WCONTINUED);
    if (result == -1)
    {
        // 发生错误
        return false;
    }
    else if (result == 0)
    {
        // 子进程状态未发生变化，不是僵尸进程
        return false;
    }
    else
    {
        // 子进程状态发生变化
        if (WIFEXITED(status) || WIFSIGNALED(status))
        {
            // 子进程已经退出或被终止，是僵尸进程
            return true;
        }
        else
        {
            // 子进程被暂停或继续执行，不是僵尸进程
            return false;
        }
    }
}
void device_management_handler::walk_zombie_process()
{
    std::vector<long> dids;
    pthread_mutex_lock(&g_runing_lock);
    for (auto itr = g_runing_map.begin(); itr != g_runing_map.end(); ++itr)
    {
        if (isZombieProcess(itr->second.pid))
        {
            dids.push_back(itr->second.device_id);
        }
    }
    pthread_mutex_unlock(&g_runing_lock);
    THR_CALL_DM_BEGIN();
    for (auto &itr : dids)
    {
        client->device_ctrl(itr, false);
    }
    THR_CALL_DM_END();
    timer_wheel_add_node(
        3, [=](void *)
        {
        THR_CALL_DM_BEGIN();
        for (auto &itr:dids)
        {
            client->device_ctrl(itr, true);
        }
        THR_CALL_DM_END(); },
        true);
}

void device_management_handler::start_device_no_exp(int64_t id)
{
    try
    {
        device_ctrl(id, true);
    }
    catch (gen_exp &e)
    {
    }
}

void device_management_handler::sm_init_add(std::shared_ptr<abs_state_machine> _sm, int64_t sm_id)
{
    pthread_mutex_lock(&map_lock);
    m_sm_map[sm_id] = _sm;
    _sm->init_sm();
    pthread_mutex_unlock(&map_lock);
}

void device_management_handler::sm_trigger(int64_t sm_id, std::function<bool(abs_state_machine &_sm)> update_func)
{
    pthread_mutex_lock(&map_lock);
    try
    {
        auto sm = m_sm_map[sm_id];
        if (sm && update_func(*sm))
        {
            sm->trigger_sm();
        }
    }
    catch (...)
    {
    }

    pthread_mutex_unlock(&map_lock);
}

void device_management_handler::sm_run_in_scale(int64_t sm_id, std::function<void(abs_state_machine &_sm)> runner)
{
    pthread_mutex_lock(&map_lock);
    try
    {

        auto sm = m_sm_map[sm_id];
        if (sm)
        {
            runner(*sm);
        }
    }
    catch (...)
    {
    }
    pthread_mutex_unlock(&map_lock);
}

std::string device_management_handler::gate_proc_id_plate(const std::string &_id, const std::string &_plate, bool _is_enter, sql_device_set &_set)
{
    std::string ret;
    bool is_strict = false;
    THR_CALL_BEGIN(config_management);
    running_rule tmp;
    client->get_rule(tmp);
    is_strict = tmp.gate_strict;
    THR_CALL_END();
    if (is_strict)
    {
        auto plate = _plate;
        if (plate.empty())
        {
            plate = get_plate_no_by_id(_id);
        }
        std::string order_number;
        ret = _set.should_handle_income_plate(plate, order_number, _is_enter);
        if (ret.length() > 0)
        {
            auto vo = sqlite_orm::search_record<sql_order>("plate_number == '%s' AND enter_gate == 1 AND status == 100", plate.c_str());
            if (vo)
            {
                vo->enter_gate = 0;
                vo->update_record();
                ret = "";
            }
        }
    }
    else
    {
        if (_is_enter)
        {
            THR_CALL_BEGIN(order_center);
            if (client->check_pass_permit(_plate, _id))
            {
                ret = "";
            }
            THR_CALL_END();
        }
        else
        {
            ret = "";
        }
    }

    return ret;
}

#define GOTHROUGH_EACH_SET(x, y)                                 \
    if (x)                                                       \
    {                                                            \
        auto target = x->get_parent<sql_device_meta>(y + _type); \
        if (target)                                              \
        {                                                        \
            ret = target->get_pri_id();                          \
        }                                                        \
    }

int64_t device_management_handler::get_same_side_device(int64_t _input_id, const std::string &_type)
{
    int64_t ret = 0;

    std::string front_direc = "front_";
    std::string back_direc = "back_";
    auto ipd = sqlite_orm::search_record<sql_device_meta>(_input_id);
    if (ipd)
    {
        auto fpc_set = ipd->get_children<sql_device_set>("front_plate_cam");
        auto bpc_set = ipd->get_children<sql_device_set>("back_plate_cam");
        auto fi_set = ipd->get_children<sql_device_set>("front_id_reader");
        auto bi_set = ipd->get_children<sql_device_set>("back_id_reader");
        auto fq_set = ipd->get_children<sql_device_set>("front_qr_reader");
        auto bq_set = ipd->get_children<sql_device_set>("back_qr_reader");
        auto bg_set = ipd->get_children<sql_device_set>("back_gate");
        auto fg_set = ipd->get_children<sql_device_set>("front_gate");
        GOTHROUGH_EACH_SET(fpc_set, front_direc);
        GOTHROUGH_EACH_SET(bpc_set, back_direc);
        GOTHROUGH_EACH_SET(fi_set, front_direc);
        GOTHROUGH_EACH_SET(bi_set, back_direc);
        GOTHROUGH_EACH_SET(fq_set, front_direc);
        GOTHROUGH_EACH_SET(bq_set, back_direc);
        GOTHROUGH_EACH_SET(fg_set, front_direc);
        GOTHROUGH_EACH_SET(bg_set, back_direc);
    }

    return ret;
}

int64_t device_management_handler::get_diff_side_device(int64_t _input_id, const std::string &_type)
{
    int64_t ret = 0;

    auto this_gate = get_same_side_device(_input_id, "gate");
    auto tg = sqlite_orm::search_record<sql_device_meta>(this_gate);
    if (tg)
    {
        auto set = tg->get_children<sql_device_set>("front_gate");
        if (set)
        {
            auto og = set->get_parent<sql_device_meta>("back_gate");
            if (og)
            {
                ret = get_same_side_device(og->get_pri_id(), _type);
            }
        }
        else
        {
            auto set = tg->get_children<sql_device_set>("back_gate");
            if (set)
            {
                auto og = set->get_parent<sql_device_meta>("front_gate");
                if (og)
                {
                    ret = get_same_side_device(og->get_pri_id(), _type);
                }
            }
        }
    }

    return ret;
}

gate_sm::gate_sm(int64_t _set_id, device_management_handler *dmh) : abs_state_machine(std::unique_ptr<abs_sm_state>(new gate_state_init()), dmh, _set_id)
{
}

void gate_state_init::before_enter(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<gate_sm &>(_sm);
    auto this_gate = get_gate_config_by_id(sm.set_id);
    sm.order_number.clear();
    sm.pass_plate_number.clear();
    sm.trigger_device_id = 0;
}

void gate_state_init::after_exit(abs_state_machine &_sm)
{
}

std::unique_ptr<abs_sm_state> gate_state_init::proc_event(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<gate_sm &>(_sm);
    auto this_gate = get_gate_config_by_id(sm.set_id);
    if (this_gate)
    {
        THR_CALL_DM_BEGIN();
        auto gate_id = device_management_handler::get_same_side_device(sm.trigger_device_id, "gate");
        auto speaker_id = device_management_handler::get_same_side_device(sm.trigger_device_id, "speaker");
        auto led_id = device_management_handler::get_same_side_device(sm.trigger_device_id, "led");
        client->gate_ctrl(gate_id, true);
        client->speaker_cast(speaker_id, "请通过");
        client->led_display(led_id, {"", sm.pass_plate_number, "请通过", util_get_timestring()});
        THR_CALL_DM_END();
    }
    sm.init_sm();

    return std::unique_ptr<abs_sm_state>();
}

std::unique_ptr<device_gate_set> get_gate_config_by_id(int64_t _id)
{
    std::unique_ptr<device_gate_set> ret;
    std::vector<device_gate_set> gate_tmp;
    try
    {
        THR_DEF_CIENT(config_management);
        THR_CONNECT(config_management);
        client->get_gate_config(gate_tmp);
        TRH_CLOSE(); /* code */
    }
    catch (...)
    {
    }

    for (auto &itr : gate_tmp)
    {
        if (itr.id == _id)
        {
            ret.reset(new device_gate_set(itr));
            break;
        }
    }

    return ret;
}

std::unique_ptr<device_scale_set> get_scale_config_by_id(int64_t _id)
{
    std::unique_ptr<device_scale_set> ret;
    std::vector<device_scale_set> scale_tmp;
    try
    {
        THR_DEF_CIENT(config_management);
        THR_CONNECT(config_management);
        client->get_scale_config(scale_tmp);
        TRH_CLOSE(); /* code */
    }
    catch (...)
    {
    }

    for (auto &itr : scale_tmp)
    {
        if (itr.id == _id)
        {
            ret.reset(new device_scale_set(itr));
            break;
        }
    }
    return ret;
}

scale_sm::scale_sm(int64_t _set_id, device_management_handler *dmh) : abs_state_machine(std::unique_ptr<scale_state_idle>(new scale_state_idle()), dmh, _set_id)
{
}

void scale_sm::clear_state()
{
    this->order_number.clear();
    this->pass_plate_number.clear();
    this->weight_que.clear();
    this->trigger_device_id = 0;
    this->begin_scale_date.clear();
    this->end_scale_date.clear();
}

void scale_sm::open_entry()
{
    auto tg_id = device_management_handler::get_same_side_device(trigger_device_id, "gate");
    THR_CALL_DM_BEGIN();
    client->gate_ctrl(tg_id, true);
    THR_CALL_DM_END();
}

void scale_sm::open_exit()
{
    auto tg_id = device_management_handler::get_diff_side_device(trigger_device_id, "gate");
    THR_CALL_DM_BEGIN();
    client->gate_ctrl(tg_id, true);
    THR_CALL_DM_END();
}

void scale_sm::start_scale_timer(int sec)
{
    m_timer = timer_wheel_add_node(
        sec,
        [this](void *p_set_id)
        {
            tft = timer;
            trigger_sm();
        });
}

void scale_sm::stop_scale_timer()
{
    timer_wheel_del_node(m_timer);
}

void scale_sm::cast_common(const std::string &_content)
{
    auto fs_id = device_management_handler::get_same_side_device(trigger_device_id, "speaker");
    auto bs_id = device_management_handler::get_diff_side_device(trigger_device_id, "speaker");
    auto fl_id = device_management_handler::get_same_side_device(trigger_device_id, "led");
    auto bl_id = device_management_handler::get_diff_side_device(trigger_device_id, "led");
    std::vector<std::string> content = {
        "",
        pass_plate_number,
        _content,
        util_get_timestring(),
    };
    auto spe_content = std::vector<std::string>(content.begin() + 1, content.begin() + 3);
    auto sp_content = util_join_string(spe_content, ",");
    THR_CALL_DM_BEGIN();
    client->speaker_cast(fs_id, sp_content);
    client->speaker_cast(bs_id, sp_content);
    client->led_display(fl_id, content);
    client->led_display(bl_id, content);
    THR_CALL_DM_END();
}

void scale_sm::cast_enter_info()
{
    cast_common("请上磅");
}

void scale_sm::cast_stop_stable()
{
    cast_common("未完全上磅");
}

void scale_sm::cast_issue_card()
{
    cast_common("请取卡后刷卡");
}

void scale_sm::cast_wait_scale()
{
    cast_common("请等待");
}

void scale_sm::cast_result()
{
    cast_common("已完成，请下磅," + util_double_to_string(cur_weight) + "吨");
}

void scale_sm::cast_busy()
{
    cast_common("正在称重，请等待");
}

void scale_sm::cast_need_confirm()
{
    cast_common("未确认装卸货");
}

void scale_sm::record_scale_start()
{
    begin_scale_date = util_get_timestring();
}

void scale_sm::record_scale_end()
{
    end_scale_date = util_get_timestring();
}

void scale_sm::print_ticket()
{
    auto p_id = device_management_handler::get_diff_side_device(trigger_device_id, "printer");
    THR_CALL_DM_BEGIN();
    client->printer_print(p_id, "暂无磅单");
    THR_CALL_END();
}

void scale_sm::trigger_cam_plate()
{
    auto pc_id = device_management_handler::get_diff_side_device(trigger_device_id, "plate_cam");
    auto pc_o_id = device_management_handler::get_same_side_device(trigger_device_id, "plate_cam");
    THR_CALL_DM_BEGIN();
    client->plate_cam_cap(pc_id);
    client->plate_cam_cap(pc_o_id);
    THR_CALL_END();
}

bool scale_sm::is_over_weight(double _p_weight)
{
    bool ret = false;
    double max_m_weight = 0;
    double max_j_weight = 0;
    THR_CALL_BEGIN(config_management);
    running_rule tmp;
    client->get_rule(tmp);
    max_j_weight = tmp.max_j_weight;
    max_m_weight = tmp.max_m_weight;
    THR_CALL_END();

    if (_p_weight > 0 && cur_weight > _p_weight)
    {
        if (max_m_weight > 0 && cur_weight > max_m_weight)
        {
            ret = true;
        }
        else if (max_j_weight > 0 && (cur_weight - _p_weight) > max_j_weight)
        {
            ret = true;
        }
    }

    return ret;
}

void scale_sm::cast_is_over_weight(double _p_weight)
{
    cast_common("超重了, 皮重:" + util_double_to_string(_p_weight) + "吨, 毛重:" + util_double_to_string(cur_weight) + "吨, 净重:" + util_double_to_string(cur_weight - _p_weight) + "吨");
}

void scale_sm::cast_weight_illegal(double _exceeded_weight)
{
    auto real_exceeded = _exceeded_weight;
    std::string content = "超重";
    if (_exceeded_weight < 0)
    {
        real_exceeded = -_exceeded_weight;
        content = "欠重";
    }
    cast_common(content + util_double_to_string(real_exceeded) + "吨");
}

void scale_state_idle::before_enter(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.clear_state();
}

void scale_state_idle::after_exit(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.open_entry();
    sm.cast_enter_info();
    auto plate_cam_id = device_management_handler::get_same_side_device(sm.trigger_device_id, "plate_cam");
    std::string pic_path;
    THR_CALL_DM_BEGIN();
    client->cap_picture_slow(pic_path, plate_cam_id);
    THR_CALL_DM_END();
    THR_CALL_BEGIN(order_center);
    client->order_push_attach(sm.order_number, "上磅照片", pic_path);
    THR_CALL_END();
    sm.record_scale_start();
}

std::unique_ptr<abs_sm_state> scale_state_idle::proc_event(abs_state_machine &_sm)
{
    std::unique_ptr<abs_sm_state> ret;
    if (_sm.tft == abs_state_machine::plate_cam ||
        _sm.tft == abs_state_machine::id_reader ||
        _sm.tft == abs_state_machine::qr_reader)
    {
        ret.reset(new scale_state_prepare());
    }
    return ret;
}

void scale_state_scale::before_enter(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.cast_wait_scale();
}

void scale_state_scale::after_exit(abs_state_machine &_sm)
{
}

double weight_make_scense(double _cur_weight, const std::string &_stuff_name, bool _is_p)
{
    double ret = 0;
    std::vector<weight_ref_config> wrcs;
    THR_CALL_BEGIN(config_management);
    client->get_weight_ref(wrcs);
    THR_CALL_END();

    for (auto &itr : wrcs)
    {
        if (_stuff_name.find(itr.stuff_name) != std::string::npos && itr.is_p_weight == _is_p)
        {
            ret = _cur_weight - itr.weight_ref;
            if (std::abs(ret) <= itr.flu_permission)
            {
                ret = 0;
            }
            break;
        }
    }

    return ret;
}

std::unique_ptr<abs_sm_state> scale_state_scale::proc_event(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    std::unique_ptr<abs_sm_state> ret;
    if (_sm.tft == abs_state_machine::plate_cam ||
        _sm.tft == abs_state_machine::id_reader ||
        _sm.tft == abs_state_machine::qr_reader)
    {
        sm.cast_busy();
    }
    else if (_sm.tft == abs_state_machine::manual_reset)
    {
        ret.reset(new scale_state_idle());
    }
    else if (_sm.tft == abs_state_machine::scale)
    {
        bool should_scale = true;
        auto set = sqlite_orm::search_record<sql_device_set>(sm.set_id);
        if (set)
        {
            auto fg = set->get_parent<sql_device_meta>("front_gate");
            auto bg = set->get_parent<sql_device_meta>("back_gate");
            if (fg && bg)
            {
                THR_CALL_DM_BEGIN();
                if (!client->gate_is_close(fg->get_pri_id()) || !client->gate_is_close(bg->get_pri_id()))
                {
                    should_scale = false;
                }
                THR_CALL_DM_END();
            }
        }
        if (should_scale)
        {
            if (sm.weight_que.empty())
            {
                sm.weight_que.push_back(sm.cur_weight);
            }
            else
            {
                if (sm.weight_que.back() != sm.cur_weight)
                {
                    sm.weight_que.clear();
                }
                sm.weight_que.push_back(sm.cur_weight);
            }
            auto require_weight_count = 3;
            bool need_issue_card = false;
            THR_CALL_BEGIN(config_management);
            running_rule tmp;
            client->get_rule(tmp);
            if (tmp.weight_turn > 0)
            {
                require_weight_count = tmp.weight_turn;
            }
            if (tmp.issue_card_path.length() > 0)
            {
                need_issue_card = true;
            }
            THR_CALL_END();
            if (sm.weight_que.size() > require_weight_count)
            {
                vehicle_order_info tmp;
                THR_CALL_BEGIN(order_center);
                client->get_order(tmp, sm.order_number);
                THR_CALL_END();
                bool cur_is_p_weight = false;
                if (tmp.is_sale && tmp.p_weight == 0)
                {
                    cur_is_p_weight = true;
                }
                else if (!tmp.is_sale && tmp.p_weight > 0)
                {
                    cur_is_p_weight = true;
                }
                auto exceeded_weight = weight_make_scense(sm.cur_weight, tmp.stuff_name, cur_is_p_weight);
                if (sm.is_over_weight(tmp.p_weight))
                {
                    sm.cast_is_over_weight(tmp.p_weight);
                }
                else if (exceeded_weight != 0)
                {
                    sm.cast_weight_illegal(exceeded_weight);
                }
                else
                {
                    if (tmp.p_weight == 0)
                    {
                        if (need_issue_card && tmp.expect_weight != 0)
                        {
                            ret.reset(new scale_state_issue_card());
                        }
                        else
                        {
                            ret.reset(new scale_state_clean());
                        }
                    }
                    else
                    {
                        if (tmp.confirm_info.operator_time.length() > 0)
                        {
                            ret.reset(new scale_state_clean());
                        }
                        else
                        {
                            sm.cast_need_confirm();
                        }
                    }
                }
            }
        }
        else
        {
            sm.weight_que.clear();
            ret.reset(new scale_state_prepare());
        }
    }

    return ret;
}

void scale_state_prepare::before_enter(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.start_scale_timer(5);
}

void scale_state_prepare::after_exit(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.stop_scale_timer();
}

std::unique_ptr<abs_sm_state> scale_state_prepare::proc_event(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    std::unique_ptr<abs_sm_state> ret;
    if (_sm.tft == abs_state_machine::plate_cam ||
        _sm.tft == abs_state_machine::id_reader ||
        _sm.tft == abs_state_machine::qr_reader)
    {
        sm.cast_busy();
    }
    else if (_sm.tft == abs_state_machine::manual_reset)
    {
        ret.reset(new scale_state_idle());
    }
    else if (_sm.tft == abs_state_machine::timer)
    {
        sm.cast_stop_stable();
        auto set = sqlite_orm::search_record<sql_device_set>(sm.set_id);
        if (set)
        {
            auto fg = set->get_parent<sql_device_meta>("front_gate");
            auto bg = set->get_parent<sql_device_meta>("back_gate");
            if (fg && bg)
            {
                THR_CALL_DM_BEGIN();
                if (client->gate_is_close(fg->get_pri_id()) && client->gate_is_close(bg->get_pri_id()))
                {
                    ret.reset(new scale_state_scale());
                }
                THR_CALL_DM_END();
            }
        }
    }
    else if (_sm.tft == abs_state_machine::manual_confirm)
    {
        ret.reset(new scale_state_scale());
    }
    return ret;
}

void scale_state_clean::before_enter(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.cast_result();
    THR_CALL_BEGIN(order_center);
    client->order_push_weight(sm.order_number, sm.cur_weight, "自动");
    THR_CALL_END();
    sm.print_ticket();
    sm.open_exit();
    sm.start_scale_timer();
}

void scale_state_clean::after_exit(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.stop_scale_timer();
    sm.trigger_cam_plate();
    sm.record_scale_end();
    auto begin_date = sm.begin_scale_date;
    auto end_date = sm.end_scale_date;
    auto enter_device_id = sm.trigger_device_id;
    auto on = sm.order_number;
    timer_wheel_add_node(
        1,
        [=](void *)
        {
            THR_CALL_DM_BEGIN();
            std::string file_name;
            client->video_record_slow(file_name, device_management_handler::get_same_side_device(enter_device_id, "video_cam"), begin_date, end_date);
            THR_CALL_BEGIN(order_center);
            if (file_name.length() > 0)
            {
                client->order_push_attach(on, "过磅录像", file_name);
            }
            THR_CALL_END();
            client->video_record_slow(file_name, device_management_handler::get_diff_side_device(enter_device_id, "video_cam"), begin_date, end_date);
            THR_CALL_BEGIN(order_center);
            if (file_name.length() > 0)
            {
                client->order_push_attach(on, "过磅录像", file_name);
            }
            THR_CALL_END();
            THR_CALL_DM_END();
        },
        true);
}

std::unique_ptr<abs_sm_state> scale_state_clean::proc_event(abs_state_machine &_sm)
{
    std::unique_ptr<abs_sm_state> ret;
    auto &sm = dynamic_cast<scale_sm &>(_sm);

    if (_sm.tft == abs_state_machine::plate_cam ||
        _sm.tft == abs_state_machine::id_reader ||
        _sm.tft == abs_state_machine::qr_reader)
    {
        sm.cast_busy();
    }
    else if (_sm.tft == abs_state_machine::manual_reset)
    {
        ret.reset(new scale_state_idle());
    }
    else if (sm.tft == abs_state_machine::timer)
    {
        auto set = sqlite_orm::search_record<sql_device_set>(sm.set_id);
        if (set)
        {
            auto fg = set->get_parent<sql_device_meta>("front_gate");
            auto bg = set->get_parent<sql_device_meta>("back_gate");
            if (fg && bg)
            {
                THR_CALL_DM_BEGIN();
                client->gate_is_close(fg->get_pri_id());
                client->gate_is_close(bg->get_pri_id());
                THR_CALL_DM_END();
            }
            auto sc = set->get_parent<sql_device_meta>("scale");
            if (sc)
            {
                THR_CALL_DM_BEGIN();
                sm.cur_weight = client->last_scale_read(sc->get_pri_id());
                THR_CALL_DM_END();
                if (sm.cur_weight == 0)
                {
                    if (fg && bg)
                    {
                        THR_CALL_DM_BEGIN();
                        client->gate_is_close(fg->get_pri_id());
                        client->gate_is_close(bg->get_pri_id());
                        THR_CALL_DM_END();
                    }
                    ret.reset(new scale_state_idle());
                }
            }
        }
    }

    return ret;
}

void scale_state_issue_card::before_enter(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.cast_issue_card();
    sm.start_scale_timer(5);

    auto set = sqlite_orm::search_record<sql_device_set>(sm.set_id);
    if (set)
    {
        auto cr = set->get_parent<sql_device_meta>("card_reader");
        if (cr)
        {
            std::string card_no;
            THR_CALL_DM_BEGIN();
            client->clear_card_no(cr->get_pri_id());
            THR_CALL_DM_END();
        }
    }
}

void scale_state_issue_card::after_exit(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    sm.stop_scale_timer();
}

bool issue_card(const std::string &_order_number, double _weight, const std::string &_card_no)
{
    bool ret = false;
    vehicle_order_info tmp;
    std::string host;

    THR_CALL_BEGIN(order_center);
    client->get_order(tmp, _order_number);
    THR_CALL_END();

    THR_CALL_BEGIN(config_management);
    running_rule rule;
    client->get_rule(rule);
    host = rule.issue_card_path;
    THR_CALL_END();
    if (tmp.order_number.length() > 0 && host.length() > 0)
    {
        std::string cmd = "/conf/issue_card.sh ";
        char sql[1048];
        sprintf(
            sql,
            "'%s','%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s'",
            tmp.order_number.c_str(),
            _card_no.c_str(),
            tmp.plate_number.c_str(),
            tmp.back_plate_number.c_str(),
            tmp.company_name.c_str(),
            tmp.driver_name.c_str(),
            (int)(_weight * 1000),
            (int)(tmp.expect_weight * 1000),
            util_get_timestring().c_str());
        cmd += host + " \"" + std::string(sql) + "\"";
        ret = (0 == system(cmd.c_str()));
    }

    return ret;
}

std::unique_ptr<abs_sm_state> scale_state_issue_card::proc_event(abs_state_machine &_sm)
{
    auto &sm = dynamic_cast<scale_sm &>(_sm);
    std::unique_ptr<abs_sm_state> ret;
    if (_sm.tft == abs_state_machine::plate_cam ||
        _sm.tft == abs_state_machine::id_reader ||
        _sm.tft == abs_state_machine::qr_reader)
    {
        sm.cast_busy();
    }
    else if (sm.tft == abs_state_machine::manual_reset)
    {
        ret.reset(new scale_state_idle());
    }
    else if (_sm.tft == abs_state_machine::timer)
    {
        auto set = sqlite_orm::search_record<sql_device_set>(sm.set_id);
        if (set)
        {
            auto cr = set->get_parent<sql_device_meta>("card_reader");
            if (cr)
            {
                std::string card_no;
                THR_CALL_DM_BEGIN();
                client->last_card_no(card_no, cr->get_pri_id());
                THR_CALL_DM_END();
                if (card_no.length() > 0)
                {
                    if (issue_card(sm.order_number, sm.cur_weight, card_no))
                    {
                        ret.reset(new scale_state_clean());
                    }
                    else
                    {
                        sm.cast_common("发卡失败");
                    }
                }
            }
        }
    }

    return ret;
}
