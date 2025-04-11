#include "config_management_imp.h"
#include "rpc_include.h"

config_management_handler::config_management_handler()
{
    struct driver_meta_tmp
    {
        std::string name;
        std::string path;
    } dmt_array[] = {
        {"mock_driver", "/bin/mock_driver"},
        {"zs_plate_cam", "/bin/zs_plate_cam"},
        {"id_reader_driver", "/bin/id_reader_driver"},
        {"wr_style_scale", "/bin/wr_style_scale_driver"},
        {"wl_style_scale", "/bin/wl_style_scale_driver"},
        {"card_reader_driver", "/bin/card_reader_driver"},
        {"tld_style_scale", "/bin/tld_style_scale_driver"},
    };

    for (auto &itr : dmt_array)
    {
        auto er = sqlite_orm::search_record<sql_device_driver>("name == '%s'", itr.name.c_str());
        if (!er)
        {
            sql_device_driver tmp;
            tmp.name = itr.name;
            tmp.path = itr.path;
            tmp.insert_record();
        }
    }
}

void config_management_handler::get_stuff_config(std::vector<stuff_config> &_return)
{
    auto all_record = sqlite_orm::search_record_all<sql_stuff>();
    for (auto &itr : all_record)
    {
        stuff_config tmp;
        db_2_rpc(itr, tmp);

        _return.push_back(tmp);
    }
}
bool config_management_handler::add_stuff_config(const stuff_config &new_one)
{
    bool ret = false;

    sql_stuff tmp;
    tmp.name = new_one.stuff_name;

    ret = tmp.insert_record();

    return ret;
}
bool config_management_handler::del_stuff_config(const int64_t id)
{
    bool ret = false;

    auto ss = sqlite_orm::search_record<sql_stuff>(id);
    if (ss)
    {
        ss->remove_record();
        ret = true;
    }

    return ret;
}

void config_management_handler::get_scale_config(std::vector<device_scale_set> &_return)
{
    auto gs = sqlite_orm::search_record_all<sql_device_set>("is_scale != 0");
    for (auto &itr : gs)
    {
        device_scale_set dgs;
        db_2_rpc(itr, dgs);
        _return.push_back(dgs);
    }
}

void config_management_handler::get_gate_config(std::vector<device_gate_set> &_return)
{
    auto gs = sqlite_orm::search_record_all<sql_device_set>("is_scale == 0");
    for (auto &itr : gs)
    {
        device_gate_set dgs;
        db_2_rpc(itr, dgs);
        _return.push_back(dgs);
    }
}

void config_management_handler::get_all_driver(std::vector<device_driver> &_return)
{
    auto ds = sqlite_orm::search_record_all<sql_device_driver>();
    for (auto &itr : ds)
    {
        device_driver tmp;
        db_2_rpc(itr, tmp);
        _return.push_back(tmp);
    }
}

bool config_management_handler::add_device_to_set(const std::string &name, const std::string &driver_args, const int64_t driver_id, const int64_t set_id, const std::string &use_for)
{
    bool ret = false;
    sql_device_meta dev_m;
    dev_m.name = name;
    dev_m.args = driver_args;

    auto driver = sqlite_orm::search_record<sql_device_driver>(driver_id);
    auto set = sqlite_orm::search_record<sql_device_set>(set_id);
    if (driver && set)
    {
        if (!set->get_parent<sql_device_meta>(use_for))
        {
            dev_m.set_parent(*driver, "driver");
            if (dev_m.insert_record())
            {
                set->set_parent(dev_m, use_for);
                ret = set->update_record();
            }
        }
        else
        {
            ZH_RETURN_MSG("设备已存在");
        }
    }
    else
    {
        ZH_RETURN_MSG("驱动或组件不存在");
    }

    return ret;
}

bool config_management_handler::del_device_from_set(const int64_t device_id)
{
    bool ret = true;

    auto dev = sqlite_orm::search_record<sql_device_meta>(device_id);
    if (dev)
    {
        dev->remove_record();
    }
    else
    {
        ZH_RETURN_MSG("设备不存在");
    }

    return ret;
}

bool config_management_handler::add_device_set(const std::string &name, const bool is_scale)
{
    bool ret = false;

    auto er = sqlite_orm::search_record<sql_device_set>("name == '%s'", name.c_str());
    if (er)
    {
        ZH_RETURN_MSG("组件已存在");
    }
    sql_device_set tmp;
    tmp.is_scale = is_scale;
    tmp.name = name;

    ret = tmp.insert_record();

    return ret;
}

bool config_management_handler::del_device_set(const int64_t set_id)
{
    bool ret = false;

    auto er = sqlite_orm::search_record<sql_device_set>(set_id);
    if (!er)
    {
        ZH_RETURN_MSG("组件不存在");
    }
    if (!er->is_empty_set())
    {
        ZH_RETURN_MSG("组件已经添加设备，请先删除设备");
    }
    er->remove_record();
    ret = true;

    return ret;
}

void config_management_handler::get_contract_config(std::vector<contract_config> &_return)
{
    auto ccs = sqlite_orm::search_record_all<sql_contract>();
    for (auto &itr : ccs)
    {
        contract_config tmp;
        db_2_rpc(itr, tmp);
        _return.push_back(tmp);
    }
}

void config_management_handler::get_vehicle_config(std::vector<vehicle_config> &_return)
{
    auto ccs = sqlite_orm::search_record_all<sql_vehicle>();
    for (auto &itr : ccs)
    {
        vehicle_config tmp;
        db_2_rpc(itr, tmp);
        _return.push_back(tmp);
    }
}

bool config_management_handler::add_contract(const contract_config &new_one)
{
    bool ret = false;

    auto er = sqlite_orm::search_record<sql_contract>("name == '%s'", new_one.name.c_str());
    if (er)
    {
        ZH_RETURN_MSG("合同已存在");
    }
    sql_contract tmp;
    tmp.admin_name_phone = new_one.admin_name_phone;
    tmp.code = new_one.code;
    tmp.is_sale = new_one.is_sale;
    tmp.name = new_one.name;

    ret = tmp.insert_record();

    return ret;
}

void config_management_handler::del_contract(const int64_t contract_id)
{
    auto er = sqlite_orm::search_record<sql_contract>(contract_id);
    if (!er)
    {
        ZH_RETURN_MSG("合同不存在");
    }
    er->remove_record();
}

bool config_management_handler::update_contract(const contract_config &input)
{
    bool ret = false;

    auto er = sqlite_orm::search_record<sql_contract>(input.id);
    if (!er)
    {
        ZH_RETURN_MSG("合同不存在");
    }
    er->admin_name_phone = input.admin_name_phone;
    er->code = input.code;
    er->is_sale = input.is_sale;
    er->name = input.name;

    ret = er->update_record();

    return ret;
}

bool config_management_handler::add_vehicle(const vehicle_config &new_one)
{
    bool ret = false;

    auto er = sqlite_orm::search_record<sql_vehicle>(
        "plate_no == '%s' OR back_plate_no == '%s' OR driver_id == '%s' OR driver_phone == '%s'",
        new_one.plate_no.c_str(), new_one.back_plate_no.c_str(), new_one.driver_id.c_str(), new_one.driver_phone.c_str());
    if (er)
    {
        ZH_RETURN_DUP_VEHICLE();
    }
    sql_vehicle tmp;
    tmp.back_plate_no = new_one.back_plate_no;
    tmp.driver_id = new_one.driver_id;
    tmp.driver_name = new_one.driver_name;
    tmp.driver_phone = new_one.driver_phone;
    tmp.in_black_list = new_one.in_black_list;
    tmp.in_white_list = new_one.in_white_list;
    tmp.plate_no = new_one.plate_no;

    ret = tmp.insert_record();

    return ret;
}

void config_management_handler::del_vehicle(const int64_t vehicle_id)
{
    auto er = sqlite_orm::search_record<sql_vehicle>(vehicle_id);
    if (!er)
    {
        ZH_RETURN_NO_VEHICLE();
    }
    er->remove_record();
}

bool config_management_handler::update_vehicle(const vehicle_config &input)
{
    auto er = sqlite_orm::search_record<sql_vehicle>(input.id);
    if (!er)
    {
        ZH_RETURN_NO_VEHICLE();
    }
    er->back_plate_no = input.back_plate_no;
    er->driver_id = input.driver_id;
    er->driver_name = input.driver_name;
    er->driver_phone = input.driver_phone;
    er->in_black_list = input.in_black_list;
    er->in_white_list = input.in_white_list;
    er->plate_no = input.plate_no;

    return er->update_record();
}

bool config_management_handler::set_rule(const running_rule &rule)
{
    bool ret = false;
    auto er = sqlite_orm::search_record<sql_rule_config>(1);
    if (er)
    {
        er->auto_call_count = rule.auto_call_count;
        er->call_time_out = rule.call_time_out;
        er->zyzl_ssid = rule.zyzl_ssid;
        er->zyzl_host = rule.zyzl_host;
        er->date_ticket_prefix = rule.date_ticket_prefix;
        er->oem_name = rule.oem_name;
        er->weight_turn = rule.weight_turn;
        er->issue_card_path = rule.issue_card_path;
        ret = er->update_record();
    }
    else
    {
        sql_rule_config tmp;
        tmp.auto_call_count = rule.auto_call_count;
        tmp.call_time_out = rule.call_time_out;
        tmp.zyzl_ssid = rule.zyzl_ssid;
        tmp.zyzl_host = rule.zyzl_host;
        tmp.date_ticket_prefix = rule.date_ticket_prefix;
        tmp.oem_name = rule.oem_name;
        tmp.weight_turn = rule.weight_turn;
        tmp.issue_card_path = rule.issue_card_path;
        ret = tmp.insert_record();
    }
    return ret;
}

void config_management_handler::reboot_system()
{
    exit(0);
}

void config_management_handler::get_rule(running_rule &_return)
{
    auto er = sqlite_orm::search_record<sql_rule_config>(1);
    if (er)
    {
        _return.auto_call_count = er->auto_call_count;
        _return.call_time_out = er->call_time_out;
        _return.zyzl_host = er->zyzl_host;
        _return.zyzl_ssid = er->zyzl_ssid;
        _return.date_ticket_prefix = er->date_ticket_prefix;
        _return.oem_name = er->oem_name;
        _return.weight_turn = er->weight_turn;
        _return.issue_card_path = er->issue_card_path;
    }
}

void config_management_handler::db_2_rpc(sql_stuff &_db, stuff_config &_rpc)
{
    _rpc.auto_call_count = _db.auto_call_count;
    _rpc.code = _db.code;
    _rpc.expect_weight = _db.expect_weight;
    _rpc.id = _db.get_pri_id();
    _rpc.inventory = _db.inventory;
    _rpc.max_limit = _db.max_limit;
    _rpc.min_limit = _db.min_limit;
    _rpc.need_enter_weight = _db.need_enter_weight;
    _rpc.need_manual_scale = _db.need_manual_scale;
    _rpc.price = _db.price;
    _rpc.stuff_name = _db.name;
    _rpc.use_for_white_list = _db.use_for_white_list;
}

void config_management_handler::db_2_rpc(sql_contract &_db, contract_config &_rpc)
{
    _rpc.admin_name_phone = _db.admin_name_phone;
    _rpc.attachment = _db.attachment;
    _rpc.balance = _db.balance;
    _rpc.code = _db.code;
    _rpc.credit = _db.credit;
    auto fsids = util_split_string(_db.follow_stuff_id);
    for (auto &itr : fsids)
    {
        auto stfp = sqlite_orm::search_record<sql_stuff>(atoi(itr.c_str()));
        if (stfp)
        {
            stuff_config tmp;
            db_2_rpc(*stfp, tmp);
            _rpc.follow_stuffs.push_back(tmp);
        }
    }
    _rpc.id = _db.get_pri_id();
    _rpc.is_sale = _db.is_sale;
    _rpc.name = _db.name;
}

void config_management_handler::db_2_rpc(sql_vehicle &_db, vehicle_config &_rpc)
{
    _rpc.back_plate_no = _db.back_plate_no;
    _rpc.driver_id = _db.driver_id;
    _rpc.driver_name = _db.driver_name;
    _rpc.driver_phone = _db.driver_phone;
    _rpc.id = _db.get_pri_id();
    _rpc.in_black_list = _db.in_black_list;
    _rpc.in_white_list = _db.in_white_list;
    _rpc.plate_no = _db.plate_no;
}

void config_management_handler::db_2_rpc(sql_device_driver &_db, device_driver &_rpc)
{
    _rpc.id = _db.get_pri_id();
    _rpc.name = _db.name;
    _rpc.path = _db.path;
}

void config_management_handler::db_2_rpc(sql_device_meta &_db, device_meta &_rpc)
{
    auto driver = _db.get_parent<sql_device_driver>("driver");
    if (driver)
    {
        db_2_rpc(*driver, _rpc.driver);
    }
    _rpc.driver_args = _db.args;
    _rpc.id = _db.get_pri_id();
    _rpc.name = _db.name;
}

#define DEV_FROM_SET_TO_RPC(x, y)                 \
    auto x = _db.get_parent<sql_device_meta>(#x); \
    if (x)                                        \
    {                                             \
        db_2_rpc(*x, y);                          \
    }

void config_management_handler::db_2_rpc(sql_device_set &_db, device_scale_set &_rpc)
{
    _rpc.name = _db.name;
    _rpc.id = _db.get_pri_id();
    DEV_FROM_SET_TO_RPC(front_gate, _rpc.gate.front);
    DEV_FROM_SET_TO_RPC(back_gate, _rpc.gate.back);
    DEV_FROM_SET_TO_RPC(front_plate_cam, _rpc.plate_cam.front);
    DEV_FROM_SET_TO_RPC(back_plate_cam, _rpc.plate_cam.back);
    DEV_FROM_SET_TO_RPC(front_video_cam, _rpc.video_cam.front);
    DEV_FROM_SET_TO_RPC(back_video_cam, _rpc.video_cam.back);
    DEV_FROM_SET_TO_RPC(front_id_reader, _rpc.id_reader.front);
    DEV_FROM_SET_TO_RPC(back_id_reader, _rpc.id_reader.back);
    DEV_FROM_SET_TO_RPC(front_qr_reader, _rpc.qr_reader.front);
    DEV_FROM_SET_TO_RPC(back_qr_reader, _rpc.qr_reader.back);
    DEV_FROM_SET_TO_RPC(front_led, _rpc.led.front);
    DEV_FROM_SET_TO_RPC(back_led, _rpc.led.back);
    DEV_FROM_SET_TO_RPC(front_speaker, _rpc.speaker.front);
    DEV_FROM_SET_TO_RPC(back_speaker, _rpc.speaker.back);
    DEV_FROM_SET_TO_RPC(front_printer, _rpc.printer.front);
    DEV_FROM_SET_TO_RPC(back_printer, _rpc.printer.back);
    DEV_FROM_SET_TO_RPC(scale, _rpc.scale);
    DEV_FROM_SET_TO_RPC(card_reader, _rpc.card_reader);
}

void config_management_handler::db_2_rpc(sql_device_set &_db, device_gate_set &_rpc)
{
    _rpc.name = _db.name;
    _rpc.id = _db.get_pri_id();
    DEV_FROM_SET_TO_RPC(front_gate, _rpc.gate.front);
    DEV_FROM_SET_TO_RPC(back_gate, _rpc.gate.back);
    DEV_FROM_SET_TO_RPC(front_plate_cam, _rpc.plate_cam.front);
    DEV_FROM_SET_TO_RPC(back_plate_cam, _rpc.plate_cam.back);
    DEV_FROM_SET_TO_RPC(front_video_cam, _rpc.video_cam.front);
    DEV_FROM_SET_TO_RPC(back_video_cam, _rpc.video_cam.back);
    DEV_FROM_SET_TO_RPC(front_id_reader, _rpc.id_reader.front);
    DEV_FROM_SET_TO_RPC(back_id_reader, _rpc.id_reader.back);
    DEV_FROM_SET_TO_RPC(front_qr_reader, _rpc.qr_reader.front);
    DEV_FROM_SET_TO_RPC(back_qr_reader, _rpc.qr_reader.back);
    DEV_FROM_SET_TO_RPC(front_led, _rpc.led.front);
    DEV_FROM_SET_TO_RPC(back_led, _rpc.led.back);
    DEV_FROM_SET_TO_RPC(front_speaker, _rpc.speaker.front);
    DEV_FROM_SET_TO_RPC(back_speaker, _rpc.speaker.back);
}
