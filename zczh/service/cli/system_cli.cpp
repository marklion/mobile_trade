#include "system_cli.h"
static void bdr(std::ostream &out, std::vector<std::string> _params)
{
    system_cli tmp;
    out << tmp.make_bdr() << std::endl;
}
void download_package(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        std::string cmd = "wget -O /tmp/install.sh '" + _params[0] + "' && chmod +x /tmp/install.sh";
        auto pfile = popen(cmd.c_str(), "r");
        if (pfile)
        {
            char buf[1024];
            while (fgets(buf, sizeof(buf), pfile))
            {
                out << buf;
            }
            pclose(pfile);
        }
    }
}
void update(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 0)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        std::string cmd = "cp /tmp/install.sh /root/install.sh";
        system(cmd.c_str());
        out << "已完成，重启后生效,是否重启？Yes(y) or No(n)" << std::endl;
        std::string fb;
        std::cin >> fb;
        if (fb == "y" || fb == "Y")
        {
            THR_CALL_BEGIN(config_management);
            client->reboot_system();
            THR_CALL_END();
        }
    }
}
void version(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 0)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        auto fversion = fopen("/conf/version.txt", "r");
        if (fversion)
        {
            char buffer[1024];
            while (fgets(buffer, sizeof(buffer), fversion))
            {
                out << buffer;
            }
            fclose(fversion);
        }
    }
}
std::unique_ptr<cli::Menu> make_system_cli(const std::string &_menu_name)
{
    auto root_menu = std::unique_ptr<cli::Menu>(new cli::Menu(_menu_name));

    root_menu->Insert(CLI_MENU_ITEM(bdr), "列出配置");
    root_menu->Insert(CLI_MENU_ITEM(download_package), "下载更新包", {"更新包下载地址"});
    root_menu->Insert(CLI_MENU_ITEM(update), "更新");
    root_menu->Insert(CLI_MENU_ITEM(version), "显示当前版本");

    return root_menu;
}
system_cli::system_cli() : common_cli(make_system_cli("system"), "system")
{
}

std::string system_cli::make_bdr()
{
    return std::string();
}
