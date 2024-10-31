#include "../../base/include.h"
#include "../lib/rpc_include.h"

int main(int argc, char const *argv[])
{
    timer_wheel_init();
    std::thread([]()
                {
        while (1)
        {
        timer_wheel_schc();
        } })
        .detach();
    std::shared_ptr<TMultiplexedProcessor> multi_processor(new TMultiplexedProcessor());
    multi_processor->registerProcessor("config_management", std::shared_ptr<TProcessor>(new config_managementProcessor(std::shared_ptr<config_management_handler>(new config_management_handler()))));
    multi_processor->registerProcessor("rbac_center", std::shared_ptr<TProcessor>(new rbac_centerProcessor(std::shared_ptr<rbac_center_handler>(new rbac_center_handler()))));
    multi_processor->registerProcessor("order_center", std::shared_ptr<TProcessor>(new order_centerProcessor(std::shared_ptr<order_center_handler>(new order_center_handler()))));

    ::std::shared_ptr<TServerTransport> serverTransport(new TServerSocket(8123));
    ::std::shared_ptr<TTransportFactory> transportFactory(new THttpServerTransportFactory());
    ::std::shared_ptr<TProtocolFactory> protocolFactory(new TJSONProtocolFactory());
    std::shared_ptr<ThreadManager> threadManager = ThreadManager::newSimpleThreadManager(16);
    std::shared_ptr<ThreadFactory> threadFactory(new ThreadFactory());
    threadManager->threadFactory(threadFactory);
    threadManager->start();
    TThreadPoolServer tp_server(multi_processor, serverTransport, transportFactory, protocolFactory, threadManager);
    tp_server.serve();
    timer_wheel_fini();
    return 0;
}
