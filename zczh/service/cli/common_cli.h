#if !defined(_COMMON_CLI_H_)
#define _COMMON_CLI_H_

#include "../lib/rpc_include.h"
class common_cli {
public:
    std::unique_ptr<cli::Menu> menu;
    std::string menu_name;
    common_cli(std::unique_ptr<cli::Menu> _menu, const std::string &_menu_name):menu(_menu.release()),menu_name(_menu_name) {
    }
    virtual std::string make_bdr() = 0;
};

#endif // _COMMON_CLI_H_
