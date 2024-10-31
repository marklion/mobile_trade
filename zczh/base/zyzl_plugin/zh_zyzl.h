#if !defined(_ZH_ZYZL_H_)
#define _ZH_ZYZL_H_
#include "../utils/utils.h"
#include "../utils/CJsonObject.hpp"
#include "../utils/tdf_timer.h"

class zyzl_plugin
{
    std::string m_host;
    std::string m_ssid;
    zyzl_plugin();
    static zyzl_plugin *m_inst;
public:
    static zyzl_plugin *get_inst();
    bool push_weight(const std::string &_plate, const std::string &_p_time, const std::string &_m_time, double p_weight, double m_weight, double j_weight, const std::string &_ticket_no, const std::string &_seal_no);
    bool push_call(const std::string &_plate, const std::string &_driver_name);
    bool push_p(const std::string &_plate);
    std::string get_id_from_plate(const std::string &_plate);
    bool send_to_zyzl(const std::string &_path, const neb::CJsonObject &_req, const std::function<bool(const neb::CJsonObject &)> &_callback, bool _is_get = false);
    bool send_to_zyzl(const std::string &_path, const neb::CJsonObject &_req, neb::CJsonObject &resp);
    std::string get_driver_name_from_plate(const std::string &_plate);
    void send_to_que(const std::string &_path, const neb::CJsonObject &_req, bool _is_get = false);
    bool should_pass_gate(const std::string &_plate, const std::string &_id_card);
};

#endif // _ZH_ZYZL_H_
