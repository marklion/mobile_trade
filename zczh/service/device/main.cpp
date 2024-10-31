#include "../../base/include.h"
#include "../lib/rpc_include.h"

#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>


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
    auto hdl = std::shared_ptr<device_management_handler>(new device_management_handler());
    multi_processor->registerProcessor("device_management", std::shared_ptr<TProcessor>(new device_managementProcessor(hdl)));

    ::std::shared_ptr<TServerTransport> serverTransport(new TServerSocket(8124));
    ::std::shared_ptr<TTransportFactory> transportFactory(new THttpServerTransportFactory());
    ::std::shared_ptr<TProtocolFactory> protocolFactory(new TJSONProtocolFactory());
    std::shared_ptr<ThreadManager> threadManager = ThreadManager::newSimpleThreadManager(16);
    std::shared_ptr<ThreadFactory> threadFactory(new ThreadFactory());
    threadManager->threadFactory(threadFactory);
    threadManager->start();
    TThreadPoolServer tp_server(multi_processor, serverTransport, transportFactory, protocolFactory, threadManager);

    timer_wheel_add_node(8, [&](void *){
        hdl->walk_zombie_process();
    });

    tp_server.serve();
    timer_wheel_fini();

    return 0;
}