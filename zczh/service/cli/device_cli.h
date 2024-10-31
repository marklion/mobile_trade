#if !defined(_DEVICE_CLI_H_)
#define _DEVICE_CLI_H_


#include "../lib/rpc_include.h"
#include "common_cli.h"

class device_cli:public common_cli{
public:
    device_cli();
    virtual std::string make_bdr();
};

#endif // _DEVICE_CLI_H_
