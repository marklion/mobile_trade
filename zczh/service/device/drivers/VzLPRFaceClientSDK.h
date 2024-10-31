//用于接入VZ的人脸抓拍相机的应用程序接口
#ifndef _VZ_LPR_FACE_CLIENT_SDK_
#define _VZ_LPR_FACE_CLIENT_SDK_
#include "VzLPRClientSDKDefine.h"

#ifdef  LINUX
#ifdef __cplusplus
extern "C"
{
#endif
#endif

/**
*  @brief 人脸抓拍结果
*  @param [OUT] face_result 人脸结果
*  @param [OUT] pUserData 用户自定义数据
*/
typedef void (__STDCALL *VZLPRC_FACE_RESULT_CALLBACK)(VzLPRClientHandle handle, TH_FaceResult* face_result, void* pUserData);

/**
*  @brief 设置人脸抓拍结果回调
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] func 回调接口
*  @param [IN] pUserData 用户自定义数据
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_SetFaceResultCallBack(VzLPRClientHandle handle, VZLPRC_FACE_RESULT_CALLBACK func, void* pUserData);


/**
*  @brief 人数统计结果
*  @param [OUT] area1_num 区域一人数
*  @param [OUT] area2_num 区域二人数
*  @param [OUT] pUserData 用户自定义数据
*/
typedef void (__STDCALL *VZLPRC_FACE_COUNT_STAT_CALLBACK)(VzLPRClientHandle handle, int area1_num, int area2_num, void* pUserData);

/**
*  @brief 设置人数统计结果回调
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] func 回调接口
*  @param [IN] pUserData 用户自定义数据
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_SetFaceCountStatCallBack(VzLPRClientHandle handle, VZLPRC_FACE_COUNT_STAT_CALLBACK func, void* pUserData);


/**
*  @brief 获取人脸识别区域的规则
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [OUT] face_rule_area 人脸识别规则
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_GetFaceRuleArea(VzLPRClientHandle handle, TH_FaceRuleArea* face_rule_area);

/**
*  @brief 设置人脸识别区域的规则
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] face_rule_area 人脸识别规则
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_SetFaceRuleArea(VzLPRClientHandle handle, TH_FaceRuleArea* face_rule_area);

/**
*  @brief 获取人脸屏蔽区域的规则
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [OUT] face_rule_area 人脸屏蔽区域
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_GetFaceShieldArea(VzLPRClientHandle handle, TH_FaceShieldArea* face_shield_area);

/**
*  @brief 设置人脸屏蔽区域的规则
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] face_rule_area 人脸屏蔽区域
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_SetFaceShieldArea(VzLPRClientHandle handle, TH_FaceShieldArea* face_shield_area);

/**
*  @brief 设置人脸IRCUT的状态
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] ircut 视频参数
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_SetFaceIrcutParams(VzLPRClientHandle handle, int ircut);

/**
*  @brief 获取人脸IRCUT的状态
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] ircut 视频参数
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_GetFaceIrcutParams(VzLPRClientHandle handle, int* ircut);

/**
*  @brief 区域流动人员统计数据清空
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_FaceResetCounter(VzLPRClientHandle handle);

/**
*  @brief 设置是否绘制识别框
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] bDraw  0不代表不绘制, 1代表绘制
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_FaceSetIsDrawTargetRect(VzLPRClientHandle handle, int bDraw);

/**
*  @brief 查询图片列表
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_FaceQueryPicList(VzLPRClientHandle handle, int type, int sub_type, const char* start_time, const char* end_time, int page_num, int page_size, VZ_PIC_LIST_RESULT *picture_result);


/**
*  @brief 结构化查询
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_FaceQueryReccordData(VzLPRClientHandle handle, int data_type, int page_num, int page_size, const char* start_time, const char* end_time, VZ_FACE_QUERY_CONDITION *condition, VZ_FACE_RECORD_RESULT *record_result);


/**
*  @brief 区域计数结果
*  @param [OUT] count_result区域计数结果
*  @param [OUT] pUserData 用户自定义数据
*/
typedef void (__STDCALL *VZLPRC_FACE_AREA_COUNT_CALLBACK)(VzLPRClientHandle handle, TH_AreaCountResult* count_result, void* pUserData);

/**
*  @brief 设置区域计数结果回调
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] func 回调接口
*  @param [IN] pUserData 用户自定义数据
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_SetFaceAreaCountCallBack(VzLPRClientHandle handle, VZLPRC_FACE_AREA_COUNT_CALLBACK func, void* pUserData);

/**
*  @brief 获取当前区域人数
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [OUT] people_num 人数结果
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_FaceGetAreaPeopleNum(VzLPRClientHandle handle, int* people_num);

/**
*  @brief 获取当前绊线计数的结果
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [OUT] area1_num 向区域1流动人数记录
*  @param [OUT] area2_num 向区域2流动人数记录
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_FaceGetAreaTrip(VzLPRClientHandle handle, int* area1_num, int* area2_num);

/**
*  @brief 安装向导推送结果
*  @param [OUT] count_result区域计数结果
*  @param [OUT] pUserData 用户自定义数据
*/
typedef void (__STDCALL *VZLPRC_FACE_GUIDE_DATA_PUSH_CALLBACK)(VzLPRClientHandle handle, TH_FaceGuideData* guide_data, void* pUserData);

/**
*  @brief 设置安装向导推送回调
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [IN] func 回调接口
*  @param [IN] pUserData 用户自定义数据
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_SetGuideDataCallBack(VzLPRClientHandle handle, VZLPRC_FACE_GUIDE_DATA_PUSH_CALLBACK func, void* pUserData);


/**
*  @brief 弃用
*  @brief 获取人脸相机SD信息(此接口弃用，使用VzLPRClient_GetCameraConfig替代)
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @param [OUT] sd_info SD卡信息
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_GetFaceSDInfo(VzLPRClientHandle handle, TH_FaceSDInfo* sd_info);

/**
*  @brief 弃用
*  @brief 格式化人脸相机SD卡(统一使用VzLPRClient_SDFormat格式化的接口)
*  @param [IN] handle 由VzLPRClient_Open函数获得的句柄
*  @return 返回值为0表示成功，返回其他值表示失败。
*/
VZ_LPRC_API int __STDCALL VzLPRClient_FaceFormatSd(VzLPRClientHandle handle);

#ifdef  LINUX
#ifdef __cplusplus
}
#endif
#endif


#endif
