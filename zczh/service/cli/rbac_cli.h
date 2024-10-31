#if !defined(_RBAC_CLI_H)
#define _RBAC_CLI_H

#include "../lib/rpc_include.h"
#include "common_cli.h"
class rbac_cli:public common_cli{
public:
    rbac_cli();
    virtual std::string make_bdr();
};

#endif // _RBAC_CLI_H