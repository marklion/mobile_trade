#include "../driver.h"
#include "common_scale_driver.h"

static std::string g_dev_ip;

class wr_style_scale : public common_scale_driver
{
public:
    using common_scale_driver::common_scale_driver;
    virtual double handle_buff(const std::string &buff)
    {
        double ret = 0;
        if (buff.length() >= 7)
        {
            ret += buff[1] - 48;
            ret += 10 * (buff[2] - 48);
            ret += 100 * (buff[3] - 48);
            ret += 1000 * (buff[4] - 48);
            ret += 10000 * (buff[5] - 48);
            ret += 100000 * (buff[6] - 48);
        }
        ret /= 1000;
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
    auto pd = new wr_style_scale("wr_style_scale_driver" + std::to_string(self_id), self_id, g_dev_ip);
    pd->init_all_set();
    common_driver::start_driver(run_port, pd);

    return 0;
}
