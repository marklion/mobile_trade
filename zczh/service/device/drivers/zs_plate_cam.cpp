#include "../driver.h"
extern "C"
{
#include "VzLPRClientSDK.h"
}
static std::string g_dev_ip;
static long g_boud_rate = 0;
std::string g_last_plate;

static int g_zc_handler = -1;
static long long g_zc_ser_handler0 = -1;
static long long g_zc_ser_handler1 = -1;
const uint16_t ModBusCRCTable[] = {
    0X0000, 0XC0C1, 0XC181, 0X0140, 0XC301, 0X03C0, 0X0280, 0XC241,
    0XC601, 0X06C0, 0X0780, 0XC741, 0X0500, 0XC5C1, 0XC481, 0X0440,
    0XCC01, 0X0CC0, 0X0D80, 0XCD41, 0X0F00, 0XCFC1, 0XCE81, 0X0E40,
    0X0A00, 0XCAC1, 0XCB81, 0X0B40, 0XC901, 0X09C0, 0X0880, 0XC841,
    0XD801, 0X18C0, 0X1980, 0XD941, 0X1B00, 0XDBC1, 0XDA81, 0X1A40,
    0X1E00, 0XDEC1, 0XDF81, 0X1F40, 0XDD01, 0X1DC0, 0X1C80, 0XDC41,
    0X1400, 0XD4C1, 0XD581, 0X1540, 0XD701, 0X17C0, 0X1680, 0XD641,
    0XD201, 0X12C0, 0X1380, 0XD341, 0X1100, 0XD1C1, 0XD081, 0X1040,
    0XF001, 0X30C0, 0X3180, 0XF141, 0X3300, 0XF3C1, 0XF281, 0X3240,
    0X3600, 0XF6C1, 0XF781, 0X3740, 0XF501, 0X35C0, 0X3480, 0XF441,
    0X3C00, 0XFCC1, 0XFD81, 0X3D40, 0XFF01, 0X3FC0, 0X3E80, 0XFE41,
    0XFA01, 0X3AC0, 0X3B80, 0XFB41, 0X3900, 0XF9C1, 0XF881, 0X3840,
    0X2800, 0XE8C1, 0XE981, 0X2940, 0XEB01, 0X2BC0, 0X2A80, 0XEA41,
    0XEE01, 0X2EC0, 0X2F80, 0XEF41, 0X2D00, 0XEDC1, 0XEC81, 0X2C40,
    0XE401, 0X24C0, 0X2580, 0XE541, 0X2700, 0XE7C1, 0XE681, 0X2640,
    0X2200, 0XE2C1, 0XE381, 0X2340, 0XE101, 0X21C0, 0X2080, 0XE041,
    0XA001, 0X60C0, 0X6180, 0XA141, 0X6300, 0XA3C1, 0XA281, 0X6240,
    0X6600, 0XA6C1, 0XA781, 0X6740, 0XA501, 0X65C0, 0X6480, 0XA441,
    0X6C00, 0XACC1, 0XAD81, 0X6D40, 0XAF01, 0X6FC0, 0X6E80, 0XAE41,
    0XAA01, 0X6AC0, 0X6B80, 0XAB41, 0X6900, 0XA9C1, 0XA881, 0X6840,
    0X7800, 0XB8C1, 0XB981, 0X7940, 0XBB01, 0X7BC0, 0X7A80, 0XBA41,
    0XBE01, 0X7EC0, 0X7F80, 0XBF41, 0X7D00, 0XBDC1, 0XBC81, 0X7C40,
    0XB401, 0X74C0, 0X7580, 0XB541, 0X7700, 0XB7C1, 0XB681, 0X7640,
    0X7200, 0XB2C1, 0XB381, 0X7340, 0XB101, 0X71C0, 0X7080, 0XB041,
    0X5000, 0X90C1, 0X9181, 0X5140, 0X9301, 0X53C0, 0X5280, 0X9241,
    0X9601, 0X56C0, 0X5780, 0X9741, 0X5500, 0X95C1, 0X9481, 0X5440,
    0X9C01, 0X5CC0, 0X5D80, 0X9D41, 0X5F00, 0X9FC1, 0X9E81, 0X5E40,
    0X5A00, 0X9AC1, 0X9B81, 0X5B40, 0X9901, 0X59C0, 0X5880, 0X9841,
    0X8801, 0X48C0, 0X4980, 0X8941, 0X4B00, 0X8BC1, 0X8A81, 0X4A40,
    0X4E00, 0X8EC1, 0X8F81, 0X4F40, 0X8D01, 0X4DC0, 0X4C80, 0X8C41,
    0X4400, 0X84C1, 0X8581, 0X4540, 0X8701, 0X47C0, 0X4680, 0X8641,
    0X8201, 0X42C0, 0X4380, 0X8341, 0X4100, 0X81C1, 0X8081, 0X4040};

uint16_t ModBusCRC16(uint8_t *pData, int length)
{
    uint8_t index;
    uint16_t CRC = 0xFFFF;

    while (length--)
    {
        index = *pData++ ^ CRC;
        CRC >>= 8;
        CRC ^= ModBusCRCTable[index];
    }
    return CRC;
}
static std::string make_oneline_text(const std::string &_content, int _line)
{
    std::string data;
    data.push_back((char)_line);
    data.push_back(0x15);
    data.push_back(1);
    data.push_back(0);
    data.push_back(5);
    data.push_back(0x15);
    data.push_back(1);
    data.push_back(3);
    data.push_back(0);
    data.push_back(0xff);
    data.push_back(0x00);
    data.push_back(0x00);
    data.push_back(0x00);
    data.push_back(0x00);
    data.push_back(0x00);
    data.push_back(0x00);
    data.push_back(0x00);

    auto gbd_content = util_utf2gbk(_content);
    unsigned short cont_len = gbd_content.length();
    data.push_back(*(char *)(&cont_len));
    data.push_back(*((char *)(&cont_len) + 1));
    data.append(gbd_content);

    return data;
}

static std::string make_voice_content(const std::string &_voice)
{
    std::string ret;

    ret.push_back(1);
    ret.append(util_utf2gbk(_voice));

    return ret;
}

static std::string make_trfc_lt()
{
    std::string ret;

    ret.push_back(0);
    ret.push_back(0);
    ret.push_back(0);
    ret.push_back(0);
    ret.push_back(0);
    ret.push_back(1);

    return ret;
}

static std::string make_frame(unsigned char _cmd, const std::string &_data)
{
    std::string ret;

    ret.push_back(0);
    ret.push_back(100);
    ret.push_back(0xff);
    ret.push_back(0xff);
    ret.push_back(_cmd);

    unsigned short cont_len = _data.length();
    ret.push_back(*(char *)(&cont_len));
    ret.append(_data);

    auto crc_value = ModBusCRC16((unsigned char *)(ret.data()), ret.length());
    ret.push_back(*(char *)(&crc_value));
    ret.push_back(*((char *)(&crc_value) + 1));

    tdf_log pack_log("led");
    pack_log.log_package(ret.data(), ret.length());

    return ret;
}

void common_callback(VzLPRClientHandle handle, void *pUserData, VZ_LPRC_COMMON_NOTIFY eNotify, const char *pStrDetail)
{
    auto p_com_driver = (common_driver *)pUserData;
    switch (eNotify)
    {
    case VZ_LPRC_ACCESS_DENIED:
    case VZ_LPRC_NETWORK_ERR:
    case VZ_LPRC_OFFLINE:
        p_com_driver->exit_driver("device offline");
        break;
    case VZ_LPRC_ONLINE:
        break;
    default:
        break;
    }
}
int plate_callback(VzLPRClientHandle handle, void *pUserData,
                   const TH_PlateResult *pResult, unsigned uNumPlates,
                   VZ_LPRC_RESULT_TYPE eResultType,
                   const VZ_LPRC_IMAGE_INFO *pImgFull,
                   const VZ_LPRC_IMAGE_INFO *pImgPlateClip)
{
    std::string plate = pResult->license;
    auto p_com_driver = (common_driver *)pUserData;
    if (plate.length() > 0)
    {
        auto utf_plate = util_gbk2utf(plate);
        if (utf_plate.find("无") == std::string::npos)
        {
            p_com_driver->push_plate_read(1, utf_plate);
        }
    }

    return 0;
}


class zs_plate_cam_driver : public common_driver
{
    bool m_gate_is_open = false;
    bool healthy = true;
public:
    using common_driver::common_driver;
    bool double_led = false;

    virtual void before_exit_driver()
    {
        VzLPRClient_Close(g_zc_handler);
        VzLPRClient_SerialStop(g_zc_ser_handler0);
        if (double_led)
        {
            VzLPRClient_SerialStop(g_zc_ser_handler1);
        }
        VzLPRClient_Cleanup();
    }
    virtual void init_all_set()
    {
        int zs_ret = -1;
        if (0 == (zs_ret = VzLPRClient_Setup()))
        {
            if (0 == (zs_ret = VZLPRClient_SetCommonNotifyCallBack(common_callback, this)))
            {
                auto handler = VzLPRClient_Open(g_dev_ip.c_str(), 80, "admin", "admin");
                if (handler > 0)
                {
                    VZ_SERIAL_PARAMETER ser_param;
                    ser_param.uBaudRate = 19200;
                    ser_param.uDataBits = 8;
                    ser_param.uParity = 0;
                    ser_param.uStopBit = 1;
                    if (0 != (zs_ret = VzLPRClient_SetSerialParameter(handler, 0, &ser_param)))
                    {
                        log_driver(__FUNCTION__, "failed to set ser param:%d", zs_ret);
                        exit_driver("failed to set ser param");
                    }
                    auto ser_handler = VzLPRClient_SerialStart_V2(
                        handler,
                        0,
                        [](int, const unsigned char *_resp_data, unsigned _resp_len, void *)
                        {
                            tdf_log pack_log("led");
                            pack_log.log_package((const char *)_resp_data, _resp_len);
                        },
                        nullptr);
                    if (ser_handler != 0)
                    {
                        g_zc_ser_handler0 = ser_handler;
                    }
                    else
                    {
                        log_driver(__FUNCTION__, "failed to open ser port0:%lld", ser_handler);
                        exit_driver("failed to open ser port0");
                    }
                    if (double_led)
                    {
                        auto ser_handler = VzLPRClient_SerialStart_V2(
                            handler,
                            1,
                            [](int, const unsigned char *_resp_data, unsigned _resp_len, void *)
                            {
                                tdf_log pack_log("led");
                                pack_log.log_package((const char *)_resp_data, _resp_len);
                            },
                            nullptr);
                        if (ser_handler != 0)
                        {
                            g_zc_ser_handler1 = ser_handler;
                        }
                        else
                        {
                            log_driver(__FUNCTION__, "failed to open ser port1:%lld", ser_handler);
                            exit_driver("failed to open ser port1");
                        }
                    }
                    g_zc_handler = handler;
                    if (0 == (zs_ret = VzLPRClient_SetPlateInfoCallBack(handler, plate_callback, this, false)))
                    {
                        log_driver(__FUNCTION__, "init success");
                    }
                    else
                    {
                        log_driver(__FUNCTION__, "failed to set callback:%d", zs_ret);
                        exit_driver("failed to set callback");
                    }
                }
                else
                {
                    log_driver(__FUNCTION__, "failed to open device:%s", g_dev_ip.c_str());
                    exit_driver("failed to open device");
                }
            }
            else
            {
                log_driver(__FUNCTION__, "failed to set common callback:%d", zs_ret);
                exit_driver("failed to set common callback");
            }
        }
        else
        {
            log_driver(__FUNCTION__, "failed to setup device:%d", zs_ret);
            exit_driver("failed to setup device");
        }
    }
    virtual void plate_cam_cap(const int64_t plate_cam_id)
    {
        auto zs_ret = VzLPRClient_ForceTrigger(g_zc_handler);
        if (zs_ret != 0)
        {
            log_driver(__FUNCTION__, "failed to force trigger:%d", zs_ret);
        }
    }
    virtual void push_plate_read(const int64_t plate_cam_id, const std::string &plate_no)
    {
        THR_CALL_DM_BEGIN();
        client->push_plate_read(self_dev_id, plate_no);
        THR_CALL_DM_END();
    }
    virtual void gate_ctrl(const int64_t gate_id, const bool is_open)
    {
        int zs_ret = -1;
        if (!is_open)
        {
            zs_ret = VzLPRClient_SetIOOutputAuto(g_zc_handler, 1, 1000);
        }
        else
        {
            zs_ret = VzLPRClient_SetIOOutputAuto(g_zc_handler, 0, 1000);
        }

        if (zs_ret != 0)
        {
            log_driver(__FUNCTION__, "failed to gate control:%d", zs_ret);
        }
    }
    virtual void led_display(const int64_t led_id, const std::vector<std::string> &content)
    {
        int line_index = 0;
        int zs_ret = 0;
        for (auto &itr : content)
        {
            auto l_frame = make_frame(0x62, make_oneline_text(itr, line_index++));
            usleep(120000);
            zs_ret |= VzLPRClient_SerialSend(g_zc_ser_handler0, (unsigned char *)(l_frame.data()), l_frame.length());
            if (double_led)
            {
                zs_ret |= VzLPRClient_SerialSend(g_zc_ser_handler1, (unsigned char *)(l_frame.data()), l_frame.length());
            }
        }
        if (0 != zs_ret)
        {
            log_driver(__FUNCTION__, "failed to send ser data:%d", zs_ret);
        }
    }
    virtual void speaker_cast(const int64_t speaker_id, const std::string &content)
    {
        auto voice_req = make_frame(0x30, make_voice_content(content));
        usleep(120000);
        auto zs_ret = VzLPRClient_SerialSend(g_zc_ser_handler0, (unsigned char *)(voice_req.data()), voice_req.length());
        if (0 != zs_ret)
        {
            log_driver(__FUNCTION__, "failed to send ser data:%d", zs_ret);
        }
    }
    virtual void last_plate_read(std::string &_return, const int64_t plate_cam_id)
    {
        _return = g_last_plate;
    }
    virtual void cap_picture_slow(std::string &_return, const int64_t cam_id)
    {
        std::string pic_path = "/tmp/pic" + std::to_string(self_dev_id) + "_" + std::to_string(time(nullptr)) + ".jpg";
        int zs_ret = -1;
        if (0 == (zs_ret = VzLPRClient_SaveSnapImageToJpeg(g_zc_handler, pic_path.c_str())))
        {
            _return = file_store_name(pic_path, "jpg", true);
        }
        else
        {
            log_driver(__FUNCTION__, "faile to snap:%d", zs_ret);
        }
    }
    bool m_was_blocking = false;
    void force_close_gate()
    {
        bool force_close = false;
        THR_CALL_BEGIN(config_management);
        running_rule rule;
        client->get_rule(rule);
        force_close = rule.force_close;
        THR_CALL_END();
        if (force_close)
        {
            int val = 0;
            auto zs_ret = VzLPRClient_GetGPIOValue(g_zc_handler, 1, &val);
            if (0 == val)
            {
                m_was_blocking = true;
            }
            else
            {
                if (m_was_blocking)
                {
                    gate_ctrl(1, false);
                }
                m_was_blocking = false;
            }
        }
    }
    virtual bool gate_is_close(const int64_t gate_id)
    {
        bool ret = false;
        force_close_gate();
        int val = 1;
        auto zs_ret = VzLPRClient_GetGPIOValue(g_zc_handler, 0, &val);
        if (1 == val)
        {
            zs_ret = VzLPRClient_GetGPIOValue(g_zc_handler, 1, &val);
            if (1 == val)
            {
                ret = true;
            }
        }
        if (zs_ret != 0)
        {
            log_driver(__FUNCTION__, "failed to get gate status:%d", zs_ret);
        }

        return ret;
    }
};

int main(int argc, char **argv)
{
    using namespace clipp;
    unsigned short run_port = 0;
    unsigned short self_id;
    bool double_led = false;
    auto cli = (required("-p") & value("port", run_port),
                required("-i") & value("self_id", self_id),
                required("-a") & value("device_ip", g_dev_ip),
                option("-d").set(double_led));
    if (!parse(argc, argv, cli))
    {
        std::cerr << "Usage:\n"
                  << usage_lines(cli, argv[0])
                  << '\n';
        return -1;
    }
    auto pd = new zs_plate_cam_driver("zs_plate_cam_driver" + std::to_string(self_id), self_id);
    pd->double_led = double_led;
    pd->init_all_set();
    common_driver::start_driver(run_port, pd);

    return 0;
}
