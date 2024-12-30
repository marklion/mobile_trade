#include <modbus/modbus.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>

char *sql_file = "./zh.db";
int parse_cmdline(int argc, char *argv[], char *file_name, int *boudrate, int *slave_id)
{
    int opt;
    int ret = 0;
    int full_cmd = 3;
    // 解析命令行参数
    while (0 == ret && (opt = getopt(argc, argv, "F:B:A:")) != -1)
    {
        switch (opt)
        {
        case 'F':
            strcpy(file_name, optarg); // 将 -F 参数的值存储为字符串
            full_cmd--;
            break;
        case 'B':
            *boudrate = atoi(optarg);
            full_cmd--;
            break;
        case 'A':
            *slave_id = atoi(optarg);
            full_cmd--;
            break;
        default:
            fprintf(stderr, "Usage: %s -F <TTY file name> -B <boudrate> -A <salve id>\n", argv[0]);
            ret = -1;
            break;
        }
    } // 输出解析结果
    if (0 != full_cmd)
    {
        fprintf(stderr, "Usage: %s -F <TTY file name> -B <boudrate> -A <salve id>\n", argv[0]);
        ret = -1;
    }
    return ret;
}

float get_current_weight()
{
    float ret = 0.0;
    char cmd[4096] = {0};
    sprintf(cmd, "sqlite3 %s \"select sum(m_weight - p_weight) from vehicle_order_table where PRI_ID > $(cat /root/wst.txt)\";", sql_file);
    FILE *fp = popen(cmd, "r");
    if (NULL != fp)
    {
        char buf[4096] = {0};
        if (NULL != fgets(buf, sizeof(buf), fp))
        {
            ret = atof(buf);
        }
        pclose(fp);
    }
    return ret;
}

void reset_mst()
{
    char cmd[4096] = {0};
    sprintf(cmd, "sqlite3 %s 'select max(PRI_ID) from vehicle_order_table;' > /root/wst.txt", sql_file);
    system(cmd);
}

void init_mst()
{
    char cmd[4096] = {0};
    sprintf(cmd, "[ -f /root/wst.txt ] || echo 0 > /root/wst.txt");
    system(cmd);
}

int start_sample_salver(modbus_t *ctx, int slave_id)
{
    int ret = 0;

    modbus_mapping_t *mb = modbus_mapping_new(500, 500, 500, 500);
    if (mb)
    {
        while (1)
        {
            uint8_t query[MODBUS_TCP_MAX_ADU_LENGTH];
            int rc = modbus_receive(ctx, query);
            if (rc > 0 && query[0] == slave_id)
            {
                if (query[1] == 3)
                {
                    float weight = get_current_weight();
                    mb->tab_registers[3] = *(uint16_t *)(&weight);
                    mb->tab_registers[2] = *((uint16_t *)(&weight) + 1);
                }
                if (query[1] == 5 && query[2] == 0x00 && query[3] == 0x01 && query[4] == 0xff)
                {
                    reset_mst();
                    mb->tab_input_registers[1] = 0xff00;
                }
                modbus_reply(ctx, query, rc, mb);
            }
        }
        modbus_mapping_free(mb);
    }
    else
    {
        fprintf(stderr, "Failed to allocate the mapping: %s\n", modbus_strerror(errno));
        ret = -1;
    }

    return ret;
}
int main(int argc, char *argv[])
{
    char file_name[256] = {0};
    int boudrate = 0;
    int slave_id = 0;
    if (0 != parse_cmdline(argc, argv, file_name, &boudrate, &slave_id))
    {
        return -1;
    }
    init_mst();
    modbus_t *ctx = modbus_new_rtu(file_name, boudrate, 'N', 8, 1);
    if (NULL != ctx)
    {
        int mod_ret = modbus_set_slave(ctx, slave_id);
        mod_ret |= modbus_connect(ctx);
        if (0 == mod_ret)
        {
            start_sample_salver(ctx, slave_id);
        }
        else
        {
            fprintf(stderr, "Unable to connect the modbus:%s\n", modbus_strerror(errno));
            return -1;
        }
    }
    else
    {
        fprintf(stderr, "Unable to create the libmodbus context\n");
        return -1;
    }
    return 0;
}
