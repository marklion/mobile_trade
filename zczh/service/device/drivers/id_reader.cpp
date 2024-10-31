#include "../driver.h"
extern "C"
{
#include "libtermb.h"
}

std::string g_dev_ip;
zh_vcom_link *com_inter = nullptr;
static std::string read_id()
{
    std::string ret;
    char szWlt[2048] = {0};
    char szTxt_GB2312[500] = {0x00};
    char szTxt_UTF[1024] = {0x00};
    char szBmp[38862] = {0x00};
    char sam_id[64] = {0};
    if (1 == GetSamdId(sam_id))
    {
        if (0 != FindCardCmd())
        {
            if (0 != SelCardCmd())
            {
                if (1 == ReadCard(szTxt_GB2312, szWlt, szBmp))
                {
                    ret = util_gbk2utf(szTxt_GB2312);
                }
            }
        }
    }

    auto all_info = util_split_string(ret, "|");
    if (all_info.size() > 5)
    {
        ret = all_info[5];
        if (ret.length() > 0 && ret[ret.length() - 1] == 'X')
        {
            ret[ret.length() - 1] = 'x';
        }
    }

    return ret;
}
class id_reader_driver : public common_driver
{
public:
    std::string last_id;
    using common_driver::common_driver;

    virtual void init_all_set()
    {
        if (1 != InitComm(com_inter->get_pts().c_str()))
        {
            log_driver(__FUNCTION__, "failed to init id reader");
            exit_driver("failed to init id reader");
        }
        timer_wheel_add_node(
            2,
            [this](void *)
            {
                auto id = read_id();
                if (id.length() > 0)
                {
                    THR_CALL_DM_BEGIN();
                    client->push_id_read(self_dev_id, id);
                    THR_CALL_DM_END();
                    last_id = id;
                }
            });
        timer_wheel_add_node(3, [this](void *)
                             {
            std::string command = "ping -c 1 " + g_dev_ip;
            int result = std::system(command.c_str());
            if (result != 0)
            {
                log_driver(__FUNCTION__, "failed to ping id reader");
                exit_driver("failed to ping id reader");
            } });
    }
    virtual void last_id_read(std::string &_return, const int64_t id_reader_id)
    {
        _return = last_id;
    }
};

int main(int argc, char **argv)
{
    timer_wheel_init();
    std::thread([]()
                {
        while (1)
        {
        timer_wheel_schc();
        } })
        .detach();
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
    com_inter = new zh_vcom_link(g_dev_ip, 30202);
    auto pd = new id_reader_driver("id_reader_driver" + std::to_string(self_id), self_id);
    pd->init_all_set();
    common_driver::start_driver(run_port, pd);
    timer_wheel_fini();
    return 0;
}
