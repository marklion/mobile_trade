#include "../driver.h"
#include <fstream>
std::string g_dev_ip;
zh_vcom_link *com_inter = nullptr;

std::string read_line_from_file(const std::string &_file_name)
{
    int fd = open(_file_name.c_str(), O_RDONLY | O_NONBLOCK);
    if (fd == -1)
    {
        throw std::runtime_error("Failed to open file descriptor");
    }

    std::string line;
    char buffer[256];
    ssize_t bytesRead;
    bool endOfLine = false;

    while (!endOfLine)
    {
        bytesRead = read(fd, buffer, sizeof(buffer) - 1);
        if (bytesRead == -1)
        {
            if (errno == EAGAIN || errno == EWOULDBLOCK)
            {
                // 非阻塞模式下没有数据可读，返回空字符串
                close(fd);
                return "";
            }
            else
            {
                close(fd);
                throw std::runtime_error("Failed to read from file descriptor");
            }
        }
        else if (bytesRead == 0)
        {
            // 文件结束
            break;
        }
        else
        {
            buffer[bytesRead] = '\0';
            for (ssize_t i = 0; i < bytesRead; ++i)
            {
                if (buffer[i] == '\n')
                {
                    endOfLine = true;
                    line.append(buffer, i);
                    break;
                }
            }
            if (!endOfLine)
            {
                line.append(buffer, bytesRead);
            }
        }
    }

    close(fd);
    return line;
}
class card_reader_driver : public common_driver
{
public:
    std::string last_card_no_read;
    using common_driver::common_driver;

    virtual void init_all_set()
    {
        timer_wheel_add_node(
            2,
            [this](void *)
            {
                std::string card_no;
                try
                {
                    card_no = read_line_from_file(com_inter->get_pts());
                }
                catch (const std::runtime_error &e)
                {
                    log_driver(__FUNCTION__, e.what());
                    exit_driver(e.what());
                }
                if (card_no != "" && card_no != last_card_no_read)
                {
                    last_card_no_read = card_no;
                }
            });
        timer_wheel_add_node(
            3,
            [this](void *)
            {
                std::string command = "ping -c 1 " + g_dev_ip;
                int result = std::system(command.c_str());
                if (result != 0)
                {
                    log_driver(__FUNCTION__, "failed to ping card reader");
                    exit_driver("failed to ping id reader");
                }
            });
    }
    virtual void last_card_no(std::string &_return, const int64_t id_reader_id)
    {
        if (!last_card_no_read.empty())
        {
            _return = last_card_no_read;
            last_card_no_read = "";
        }
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
    com_inter = new zh_vcom_link(g_dev_ip, 30204);
    auto pd = new card_reader_driver("card_reader_driver" + std::to_string(self_id), self_id);
    pd->init_all_set();
    common_driver::start_driver(run_port, pd);
    timer_wheel_fini();
    return 0;
}
