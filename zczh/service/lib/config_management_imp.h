#if !defined(_CONFIG_MANAGEMENT_H_)
#define _CONFIG_MANAGEMENT_H_

#include "../../base/include.h"

class config_management_handler : public config_managementIf
{
public:
    config_management_handler();
    virtual void get_stuff_config(std::vector<stuff_config> &_return);
    virtual bool add_stuff_config(const stuff_config &new_one);
    virtual bool del_stuff_config(const int64_t id);
    virtual void get_scale_config(std::vector<device_scale_set> &_return);
    virtual void get_gate_config(std::vector<device_gate_set> &_return);
    virtual void get_all_driver(std::vector<device_driver> &_return);
    virtual bool add_device_to_set(const std::string &name, const std::string &driver_args, const int64_t driver_id, const int64_t set_id, const std::string &use_for);
    virtual bool del_device_from_set(const int64_t device_id);
    virtual bool add_device_set(const std::string &name, const bool is_scale);
    virtual bool del_device_set(const int64_t set_id);
    virtual void get_contract_config(std::vector<contract_config> &_return);
    virtual void get_vehicle_config(std::vector<vehicle_config> &_return);
    virtual bool add_contract(const contract_config &new_one);
    virtual void del_contract(const int64_t contract_id);
    virtual bool update_contract(const contract_config &input);
    virtual bool add_vehicle(const vehicle_config &new_one);
    virtual void del_vehicle(const int64_t vehicle_id);
    virtual bool update_vehicle(const vehicle_config &input);
    virtual void get_rule(running_rule &_return);
    virtual bool set_rule(const running_rule &rule);
    virtual void reboot_system();
    virtual void get_weight_ref(std::vector<weight_ref_config> &_return);
    virtual bool add_weight_ref(const weight_ref_config &new_one);
    virtual bool del_weight_ref(const int64_t ref_id);

    void db_2_rpc(sql_stuff &_db, stuff_config &_rpc);
    void db_2_rpc(sql_contract &_db, contract_config &_rpc);
    void db_2_rpc(sql_vehicle &_db, vehicle_config &_rpc);
    void db_2_rpc(sql_device_driver &_db, device_driver &_rpc);
    void db_2_rpc(sql_device_meta &_db, device_meta &_rpc);
    void db_2_rpc(sql_device_set &_db, device_scale_set &_rpc);
    void db_2_rpc(sql_device_set &_db, device_gate_set &_rpc);
    void db_2_rpc(sql_weight_ref_config &_db, weight_ref_config &_rpc);
    void rpc_2_db(const weight_ref_config &_rpc, sql_weight_ref_config &_db);
};
#endif // _CONFIG_MANAGEMENT_H_