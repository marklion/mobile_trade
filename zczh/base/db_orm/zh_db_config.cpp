#include "zh_db_config.h"
#include <uuid/uuid.h>
#include <fstream>
#include <sstream>

std::unique_ptr<sql_user> db_get_online_user(const std::string &_token)
{
    if (_token.empty())
    {
        return std::unique_ptr<sql_user>();
    }
    return sqlite_orm::search_record<sql_user>("online_token == '%s'", _token.c_str());
}

#define GET_DEVICE_FROM_SET(x) get_parent<sql_device_meta>(#x)

bool sql_device_set::is_empty_set()
{
    bool ret = true;

    if (GET_DEVICE_FROM_SET(front_plate_cam) ||
        GET_DEVICE_FROM_SET(back_plate_cam)||
        GET_DEVICE_FROM_SET(front_gate)||
        GET_DEVICE_FROM_SET(back_gate)||
        GET_DEVICE_FROM_SET(front_led)||
        GET_DEVICE_FROM_SET(back_led)||
        GET_DEVICE_FROM_SET(front_speaker)||
        GET_DEVICE_FROM_SET(back_speaker)||
        GET_DEVICE_FROM_SET(front_video_cam)||
        GET_DEVICE_FROM_SET(back_video_cam)||
        GET_DEVICE_FROM_SET(front_id_reader)||
        GET_DEVICE_FROM_SET(back_id_reader)||
        GET_DEVICE_FROM_SET(front_qr_reader)||
        GET_DEVICE_FROM_SET(back_qr_reader)||
        GET_DEVICE_FROM_SET(front_printer)||
        GET_DEVICE_FROM_SET(back_printer)||
        GET_DEVICE_FROM_SET(scale)
        )
    {
        ret = false;
    }

    return ret;
}

std::string sql_device_set::should_handle_income_plate(const std::string &_plate_no, std::string &_order_number)
{
    std::string ret = "无车辆信息";

    if (_plate_no.length() > 0)
    {
        auto vo = sqlite_orm::search_record<sql_order>("plate_number == '%s' AND status != 100", _plate_no.c_str());
        if (vo)
        {
            if (vo->call_info_time.length() > 0)
            {
                _order_number = vo->order_number;
                if (is_scale)
                {
                    ret = "";
                }
                else if (vo->confirm_info_time.length() > 0)
                {
                    ret = "";
                }
                else if (!vo->get_children<sql_order_history>("belong_order", "node_name == '%s'", node_name_p_weight.c_str()))
                {
                    ret = "";
                }
                else
                {
                    _order_number = "";
                    ret = "未确认不能出厂";
                }
            }
            else
            {
                ret = "车辆未叫号";
            }
        }
        else
        {
            ret = "未找到车辆信息";
        }
    }

    return ret;
}
