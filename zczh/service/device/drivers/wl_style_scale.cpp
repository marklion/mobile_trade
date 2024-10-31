#include "../driver.h"
#include "common_scale_driver.h"

static std::string g_dev_ip;

class wl_style_scale : public common_scale_driver
{
public:
    using common_scale_driver::common_scale_driver;
    virtual double handle_buff(const std::string &_frame)
    {
        double ret = 0;
        if (_frame.length() >= 12)
        {
            auto sign_flag = _frame[1];

            for (auto i = 0; i < 6; i++)
            {
                auto dig = _frame[2 + i];
                ret += (dig - '0') * pow(10, (5 - i));
            }
            for (auto i = 0; i < (_frame[8] - '0'); i++)
            {
                ret /= 10;
            }

            if (sign_flag == '-')
            {
                ret = 0 - ret;
            }
        }
        return ret;
    }
};

int main(int argc, char **argv)
{
    using namespace clipp;
    unsigned short run_port = 0;
    unsigned short self_id;
    auto cli = (required("-p") & value("port", run_port),
                required("-i") & value("self_id", self_id),
                required("-a") & value("device_ip", g_dev_ip));
    if (!parse(argc, argv, cli))
    {
        std::cerr << "Usage:\n"
                  << usage_lines(cli, argv[0])
                  << '\n';
        return -1;
    }
    auto pd = new wl_style_scale("wl_style_scale_driver" + std::to_string(self_id), self_id, g_dev_ip);
    pd->init_all_set();
    common_driver::start_driver(run_port, pd);

    return 0;
}
