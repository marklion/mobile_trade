/**
 *	libtermb header file
**/

/**	初始化设备
 * @Parm 			[in]szPort		设备路径：	"/dev/ttyS0"，表示串口0;	"usb"，表示USB设备。
 * @return 			1 - 成功			-1 - 端口错误
**/
int InitComm(const char* szPort);


/**	关闭设备
**/
void CloseComm();


/**	获取SAMID
 * @Parm 			[out]char szSamId[50]		返回samid
 * @return 			1 - 成功
**/
int GetSamdId(char* szSamId);


/**	寻卡
 * @return 			0		寻卡失败
 * 					0x80	寻卡命令成功，但该卡已经读取过或者已拿走
 * 					0x9F	寻卡命令成功，该卡未读取过
**/
int FindCardCmd();


/**	选卡
 * @return 			0		选卡失败
 * 					0x80	选卡命令成功，但该卡已经读取过或者已拿走
 * 					0x9F	选卡命令成功，该卡未读取过
**/
int SelCardCmd();


/**	读取卡中基本信息，包括文字信息、原始图像信息wlt,解码后图像信息
 * @parm	[out]char szTxt[512]		文字信息【GB2312】	例：何明|男|汉|19871016|河北鹿泉区槐安路211号|130423198710164211|石家庄公安局|20130330-20230330。
 * @parm	[out]char wlt[2048]		加密的图像信息
 * @parm	[out]char bmp[38862]		解密后的图像信息
 * @return 			1 - 成功			其他失败
**/
int ReadCard(char* szTxt, char* szWlt, char* szBmp);


/**	读取卡中基本信息，包括文字信息、原始图像信息wlt,解码后图像信息【获取指纹信息，通过GetFingerData获取】
 * @parm	[out]char szTxt[512]		文字信息【GB2312】	例：何明|男|汉|19871016|河北鹿泉区槐安路211号|130423198710164211|石家庄公安局|20130330-20230330。
 * @parm	[out]char wlt[2048]		加密的图像信息
 * @parm	[out]char bmp[38862]		解密后的图像信息
 * @return 			1 - 成功			其他失败
**/
int ReadCardExt(char* szTxt, char* szWlt, char* szBmp);


/**	ReadCardExt
 * @parm	[out]char finger[1024]		指纹数据	
 * @return 			>0	成功，指纹数据长度			 0 失败
**/
int GetFingerData(char* finger);


/**	读取卡中基本信息，包括文字信息、原始图像信息wlt,解码后图像信息【后台获取指纹信息，通过GetFingerData获取】
 * @parm	[in]char wlt[1024]		加密的图像信息
 * @parm	[out]char bmp[38862]		解密后的图像信息
 * @return 			1 - 成功			0 失败
**/
int WltToBmp(char* szWlt, char* szBmp);

