#include "../driver.h"
#include "common_scale_driver.h"

static std::string g_dev_ip;

class tld_style_scale : public common_scale_driver
{
public:
    using common_scale_driver::common_scale_driver;
    virtual double handle_buff(const std::string &_frame)
    {
        double ret = 0;
        if (_frame.length() >= 18)
        {
            int dot_pos = _frame[1] & 0x07;
            int pow_number = 2 - dot_pos;
            if (pow_number > 0)
            {
                pow_number = 0;
            }
            for (auto i = 0; i < 6; i++)
            {
                auto tmp_number = _frame[4 + i];
                if (tmp_number >= '0' && tmp_number <= '9')
                {
                    tmp_number = tmp_number - '0';
                }
                else
                {
                    tmp_number = 0;
                }
                ret += tmp_number * pow(10, 5 + pow_number - i);
            }
        }
        return ret / 1000;
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
    auto pd = new tld_style_scale("tld_style_scale_driver" + std::to_string(self_id), self_id, g_dev_ip);
    pd->init_all_set();
    common_driver::start_driver(run_port, pd);

    return 0;
}
