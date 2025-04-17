exception gen_exp {
    1:string msg,
}

struct stuff_config {
    1:i64 id,
    2:string stuff_name,
    3:double inventory,
    4:bool need_enter_weight,
    5:double price,
    6:double expect_weight,
    7:bool need_manual_scale,
    8:double min_limit,
    9:double max_limit,
    10:string code,
    11:bool use_for_white_list,
    12:bool auto_call_count,
}

struct rbac_user {
    1:string name,
    2:i64 id,
    3:string phone,
    4:list<string> role_name,
    5:string md5_password,
}

struct rbac_permission {
    1:string name,
    2:string text_name,
    3:i64 id,
    4:i64 is_module,
    5:list<string> role_name,
}

struct rbac_role{
    1:string role_name,
    2:i64 id,
    3:list<rbac_user> all_user,
    4:list<rbac_permission> author_modules,
    5:list<rbac_permission> author_resouces,
    6:bool read_only,
}


service rbac_center{
    bool has_permission(1:string token, 2:string target_module, 3:string target_resouce, 4:bool is_write) throws (1:gen_exp e),
    bool add_role(1:rbac_role new_one) throws (1:gen_exp e),
    bool del_role(1:i64 role_id) throws (1:gen_exp e),
    list<rbac_role> get_all_roles() throws (1:gen_exp e),
    bool add_user_to_role(1:i64 role_id, 2:i64 user_id) throws (1:gen_exp e),
    bool del_user_from_role(1:i64 role_id, 2:i64 user_id) throws (1:gen_exp e),
    bool add_role_permission(1:i64 role_id, 2:i64 perm_id) throws (1:gen_exp e),
    bool del_role_permission(1:i64 role_id, 2:i64 perm_id) throws (1:gen_exp e),
    bool add_user(1:rbac_user new_one) throws (1:gen_exp e),
    void del_user(1:i64 user_id) throws (1:gen_exp e),
    list<rbac_user> get_all_user() throws (1:gen_exp e),
    list<rbac_permission> get_all_permission() throws (1:gen_exp e),
    string login(1:string phone, 2:string pwd) throws (1:gen_exp e),
    string get_name_by_token(1:string token) throws (1:gen_exp e),
    rbac_user get_user_by_token(1:string token) throws (1:gen_exp e),
}

struct device_driver {
    1:string name,
    2:i64 id,
    3:string path,
}

struct device_meta{
    1:string name,
    2:i64 id,
    3:string driver_args,
    4:device_driver driver,
}

struct device_couple {
    1:device_meta front,
    2:device_meta back;
}

struct device_scale_set {
    1:string name,
    2:i64 id,
    3:device_couple plate_cam,
    4:device_couple video_cam,
    5:device_couple led,
    6:device_couple speaker,
    7:device_couple id_reader,
    8:device_couple qr_reader,
    9:device_couple gate,
    10:device_couple printer,
    11:device_meta scale,
    12:device_meta card_reader,
}

struct device_gate_set{
    1:string name,
    2:i64 id,
    3:device_couple plate_cam,
    4:device_couple video_cam,
    5:device_couple led,
    6:device_couple speaker,
    7:device_couple id_reader,
    8:device_couple qr_reader,
    9:device_couple gate,
}

struct contract_config {
    1:string name,
    2:bool is_sale,
    3:string attachment,
    4:i64 id,
    5:string code,
    6:string admin_name_phone,
    8:double balance,
    9:double credit,
    10:list<stuff_config> follow_stuffs,
}

struct vehicle_config {
    1:string plate_no,
    2:i64 id,
    3:string back_plate_no,
    4:string driver_name,
    5:string driver_phone,
    6:string driver_id,
    7:bool in_black_list,
    8:bool in_white_list,
}

struct running_rule {
    1:i64 auto_call_count,
    2:i64 call_time_out,
    3:string zyzl_ssid,
    4:string zyzl_host,
    5:string date_ticket_prefix,
    6:string oem_name,
    7:i64 weight_turn,
    8:string issue_card_path
    9:bool gate_strict,
    10:double max_m_weight,
    11:double max_j_weight,
}

struct device_run_time{
    1:i64 id,
    2:string name,
    3:string stay_time,
}

service config_management{
    list<stuff_config> get_stuff_config() throws (1:gen_exp e),
    bool add_stuff_config(1:stuff_config new_one) throws (1:gen_exp e),
    bool del_stuff_config(1:i64 id) throws (1:gen_exp e),
    list<device_scale_set> get_scale_config() throws (1:gen_exp e),
    list<device_gate_set> get_gate_config() throws (1:gen_exp e),
    list<device_driver> get_all_driver() throws (1:gen_exp e),
    bool add_device_set(1:string name, 2:bool is_scale) throws(1:gen_exp e),
    bool del_device_set(1:i64 set_id) throws (1:gen_exp e),
    bool add_device_to_set(1:string name, 2:string driver_args, 3:i64 driver_id, 4:i64 set_id, 5:string use_for) throws (1:gen_exp e),
    bool del_device_from_set(1:i64 device_id) throws (1:gen_exp e),
    list<contract_config> get_contract_config() throws(1:gen_exp e),
    list<vehicle_config> get_vehicle_config() throws (1:gen_exp e),
    bool add_contract(1:contract_config new_one) throws (1:gen_exp e),
    void del_contract(1:i64 contract_id) throws (1:gen_exp e),
    bool update_contract(1:contract_config input) throws(1:gen_exp e),
    bool add_vehicle(1:vehicle_config new_one) throws(1:gen_exp e),
    void del_vehicle(1:i64 vehicle_id) throws(1:gen_exp e),
    bool update_vehicle(1:vehicle_config input) throws(1:gen_exp e),
    running_rule get_rule() throws(1:gen_exp e),
    bool set_rule(1:running_rule rule) throws (1:gen_exp e),
    void reboot_system() throws (1:gen_exp e),
}

struct vehicle_order_opt_info {
    1:string operator_name,
    2:string operator_time,
}

struct vehicle_order_history_node {
    1:string node_name,
    2:string node_caller,
    3:string occour_time,
    4:i64 id,
}

struct vehicle_order_attachment {
    1:string att_name,
    2:string att_path,
    3:i64 id,
}

struct vehicle_order_info {
    1:i64 id,
    2:string order_number,
    3:string plate_number,
    4:string back_plate_number,
    5:string driver_name,
    6:string driver_id,
    7:string driver_phone,
    8:string stuff_name,
    9:double p_weight,
    10:double m_weight,
    11:double enter_weight,
    12:vehicle_order_opt_info reg_info,
    13:vehicle_order_opt_info call_info,
    14:vehicle_order_opt_info confirm_info,
    15:string seal_no,
    16:list<vehicle_order_history_node> history_records,
    17:list<vehicle_order_attachment> order_attachs,
    18:string p_time,
    19:string m_time,
    20:bool is_sale,
    21:i64 status,
    22:string company_name,
    23:string stuff_from,
    24:i64 reg_no,
    25:string continue_until,
    26:double expect_weight,
}

struct order_search_cond {
    1:string plate_number,
    2:string driver_phone,
    3:string company_name,
    4:string stuff_name,
    5:i64 status,
    6:string begin_time,
    7:string end_time,
    8:i64 page_no,
    9:string driver_id,
    10:i64 exp_status,
    11:string create_time_begin,
    12:string create_time_end,
}

struct req_wait_info{
    1:string req_url,
    2:string req_body,
    3:i64 id,
}

service order_center {
    bool add_order(1:vehicle_order_info order, 2:string opt_name) throws (1:gen_exp e),
    bool del_order(1:string order_number, 2:string opt_name) throws (1:gen_exp e),
    bool update_order(1:vehicle_order_info order, 2:string opt_name) throws (1:gen_exp e),
    list<vehicle_order_info> search_order(1:order_search_cond cond) throws (1:gen_exp e),
    vehicle_order_info get_order(1:string order_number) throws (1:gen_exp e),
    list<vehicle_order_info> get_registered_order() throws (1:gen_exp e),
    bool order_check_in(1:string order_number, 2:bool is_check_in, 3:string opt_name, 4:double expect_weight) throws (1:gen_exp e),
    bool order_call(1:string order_number, 2:bool is_call, 3:string opt_name) throws (1:gen_exp e),
    bool order_confirm(1:string order_number, 2:bool is_confirm, 3:string opt_name) throws(1:gen_exp e),
    bool order_set_seal_no(1:string order_number, 2:string seal_no) throws(1:gen_exp e),
    bool order_push_weight(1:string order_number, 2:double weight, 3:string opt_name) throws(1:gen_exp e),
    bool order_rollback_weight(1:string order_number, 3:string opt_name) throws(1:gen_exp e),
    bool order_push_gate(1:string order_number, 3:string opt_name) throws(1:gen_exp e),
    bool order_rollback_gate(1:string order_number, 3:string opt_name) throws(1:gen_exp e),
    bool order_push_attach(1:string order_number, 2:string name, 3:string att_path) throws (1:gen_exp e),
    i64 count_order(1:order_search_cond cond) throws (1:gen_exp e),
    list<req_wait_info> get_req_que() throws (1:gen_exp e),
    void pop_out_req(1:i64 req_id) throws (1:gen_exp e),
    bool check_pass_permit(1:string plate, 2:string id_card) throws (1:gen_exp e),
}

struct scale_sm_info {
    1:device_scale_set set_info,
    2:string cur_state,
    3:string cur_plate,
    4:double cur_weight,
    5:bool front_gate_is_close,
    6:bool back_gate_is_close,
}
 struct gate_sm_info {
    1:device_gate_set set_info,
 }

service device_management {
    oneway void init_all_set(),
    bool device_ctrl(1:i64 device_id, 2:bool start) throws (1:gen_exp e),
    bool device_is_started(1:i64 device_id) throws (1:gen_exp e),
    oneway void gate_ctrl(1:i64 gate_id, 2:bool is_open),
    oneway void led_display(1:i64 led_id, 2:list<string> content),
    oneway void speaker_cast(1:i64 speaker_id, 2:string content),
    oneway void printer_print(1:i64 printer_id, 2:string content),
    oneway void plate_cam_cap(1:i64 plate_cam_id),
    double last_scale_read(1:i64 scale_id) throws (1:gen_exp e),
    string last_id_read(1:i64 id_reader_id) throws (1:gen_exp e),
    string last_qr_read(1:i64 qr_reader_id) throws (1:gen_exp e),
    string last_plate_read(1:i64 plate_cam_id) throws (1:gen_exp e),
    oneway void push_scale_read(1:i64 scale_id, 2:double weight),
    oneway void push_id_read(1:i64 id_id, 2:string id_number),
    oneway void push_qr_read(1:i64 qr_id, 2:string qr_content),
    oneway void push_plate_read(1:i64 plate_cam_id, 2:string plate_no),
    string cap_picture_slow(1:i64 cam_id) throws (1:gen_exp e),
    string video_record_slow(1:i64 cam_id, 2:string begin_date, 3:string end_date) throws (1:gen_exp e),
    bool gate_is_close(1:i64 gate_id) throws(1:gen_exp e),
    list<scale_sm_info> get_scale_sm_info() throws (1:gen_exp e),
    void reset_scale_sm(1:i64 sm_id) throws (1:gen_exp e),
    void confirm_scale(1:i64 sm_id) throws (1:gen_exp e),
    list<device_run_time> get_device_run_time() throws (1:gen_exp e),
    list<gate_sm_info> get_gate_sm_info() throws (1:gen_exp e),
    string last_card_no(1:i64 card_reader_id) throws (1:gen_exp e),
    oneway void push_card_no(1:i64 card_reader_id, 2:string card_no),
    oneway void clear_card_no(1:i64 card_reader_id),
}