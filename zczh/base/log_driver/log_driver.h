#if !defined(_LOG_DRIVER_H_)
#define _LOG_DRIVER_H_




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
static int is_leap_year(time_t year)
{
    if (year % 4)
        return 0; /* A year not divisible by 4 is not leap. */
    else if (year % 100)
        return 1; /* If div by 4 and not 100 is surely leap. */
    else if (year % 400)
        return 0; /* If div by 100 *and* 400 is not leap. */
    else
        return 1; /* If div by 100 and not by 400 is leap. */
}

static void nolocks_localtime(struct tm *tmp, time_t t)
{
    const time_t secs_min = 60;
    const time_t secs_hour = 3600;
    const time_t secs_day = 3600 * 24;

    t -= timezone;                       /* Adjust for timezone. */
    time_t days = t / secs_day;    /* Days passed since epoch. */
    time_t seconds = t % secs_day; /* Remaining seconds. */

    tmp->tm_isdst = 0;
    tmp->tm_hour = seconds / secs_hour;
    tmp->tm_min = (seconds % secs_hour) / secs_min;
    tmp->tm_sec = (seconds % secs_hour) % secs_min;

    /* 1/1/1970 was a Thursday, that is, day 4 from the POV of the tm structure
     * where sunday = 0, so to calculate the day of the week we have to add 4
     * and take the modulo by 7. */
    tmp->tm_wday = (days + 4) % 7;

    /* Calculate the current year. */
    tmp->tm_year = 1970;
    while (1)
    {
        /* Leap years have one day more. */
        time_t days_this_year = 365 + is_leap_year(tmp->tm_year);
        if (days_this_year > days)
            break;
        days -= days_this_year;
        tmp->tm_year++;
    }
    tmp->tm_yday = days; /* Number of day of the current year. */
    /* We need to calculate in which month and day of the month we are. To do
     * so we need to skip days according to how many days there are in each
     * month, and adjust for the leap year that has one more day in February. */
    int mdays[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    mdays[1] += is_leap_year(tmp->tm_year);

    tmp->tm_mon = 0;
    while (days >= mdays[tmp->tm_mon])
    {
        days -= mdays[tmp->tm_mon];
        tmp->tm_mon++;
    }

    tmp->tm_mday = days + 1; /* Add 1 since our 'days' is zero-based. */
    tmp->tm_year -= 1900;    /* Surprisingly tm_year is year-1900. */
}

std::string get_string_from_format(const char *format, va_list vl);
class tdf_log
{
    int m_log_stdout = 1;
    int m_log_stderr = 2;
    std::string m_module;
    void output_2_fd(const std::string &_msg, int _fd) const
    {
        std::string output;
        char time_buffer[64] = {0};

        timeval usec_time;
        gettimeofday(&usec_time, nullptr);
        auto msec_time = usec_time.tv_usec / 1000;

        tm tmp_tm;
        nolocks_localtime(&tmp_tm, usec_time.tv_sec);
        strftime(time_buffer, 48, "%Y/%m/%d %H:%M:%S", &tmp_tm);
        char m_sec_string[4] = {0};
        snprintf(m_sec_string, sizeof(m_sec_string), "%03ld", msec_time);

        output.append(time_buffer);
        output.append(":" + std::string(m_sec_string));

        if (m_module.length() != 0)
        {
            output.append(std::string(" [") + m_module + "]");
        }

        if (m_log_stderr == _fd)
        {
            output.append(" [ERR] ");
        }
        else
        {
            output.append(" [INFO] ");
        }
        std::string prefix = output;
        output = "";

        std::string content = _msg;
        auto n_pos = content.find('\n');
        while (n_pos != std::string::npos)
        {
            output.append(prefix + content.substr(0, n_pos) + "\n");
            content.erase(0, n_pos + 1);
            n_pos = content.find('\n');
        }
        if (content.length() > 0)
        {
            output.append(prefix + content + "\n");
        }

        (void)write(_fd, output.c_str(), output.length());
    }

public:
    tdf_log() {}
    tdf_log(const std::string _module, const std::string &_out_file_name, const std::string &_err_file_name)
    {
        if (_out_file_name.length() > 0)
        {
            m_log_stdout = open(_out_file_name.c_str(), O_WRONLY | O_APPEND | O_CREAT, 0664);
        }
        if (_err_file_name.length() > 0)
        {
            m_log_stderr = open(_err_file_name.c_str(), O_WRONLY | O_APPEND | O_CREAT, 0664);
        }
        if (m_log_stderr * m_log_stdout < 0)
        {
            std::cout << "open log file error" << std::endl;
        }
        m_module = _module;
    }
    tdf_log(const std::string &_module)
    {
        m_module = _module;
    }
    ~tdf_log()
    {
        if (m_log_stdout != 1)
        {
            close(m_log_stdout);
        }
        if (m_log_stderr != 2)
        {
            close(m_log_stderr);
        }
    }
    std::string get_string_from_format(const char *format, va_list vl_orig) const
    {
        std::string ret;
        va_list vl;
        va_copy(vl, vl_orig);

        auto vl_len = vsnprintf(nullptr, 0, format, vl) + 1;
        va_end(vl);
        char *tmpbuff = (char *)calloc(1UL, vl_len);
        if (tmpbuff)
        {
            vsnprintf(tmpbuff, vl_len, format, vl_orig);
            ret.assign(tmpbuff);
            free(tmpbuff);
        }

        return ret;
    }
    void log(const std::string &_log) const
    {
        output_2_fd(_log, m_log_stdout);
    }
    void log(const char *_log, ...) const
    {
        va_list vl;
        va_start(vl, _log);
        auto tmpbuff = get_string_from_format(_log, vl);
        va_end(vl);
        output_2_fd(tmpbuff, m_log_stdout);
    }
    void log_package(const char *_data, int _len) const
    {
        char tmp[4] = {0};
        std::string out_log;
        for (int i = 0; i < _len; i++)
        {
            sprintf(tmp, "%02X ", (unsigned char)(_data[i]));
            out_log.append(tmp);
        }
        output_2_fd(out_log, m_log_stdout);
    }
    void err(const std::string &_log) const
    {
        output_2_fd(_log, m_log_stderr);
    }
    void err(const char *_log, ...) const
    {
        va_list vl;
        va_start(vl, _log);
        auto tmpbuff = get_string_from_format(_log, vl);
        va_end(vl);
        output_2_fd(tmpbuff, m_log_stderr);
    }
};
#endif // _LOG_DRIVER_H_