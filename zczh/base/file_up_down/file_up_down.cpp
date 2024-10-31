#include "file_up_down.h"
#include "../db_orm/zh_db_config.h"
#include "../utils/utils.h"
#include "../utils/tdf_timer.h"

void check_need_delete()
{
    auto last_exist_date = time(nullptr) - 15 * 24*3600;
    auto expect_date = util_get_timestring(last_exist_date);
    auto all_fs = sqlite_orm::search_record_all<sql_file_store>("upload_date != '' AND datetime(upload_date) < datetime('%s')", expect_date.c_str());
    for (auto &itr:all_fs)
    {
        file_delete(itr.file_path);
    }
}

std::string file_store_content(const std::string &_content, const std::string &_ext_name, bool is_tmp)
{
    std::string ret;
    auto file_name = util_gen_ssid() + "." + _ext_name;
    int fd = open(("/database/files/" + file_name).c_str(), O_CREAT|O_WRONLY, S_IRUSR|S_IWUSR|S_IROTH);
    if (fd >= 0)
    {
        if (_content.length() > 0 && _content.length() == write(fd, _content.data(), _content.length()))
        {
            ret = file_name;
            sql_file_store tmp;
            tmp.file_path = file_name;
            if (is_tmp)
            {
                tmp.upload_date = util_get_timestring();
            }
            tmp.insert_record();
        }
        close(fd);
    }
    check_need_delete();

    return "/files/" + ret;
}

std::string file_store_name(const std::string &_name, const std::string &_ext_name, bool is_tmp)
{
    std::string ret;
    std::string file_content;
    int fd = open(_name.c_str(), O_RDONLY);
    if (fd)
    {
        char buff[8];
        long read_len = 0;
        while (0 < (read_len = read(fd, buff, sizeof(buff))))
        {
            file_content.append(buff, read_len);
        }
        close(fd);
    }
    if (file_content.length() > 0)
    {
        ret = file_store_content(file_content, _ext_name, is_tmp);
    }

    return ret;
}

void file_delete(const std::string &_content)
{
    auto fs = sqlite_orm::search_record<sql_file_store>("file_path == '%s'", _content.c_str());
    if (fs)
    {
        unlink(("/database/files/" + fs->file_path).c_str());
        fs->remove_record();
    }
    check_need_delete();
}
