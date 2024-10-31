#if !defined(_RBAC_CENTER_H_)
#define _RBAC_CENTER_H_

#include "../../base/include.h"
class rbac_center_handler : public rbac_centerIf
{
public:
    rbac_center_handler();
    virtual bool has_permission(const std::string &token, const std::string &target_module, const std::string &target_resouce, const bool is_write);
    virtual bool add_role(const rbac_role &new_one);
    virtual bool del_role(const int64_t role_id);
    virtual void get_all_roles(std::vector<rbac_role> &_return);
    virtual bool add_user_to_role(const int64_t role_id, const int64_t user_id);
    virtual bool del_user_from_role(const int64_t role_id, const int64_t user_id);
    bool add_user(const rbac_user &new_one);
    virtual void del_user(const int64_t user_id);
    virtual void get_all_user(std::vector<rbac_user> &_return);
    virtual void get_all_permission(std::vector<rbac_permission> &_return);
    virtual bool add_role_permission(const int64_t role_id, const int64_t perm_id);
    virtual bool del_role_permission(const int64_t role_id, const int64_t perm_id);
    virtual void login(std::string &_return, const std::string &phone, const std::string &pwd);
    virtual void get_name_by_token(std::string &_return, const std::string &token);
    virtual void get_user_by_token(rbac_user& _return, const std::string& token);
    void db_2_rpc(sql_permission &_db, rbac_permission &_rpc);
    void db_2_rpc(sql_user &_db, rbac_user &_user);
};

#endif // _RBAC_CENTER_H_
