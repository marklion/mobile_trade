#if !defined(_DEVICE_MANAGEMENT_H_)
#define _DEVICE_MANAGEMENT_H_

#include "../../base/include.h"
class abs_state_machine;
class abs_sm_state
{
public:
    virtual void before_enter(abs_state_machine &_sm) {}
    virtual void after_exit(abs_state_machine &_sm) {}
    virtual std::unique_ptr<abs_sm_state> proc_event(abs_state_machine &_sm)
    {
        return std::unique_ptr<abs_sm_state>();
    }
    virtual std::string name() {return std::string();}
};
class device_management_handler;
class abs_state_machine
{
    tdf_log m_log;
public:
    std::unique_ptr<abs_sm_state> m_cur_state;
    enum triggered_from_type {
        plate_cam, id_reader, qr_reader, scale, timer,self, manual_reset, manual_confirm
    } tft;
    std::string pass_plate_number;
    int64_t trigger_device_id = 0;
    std::string order_number;
    timer_handle m_timer;
    device_management_handler *belong = nullptr;
    long set_id = 0;
    abs_state_machine(std::unique_ptr<abs_sm_state> _init_state, device_management_handler *_belong, long _set_id) : m_cur_state(_init_state.release()),belong(_belong),m_log("sm", "/tmp/pub_log.log", "/tmp/pub_log.log"),set_id(_set_id)
    {
    }
    void trigger_sm()
    {
        while (1)
        {
            m_log.log("sm %d proc %d trigger in %s", set_id, tft, m_cur_state->name().c_str());
            auto next_state = m_cur_state->proc_event(*this);
            tft = self;
            if (next_state)
            {
                m_log.log("sm %d leave %s", set_id, m_cur_state->name().c_str());
                m_cur_state->after_exit(*this);
                m_cur_state.reset(next_state.release());
                m_cur_state->before_enter(*this);
                m_log.log("sm %d enter %s", set_id, m_cur_state->name().c_str());
            }
            else
            {
                break;
            }
        }
    }
    void init_sm()
    {
        m_cur_state->before_enter(*this);
    }
    virtual ~abs_state_machine() {}
};

class gate_state_init : public abs_sm_state
{
    virtual void before_enter(abs_state_machine &_sm);
    virtual void after_exit(abs_state_machine &_sm);
    virtual std::unique_ptr<abs_sm_state> proc_event(abs_state_machine &_sm);
};

class gate_sm : public abs_state_machine
{
public:
    gate_sm(int64_t _set_id, device_management_handler *dmh);
};

class scale_state_idle : public abs_sm_state
{
    virtual void before_enter(abs_state_machine &_sm);
    virtual void after_exit(abs_state_machine &_sm);
    virtual std::unique_ptr<abs_sm_state> proc_event(abs_state_machine &_sm);
    virtual std::string name() { return "空闲"; }
};

class scale_state_prepare : public abs_sm_state
{
    virtual void before_enter(abs_state_machine &_sm);
    virtual void after_exit(abs_state_machine &_sm);
    virtual std::unique_ptr<abs_sm_state> proc_event(abs_state_machine &_sm);
    virtual std::string name() { return "准备"; }
};
class scale_state_scale : public abs_sm_state
{
    virtual void before_enter(abs_state_machine &_sm);
    virtual void after_exit(abs_state_machine &_sm);
    virtual std::unique_ptr<abs_sm_state> proc_event(abs_state_machine &_sm);
    virtual std::string name() { return "称重"; }
};
class scale_state_clean : public abs_sm_state
{
    virtual void before_enter(abs_state_machine &_sm);
    virtual void after_exit(abs_state_machine &_sm);
    virtual std::unique_ptr<abs_sm_state> proc_event(abs_state_machine &_sm);
    virtual std::string name() { return "清理"; }
};

class scale_state_issue_card:public abs_sm_state
{
    virtual void before_enter(abs_state_machine &_sm);
    virtual void after_exit(abs_state_machine &_sm);
    virtual std::unique_ptr<abs_sm_state> proc_event(abs_state_machine &_sm);
    virtual std::string name() { return "发卡"; }
};

class scale_sm : public abs_state_machine
{
public:
    double cur_weight = 0;
    std::list<double> weight_que;
    std::string begin_scale_date;
    std::string end_scale_date;
    scale_sm(int64_t _set_id, device_management_handler *dmh);
    void clear_state();
    void open_entry();
    void open_exit();
    void start_scale_timer(int sec = 3);
    void stop_scale_timer();
    void cast_common(const std::string &_content);
    void cast_enter_info();
    void cast_stop_stable();
    void cast_issue_card();
    void cast_wait_scale();
    void cast_result();
    void cast_busy();
    void cast_need_confirm();
    void record_scale_start();
    void record_scale_end();
    void print_ticket();
    void trigger_cam_plate();
    bool is_over_weight(double _p_weight = 0);
    void cast_is_over_weight(double _p_weight);
};

class device_management_handler : public device_managementIf
{
    std::map<int64_t, std::shared_ptr<abs_state_machine>> m_sm_map;
    pthread_mutex_t map_lock;

public:
    device_management_handler();
    virtual void init_all_set();
    virtual bool device_ctrl(const int64_t device_id, const bool start);
    virtual bool device_is_started(const int64_t device_id);
    virtual void gate_ctrl(const int64_t gate_id, const bool is_open);
    virtual void led_display(const int64_t led_id, const std::vector<std::string> &content);
    virtual void speaker_cast(const int64_t speaker_id, const std::string &content);
    virtual double last_scale_read(const int64_t scale_id);
    virtual void last_id_read(std::string &_return, const int64_t id_reader_id);
    virtual void last_qr_read(std::string &_return, const int64_t qr_reader_id);
    virtual void last_plate_read(std::string &_return, const int64_t plate_cam_id);
    virtual void cap_picture_slow(std::string &_return, const int64_t cam_id);
    virtual void video_record_slow(std::string &_return, const int64_t cam_id, const std::string &begin_date, const std::string &end_date);
    virtual void push_scale_read(const int64_t scale_id, const double weight);
    virtual void push_id_read(const int64_t id_id, const std::string &id_number);
    virtual void push_qr_read(const int64_t qr_id, const std::string &qr_content);
    virtual void push_plate_read(const int64_t plate_cam_id, const std::string &plate_no);
    virtual bool gate_is_close(const int64_t gate_id);
    virtual void printer_print(const int64_t printer_id, const std::string &content);
    virtual void plate_cam_cap(const int64_t plate_cam_id);
    virtual void get_scale_sm_info(std::vector<scale_sm_info> &_return);
    virtual void reset_scale_sm(const int64_t sm_id);
    virtual void confirm_scale(const int64_t sm_id);
    virtual void get_device_run_time(std::vector<device_run_time> &_return);
    virtual void get_gate_sm_info(std::vector<gate_sm_info> &_return);
    virtual void last_card_no(std::string &_return, const int64_t card_reader_id);
    virtual void push_card_no(const int64_t card_reader_id, const std::string &card_no);
    virtual void clear_card_no(const int64_t card_reader_id);

    void walk_zombie_process();
    void start_device_no_exp(int64_t id);

    void sm_init_add(std::shared_ptr<abs_state_machine> _sm, int64_t sm_id);
    void sm_trigger(int64_t sm_id, std::function<bool(abs_state_machine &_sm)> update_func);
    void sm_run_in_scale(int64_t sm_id, std::function<void(abs_state_machine &_sm)> runner);

    std::string gate_proc_id_plate(const std::string &_id, const std::string &_plate, bool _is_enter, sql_device_set &_set);

    static int64_t get_same_side_device(int64_t _input_id, const std::string &_type);
    static int64_t get_diff_side_device(int64_t _input_id, const std::string &_type);
};

std::unique_ptr<device_gate_set> get_gate_config_by_id(int64_t _id);
std::unique_ptr<device_scale_set> get_scale_config_by_id(int64_t _id);

#endif // _DEVICE_MANAGEMENT_H_
