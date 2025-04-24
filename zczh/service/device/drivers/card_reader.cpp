#include "../driver.h"
#include <fstream>
#include <fcntl.h>
std::string g_dev_ip;
zh_vcom_link *com_inter = nullptr;

std::string read_line_from_file(int fd)
{
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
                return "";
            }
            else
            {
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
            for (ssize_t i = 1; i < bytesRead; ++i)
            {
                if (buffer[i] == '\r')
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
    return line.substr(1);
}
class card_reader_driver : public common_driver
{
public:
    std::string last_card_no_read;
    using common_driver::common_driver;
    int m_sel_fd = -1;
    virtual void init_all_set()
    {
        std::function<void(const std::string &)> log_func = [&](const std::string &_msg)
        {
            m_log.err(_msg);
        };
        auto fd = util_connect_to_device_tcp_server(g_dev_ip, 30204, &log_func);
        if (fd >= 0)
        {
            m_sel_fd = fd;
            int flags = fcntl(m_sel_fd, F_GETFL, 0);
            if (flags == -1)
            {
                perror("fcntl(F_GETFL) failed");
                return;
            }

            // 添加非阻塞标志
            if (fcntl(m_sel_fd, F_SETFL, flags | O_NONBLOCK) == -1)
            {
                perror("fcntl(F_SETFL) failed");
                return;
            }
        }
        timer_wheel_add_node(
            2,
            [this](void *)
            {
                std::string card_no;
                try
                {
                    card_no = read_line_from_file(m_sel_fd);
                    // 去除掉card_no前的若干0字符
                    card_no.erase(0, card_no.find_first_not_of('0'));
                    m_log.log("read card no: %s", card_no.c_str());
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

    virtual void clear_card_no(const int64_t card_reader_id) {
        last_card_no_read = "";
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
    auto pd = new card_reader_driver("card_reader_driver" + std::to_string(self_id), self_id);
    pd->init_all_set();
    common_driver::start_driver(run_port, pd);
    timer_wheel_fini();
    return 0;
}
