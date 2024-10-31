#include "device_cli.h"
#include "tabulate.hpp"

void show_device_driver(std::ostream &out, std::vector<std::string> _params)
{
    std::vector<device_driver> tmp;
    THR_DEF_CIENT(config_management);
    THR_CONNECT(config_management);
    try
    {
        client->get_all_driver(tmp);
    }
    catch (gen_exp &e)
    {
        out << e.msg << std::endl;
    }
    TRH_CLOSE();
    tabulate::Table tab;
    tab.add_row({"ID", "name"});
    for (auto &itr : tmp)
    {
        tab.add_row({std::to_string(itr.id), itr.name});
    }
    tab.format().multi_byte_characters(true);
    out << tab << std::endl;
}

void add_set(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(config_management);
        THR_CONNECT(config_management);
        try
        {
            client->add_device_set(_params[0], atoi(_params[1].c_str()));
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

void del_set(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(config_management);
        THR_CONNECT(config_management);
        try
        {
            client->del_device_set(atoi(_params[0].c_str()));
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

#define PUT_DEVICE_TO_SET(x)                                                \
    if (itr.x.id > 0)                                                       \
    {                                                                       \
        device_info.push_back(std::to_string(itr.x.id) + ":" + itr.x.name); \
    }

void show_device_scale(std::ostream &out, std::vector<std::string> _params)
{
    std::vector<device_scale_set> tmp;
    THR_DEF_CIENT(config_management);
    THR_CONNECT(config_management);
    try
    {
        client->get_scale_config(tmp);
    }
    catch (gen_exp &e)
    {
        out << e.msg << std::endl;
    }
    TRH_CLOSE();
    tabulate::Table tab;
    tab.add_row({"ID", "name", "devices"});
    for (auto &itr : tmp)
    {
        std::vector<std::string> device_info;
        PUT_DEVICE_TO_SET(plate_cam.front);
        PUT_DEVICE_TO_SET(plate_cam.back);
        PUT_DEVICE_TO_SET(video_cam.front);
        PUT_DEVICE_TO_SET(video_cam.back);
        PUT_DEVICE_TO_SET(led.front);
        PUT_DEVICE_TO_SET(led.back);
        PUT_DEVICE_TO_SET(speaker.front);
        PUT_DEVICE_TO_SET(speaker.back);
        PUT_DEVICE_TO_SET(gate.front);
        PUT_DEVICE_TO_SET(gate.back);
        PUT_DEVICE_TO_SET(id_reader.front);
        PUT_DEVICE_TO_SET(id_reader.back);
        PUT_DEVICE_TO_SET(qr_reader.front);
        PUT_DEVICE_TO_SET(qr_reader.back);
        PUT_DEVICE_TO_SET(printer.front);
        PUT_DEVICE_TO_SET(printer.back);
        PUT_DEVICE_TO_SET(scale);
        tab.add_row({std::to_string(itr.id), itr.name, util_join_string(device_info, "\n")});
    }
    tab.format().multi_byte_characters(true);
    out << tab << std::endl;
}
void show_device_gate(std::ostream &out, std::vector<std::string> _params)
{
    std::vector<device_gate_set> tmp;
    THR_DEF_CIENT(config_management);
    THR_CONNECT(config_management);
    try
    {
        client->get_gate_config(tmp);
    }
    catch (gen_exp &e)
    {
        out << e.msg << std::endl;
    }
    TRH_CLOSE();
    tabulate::Table tab;
    tab.add_row({"ID", "name", "devices"});
    for (auto &itr : tmp)
    {
        std::vector<std::string> device_info;
        PUT_DEVICE_TO_SET(plate_cam.front);
        PUT_DEVICE_TO_SET(plate_cam.back);
        PUT_DEVICE_TO_SET(video_cam.front);
        PUT_DEVICE_TO_SET(video_cam.back);
        PUT_DEVICE_TO_SET(led.front);
        PUT_DEVICE_TO_SET(led.back);
        PUT_DEVICE_TO_SET(speaker.front);
        PUT_DEVICE_TO_SET(speaker.back);
        PUT_DEVICE_TO_SET(gate.front);
        PUT_DEVICE_TO_SET(gate.back);
        PUT_DEVICE_TO_SET(id_reader.front);
        PUT_DEVICE_TO_SET(id_reader.back);
        PUT_DEVICE_TO_SET(qr_reader.front);
        PUT_DEVICE_TO_SET(qr_reader.back);
        tab.add_row({std::to_string(itr.id), itr.name, util_join_string(device_info, "\n")});
    }
    tab.format().multi_byte_characters(true);
    out << tab << std::endl;
}
void add_device(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 5)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(config_management);
        THR_CONNECT(config_management);
        try
        {
            std::vector<device_gate_set> gs;
            std::vector<device_scale_set> ss;
            client->get_scale_config(ss);
            client->get_gate_config(gs);
            long set_id = 0;
            for (auto &itr : gs)
            {
                if (itr.name == _params[3])
                {
                    set_id = itr.id;
                    break;
                }
            }
            if (set_id <= 0)
            {
                for (auto &itr : ss)
                {
                    if (itr.name == _params[3])
                    {
                        set_id = itr.id;
                        break;
                    }
                }
            }

            client->add_device_to_set(_params[0], _params[1], atoi(_params[2].c_str()), set_id, _params[4]);
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}
void del_device(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(config_management);
        THR_CONNECT(config_management);
        try
        {
            client->del_device_from_set(atoi(_params[0].c_str()));
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

void start_device(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DM(device_management);
        try
        {
            client->device_ctrl(atoi(_params[0].c_str()), 1);
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}
void stop_device(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DM(device_management);
        try
        {
            client->device_ctrl(atoi(_params[0].c_str()), 0);
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}
void show_device_status(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_DEF_CIENT(device_management);
        THR_CONNECT_DM(device_management);
        try
        {
            auto is_started = client->device_is_started(atoi(_params[0].c_str()));
            if (is_started)
            {
                out << "启动" << std::endl;
            }
            else
            {
                out << "关闭" << std::endl;
            }
        }
        catch (gen_exp &e)
        {
            out << e.msg << std::endl;
        }
        TRH_CLOSE();
    }
}

int get_port_by_id(const std::string &_port)
{
    int ret = 0;
    std::string cmd = "ps ax | grep '\\-i " + _port + "' | grep -v grep | awk '{print $(NF-2)}'";
    auto fp = popen(cmd.c_str(), "r");
    if (fp)
    {
        char buff[1024] = {0};
        fread(buff, 1, sizeof(buff), fp);
        ret = atoi(buff);
        pclose(fp);
    }

    return ret;
}

void mock_device_action(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() < 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        auto port = get_port_by_id(_params[0]);
        THR_CALL_DM_BEGIN_DEV(port);
        auto cmd = _params[1];
        if ("plate" == cmd)
        {
            client->push_plate_read(1, _params[2]);
        }
        else if ("scale" == cmd)
        {
            client->push_scale_read(1, atof(_params[2].c_str()));
        }
        else if ("gate" == cmd)
        {
            client->gate_ctrl(1, false);
        }
        else if ("id_reader" == cmd)
        {
            client->push_id_read(1, _params[2]);
        }
        THR_CALL_DM_END();
    }
}
void clear_device(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 0)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_CALL_BEGIN(config_management);
        std::vector<device_gate_set> tmp_g;
        std::vector<device_scale_set> tmp_s;
        client->get_gate_config(tmp_g);
        client->get_scale_config(tmp_s);
        for (auto &itr : tmp_g)
        {
            try
            {
                client->del_device_from_set(itr.gate.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.gate.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.plate_cam.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.plate_cam.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.video_cam.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.video_cam.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.id_reader.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.id_reader.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.qr_reader.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.qr_reader.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.speaker.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.speaker.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.led.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.led.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_set(itr.id);
            }
            catch (gen_exp &e)
            {
            }
        }
        for (auto &itr : tmp_s)
        {
            try
            {
                client->del_device_from_set(itr.gate.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.gate.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.plate_cam.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.plate_cam.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.video_cam.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.video_cam.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.id_reader.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.id_reader.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.qr_reader.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.qr_reader.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.speaker.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.speaker.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.led.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.led.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.printer.back.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.printer.front.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_from_set(itr.scale.id);
            }
            catch (gen_exp &e)
            {
            }
            try
            {
                client->del_device_set(itr.id);
            }
            catch (gen_exp &e)
            {
            }
        }
        THR_CALL_END();
    }
}

void reset_scale(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        int sm_id = 0;
        std::vector<device_scale_set> tmp;
        THR_CALL_BEGIN(config_management);
        client->get_scale_config(tmp);
        THR_CALL_END();
        for (auto &itr : tmp)
        {
            if (itr.name == _params[0])
            {
                sm_id = itr.id;
                break;
            }
        }
        THR_CALL_DM_BEGIN();
        client->reset_scale_sm(sm_id);
        THR_CALL_DM_END();
    }
}

void show_scale_status(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 0)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        std::vector<scale_sm_info> tmp;
        THR_CALL_DM_BEGIN();
        client->get_scale_sm_info(tmp);
        THR_CALL_DM_END();
        tabulate::Table tab;
        tab.add_row({"ID", "name", "state", "plate", "weight"});
        for (auto &itr : tmp)
        {
            tab.add_row({std::to_string(itr.set_info.id), itr.set_info.name, itr.cur_state, std::to_string(itr.cur_weight), itr.cur_plate});
        }
        tab.format().multi_byte_characters(true);
        out << tab << std::endl;
    }
}
void test_gate(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_CALL_DM_BEGIN();
        bool is_open = true;
        if ("open" != _params[1])
        {
            is_open = false;
        }
        client->gate_ctrl(atoi(_params[0].c_str()), is_open);
        THR_CALL_DM_END();
    }
}
void test_led(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 2)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_CALL_DM_BEGIN();
        bool is_show = true;
        if ("show" != _params[1])
        {
            is_show = false;
        }
        if (is_show)
        {
            client->led_display(atoi(_params[0].c_str()), {"第一行", "第二行", "第三行非常非常长", "第四行"});
        }
        else
        {
            client->led_display(atoi(_params[0].c_str()), {"", "", "", ""});
        }
        THR_CALL_DM_END();
    }
}

void test_speaker(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        THR_CALL_DM_BEGIN();
        client->speaker_cast(atoi(_params[0].c_str()), "测试播报");
        THR_CALL_DM_END();
    }
}
void test_plate_cam(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        std::string pic_path;
        std::string plate_no;
        THR_CALL_DM_BEGIN();
        client->cap_picture_slow(pic_path, atoi(_params[0].c_str()));
        client->plate_cam_cap(atoi(_params[0].c_str()));
        client->last_plate_read(plate_no, atoi(_params[0].c_str()));
        THR_CALL_DM_END();
        out << "图片路径：" << pic_path << std::endl;
        out << "车牌号：" << plate_no << std::endl;
    }
}

void test_id_reader(std::ostream &out, std::vector<std::string> _params)
{
    if (_params.size() != 1)
    {
        out << "参数错误" << std::endl;
    }
    else
    {
        std::string id_no;
        THR_CALL_DM_BEGIN();
        client->last_id_read(id_no, atoi(_params[0].c_str()));
        THR_CALL_DM_END();
        out << "身份证号：" << id_no << std::endl;
    }
}

std::unique_ptr<cli::Menu> make_device_cli(const std::string &_menu_name)
{
    auto root_menu = std::unique_ptr<cli::Menu>(new cli::Menu(_menu_name));

    root_menu->Insert(CLI_MENU_ITEM(show_device_driver), "查看驱动");
    root_menu->Insert(CLI_MENU_ITEM(show_device_gate), "查看门组件");
    root_menu->Insert(CLI_MENU_ITEM(show_device_scale), "查看磅组件");
    root_menu->Insert(CLI_MENU_ITEM(add_set), "添加组件", {"组件名", "类型：0->门,1->磅"});
    root_menu->Insert(CLI_MENU_ITEM(del_set), "删除组件", {"组件编号"});
    root_menu->Insert(CLI_MENU_ITEM(add_device), "添加设备", {"设备名", "参数", "驱动编号", "组件名称", "用途"});
    root_menu->Insert(CLI_MENU_ITEM(del_device), "删除设备", {"设备编号"});
    root_menu->Insert(CLI_MENU_ITEM(start_device), "启动设备", {"设备编号"});
    root_menu->Insert(CLI_MENU_ITEM(stop_device), "关闭设备", {"设备编号"});
    root_menu->Insert(CLI_MENU_ITEM(show_device_status), "查看设备启动状态", {"设备编号"});
    root_menu->Insert(CLI_MENU_ITEM(mock_device_action), "仿冒设备数据", {"设备号", "参数"});
    root_menu->Insert(CLI_MENU_ITEM(reset_scale), "重置磅状态", {"磅名称"});
    root_menu->Insert(CLI_MENU_ITEM(show_scale_status), "查看磅状态");
    root_menu->Insert(CLI_MENU_ITEM(clear_device), " 清除设备配置");
    root_menu->Insert(CLI_MENU_ITEM(test_gate), "测试道闸", {"设备编号", "动作:open->开门,close->关门"});
    root_menu->Insert(CLI_MENU_ITEM(test_id_reader), "测试身份证", {"设备编号"});
    root_menu->Insert(CLI_MENU_ITEM(test_led), "测试屏幕", {"设备编号", "动作:show->显示,close->清空"});
    root_menu->Insert(CLI_MENU_ITEM(test_plate_cam), "测试抓拍机", {"设备编号"});
    root_menu->Insert(CLI_MENU_ITEM(test_speaker), "测试喇叭", {"设备编号"});

    return root_menu;
}

device_cli::device_cli() : common_cli(make_device_cli("device"), "device")
{
}

std::string sub_bdr_make(const device_meta &_dev, const std::string &_use_for, const std::string &_set_name)
{
    std::string ret;
    if (_dev.id > 0)
    {
        std::vector<std::string> sub_bdr_v;
        sub_bdr_v.push_back("add_device");
        sub_bdr_v.push_back("'" + _dev.name + "'");
        sub_bdr_v.push_back("'" + _dev.driver_args + "'");
        sub_bdr_v.push_back("'" + std::to_string(_dev.driver.id) + "'");
        sub_bdr_v.push_back("'" + _set_name + "'");
        sub_bdr_v.push_back(_use_for);
        ret = util_join_string(sub_bdr_v, " ");
        ret += "\n";
    }
    return ret;
}

std::string device_cli::make_bdr()
{
    std::string ret;

    THR_CALL_BEGIN(config_management);
    std::vector<device_gate_set> dgss;
    client->get_gate_config(dgss);
    std::vector<device_scale_set> dsss;
    client->get_scale_config(dsss);
    for (auto &itr : dgss)
    {
        ret += "add_set " + itr.name + " 0\n";
        ret += sub_bdr_make(itr.gate.back, "back_gate", itr.name);
        ret += sub_bdr_make(itr.gate.front, "front_gate", itr.name);
        ret += sub_bdr_make(itr.id_reader.back, "back_id_reader", itr.name);
        ret += sub_bdr_make(itr.id_reader.front, "front_id_reader", itr.name);
        ret += sub_bdr_make(itr.led.back, "back_led", itr.name);
        ret += sub_bdr_make(itr.led.front, "front_led", itr.name);
        ret += sub_bdr_make(itr.plate_cam.back, "back_plate_cam", itr.name);
        ret += sub_bdr_make(itr.plate_cam.front, "front_plate_cam", itr.name);
        ret += sub_bdr_make(itr.qr_reader.back, "back_qr_reader", itr.name);
        ret += sub_bdr_make(itr.qr_reader.front, "front_qr_reader", itr.name);
        ret += sub_bdr_make(itr.speaker.back, "back_speaker", itr.name);
        ret += sub_bdr_make(itr.speaker.front, "front_speaker", itr.name);
        ret += sub_bdr_make(itr.video_cam.back, "back_video_cam", itr.name);
        ret += sub_bdr_make(itr.video_cam.front, "front_video_cam", itr.name);
    }
    for (auto &itr : dsss)
    {
        ret += "add_set " + itr.name + " 1\n";
        ret += sub_bdr_make(itr.gate.back, "back_gate", itr.name);
        ret += sub_bdr_make(itr.gate.front, "front_gate", itr.name);
        ret += sub_bdr_make(itr.id_reader.back, "back_id_reader", itr.name);
        ret += sub_bdr_make(itr.id_reader.front, "front_id_reader", itr.name);
        ret += sub_bdr_make(itr.led.back, "back_led", itr.name);
        ret += sub_bdr_make(itr.led.front, "front_led", itr.name);
        ret += sub_bdr_make(itr.plate_cam.back, "back_plate_cam", itr.name);
        ret += sub_bdr_make(itr.plate_cam.front, "front_plate_cam", itr.name);
        ret += sub_bdr_make(itr.qr_reader.back, "back_qr_reader", itr.name);
        ret += sub_bdr_make(itr.qr_reader.front, "front_qr_reader", itr.name);
        ret += sub_bdr_make(itr.speaker.back, "back_speaker", itr.name);
        ret += sub_bdr_make(itr.speaker.front, "front_speaker", itr.name);
        ret += sub_bdr_make(itr.video_cam.back, "back_video_cam", itr.name);
        ret += sub_bdr_make(itr.video_cam.front, "front_video_cam", itr.name);

        ret += sub_bdr_make(itr.printer.back, "back_printer", itr.name);
        ret += sub_bdr_make(itr.printer.front, "front_printer", itr.name);
        ret += sub_bdr_make(itr.scale, "scale", itr.name);
    }
    THR_CALL_END();

    return ret;
}
