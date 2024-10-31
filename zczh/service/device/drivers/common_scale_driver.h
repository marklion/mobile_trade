#if !defined(_COMMON_SCALE_DRIVER_H)
#define _COMMON_SCALE_DRIVER_H

#include "../driver.h"
class common_scale_driver : public common_driver
{
    double weight = 0;
    std::string dev_ip;
    tdf_log m_log;

public:
    common_scale_driver(const std::string &name, const int64_t id, const std::string &_ip)
        : common_driver(name, id), dev_ip(_ip), m_log("common_scale_driver", "/tmp/common_scale_driver.log", "/tmp/common_scale_driver.log")
    {
        timer_wheel_init();
    }
    virtual ~common_scale_driver()
    {
        timer_wheel_fini();
    }
    virtual double handle_buff(const std::string &buff) = 0;
    virtual void init_all_set()
    {
        std::thread([&]()
                    {
            while (true)
            {
                std::function<void (const std::string &)> log_func = [&](const std::string &_msg){
                    m_log.err(_msg);
                };
                auto fd = util_connect_to_device_tcp_server(dev_ip, 30201, &log_func);
                if (fd >= 0)
                {
                    char buff[1024] = {0};
                    while (true)
                    {
                        auto ret = read(fd, buff, sizeof(buff));
                        if (ret > 0)
                        {
                            weight = handle_buff(std::string(buff, ret));
                        }
                        else
                        {
                            break;
                        }
                    }
                    close(fd);
                }
                else
                {
                    std::this_thread::sleep_for(std::chrono::seconds(5));
                }
            } })
            .detach();
        std::thread(
            []()
            {
                while (1)
                {
                    timer_wheel_schc();
                }
            })
            .detach();
        timer_wheel_add_node(
            3,
            [&](void *)
            {
                if (weight > 0)
                {
                    THR_CALL_DM_BEGIN();
                    client->push_scale_read(self_dev_id, weight);
                    THR_CALL_DM_END();
                }
            });
        timer_wheel_add_node(3, [this](void *)
                             {
            std::string command = "ping -c 1 " + dev_ip;
            int result = std::system(command.c_str());
            if (result != 0)
            {
                log_driver(__FUNCTION__, "failed to ping scale");
                exit_driver("failed to ping scale");
            } });
    }

    virtual double last_scale_read(const int64_t scale_id)
    {
        return weight;
    }
};

#endif // _COMMON_SCALE_DRIVER_H
