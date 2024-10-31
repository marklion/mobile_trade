#include "zh_vcom_link.h"
#include "../log_driver/log_driver.h"
#include <thread>
#include <sys/select.h>

static tdf_log g_log("vcom", "/tmp/vcom.log", "/tmp/vcom.log");

zh_vcom_link::zh_vcom_link(const std::string &_ip, unsigned short _port) : ip(_ip), port(_port)
{
    pipe(pipe_fd);
}
std::string zh_vcom_link::get_pts()
{
    if (this->pts_name.length() <= 0)
    {
        std::string tmp_pts;
        int fd = open("/dev/ptmx", O_RDWR | O_NONBLOCK);
        if (fd >= 0)
        {
            if (0 == grantpt(fd))
            {
                if (0 == unlockpt(fd))
                {
                    char buf[128];
                    if (0 == ptsname_r(fd, buf, sizeof(buf)))
                    {
                        tmp_pts = buf;
                    }
                    else
                    {
                        g_log.err("ptsname failed: %s", strerror(errno));
                    }
                }
                else
                {
                    g_log.err("unlockpt failed: %s", strerror(errno));
                }
            }
            else
            {
                g_log.err("grantpt failed: %s", strerror(errno));
            }
            ptm_fd = fd;
        }
        else
        {
            g_log.err("open ptmx failed: %s", strerror(errno));
        }
        if (tmp_pts.length() > 0)
        {
            int sk_fd = socket(AF_INET, SOCK_STREAM, 0);
            if (sk_fd >= 0)
            {
                socket_fd = sk_fd;
                sockaddr_in addr;
                addr.sin_family = AF_INET;
                addr.sin_port = htons(port);
                addr.sin_addr.s_addr = inet_addr(ip.c_str());
                if (0 == connect(sk_fd, (sockaddr *)(&addr), sizeof(addr)))
                {
                    work = new std::thread(
                        [this]()
                        {
                            fd_set set;
                            fd_set err_set;
                            while (1)
                            {
                                FD_ZERO(&set);
                                FD_SET(pipe_fd[0], &set);
                                auto max_fd_number = pipe_fd[0];
                                FD_SET(socket_fd, &set);
                                if (socket_fd > max_fd_number)
                                {
                                    max_fd_number = socket_fd;
                                }
                                if (ptm_fd >= 0)
                                {
                                    FD_SET(ptm_fd, &set);
                                    if (ptm_fd > max_fd_number)
                                    {
                                        max_fd_number = ptm_fd;
                                    }
                                }
                                FD_ZERO(&err_set);
                                FD_SET(pipe_fd[0], &err_set);
                                FD_SET(socket_fd, &err_set);
                                if (ptm_fd >= 0)
                                {
                                    FD_SET(ptm_fd, &err_set);
                                }
                                if (0 < select(max_fd_number + 1, &set, NULL, &err_set, NULL))
                                {
                                    if (FD_ISSET(socket_fd, &set))
                                    {
                                        usleep(100000);
                                        char tmp[4096];
                                        int read_len = 0;
                                        read_len = recv(socket_fd, &tmp, sizeof(tmp), MSG_DONTWAIT);
                                        if (read_len <= 0)
                                        {
                                            close(ptm_fd);
                                            ptm_fd = -1;
                                            return;
                                        }
                                        else
                                        {
                                            write(ptm_fd, tmp, read_len);
                                        }
                                    }
                                    if (FD_ISSET(ptm_fd, &set))
                                    {
                                        char tmp[4096];
                                        int read_len = read(ptm_fd, tmp, sizeof(tmp));
                                        if (read_len > 0)
                                        {
                                            send(socket_fd, tmp, read_len, 0);
                                        }
                                        else
                                        {
                                            close(ptm_fd);
                                            ptm_fd = -1;
                                            return;
                                        }
                                    }
                                    if (FD_ISSET(pipe_fd[0], &set))
                                    {
                                        return;
                                    }
                                    if (FD_ISSET(ptm_fd, &err_set) || FD_ISSET(socket_fd, &err_set) || FD_ISSET(pipe_fd[0], &err_set))
                                    {
                                        close(ptm_fd);
                                        ptm_fd = -1;
                                    }
                                }
                                else
                                {
                                    close(ptm_fd);
                                    ptm_fd = -1;
                                }
                            }
                        });
                    pts_name = tmp_pts;
                }
                else
                {
                    g_log.err("connect failed: %s", strerror(errno));
                    close(ptm_fd);
                }
            }
            else
            {
                g_log.err("open socket failed: %s", strerror(errno));
                close(ptm_fd);
            }
        }
    }

    return pts_name;
}
zh_vcom_link::~zh_vcom_link()
{
    if (work)
    {
        write(pipe_fd[1], "c", 1);
        work->join();
        delete work;
    }
    if (socket_fd != -1)
    {
        close(socket_fd);
    }
    if (ptm_fd != -1)
    {
        close(ptm_fd);
    }
    if (pipe_fd[0] >= 0)
    {
        close(pipe_fd[0]);
    }
    if (pipe_fd[1] >= 0)
    {
        close(pipe_fd[1]);
    }
}

bool zh_vcom_link::proc_modbus(int _address, std::function<bool(modbus_t *, void *)> _handler, void *_private)
{
    bool ret = false;

    auto mctx = modbus_new_rtu(get_pts().c_str(), 19200, 'E', 8, 1);
    if (mctx)
    {
        if (0 == modbus_set_slave(mctx, _address))
        {
            unsigned int sec;
            unsigned int usec;
            if (0 == modbus_get_response_timeout(mctx, &sec, &usec))
            {
                sec = 0;
                usec = 700000;
                if (0 == modbus_set_response_timeout(mctx, sec, usec))
                {
                }
            }
            if (0 == modbus_connect(mctx))
            {
                ret = _handler(mctx, _private);
                modbus_close(mctx);
            }
            else
            {
                g_log.err("fail to connect modbus_slaver:%s", modbus_strerror(errno));
            }
        }
        else
        {
            g_log.err("fail to set_slave :%s", modbus_strerror(errno));
        }

        modbus_free(mctx);
    }
    else
    {
        g_log.err("fail to open modbus:%s", modbus_strerror(errno));
    }

    return ret;
}