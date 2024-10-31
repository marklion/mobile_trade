#if !defined(_UTILS_H_)
#define _UTILS_H_
#include <string>
#include <vector>
#include <algorithm>
#include <functional>

std::vector<std::string> util_split_string(const std::string &s, const std::string &seperator = ",");
std::string util_join_string(const std::vector<std::string> &_vec, const std::string &_dil = ",");
template <typename ele>
bool util_vector_has(const std::vector<ele> &_vec, const ele &_el)
{
    return std::find(_vec.begin(), _vec.end(), _el) != _vec.end();
}

std::string util_calcu_md5(const std::string &_input);
std::string util_data_hex(const unsigned char *_data, int _length);
std::string util_gen_ssid();
std::string util_double_to_string(double _d);

std::string util_gbk2utf(const std::string &_utf);

std::string util_utf2gbk(const std::string &_gbk);

int util_connect_to_device_tcp_server(const std::string &_ip, unsigned short _port, const std::function<void(const std::string &)> *_log_func = nullptr);

#endif // _UTILS_H_
