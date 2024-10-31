#if !defined(_RULE_CLI_H_)
#define _RULE_CLI_H_
#include "../lib/rpc_include.h"
#include "common_cli.h"

class rule_cli:public common_cli{
public:
    rule_cli();
    virtual std::string make_bdr();
};


#endif // _RULE_CLI_H_
