#if !defined(_ORDER_CENTER_H_)
#define _ORDER_CENTER_H_

#include "../../base/include.h"

class order_center_handler : public order_centerIf
{
public:
    order_center_handler();
    virtual bool add_order(const vehicle_order_info &order, const std::string &opt_name);
    virtual bool del_order(const std::string &order_number, const std::string &opt_name);
    virtual bool update_order(const vehicle_order_info &order, const std::string &opt_name);
    virtual void search_order(std::vector<vehicle_order_info> &_return, const order_search_cond &cond);
    virtual void get_order(vehicle_order_info &_return, const std::string &order_number);
    virtual void get_registered_order(std::vector<vehicle_order_info> &_return);
    virtual bool order_check_in(const std::string &order_number, const bool is_check_in, const std::string &opt_name, const double expect_weight);
    virtual bool order_call(const std::string &order_number, const bool is_call, const std::string &opt_name);
    virtual bool order_confirm(const std::string &order_number, const bool is_confirm, const std::string &opt_name);
    virtual bool order_set_seal_no(const std::string &order_number, const std::string &seal_no);
    virtual bool order_push_weight(const std::string &order_number, const double weight, const std::string &opt_name);
    virtual bool order_rollback_weight(const std::string &order_number, const std::string &opt_name);
    virtual bool order_push_gate(const std::string &order_number, const std::string &opt_name);
    virtual bool order_rollback_gate(const std::string &order_number, const std::string &opt_name);
    virtual bool order_push_attach(const std::string &order_number, const std::string &name, const std::string &att_path);
    virtual int64_t count_order(const order_search_cond &cond);
    virtual void get_req_que(std::vector<req_wait_info> &_return);
    virtual void pop_out_req(const int64_t req_id);
    virtual bool check_pass_permit(const std::string& plate, const std::string& id_card);

    std::string order_is_dup(const vehicle_order_info &order);
    std::unique_ptr<sql_order> get_order_by_number(const std::string &_order_number);
    void auto_call_next();
    void push_zyzl(const std::string &_order_number);
    std::string gen_ticket_no();
    long gen_reg_no();
    void close_order(sql_order &_order, const std::string &_opt_name = "自动");
    void check_order_pass();

    void db_2_rpc(sql_order &_db, vehicle_order_info &_rpc);
    void db_2_rpc(sql_order_attach &_db, vehicle_order_attachment &_rpc);
    void db_2_rpc(sql_order_history &_db, vehicle_order_history_node &_rpc);

    void rpc_2_db(const vehicle_order_info &_rpc, sql_order &_db);
};

#endif // _ORDER_CENTER_H_
