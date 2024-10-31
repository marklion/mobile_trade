#include "utils.h"
#include <uuid/uuid.h>
#include <openssl/md5.h>
#include <iconv.h>
#include <string.h>
#include <string>
#include <stdarg.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <unistd.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <errno.h>
#include <malloc.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <sys/ioctl.h>
#include <stdarg.h>
#include <fcntl.h>
#include <sys/time.h>
#include <utime.h>
#include <time.h>
#include <sys/stat.h>
#include <sys/file.h>
#include <map>
#include <sys/epoll.h>
#include <sys/timerfd.h>
#include <list>
#include <iostream>
#include <algorithm>
#include <functional>
#include <memory>
#include <thread>
#include <mqueue.h>
#include <set>

std::vector<std::string> util_split_string(const std::string &s, const std::string &seperator)
{
    std::vector<std::string> result;
    typedef std::string::size_type string_size;
    string_size i = 0;

    while (i != s.size())
    {
        // 找到字符串中首个不等于分隔符的字母；
        int flag = 0;
        while (i != s.size() && flag == 0)
        {
            flag = 1;
            for (string_size x = 0; x < seperator.size(); ++x)
                if (s[i] == seperator[x])
                {
                    ++i;
                    flag = 0;
                    break;
                }
        }

        // 找到又一个分隔符，将两个分隔符之间的字符串取出；
        flag = 0;
        string_size j = i;
        while (j != s.size() && flag == 0)
        {
            for (string_size x = 0; x < seperator.size(); ++x)
                if (s[j] == seperator[x])
                {
                    flag = 1;
                    break;
                }
            if (flag == 0)
                ++j;
        }
        if (i != j)
        {
            result.push_back(s.substr(i, j - i));
            i = j;
        }
    }
    return result;
}

std::string util_join_string(const std::vector<std::string> &_vec, const std::string &_dil)
{
    std::string ret;

    for (const auto &itr : _vec)
    {
        ret += itr + _dil;
    }

    ret = ret.substr(0, ret.length() - _dil.length());

    return ret;
}

std::string util_calcu_md5(const std::string &_input)
{
    MD5_CTX ctx;
    unsigned char dig[16];

    MD5_Init(&ctx);
    MD5_Update(&ctx, _input.data(), _input.length());
    MD5_Final(dig, &ctx);

    return util_data_hex(dig, sizeof(dig));
}

std::string util_data_hex(const unsigned char *_data, int _length)
{
    std::string ret;

    int i = 0;
    while (i < _length)
    {
        char buf[3] = {0};
        snprintf(buf, sizeof(buf), "%02X", (unsigned int)(_data[i]));
        ret += buf;
        i++;
    }

    return ret;
}
std::string util_gen_ssid()
{
    uuid_t out;
    std::string ret;

    uuid_generate(out);
    ret = util_data_hex(out, sizeof(out));

    return ret;
}
std::string util_double_to_string(double _d)
{
    std::string ret;
    char buffer[34] = {0};
    snprintf(buffer, sizeof(buffer), "%.2f", _d);
    ret = buffer;

    return ret;
}
static int code_convert(char *from_charset, char *to_charset, char *inbuf, size_t inlen, char *outbuf, size_t outlen)
{
    iconv_t cd;
    int rc;
    char **pin = &inbuf;
    char **pout = &outbuf;

    cd = iconv_open(to_charset, from_charset);
    if (cd == 0)
        return -1;
    memset(outbuf, 0, outlen);
    if (iconv(cd, pin, &inlen, pout, &outlen) == -1)
        return -1;
    iconv_close(cd);
    return 0;
}
// UNICODE码转为GB2312码
static int u2g(char *inbuf, int inlen, char *outbuf, int outlen)
{
    return code_convert("utf-8", "gb2312", inbuf, inlen, outbuf, outlen);
}
static int g2u(char *inbuf, int inlen, char *outbuf, int outlen)
{
    return code_convert("gb2312", "utf-8", inbuf, inlen, outbuf, outlen);
}
std::string util_gbk2utf(const std::string &_utf)
{
    char in_buff[9600] = {0};
    char out_buff[9600] = {0};
    strcpy(in_buff, _utf.c_str());
    g2u(in_buff, strlen(in_buff), out_buff, sizeof(out_buff));
    return std::string(out_buff);
}
std::string util_utf2gbk(const std::string &_gbk)
{
    char in_buff[9600] = {0};
    char out_buff[9600] = {0};
    strcpy(in_buff, _gbk.c_str());
    u2g(in_buff, strlen(in_buff), out_buff, sizeof(out_buff));
    return std::string(out_buff);
}
int util_connect_to_device_tcp_server(const std::string &_ip, unsigned short _port, const std::function<void(const std::string &)> *_log_func)
{
    int ret = -1;
    sockaddr_in server_addr = {
        .sin_family = AF_INET,
        .sin_port = htons(_port),
        .sin_addr = {.s_addr = inet_addr(_ip.c_str())},
    };
    auto socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_fd >= 0)
    {
        if (0 == connect(socket_fd, (sockaddr *)&server_addr, sizeof(server_addr)))
        {
            ret = socket_fd;
        }
        else
        {
            if (_log_func)
            {
                (*_log_func)("failed to connect server");
            }
            else
            {
                perror("failed to connect server");
            }
            close(socket_fd);
        }
    }
    else
    {
        if (_log_func)
        {
            (*_log_func)("failed to open socket fd");
        }
        else
        {
            perror("failed to open socket fd");
        }
    }
    return ret;
}