#include "bx_sdk_dual.h"
#include <iostream>
#include <string.h>
int main(int argc, char const *argv[])
{
    if (argc != 4)
    {
        std::cout << "Usage: " << argv[0] << " <ip> <port> <x_offset>" << std::endl;
        return -1;
    }
    std::string input_text;
    std::string line;
    int ln = 0;
    while (std::getline(std::cin, line)) {
        input_text += line + '\n';
        std::cout << line + "-->" << ln++ <<std::endl;
    }
    auto ip = (Ouint8 *)(argv[1]);
    auto port = (Ouint16)atoi(argv[2]);
    auto x_offset =(Ouint16)atoi(argv[3]);
    auto width = (Ouint16)(128-x_offset);
    auto height = (Ouint16)96;
    auto text = (Ouint8 *)(input_text.c_str());
    EQareaHeader_G6 ah;
    ah.AreaEqual = 0;
    ah.AreaHeight = height;
    ah.AreaType = 0x10;
    ah.AreaWidth = width;
    ah.AreaX = x_offset;
    ah.AreaY = 0;
    ah.BackGroundFlag = 0;
    memset(&(ah.stSoundData), 0, sizeof(ah.stSoundData));
    ah.Transparency = 101;
    EQpageHeader_G6 ph;
    ph.arrMode = eMULTILINE;
    ph.BackNotValidFlag = 0;
    ph.CartoonFrameRate = 0;
    ph.ClearMode = 0;
    ph.color = eSCREEN_COLOR_SINGLE;
    ph.DisplayMode = 0x01;
    ph.fontBold = false;
    ph.fontItalic = false;
    ph.Halign = 1;
    ph.PageStyle = 0;
    ph.RepeatTime = 1;
    ph.Speed = 64;
    ph.StayTime = 500;
    ph.tdirection = pNORMAL;
    ph.txtSpace = 1;
    ph.ValidLen = 1;
    ph.Valign = 1;
    ph.fontSize = 9;
    bxDual_dynamicArea_AddAreaTxtDetails_6G(ip, port, eSCREEN_COLOR_SINGLE, 0, &ah, &ph, (unsigned char *)"黑体", text);
    return 0;
}