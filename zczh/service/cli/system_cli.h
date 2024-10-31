#if !defined(_SYSTEM_CLI_H_)
#define _SYSTEM_CLI_H_

#include "../lib/rpc_include.h"
#include "common_cli.h"

class system_cli:public common_cli{
public:
    system_cli();
    virtual std::string make_bdr();
};



#endif // _SYSTEM_CLI_H_
