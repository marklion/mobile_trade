#if !defined(_SQLITE_ORM_H_)
#define _SQLITE_ORM_H_

#include <list>
#include <string>
#include <vector>
#include <map>
#include <functional>
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
#include <memory>
#include "../log_driver/log_driver.h"

#define SQLITE_ORM_COLUMN_LIMIT_NONE 0
#define SQLITE_ORM_COLUMN_LIMIT_UNIQ 0x01

extern bool execute_sql_cmd(const std::string& _sql_cmd, const std::string& _sql_file, std::vector<std::map<std::string, std::string>> *_ret = nullptr);

struct sqlite_orm_column {
    std::string convert_limit() {
        std::string ret;
        if (m_limit & SQLITE_ORM_COLUMN_LIMIT_UNIQ) {
            ret.append("UNIQUE ");
        }

        return ret;
    }
    std::string m_name;
    enum column_type {
        INTEGER, STRING, REAL
    } m_type;
    void *m_data;
    unsigned long m_limit;
    sqlite_orm_column(const std::string& _name, column_type _type, void * _data, unsigned long _limit = SQLITE_ORM_COLUMN_LIMIT_NONE)
    : m_name(_name), m_type(_type), m_data(_data), m_limit(_limit)
    {

    }
};

class sqlite_orm_lock {
    static pthread_mutex_t lock;
public:
    static void init_lock() ;
    sqlite_orm_lock();
    ~sqlite_orm_lock();
};

class sqlite_orm
{
public:
    virtual bool whole_unique() {
        return false;
    }
private:
    bool table_exists = false;
    tdf_log m_log;
    long m_pri_id = -1;
    std::string m_sqlite_file = "";

    void create_table() {
        std::string sql_cmd = "CREATE TABLE IF NOT EXISTS ";
        sql_cmd.append(table_name() + " (");

        sql_cmd.append("PRI_ID INTEGER PRIMARY KEY AUTOINCREMENT,");
        for (auto &single_column:columns_defined())
        {
            sql_cmd.append(single_column.m_name + " ");
            switch (single_column.m_type)
            {
            case sqlite_orm_column::INTEGER:
                sql_cmd.append("INTEGER ");
                break;

            case sqlite_orm_column::STRING:
                sql_cmd.append("TEXT ");
                break;
            case sqlite_orm_column::REAL:
                sql_cmd.append("REAL ");
                break;
            default:
                break;
            }
            sql_cmd.append(single_column.convert_limit() + ",");
        }
        sql_cmd.pop_back();
        if (whole_unique())
        {
            sql_cmd.append(" , UNIQUE (");
            for (auto &itr:columns_defined())
            {
                sql_cmd.append(itr.m_name + ",");
            }
            sql_cmd.pop_back();
            sql_cmd.append(") ON CONFLICT REPLACE");
        }
        sql_cmd.append(");");

        (void)execute_sql_cmd(sql_cmd, m_sqlite_file);
        return;
    }
    void fetch_table() {
        // create table if it doesn't exist
        create_table();

        std::vector<std::map<std::string,std::string>> colunms_from_db;
        execute_sql_cmd("PRAGMA table_info(" + table_name() + ");", m_sqlite_file, &colunms_from_db);
        auto columns_from_code = columns_defined();

        if ((columns_from_code.size() + 1) > colunms_from_db.size())
        {
            for (auto &itr:columns_from_code)
            {
                auto has_same = false;
                for (auto &db_itr:colunms_from_db)
                {
                    if (db_itr["name"] == itr.m_name)
                    {
                        has_same = true;
                        break;
                    }
                }
                if (!has_same)
                {
                    std::string sql_cmd = "ALTER TABLE " + table_name() + " ADD COLUMN ";
                    sql_cmd.append(itr.m_name + " ");
                    switch (itr.m_type)
                    {
                    case sqlite_orm_column::INTEGER:
                        sql_cmd.append("INTEGER");
                        break;

                    case sqlite_orm_column::STRING:
                        sql_cmd.append("TEXT");
                        break;
                    case sqlite_orm_column::REAL:
                        sql_cmd.append("REAL");
                        break;
                    default:
                        break;
                    }
                    sql_cmd.append(";");

                    execute_sql_cmd(sql_cmd, m_sqlite_file);
                }
            }
        }
    }

public:
    sqlite_orm(const std::string &_sql_file) : m_sqlite_file(_sql_file), m_log("test_orm") {}
    virtual ~sqlite_orm() {}
    static std::string escape_single_quotes(const std::string &_string)
    {
        std::string ret;

        for (auto &itr:_string) {
            if (itr == '\'')
            {
                ret.push_back('\'');
            }
            ret.push_back(itr);
        }

        return ret;
    }

    virtual std::vector<sqlite_orm_column> columns_defined() = 0;
    virtual std::string table_name() = 0;

    long get_pri_id() {
        return m_pri_id;
    }
    void remove_table() {
        std::string sql_cmd = "DROP TABLE IF EXISTS ";
        sql_cmd.append(table_name() + ";");
        (void)execute_sql_cmd(sql_cmd, m_sqlite_file);
    };
    virtual bool insert_record() {
        bool ret = false;
        // refresh table structure
        fetch_table();
        // make sql cmd

        std::string column_names = " (PRI_ID,";
        for (auto &itr:columns_defined())
        {
            column_names +=itr.m_name + ",";
        }
        column_names.pop_back();
        column_names.push_back(')');

        std::string sql_cmd = "INSERT INTO " + table_name() + column_names + " VALUES ( NULL,";
        for (auto &single_column : columns_defined())
        {
            switch (single_column.m_type)
            {
            case sqlite_orm_column::INTEGER:
                sql_cmd.append(std::to_string(*(static_cast<long *>(single_column.m_data))) + ",");
                break;
            case sqlite_orm_column::STRING:
                sql_cmd.append("'" + escape_single_quotes(*(static_cast<std::string *>(single_column.m_data))) + "',");
                break;
            case sqlite_orm_column::REAL:
                sql_cmd.append(std::to_string(*(static_cast<double *>(single_column.m_data))) + ",");
                break;
            default:
                break;
            }
        }
        sql_cmd.pop_back();
        sql_cmd.append(");");

        sql_cmd.append("SELECT last_insert_rowid() from " + table_name() + ";");
        // execute sql and return

        std::vector<std::map<std::string,std::string>> pri_id_ret;
        if (true == execute_sql_cmd(sql_cmd, m_sqlite_file, &pri_id_ret))
        {
            // get pri id and store it
            if (pri_id_ret.size() >= 1)
            {
                ret = true;
                m_pri_id = atol(pri_id_ret[0]["last_insert_rowid()"].c_str());
            }
        }

        return ret;
    }
    void remove_record()
    {
        std::string sql_cmd = "DELETE FROM " + table_name() + " WHERE PRI_ID == " + std::to_string(m_pri_id) + ";";
        execute_sql_cmd(sql_cmd, m_sqlite_file);
    }
    std::string make_update_cmd(const std::string &_related_col = "")
    {
        std::string sql_cmd = "UPDATE " + table_name() + " SET ";
        for (auto &single_column : columns_defined())
        {
            if (_related_col.length() == 0 || _related_col == single_column.m_name)
            {
                sql_cmd.append(single_column.m_name + " = ");
                switch (single_column.m_type)
                {
                case sqlite_orm_column::INTEGER:
                    sql_cmd.append(std::to_string(*(static_cast<long *>(single_column.m_data))));
                    break;
                case sqlite_orm_column::STRING:
                    sql_cmd.append("'" + escape_single_quotes(*(static_cast<std::string *>(single_column.m_data))) + "'");
                    break;
                case sqlite_orm_column::REAL:
                    sql_cmd.append(std::to_string(*(static_cast<double *>(single_column.m_data))));
                    break;
                default:
                    break;
                }
                sql_cmd.append(",");
            }
        }
        sql_cmd.pop_back();
        sql_cmd.append(" WHERE PRI_ID = " + std::to_string(m_pri_id) + ";");

        return sql_cmd;
    }
    bool update_record(const std::string &_related_col = "")
    {
        bool ret = false;
        // refresh table structure
        fetch_table();
        ret = execute_sql_cmd(make_update_cmd(_related_col), m_sqlite_file);

        return ret;
    }
    template <typename sql_record>
    static std::list<sql_record> search_record_all(const std::string &_qurey)
    {
        std::list<sql_record> ret;
        std::vector<std::map<std::string, std::string>> search_ret;
        sql_record tmp_record;

        std::string sql_cmd = "SELECT * FROM " + tmp_record.table_name();
        if (_qurey.length() > 0)
        {
            sql_cmd.append(" WHERE " + _qurey);
        }
        sql_cmd.append(";");
        if (execute_sql_cmd(sql_cmd, tmp_record.m_sqlite_file, &search_ret))
        {
            for (auto &itr : search_ret)
            {
                sql_record single_record;
                single_record.m_pri_id = atol(itr["PRI_ID"].c_str());
                for (auto &single_column : single_record.columns_defined())
                {
                    switch (single_column.m_type)
                    {
                    case sqlite_orm_column::INTEGER:
                        *(static_cast<long *>(single_column.m_data)) = atol(itr[single_column.m_name].c_str());
                        break;
                    case sqlite_orm_column::STRING:
                        *(static_cast<std::string *>(single_column.m_data)) = itr[single_column.m_name].c_str();
                        break;
                    case sqlite_orm_column::REAL:
                    {
                        double tmp_val = 0;
                        try
                        {
                            tmp_val = std::stod(itr[single_column.m_name]);
                        }
                        catch (...)
                        {
                        }
                        *(static_cast<double *>(single_column.m_data)) = tmp_val;
                    }
                    break;
                    }
                }
                ret.push_back(single_record);
            }
        }

        return ret;
    }
    template <typename sql_record>
    static std::list<sql_record> search_record_all()
    {
        return search_record_all<sql_record>("");
    }
    template <typename sql_record>
    static std::list<sql_record> search_record_all(const char *_query, ...)
    {
        va_list vl;
        va_start(vl, _query);
        char tmpbuff[8018];
        vsnprintf(tmpbuff, sizeof(tmpbuff), _query, vl);
        va_end(vl);
        return search_record_all<sql_record>(std::string(tmpbuff));
    }
    template <typename sql_record>
    static std::unique_ptr<sql_record> search_record(const std::string &_qurey)
    {
        std::unique_ptr<sql_record> ret;

        auto records = search_record_all<sql_record>(_qurey);
        if (records.size() > 0)
        {
            ret.reset(new sql_record(records.front()));
        }

        return ret;
    }
    template <typename sql_record>
    static std::unique_ptr<sql_record> search_record(const char *_query, ...)
    {
        va_list vl;
        va_start(vl, _query);
        char tmpbuff[8018];
        vsnprintf(tmpbuff, sizeof(tmpbuff), _query, vl);
        va_end(vl);
        return search_record<sql_record>(std::string(tmpbuff));
    }
    template <typename sql_record>
    static std::unique_ptr<sql_record> search_record(long _pri_id)
    {
        return search_record<sql_record>("PRI_ID = %ld", _pri_id);
    }
};

#endif // _SQLITE_ORM_H_
