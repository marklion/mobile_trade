#if !defined(_RPC_INCLUDE_H_)
#define _RPC_INCLUDE_H_

#include <stdio.h>
#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/concurrency/ThreadFactory.h>
#include <thrift/server/TSimpleServer.h>
#include <thrift/transport/TServerSocket.h>
#include <thrift/transport/TNonblockingServerSocket.h>
#include <thrift/transport/TBufferTransports.h>
#include <thrift/transport/THttpServer.h>
#include <thrift/processor/TMultiplexedProcessor.h>
#include <thrift/server/TNonblockingServer.h>
#include <thrift/server/TThreadPoolServer.h>
#include <thrift/concurrency/ThreadManager.h>
#include <thrift/transport/THttpClient.h>
#include <thrift/protocol/TJSONProtocol.h>
#include <thrift/protocol/TMultiplexedProtocol.h>
#include "config_management_imp.h"
#include "rbac_center_imp.h"
#include "device_management_imp.h"
#include "order_center_imp.h"

#define ZH_RETURN_MSG(_msg) \
    do                      \
    {                       \
        gen_exp e;          \
        e.msg = _msg;       \
        throw e;            \
    } while (0)
#define ZH_RETURN_UNLOGIN_MSG() ZH_RETURN_MSG("用户未登录")
#define ZH_RETURN_DUP_USER_MSG() ZH_RETURN_MSG("用户已存在")
#define ZH_RETURN_NO_PRAVILIGE() ZH_RETURN_MSG("无权限")
#define ZH_RETURN_NEED_PRAVILIGE(_need_target)                                              \
    do                                                                                      \
    {                                                                                       \
        ZH_RETURN_MSG("无权限，需要" + g_permisson_description_map[_need_target] + "权限"); \
    } while (0)
#define ZH_RETURN_DUP_CONTRACT() ZH_RETURN_MSG("合同已存在")
#define ZH_RETURN_NO_CONTRACT() ZH_RETURN_MSG("合同不存在")
#define ZH_RETURN_DUP_STUFF() ZH_RETURN_MSG("物料已存在")
#define ZH_RETURN_NO_STUFF() ZH_RETURN_MSG("物料不存在")
#define ZH_RETURN_DUP_VEHICLE() ZH_RETURN_MSG("车辆已存在")
#define ZH_RETURN_DUP_DRIVER() ZH_RETURN_MSG("司机重复绑定")
#define ZH_RETURN_NO_VEHICLE() ZH_RETURN_MSG("车辆不存在")
#define ZH_RETURN_DUP_ORDER() ZH_RETURN_MSG("派车内容已存在")
#define ZH_RETURN_NO_ORDER() ZH_RETURN_MSG("派车单不存在")
#define ZH_RETURN_ORDER_CANNOT_CANCEL(x) ZH_RETURN_MSG(x + " 无法取消")

using namespace ::apache::thrift;
using namespace ::apache::thrift::protocol;
using namespace ::apache::thrift::transport;
using namespace ::apache::thrift::server;

#define THR_DEF_CIENT(x) x##Client *client = nullptr
#define THR_CONNECT_DEV(x, y)                                                         \
    std::shared_ptr<TSocket> th_socket(new TSocket("localhost", y));                  \
    th_socket->setRecvTimeout(8000);                                                  \
    std::shared_ptr<TTransport> transport(new THttpClient(th_socket, "/zh_rpc"));     \
    std::shared_ptr<TProtocol> protocol(new TJSONProtocol(transport));                \
    transport->open();                                                                \
    std::shared_ptr<TMultiplexedProtocol> mp(new TMultiplexedProtocol(protocol, #x)); \
    client = new x##Client(mp)
#define THR_CONNECT(x) THR_CONNECT_DEV(x, 8123);
#define THR_CONNECT_DM(x) THR_CONNECT_DEV(x, 8124)
#define TRH_CLOSE()     \
    transport->close(); \
    delete client

#define THR_CALL_DM_BEGIN_DEV(x)               \
    do                                         \
    {                                          \
        THR_DEF_CIENT(device_management);      \
        THR_CONNECT_DEV(device_management, x); \
        try                                    \
        {
#define THR_CALL_DM_END() \
    }                     \
    catch (...) {}        \
    TRH_CLOSE();          \
    }                     \
    while (0)

#define THR_CALL_DM_BEGIN() THR_CALL_DM_BEGIN_DEV(8124)

#define THR_CALL_BEGIN(x) \
    do                    \
    {                     \
        THR_DEF_CIENT(x); \
        THR_CONNECT(x)    \
        try               \
        {
#define THR_CALL_END() \
    }                  \
    catch (...) {}     \
    TRH_CLOSE();       \
    }                  \
    while (0)

#define CLI_MENU_ITEM(x) #x, [](std::ostream &out, std::vector<std::string> _params) { x(out, _params); }
#endif // _RPC_INCLUDE_H_
