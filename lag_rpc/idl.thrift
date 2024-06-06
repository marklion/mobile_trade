exception gen_exp {
    1:string msg,
}
struct device_status {
    1:string name,
    2:bool enter_gate_is_close,
    3:bool exit_gate_is_close,
    4:i64 type_id,
    5:string scale_status,
    6:string cur_weight,
}

struct field_queue_node {
    1:i64 id,
    2:string plate,
    3:string back_plate,
    4:string stuff_name,
    5:i64 status_code,
    6:string driver_name,
    7:string driver_phone,
    8:string p_weight,
    9:string m_weight,
    10:string seal_no,
    11:bool need_confirm,
    12:bool has_called,
    13:string check_in_time,
    14:string call_time,
}

service open_api {
    list<device_status> get_device_status(1:string phone) throws (1:gen_exp e),
    void do_device_opt_gate_control(1:string phone, 2:string name, 3:bool is_enter, 4:bool is_open) throws (1:gen_exp e),
    void do_device_opt_confirm_scale(1:string phone, 2:string name) throws (1:gen_exp e),
    void do_device_opt_reset_scale(1:string phone, 2:string name) throws (1:gen_exp e),
    void do_device_opt_trigger_cap(1:string phone, 2:string name, 3:bool is_enter, 4:string vehicle_number) throws (1:gen_exp e),
    string do_device_opt_take_pic(1:string phone, 2:string name, 3:bool is_enter) throws (1:gen_exp e),
    list<field_queue_node> get_queue_node(1:string phone) throws (1:gen_exp e),
    bool field_queue_call(1:string phone, 2:i64 id,  3:bool is_call) throws (1:gen_exp e),
    bool field_queue_pass(1:string phone, 2:i64 id) throws (1:gen_exp e),
    bool field_queue_confirm(1:string phone, 2:i64 id, 3:bool is_confirm) throws (1:gen_exp e),
    bool field_queue_set_seal(1:string phone, 2:i64 id, 3:string seal_no) throws (1:gen_exp e),
}