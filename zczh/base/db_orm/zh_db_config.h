#if !defined(_ZH_DB_CONFIG_H_)
#define _ZH_DB_CONFIG_H_

#include "sqlite_orm_tree.h"
#include "../utils/CJsonObject.hpp"
#include "../utils/Base64.h"
#include "../utils/clipp.h"
#include <functional>

const std::string node_name_enter = "进厂";
const std::string node_name_exit = "出厂";
const std::string node_name_p_weight = "一次称重";
const std::string node_name_rollback_weight = "回退一次称重";
const std::string node_name_m_weight = "二次称重";
const std::string node_name_create = "创建";
const std::string node_name_update = "更新";
const std::string node_name_close = "关闭";
const std::string node_name_check_in = "排号";
const std::string node_name_call = "叫号";
const std::string node_name_confirm = "确认出厂";
class sql_stuff : public sql_tree_base
{
public:
    std::string name;
    double inventory = 0;
    long need_enter_weight = 0;
    double price = 0;
    double expect_weight = 0;
    long need_manual_scale = 0;
    double min_limit = 45;
    double max_limit = 49.5;
    std::string code;
    long use_for_white_list = 0;
    long auto_call_count = 0;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;
        ret.push_back(sqlite_orm_column("name", sqlite_orm_column::STRING, &name));
        ret.push_back(sqlite_orm_column("inventory", sqlite_orm_column::REAL, &inventory));
        ret.push_back(sqlite_orm_column("need_enter_weight", sqlite_orm_column::INTEGER, &need_enter_weight));
        ret.push_back(sqlite_orm_column("price", sqlite_orm_column::REAL, &price));
        ret.push_back(sqlite_orm_column("expect_weight", sqlite_orm_column::REAL, &expect_weight));
        ret.push_back(sqlite_orm_column("need_manual_scale", sqlite_orm_column::INTEGER, &need_manual_scale));
        ret.push_back(sqlite_orm_column("min_limit", sqlite_orm_column::REAL, &min_limit));
        ret.push_back(sqlite_orm_column("max_limit", sqlite_orm_column::REAL, &max_limit));
        ret.push_back(sqlite_orm_column("code", sqlite_orm_column::STRING, &code));
        ret.push_back(sqlite_orm_column("use_for_white_list", sqlite_orm_column::INTEGER, &use_for_white_list));
        ret.push_back(sqlite_orm_column("auto_call_count", sqlite_orm_column::INTEGER, &auto_call_count));

        return ret;
    }
    virtual std::string table_name()
    {
        return "stuff_table";
    }
};

class sql_user : public sql_tree_base
{
public:
    std::string name;
    std::string phone;
    std::string md5_password;
    long is_external = 0;
    std::string online_token;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;
        ret.push_back(sqlite_orm_column("name", sqlite_orm_column::STRING, &name));
        ret.push_back(sqlite_orm_column("phone", sqlite_orm_column::STRING, &phone));
        ret.push_back(sqlite_orm_column("md5_password", sqlite_orm_column::STRING, &md5_password));
        ret.push_back(sqlite_orm_column("online_token", sqlite_orm_column::STRING, &online_token));
        ret.push_back(sqlite_orm_column("is_external", sqlite_orm_column::INTEGER, &is_external));

        return ret;
    }
    virtual std::string table_name()
    {
        return "user_table";
    }
};

class sql_permission : public sql_tree_base
{
public:
    std::string permission_name;
    std::string text_name;
    long is_module = 0;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;
        ret.push_back(sqlite_orm_column("permission_name", sqlite_orm_column::STRING, &permission_name));
        ret.push_back(sqlite_orm_column("text_name", sqlite_orm_column::STRING, &text_name));
        ret.push_back(sqlite_orm_column("is_module", sqlite_orm_column::INTEGER, &is_module));

        return ret;
    }
    virtual std::string table_name()
    {
        return "permission_table";
    }
};

class sql_role : public sql_tree_base
{
public:
    std::string name;
    std::string has_user_id;
    std::string has_permission_id;
    long read_only = 0;

    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("name", sqlite_orm_column::STRING, &name));
        ret.push_back(sqlite_orm_column("has_user_id", sqlite_orm_column::STRING, &has_user_id));
        ret.push_back(sqlite_orm_column("has_permission_id", sqlite_orm_column::STRING, &has_permission_id));
        ret.push_back(sqlite_orm_column("read_only", sqlite_orm_column::INTEGER, &read_only));

        return ret;
    }
    virtual std::string table_name()
    {
        return "role_table";
    }
};

class sql_device_driver : public sql_tree_base
{
public:
    std::string name;
    std::string path;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("name", sqlite_orm_column::STRING, &name));
        ret.push_back(sqlite_orm_column("path", sqlite_orm_column::STRING, &path));

        return ret;
    }
    virtual std::string table_name()
    {
        return "device_driver_table";
    }
};
class sql_device_meta;
class sql_device_set : public sql_tree_base
{
public:
    std::string name;
    long is_scale = 0;
    sql_device_set()
    {
        add_parent_type<sql_device_meta>("front_plate_cam");
        add_parent_type<sql_device_meta>("back_plate_cam");
        add_parent_type<sql_device_meta>("front_video_cam");
        add_parent_type<sql_device_meta>("back_video_cam");
        add_parent_type<sql_device_meta>("front_led");
        add_parent_type<sql_device_meta>("back_led");
        add_parent_type<sql_device_meta>("front_speaker");
        add_parent_type<sql_device_meta>("back_speaker");
        add_parent_type<sql_device_meta>("front_gate");
        add_parent_type<sql_device_meta>("back_gate");
        add_parent_type<sql_device_meta>("front_id_reader");
        add_parent_type<sql_device_meta>("back_id_reader");
        add_parent_type<sql_device_meta>("front_qr_reader");
        add_parent_type<sql_device_meta>("back_qr_reader");
        add_parent_type<sql_device_meta>("front_printer");
        add_parent_type<sql_device_meta>("back_printer");
        add_parent_type<sql_device_meta>("scale");
        add_parent_type<sql_device_meta>("card_reader");
    }
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("name", sqlite_orm_column::STRING, &name));
        ret.push_back(sqlite_orm_column("is_scale", sqlite_orm_column::INTEGER, &is_scale));

        return ret;
    }
    bool is_empty_set();
    std::string should_handle_income_plate(const std::string &_plate_no, std::string &_order_number);
    virtual std::string table_name()
    {
        return "device_set_table";
    }
};
class sql_device_meta : public sql_tree_base
{
public:
    std::string name;
    std::string args;

    sql_device_meta()
    {
        add_parent_type<sql_device_driver>("driver");
    }

    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("name", sqlite_orm_column::STRING, &name));
        ret.push_back(sqlite_orm_column("args", sqlite_orm_column::STRING, &args));

        return ret;
    }
    virtual std::string table_name()
    {
        return "device_meta_table";
    }
};

class sql_contract : public sql_tree_base
{
public:
    std::string name;
    long is_sale = 0;
    std::string attachment;
    std::string code;
    std::string admin_name_phone;
    double balance = 0;
    double credit = 0;
    std::string follow_stuff_id;

    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("name", sqlite_orm_column::STRING, &name));
        ret.push_back(sqlite_orm_column("is_sale", sqlite_orm_column::INTEGER, &is_sale));
        ret.push_back(sqlite_orm_column("attachment", sqlite_orm_column::STRING, &attachment));
        ret.push_back(sqlite_orm_column("code", sqlite_orm_column::STRING, &code));
        ret.push_back(sqlite_orm_column("admin_name_phone", sqlite_orm_column::STRING, &admin_name_phone));
        ret.push_back(sqlite_orm_column("follow_stuff_id", sqlite_orm_column::STRING, &follow_stuff_id));
        ret.push_back(sqlite_orm_column("balance", sqlite_orm_column::REAL, &balance));
        ret.push_back(sqlite_orm_column("credit", sqlite_orm_column::REAL, &credit));

        return ret;
    }
    virtual std::string table_name()
    {
        return "contract_table";
    }
};
class sql_vehicle : public sql_tree_base
{
public:
    std::string plate_no;
    std::string back_plate_no;
    std::string driver_name;
    std::string driver_phone;
    std::string driver_id;
    long in_black_list = 0;
    long in_white_list = 0;

    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("plate_no", sqlite_orm_column::STRING, &plate_no));
        ret.push_back(sqlite_orm_column("back_plate_no", sqlite_orm_column::STRING, &back_plate_no));
        ret.push_back(sqlite_orm_column("driver_name", sqlite_orm_column::STRING, &driver_name));
        ret.push_back(sqlite_orm_column("driver_phone", sqlite_orm_column::STRING, &driver_phone));
        ret.push_back(sqlite_orm_column("driver_id", sqlite_orm_column::STRING, &driver_id));
        ret.push_back(sqlite_orm_column("in_black_list", sqlite_orm_column::INTEGER, &in_black_list));
        ret.push_back(sqlite_orm_column("in_white_list", sqlite_orm_column::INTEGER, &in_white_list));

        return ret;
    }
    virtual std::string table_name()
    {
        return "vehicle_table";
    }
};

class sql_order : public sql_tree_base
{
public:
    std::string order_number;
    std::string plate_number;
    std::string back_plate_number;
    std::string driver_name;
    std::string driver_id;
    std::string driver_phone;
    std::string stuff_name;
    double p_weight = 0;
    double m_weight = 0;
    double enter_weight = 0;
    std::string reg_info_name;
    std::string reg_info_time;
    std::string call_info_name;
    std::string call_info_time;
    std::string confirm_info_name;
    std::string confirm_info_time;
    std::string seal_no;
    std::string p_time;
    std::string m_time;
    long is_sale = 0;
    // 无效->0, 未入场->1,正在执行->2, 已完成->100
    long status = 0;
    std::string company_name;
    std::string stuff_from;
    long reg_no = 0;
    std::string create_time;
    std::string continue_until;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("order_number", sqlite_orm_column::STRING, &order_number));
        ret.push_back(sqlite_orm_column("plate_number", sqlite_orm_column::STRING, &plate_number));
        ret.push_back(sqlite_orm_column("back_plate_number", sqlite_orm_column::STRING, &back_plate_number));
        ret.push_back(sqlite_orm_column("driver_name", sqlite_orm_column::STRING, &driver_name));
        ret.push_back(sqlite_orm_column("driver_phone", sqlite_orm_column::STRING, &driver_phone));
        ret.push_back(sqlite_orm_column("driver_id", sqlite_orm_column::STRING, &driver_id));
        ret.push_back(sqlite_orm_column("stuff_name", sqlite_orm_column::STRING, &stuff_name));
        ret.push_back(sqlite_orm_column("p_weight", sqlite_orm_column::REAL, &p_weight));
        ret.push_back(sqlite_orm_column("m_weight", sqlite_orm_column::REAL, &m_weight));
        ret.push_back(sqlite_orm_column("enter_weight", sqlite_orm_column::REAL, &enter_weight));
        ret.push_back(sqlite_orm_column("reg_info_name", sqlite_orm_column::STRING, &reg_info_name));
        ret.push_back(sqlite_orm_column("reg_info_time", sqlite_orm_column::STRING, &reg_info_time));
        ret.push_back(sqlite_orm_column("call_info_name", sqlite_orm_column::STRING, &call_info_name));
        ret.push_back(sqlite_orm_column("call_info_time", sqlite_orm_column::STRING, &call_info_time));
        ret.push_back(sqlite_orm_column("confirm_info_name", sqlite_orm_column::STRING, &confirm_info_name));
        ret.push_back(sqlite_orm_column("confirm_info_time", sqlite_orm_column::STRING, &confirm_info_time));
        ret.push_back(sqlite_orm_column("seal_no", sqlite_orm_column::STRING, &seal_no));
        ret.push_back(sqlite_orm_column("p_time", sqlite_orm_column::STRING, &p_time));
        ret.push_back(sqlite_orm_column("m_time", sqlite_orm_column::STRING, &m_time));
        ret.push_back(sqlite_orm_column("is_sale", sqlite_orm_column::INTEGER, &is_sale));
        ret.push_back(sqlite_orm_column("status", sqlite_orm_column::INTEGER, &status));
        ret.push_back(sqlite_orm_column("company_name", sqlite_orm_column::STRING, &company_name));
        ret.push_back(sqlite_orm_column("stuff_from", sqlite_orm_column::STRING, &stuff_from));
        ret.push_back(sqlite_orm_column("reg_no", sqlite_orm_column::INTEGER, &reg_no));
        ret.push_back(sqlite_orm_column("create_time", sqlite_orm_column::STRING, &create_time));
        ret.push_back(sqlite_orm_column("continue_until", sqlite_orm_column::STRING, &continue_until));

        return ret;
    }
    virtual std::string table_name()
    {
        return "order_table";
    }
};
class sql_order_history : public sql_tree_base
{
public:
    std::string node_name;
    std::string node_caller;
    std::string occour_time;
    sql_order_history()
    {
        add_parent_type<sql_order>("belong_order");
    }
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("node_name", sqlite_orm_column::STRING, &node_name));
        ret.push_back(sqlite_orm_column("node_caller", sqlite_orm_column::STRING, &node_caller));
        ret.push_back(sqlite_orm_column("occour_time", sqlite_orm_column::STRING, &occour_time));

        return ret;
    }
    virtual std::string table_name()
    {
        return "vehicle_history_table";
    }
};

class sql_order_attach : public sql_tree_base
{
public:
    std::string att_name;
    std::string att_path;
    sql_order_attach()
    {
        add_parent_type<sql_order>("belong_order");
    }
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("att_name", sqlite_orm_column::STRING, &att_name));
        ret.push_back(sqlite_orm_column("att_path", sqlite_orm_column::STRING, &att_path));

        return ret;
    }
    virtual std::string table_name()
    {
        return "vehicle_attach_table";
    }
};

class sql_rule_config : public sql_tree_base
{
public:
    long auto_call_count = 0;
    long call_time_out = 0;
    std::string zyzl_ssid;
    std::string zyzl_host;
    std::string date_ticket_prefix;
    std::string oem_name;
    long weight_turn = 0;
    long need_issue_card = 0;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("auto_call_count", sqlite_orm_column::INTEGER, &auto_call_count));
        ret.push_back(sqlite_orm_column("call_time_out", sqlite_orm_column::INTEGER, &call_time_out));
        ret.push_back(sqlite_orm_column("zyzl_ssid", sqlite_orm_column::STRING, &zyzl_ssid));
        ret.push_back(sqlite_orm_column("zyzl_host", sqlite_orm_column::STRING, &zyzl_host));
        ret.push_back(sqlite_orm_column("date_ticket_prefix", sqlite_orm_column::STRING, &date_ticket_prefix));
        ret.push_back(sqlite_orm_column("oem_name", sqlite_orm_column::STRING, &oem_name));
        ret.push_back(sqlite_orm_column("weight_turn", sqlite_orm_column::INTEGER, &weight_turn));
        ret.push_back(sqlite_orm_column("need_issue_card", sqlite_orm_column::INTEGER, &need_issue_card));

        return ret;
    }
    virtual std::string table_name()
    {
        return "rule_table";
    }
};

class sql_file_store : public sql_tree_base
{
public:
    std::string file_path;
    std::string upload_date;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("file_path", sqlite_orm_column::STRING, &file_path));
        ret.push_back(sqlite_orm_column("upload_date", sqlite_orm_column::STRING, &upload_date));

        return ret;
    }
    virtual std::string table_name()
    {
        return "file_store_table";
    }
};

class sql_zyzl_plugin_que : public sql_tree_base
{
public:
    std::string req_body;
    std::string req_url;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("req_body", sqlite_orm_column::STRING, &req_body));
        ret.push_back(sqlite_orm_column("req_url", sqlite_orm_column::STRING, &req_url));

        return ret;
    }
    virtual std::string table_name()
    {
        return "zyzl_plugin_que_table";
    }
};

class sql_ticket_today_index : public sql_tree_base
{
public:
    long today_index;
    std::string today_date;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("today_index", sqlite_orm_column::INTEGER, &today_index));
        ret.push_back(sqlite_orm_column("today_date", sqlite_orm_column::STRING, &today_date));

        return ret;
    }
    virtual std::string table_name()
    {
        return "ticket_today_table";
    }
};
class sql_reg_no_today_index : public sql_tree_base
{
public:
    long today_index;
    std::string today_date;
    virtual std::vector<sqlite_orm_column> self_columns_defined()
    {
        std::vector<sqlite_orm_column> ret;

        ret.push_back(sqlite_orm_column("today_index", sqlite_orm_column::INTEGER, &today_index));
        ret.push_back(sqlite_orm_column("today_date", sqlite_orm_column::STRING, &today_date));

        return ret;
    }
    virtual std::string table_name()
    {
        return "reg_no_today_table";
    }
};

std::unique_ptr<sql_user> db_get_online_user(const std::string &_token);

#endif