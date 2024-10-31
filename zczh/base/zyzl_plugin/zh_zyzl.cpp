#include "zh_zyzl.h"
#include "../db_orm/zh_db_config.h"
#define CPPHTTPLIB_OPENSSL_SUPPORT
#include "../log_driver/httplib.h"
#include "../utils/tdf_timer.h"

static tdf_log g_log("zyzl", "/tmp/audit.log", "/tmp/audit.log");

zyzl_plugin *zyzl_plugin::m_inst;

zyzl_plugin::zyzl_plugin()
{
    timer_wheel_add_node(
        4,
        [this](void *)
        {
            auto ers = sqlite_orm::search_record_all<sql_zyzl_plugin_que>("PRI_ID != 0");
            for (auto &itr : ers)
            {
                auto send_ret = send_to_zyzl(
                    itr.req_url,
                    neb::CJsonObject(itr.req_body),
                    [](const neb::CJsonObject &)
                    { return true; });
                if (send_ret)
                {
                    itr.remove_record();
                }
                else
                {
                    break;
                }
            }
        });
}

zyzl_plugin *zyzl_plugin::get_inst()
{
    if (m_inst)
    {
        return m_inst;
    }
    else
    {
        m_inst = new zyzl_plugin();
        return m_inst;
    }
}

bool zyzl_plugin::push_weight(const std::string &_plate, const std::string &_p_time, const std::string &_m_time, double p_weight, double m_weight, double j_weight, const std::string &_ticket_no, const std::string &_seal_no)
{
    bool ret = false;
    std::string push_weight_path = "/push_weight";

    neb::CJsonObject req;
    auto zyzl_id = get_id_from_plate(_plate);
    req.Add("id", zyzl_id);
    req.Add("plateNo", _plate);
    req.Add("pWeight", p_weight);
    req.Add("mWeight", m_weight);
    req.Add("jWeight", j_weight);
    req.Add("pTime", _p_time);
    req.Add("mTime", _m_time);
    req.Add("ticketNo", _ticket_no);
    req.Add("sealNo", _seal_no);

    send_to_que(push_weight_path, req);
    ret = true;

    return ret;
}

bool zyzl_plugin::push_call(const std::string &_plate, const std::string &_driver_name)
{
    bool ret = false;
    std::string call_vehicle_path = "/call_vehicle";

    neb::CJsonObject req;
    req.Add("plateNo", _plate);
    req.Add("driverName", _driver_name);

    send_to_que(call_vehicle_path, req);
    ret = true;

    return ret;
}

bool zyzl_plugin::push_p(const std::string &_plate)
{
    std::string push_p_path = "/push_p";

    neb::CJsonObject req;
    req.Add("id", get_id_from_plate(_plate));

    send_to_zyzl(
        push_p_path,
        req,
        [](const neb::CJsonObject &)
        { return true; });
    return true;
}

std::string zyzl_plugin::get_id_from_plate(const std::string &_plate)
{
    std::string ret;

    neb::CJsonObject req;
    req.Add("plateNo", _plate);

    send_to_zyzl(
        "/vehicle_info",
        req,
        [&](const neb::CJsonObject &res) -> bool
        {
            bool lamda_ret = false;

            if (res.KeyExist("id"))
            {
                ret = res("id");
                lamda_ret = true;
            }

            return lamda_ret;
        });

    return ret;
}

bool zyzl_plugin::send_to_zyzl(const std::string &_path, const neb::CJsonObject &_req, const std::function<bool(const neb::CJsonObject &)> &_callback, bool _is_get)
{
    bool ret = false;
    std::string token;
    std::string remote_url;
    auto rule = sqlite_orm::search_record<sql_rule_config>(1);
    if (rule)
    {
        token = rule->zyzl_ssid;
        remote_url = rule->zyzl_host;
    }
    if (token.length() > 0 && remote_url.length() > 0)
    {
        httplib::Client cli(remote_url);
        cli.set_read_timeout(20, 0);
        cli.set_default_headers(httplib::Headers({{"Content-Type", "application/json"}}));
        cli.set_follow_location(true);
        auto begin_point = time(NULL);
        auto real_req = _req;

        std::string real_path = "/mt_api/pa_rest" + _path + "?token=" + token;
        g_log.log("send req to host->%s path->%s token->%s:%s", remote_url.c_str(), real_path.c_str(), token.c_str(), real_req.ToFormattedString().c_str());

        if (_is_get)
        {
            auto res = cli.Get(real_path.c_str());
            if (res)
            {
                auto res_json = neb::CJsonObject(res->body);
                g_log.log("recv resp from zyzl:%s", res_json.ToFormattedString().c_str());
                if (res_json("err_msg") == "")
                {
                    ret = _callback(res_json["result"]);
                }
                else
                {
                    g_log.err("failure because %s", res_json("err_msg").c_str());
                    std::cerr << res_json("err_msg") << std::endl;
                }
            }
            else
            {
                g_log.err("failed to post api req :%s", httplib::to_string(res.error()).c_str());
            }
        }
        else
        {
            auto res = cli.Post(real_path.c_str(), real_req.ToString(), "application/json");
            if (res)
            {
                auto res_json = neb::CJsonObject(res->body);
                g_log.log("recv resp from zyzl:%s", res_json.ToFormattedString().c_str());
                if (res_json("err_msg") == "")
                {
                    ret = _callback(res_json["result"]);
                }
                else
                {
                    g_log.err("failure because %s", res_json("err_msg").c_str());
                    std::cerr << res_json("err_msg") << std::endl;
                }
            }
            else
            {
                g_log.err("failed to post api req :%s", httplib::to_string(res.error()).c_str());
            }
        }

        auto end_point = time(NULL);
        g_log.log("spend %d second", end_point - begin_point);
    }
    else
    {
        g_log.err("no access code or url");
    }

    return ret;
}

bool zyzl_plugin::send_to_zyzl(const std::string &_path, const neb::CJsonObject &_req, neb::CJsonObject &resp)
{
    bool ret = false;
    std::string token;
    std::string remote_url;
    auto rule = sqlite_orm::search_record<sql_rule_config>(1);
    if (rule)
    {
        token = rule->zyzl_ssid;
        remote_url = rule->zyzl_host;
    }
    if (token.length() > 0 && remote_url.length() > 0)
    {
        httplib::Client cli(remote_url);
        cli.set_read_timeout(20, 0);
        cli.set_default_headers(httplib::Headers({{"Content-Type", "application/json"}, {"token", token}}));
        cli.set_follow_location(true);
        auto begin_point = time(NULL);
        auto real_req = _req;

        std::string real_path = "/mt_api/api/v1" + _path;
        g_log.log("send req to host->%s path->%s token->%s:%s", remote_url.c_str(), real_path.c_str(), token.c_str(), real_req.ToFormattedString().c_str());

        auto res = cli.Post(real_path.c_str(), real_req.ToString(), "application/json");
        if (res)
        {
            auto res_json = neb::CJsonObject(res->body);
            g_log.log("recv resp from zyzl:%s", res_json.ToFormattedString().c_str());
            if (res_json("err_msg") == "")
            {
                ret = true;
                resp = res_json["result"];
            }
            else
            {
                g_log.err("failure because %s", res_json("err_msg").c_str());
                std::cerr << res_json("err_msg") << std::endl;
            }
        }
        else
        {
            g_log.err("failed to post api req :%s", httplib::to_string(res.error()).c_str());
        }

        auto end_point = time(NULL);
        g_log.log("spend %d second", end_point - begin_point);
    }
    else
    {
        g_log.err("no access code or url");
    }

    return ret;
}

std::string zyzl_plugin::get_driver_name_from_plate(const std::string &_plate)
{
    std::string ret;

    neb::CJsonObject req;
    req.Add("plateNo", _plate);

    send_to_zyzl(
        "/vehicle_info",
        req,
        [&](const neb::CJsonObject &res) -> bool
        {
            bool lamda_ret = false;

            if (res.KeyExist("driverName"))
            {
                ret = res("driverName");
                lamda_ret = true;
            }

            return lamda_ret;
        });

    return ret;
}

void zyzl_plugin::send_to_que(const std::string &_path, const neb::CJsonObject &_req, bool _is_get)
{
    sql_zyzl_plugin_que tmp;
    tmp.req_body = _req.ToString();
    tmp.req_url = _path;
    tmp.insert_record();
}

bool zyzl_plugin::should_pass_gate(const std::string &_plate, const std::string &_id_card)
{
    bool ret = false;

    neb::CJsonObject req;
    req.Add("plate", _plate);
    req.Add("id_card", _id_card);

    neb::CJsonObject resp;
    if (send_to_zyzl(
            "/global/search_valid_plan_by_plate_id",
            req,
            resp))
    {
        if (resp.KeyExist("result"))
        {
            ret = resp("result") == "true";
        }
    }

    return ret;
}
