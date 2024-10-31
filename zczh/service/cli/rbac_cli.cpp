#include "rbac_cli.h"
#include "tabulate.hpp"

void show_users(std::ostream &out, std::vector<std::string> _params)
{
    std::vector<rbac_user> tmp;
    THR_DEF_CIENT(rbac_center);
    THR_CONNECT(rbac_center);
    try
    {
        client->get_all_user(tmp);
        tabulate::Table tab;
        tab.add_row({"ID", "name", "phone", "pwd", "roles"});
        for (auto &itr : tmp)
        {
            tab.add_row({std::to_string(itr.id), itr.name, itr.phone, itr.md5_password, util_join_string(itr.role_name, "\n")});
        }
        tab.format().multi_byte_characters(true);
        out << tab << std::endl;
    }
    catch (gen_exp &e)
    {
        out << e.msg << std::endl;
    }
    TRH_CLOSE();
}

void add_user(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 3)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            rbac_user tmp;
            tmp.md5_password = util_calcu_md5(_params[2]);
            tmp.name = _params[0];
            tmp.phone = _params[1];
            client->add_user(tmp);
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

void show_permission(std::ostream &out, std::vector<std::string> _params)
{
    THR_DEF_CIENT(rbac_center);
    THR_CONNECT(rbac_center);
    try
    {
        std::vector<rbac_permission> tmp;
        client->get_all_permission(tmp);

        tabulate::Table tab;
        tab.add_row({"ID", "name", "role_name", "type"});

        for (auto &itr : tmp)
        {
            tab.add_row({std::to_string(itr.id), itr.text_name, util_join_string(itr.role_name, "\n"), (itr.is_module ? "模块" : "资源")});
        }

        tab.format().multi_byte_characters(true);
        out << tab << std::endl;
    }
    catch (const gen_exp &e)
    {
        out << e.msg << std::endl;
    }
    TRH_CLOSE();
}

void show_roles(std::ostream &out, std::vector<std::string> _params)
{
    THR_DEF_CIENT(rbac_center);
    THR_CONNECT(rbac_center);
    try
    {
        std::vector<rbac_role> tmp;
        client->get_all_roles(tmp);

        tabulate::Table tab;
        tab.add_row({"ID", "name", "users", "permissions", "type"});
        for (auto &itr : tmp)
        {
            std::vector<std::string> users;
            for (auto &su : itr.all_user)
            {
                users.push_back(su.name);
            }
            std::vector<std::string> perms;
            for (auto &su : itr.author_modules)
            {
                perms.push_back("模块:" + su.text_name);
            }
            for (auto &su : itr.author_resouces)
            {
                perms.push_back("资源:" + su.text_name);
            }
            tab.add_row({std::to_string(itr.id), itr.role_name, util_join_string(users, "\n"), util_join_string(perms, "\n"), (itr.read_only ? "只读" : "读写")});
        }
        tab.format().multi_byte_characters(true);
        out << tab << std::endl;
    }
    catch (const gen_exp &e)
    {
        out << e.msg << std::endl;
    }
    TRH_CLOSE();
}

void add_user_to_role(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            client->add_user_to_role(atoi(_params[0].c_str()), atoi(_params[1].c_str()));
        }
        catch (const gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

void del_user_from_role(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            client->del_user_from_role(atoi(_params[0].c_str()), atoi(_params[1].c_str()));
        }
        catch (const gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

void del_user(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            client->del_user(atoi(_params[0].c_str()));
        }
        catch (const gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

void add_perm_to_role(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            client->add_role_permission(atoi(_params[0].c_str()), atoi(_params[1].c_str()));
        }
        catch (const gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}
void del_perm_from_role(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            client->del_role_permission(atoi(_params[0].c_str()), atoi(_params[1].c_str()));
        }
        catch (const gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

void add_role(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            rbac_role tmp;
            tmp.role_name = _params[0];
            tmp.read_only = atoi(_params[1].c_str());
            client->add_role(tmp);
        }
        catch (const gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}
void del_role(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(rbac_center);
        THR_CONNECT(rbac_center);
        try
        {
            client->del_role(atoi(_params[0].c_str()));
        }
        catch (const gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

std::unique_ptr<cli::Menu> make_rabc_cli(const std::string &_menu_name)
{
    auto root_menu = std::unique_ptr<cli::Menu>(new cli::Menu(_menu_name));

    root_menu->Insert(CLI_MENU_ITEM(show_users), "查看用户");
    root_menu->Insert(CLI_MENU_ITEM(show_permission), "查看权限");
    root_menu->Insert(CLI_MENU_ITEM(show_roles), "查看角色");
    root_menu->Insert(CLI_MENU_ITEM(add_user), "添加用户", {"用户名", "电话", "密码"});
    root_menu->Insert(CLI_MENU_ITEM(del_user), "删除用户", {"编号"});
    root_menu->Insert(CLI_MENU_ITEM(add_role), "添加角色", {"名称", "是否只读:1->是, 0->否"});
    root_menu->Insert(CLI_MENU_ITEM(del_role), "删除角色", {"编号"});
    root_menu->Insert(CLI_MENU_ITEM(add_user_to_role), "用户添加角色", {"角色编号", "用户编号"});
    root_menu->Insert(CLI_MENU_ITEM(del_user_from_role), "用户取消角色", {"角色编号", "用户编号"});
    root_menu->Insert(CLI_MENU_ITEM(add_perm_to_role), "添加角色权限", {"角色编号", "权限编号"});
    root_menu->Insert(CLI_MENU_ITEM(del_perm_from_role), "取消角色权限", {"角色编号", "权限编号"});

    return root_menu;
}

rbac_cli::rbac_cli() : common_cli(make_rabc_cli("rbac"), "rbac")
{
}

std::string rbac_cli::make_bdr()
{
    return std::string();
}
