#include "../driver.h"
#include <fstream>
#include <fcntl.h>
#include <modbus/modbus.h>
#include <map>
std::string g_dev_ip;

const unsigned short CONST_WRITE_CARD_CMD = 1 << 1;
const unsigned short CONST_READ_CARD_CMD = 1 << 2;
const std::map<std::string, unsigned short> CONST_ZONE_PLATE_MAP = {
    {"京", 1},
    {"津", 2},
    {"冀", 3},
    {"晋", 4},
    {"蒙", 5},
    {"辽", 6},
    {"吉", 7},
    {"黑", 8},
    {"沪", 9},
    {"苏", 10},
    {"浙", 11},
    {"皖", 12},
    {"闽", 13},
    {"赣", 14},
    {"鲁", 15},
    {"豫", 16},
    {"鄂", 17},
    {"湘", 18},
    {"粤", 19},
    {"桂", 20},
    {"琼", 21},
    {"川", 22},
    {"贵", 23},
    {"云", 24},
    {"渝", 25},
    {"藏", 26},
    {"陕", 27},
    {"甘", 28},
    {"青", 29},
    {"宁", 30},
    {"新", 31}};

class card_deliver_driver : public common_driver
{
    bool write_modbus_reg(modbus_t *ctx, int reg_addr, const uint16_t *value, int count)
    {
        int rc = modbus_write_registers(ctx, reg_addr, count, value);
        if (rc == -1)
        {
            log_driver(__FUNCTION__, "modbus_write_registers failed: %s", modbus_strerror(errno));
            return false;
        }
        return true;
    }

    std::string read_modbus_reg(modbus_t *ctx, int reg_addr, int count)
    {
        uint16_t regs[128] = {0};
        int rc = modbus_read_registers(ctx, reg_addr, count, regs);
        if (rc == -1)
        {
            log_driver(__FUNCTION__, "modbus_read_registers failed: %s", modbus_strerror(errno));
            return "";
        }
        std::string result;
        for (int i = 0; i < count; ++i)
        {
            result += static_cast<char>(regs[i] >> 8);
            result += static_cast<char>(regs[i] & 0xFF);
        }
        return result;
    }
    unsigned short read_modbus_reg_uint16(modbus_t *ctx, int reg_addr)
    {
        uint16_t reg = 0;
        int rc = modbus_read_registers(ctx, reg_addr, 1, &reg);
        if (rc == -1)
        {
            log_driver(__FUNCTION__, "modbus_read_registers failed: %s", modbus_strerror(errno));
            return 0;
        }
        return reg;
    }

public:
    using common_driver::common_driver;
    virtual void deliver_card(std::string &_return, const int64_t card_deliver_id, const std::string &plate, const int64_t ser_no, const int64_t expect_load)
    {
        _return = "未知异常";
        auto ctx = modbus_new_tcp(g_dev_ip.c_str(), 6502);
        if (ctx)
        {
            modbus_set_slave(ctx, 2);
            if (modbus_connect(ctx) == 0)
            {
                bool modbus_ret = true;
                modbus_ret &= write_modbus_reg(ctx, 8, &CONST_READ_CARD_CMD, 1);
                auto orig_card_no = read_modbus_reg_uint16(ctx, 9);

                unsigned short plate_array[7] = {0};
                plate_array[0] = CONST_ZONE_PLATE_MAP.at(plate.substr(0, 3));
                for (size_t i = 1; i < plate.size() && i < 7; ++i)
                {
                    plate_array[i] = static_cast<unsigned short>(plate[i + 2]);
                }
                modbus_ret &= write_modbus_reg(ctx, 15, plate_array, 7);
                unsigned short ser_no_reg[2] = {0};
                ser_no_reg[0] = static_cast<unsigned short>((ser_no >> 16) & 0xFFFF);
                ser_no_reg[1] = static_cast<unsigned short>(ser_no & 0xFFFF);
                modbus_ret &= write_modbus_reg(ctx, 13, ser_no_reg, 2);
                unsigned short expect_load_reg[2] = {0};
                expect_load_reg[0] = static_cast<unsigned short>((expect_load >> 16) & 0xFFFF);
                expect_load_reg[1] = static_cast<unsigned short>(expect_load & 0xFFFF);
                modbus_ret &= write_modbus_reg(ctx, 11, expect_load_reg, 2);
                modbus_ret &= write_modbus_reg(ctx, 8, &CONST_WRITE_CARD_CMD, 1);

                modbus_ret &= write_modbus_reg(ctx, 8, &CONST_READ_CARD_CMD, 1);
                auto new_card_no = read_modbus_reg_uint16(ctx, 9);
                auto new_expect_load =
                    (static_cast<int64_t>(read_modbus_reg_uint16(ctx, 11)) << 16) |
                    static_cast<int64_t>(read_modbus_reg_uint16(ctx, 12));
                auto new_plate_str = read_modbus_reg(ctx, 15, 7);
                std::string new_plate_print;
                for (size_t i = 0; i < 7; ++i)
                {
                    auto num = static_cast<unsigned short>(new_plate_str[i*2] << 8 | (new_plate_str[i*2 + 1] & 0xFF));
                    new_plate_print.push_back(static_cast<char>(num));
                }
                modbus_close(ctx);
                if (modbus_ret && orig_card_no == new_card_no)
                {
                    _return = "";
                    log_driver(
                        __FUNCTION__,
                        "deliver card success,card_no=%u,plate=%s,ser_no=%u,expect_load=%u,new_expect_load=%u,new_plate=%s", new_card_no, plate.c_str(), ser_no, expect_load, new_expect_load, new_plate_print.c_str());
                }
                else
                {
                    _return = "发卡失败";
                    log_driver(
                        __FUNCTION__,
                        "deliver card failed,modbus_ret=%d,orig_card_no=%u,new_card_no=%u,plate=%s,ser_no=%u,expect_load=%u",
                        modbus_ret, orig_card_no, new_card_no, plate.c_str(), ser_no, expect_load);
                }
            }
            else
            {
                log_driver(__FUNCTION__, "failed to connect to modbus server");
            }
            modbus_free(ctx);
        }
        else
        {
            log_driver(__FUNCTION__, "failed to create modbus context");
        }
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
    auto pd = new card_deliver_driver("card_deliver_driver" + std::to_string(self_id), self_id);
    if (run_port == 0)
    {
        std::string card_ret = "";
        pd->deliver_card(card_ret, 0, "京A12345", 23, 23190);
    }
    else
    {
        common_driver::start_driver(run_port, pd);
    }
    return 0;
}
