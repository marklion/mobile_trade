const express = require('express');
const app = express();
const port = 8080;
const thrift = require('thrift');
const Int64 = require('node-int64');
const _ = require('lodash')
const showdown = require("showdown")

const zh_rpc_config_management = require('../base/build/lib/node_gen_code/config_management')
const zh_rpc_rbac_center = require('../base/build/lib/node_gen_code/rbac_center')
const zh_rpc_device_management = require('../base/build/lib/node_gen_code/device_management')
const zh_rpc_order_center = require('../base/build/lib/node_gen_code/order_center')
'use strict';

const fs = require('fs');
const { gen_exp } = require('../base/build/lib/node_gen_code/idl_types');
const json2md = require('json2md');

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
function request_rpc(service_name, process_name, params, one_way = false) {
    let mp = new thrift.Multiplexer();
    let path = "/zh_rpc";
    let remote_port = 8123;
    if (service_name == "device_management") {
        remote_port = 8124;
    }
    let options = {
        transport: thrift.TBufferedTransport,
        protocol: thrift.TJSONProtocol,
        path: path,
        https: false,
    };
    let connection = thrift.createHttpConnection("localhost", remote_port, options);
    let new_write = (data) => {
        var http = require('http');
        var https = require('https');
        var self = connection;
        var opts = self.nodeOptions;
        opts.headers["Content-length"] = data.length;
        if (!opts.headers["Content-Type"])
            opts.headers["Content-Type"] = "application/x-thrift";
        var req = (self.https) ?
            https.request(opts, self.responseCallback) :
            http.request(opts, self.responseCallback);
        req.on('error', function (err) {
            if (err.code === "ECONNRESET") {
                console.log("Timeout occurs");
            }
            else {
                self.emit("error", err);
            }
        });
        req.write(data);
        req.end();
        setTimeout(() => {
            req.destroy();
        }, 2000);
    };
    if (one_way) {
        connection.write = new_write;
    }
    let client = mp.createClient(service_name, eval("zh_rpc_" + service_name), connection);
    return new Promise(function (resolve, reject) {
        client[process_name].apply(client, params).then(function (resp) {
            resolve(resp);
        }).catch(function (err) {
            reject(err);
        });
    });
}

async function verify_rbac(token, target_moduel, target_resource, is_write) {
    let resp = await request_rpc("rbac_center", "has_permission", [token, target_moduel, target_resource, is_write]);
    return resp;
}

const g_device_meta_format = function (name, mean) {
    return {
        name: name,
        type: Object,
        mean: mean,
        explain: [
            {
                name: "name",
                type: String,
                mean: "设备命名"
            },
            {
                name: "id",
                type: Number,
                mean: "设备编号"
            },
            {
                name: "driver_args",
                type: String,
                mean: "设备运行参数"
            },
            {
                name: "driver",
                type: Object,
                mean: "设备驱动信息",
                explain: [
                    {
                        name: "name",
                        type: String,
                        mean: "驱动名称",
                    },
                    {
                        name: "id",
                        type: Number,
                        mean: "驱动编号",
                    },
                    {
                        name: "path",
                        type: Number,
                        mean: "驱动路径",
                    },
                ],
            },
        ]
    }
}

const g_device_couple_format = function (name, mean) {
    return {
        name: name,
        mean: '前后' + mean + "配置",
        type: Object,
        explain: [
            g_device_meta_format('front', '前' + mean + '配置'),
            g_device_meta_format('back', '后' + mean + '配置'),
        ]
    }
}

const g_scale_set_info = {
    type: Object,
    mean: '磅配置信息',
    name: 'set_info',
    explain: [
        {
            name: "name",
            type: String,
            mean: "磅名",
        },
        {
            name: "id",
            type: Number,
            mean: "磅编号",
        },
        g_device_meta_format('scale', '磅仪表配置'),
        g_device_couple_format('plate_cam', '车牌识别'),
        g_device_couple_format('video_cam', '监控'),
        g_device_couple_format('led', '屏幕'),
        g_device_couple_format('speaker', '喇叭'),
        g_device_couple_format('id_reader', '身份证阅读器'),
        g_device_couple_format('qr_reader', '二维码阅读器'),
        g_device_couple_format('gate', '道闸'),
        g_device_couple_format('printer', '打印机'),
        g_device_meta_format('card_reader', '读卡器'),
    ],
}

const g_order_found_result = {
    type: Array,
    mean: "搜索到的派车单信息",
    explain: [
        {
            name: 'back_plate_number',
            type: String,
            mean: "挂车车牌号"
        },
        {
            name: 'call_info',
            type: Object,
            mean: "叫号信息",
            explain: [
                {
                    name: "operator_name",
                    type: String,
                    mean: '操作人'
                },
                {
                    name: "operator_time",
                    type: String,
                    mean: '操作时间'
                }
            ]
        },
        {
            name: 'company_name',
            type: String,
            mean: "派车公司"
        },
        {
            name: 'reg_no',
            type: Number,
            mean: '排队序号，0 代表没排队'
        },
        {
            name: 'confirm_info',
            type: Object,
            mean: "确认装卸货信息",
            explain: [
                {
                    name: "operator_name",
                    type: String,
                    mean: '操作人'
                },
                {
                    name: "operator_time",
                    type: String,
                    mean: '操作时间'
                }
            ]
        },
        {
            name: 'driver_id',
            type: String,
            mean: "司机身份证号"
        },
        {
            name: 'driver_name',
            type: String,
            mean: "司机姓名"
        },
        {
            name: 'driver_phone',
            type: String,
            mean: "司机电话"
        },
        {
            name: 'enter_weight',
            type: String,
            mean: "进厂前重量"
        },
        {
            name: 'id',
            type: Number,
            mean: "编号"
        },
        {
            name: 'is_sale',
            type: Boolean,
            mean: "是否用于销售"
        },
        {
            name: 'm_time',
            type: String,
            mean: "二次称重时间"
        },
        {
            name: 'm_weight',
            type: Number,
            mean: "二次称重重量"
        },
        {
            name: 'order_number',
            type: String,
            mean: "派车单号",
        },
        {
            name: 'p_time',
            type: String,
            mean: "一次称重时间",
        },
        {
            name: 'p_weight',
            type: Number,
            mean: "一次称重重量",
        },
        {
            name: 'plate_number',
            type: String,
            mean: " 车牌号",
        },
        {
            name: 'reg_info',
            type: Object,
            mean: "排号信息",
            explain: [
                {
                    name: "operator_name",
                    type: String,
                    mean: '操作人'
                },
                {
                    name: "operator_time",
                    type: String,
                    mean: '操作时间'
                }
            ],
        },
        {
            name: 'seal_no',
            type: String,
            mean: "铅封号",
        },
        {
            name: 'status',
            type: Number,
            mean: "状态：0->无效， 1->未入场, 2->正在执行, 100->已完成",
        },
        {
            name: 'stuff_from',
            type: String,
            mean: "物料来源地",
        },
        {
            name: 'stuff_name',
            type: String,
            mean: "物料名",
        },
        {
            name: 'order_attachs',
            type: Array,
            mean: "派车单附件",
            explain: [
                {
                    name: 'att_name',
                    type: String,
                    mean: '附件名',
                },
                {
                    name: 'att_path',
                    type: String,
                    mean: '附件路径',
                },
                {
                    name: 'id',
                    type: Number,
                    mean: ' 编号',
                },
            ],
        },
        {
            name: 'history_records',
            type: Array,
            mean: "执行历史节点",
            explain: [
                {
                    name: "id",
                    type: Number,
                    mean: '编号'
                },
                {
                    name: "node_caller",
                    type: String,
                    mean: '执行者'
                },
                {
                    name: "node_name",
                    type: String,
                    mean: '节点名'
                },
                {
                    name: "occour_time",
                    type: String,
                    mean: '执行时间'
                },
            ],
        },
        {
            name:'continue_until',
            type:String,
            mean:'连续派车截止日期, 为空则不是连续派车单',
        }
    ]
}

const g_api_order_params = {

    type: Object,
    have_to: true,
    explain: [
        {
            name: "back_plate_number",
            type: String,
            mean: "挂车号",
            have_to: false,
        },
        {
            name: "company_name",
            type: String,
            mean: "派车公司",
            have_to: false,
        },
        {
            name: "driver_id",
            type: String,
            mean: "司机身份证号",
            have_to: false,
        },
        {
            name: "driver_name",
            type: String,
            mean: "司机姓名",
            have_to: false,
        },
        {
            name: "driver_phone",
            type: String,
            mean: "司机电话",
            have_to: true,
        },
        {
            name: "enter_weight",
            type: Number,
            mean: "进厂前净重",
            have_to: false,
        },
        {
            name: "is_sale",
            type: Boolean,
            mean: "是否是销售车辆",
            have_to: false,
        },
        {
            name: "plate_number",
            type: String,
            mean: "车牌号",
            have_to: true,
        },
        {
            name: "stuff_from",
            type: String,
            mean: "物料来源地",
            have_to: false,
        },
        {
            name: "stuff_name",
            type: String,
            mean: "物料名",
            have_to: false,
        },
        {
            name: "continue_until",
            type: String,
            mean: "连续派车截止日期, 为空则不是连续派车单",
            have_to: false,
        },
        {
            name: "opt_name",
            type: String,
            mean: "操作人，不存在或为空则记录为当前调用用户",
            have_to: false,
        },
    ]

};

const g_api_permisson = {
    "/api/login": {
        module: '',
        resource: '',
        is_write: false,
        no_need_rabc: true,
        handler: async function (body) {
            return await request_rpc('rbac_center', 'login', [body.phone, body.pwd]);
        },
        help_info: {
            title: "登录系统",
            describe: "调用其他接口前应该先调用此接口获取 token 并保存好",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "phone",
                        type: String,
                        mean: "user's phone number",
                        have_to: true,
                    },
                    {
                        name: "pwd",
                        type: String,
                        mean: "user's password that handled with md5 hashing",
                        have_to: true,
                    }
                ]
            },
            result: {
                type: String,
                mean: "token for other apis",
            },
        },
    },
    "/api/user_info": {
        module: '',
        resource: '',
        is_write: false,
        no_need_rabc: true,
        handler: async function (body) {
            return await request_rpc('rbac_center', 'get_user_by_token', [body.token]);
        },
        help_info: {
            title: "获取用户信息",
            describe: "获取用户信息",
            result: {
                type: Object,
                mean: "用户信息",
                explain: [
                    {
                        name: "id",
                        mean: "用户编号",
                        type: Number,
                    },
                    {
                        name: "name",
                        mean: "用户名",
                        type: String,
                    },
                    {
                        name: "phone",
                        mean: "用户电话",
                        type: String,
                    },
                    {
                        name: "md5_password",
                        mean: "密码",
                        type: String,
                    },
                ],
            },
        },
    },
    "/api/order/add": {
        module: 'order',
        resource: 'vehicle_order_info',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            return await request_rpc('order_center', 'add_order', [body, name]);
        },
        help_info: {
            title: "创建派车单",
            describe: "创建后派车单处于未入场状态",
            params: g_api_order_params,
            result: {
                type: Boolean,
                mean: "是否创建成功",
            },
        },
    },
    "/api/order/update": {
        module: 'config',
        resource: 'vehicle_order_info',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            return await request_rpc('order_center', 'update_order', [body, name]);
        },
        help_info: {
            title: "修改派车单",
            describe: "修改派车单信息",
            params: g_api_order_params,
            result: {
                type: Boolean,
                mean: "是否创建成功",
            },
        },
    },
    "/api/order/del": {
        module: 'order',
        resource: 'vehicle_order_info',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            body.opt_name = name;
            return await request_rpc('order_center', 'del_order', [body.order_number, name]);
        },
        help_info: {
            title: "关闭派车单",
            describe: "只能关闭未入场的派车单",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "opt_name",
                        type: String,
                        mean: "操作人，不存在或为空则记录为当前调用用户",
                        have_to: false,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否关闭成功",
            },
        },
    },
    "/api/order/count": {
        module: 'order',
        resource: 'vehicle_order_info',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'count_order', [body]);
        },
        help_info: {
            title: "获取派车单数量",
            describe: "参数是搜索条件",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "plate_number",
                        type: String,
                        mean: "车牌号",
                        have_to: false,
                    },
                    {
                        name: "driver_phone",
                        type: String,
                        mean: "司机电话",
                        have_to: false,
                    },
                    {
                        name: "company_name",
                        type: String,
                        mean: "派车公司",
                        have_to: false,
                    },
                    {
                        name: "stuff_name",
                        type: String,
                        mean: "货物名称",
                        have_to: false,
                    },
                    {
                        name: "status",
                        type: Number,
                        mean: "状态,0->不过滤",
                        have_to: false,
                    },
                    {
                        name: "begin_time",
                        type: String,
                        mean: " 起始时间",
                        have_to: false,
                    },
                    {
                        name: "end_time",
                        type: String,
                        mean: "结束时间",
                        have_to: false,
                    },
                    {
                        name: "page_no",
                        type: Number,
                        mean: "页码，缺省情况为第一页;每页 20 条数据",
                        have_to: false,
                    },
                    {
                        name: "driver_id",
                        type: String,
                        mean: "司机身份证号",
                        have_to: false,
                    },
                    {
                        name: "exp_status",
                        type: Number,
                        mean: "排除的状态",
                        have_to: false,
                    },
                ]
            },
            result: {
                type: Number,
                mean: "数量",
            },
        },
    },
    "/api/order/search": {
        module: 'order',
        resource: 'vehicle_order_info',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'search_order', [body]);
        },
        help_info: {
            title: " 搜索派车单",
            describe: "参数是搜索条件",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "plate_number",
                        type: String,
                        mean: "车牌号",
                        have_to: false,
                    },
                    {
                        name: "driver_phone",
                        type: String,
                        mean: "司机电话",
                        have_to: false,
                    },
                    {
                        name: "company_name",
                        type: String,
                        mean: "派车公司",
                        have_to: false,
                    },
                    {
                        name: "stuff_name",
                        type: String,
                        mean: "货物名称",
                        have_to: false,
                    },
                    {
                        name: "status",
                        type: Number,
                        mean: "状态,0->不过滤",
                        have_to: false,
                    },
                    {
                        name: "create_time_begin",
                        type: String,
                        mean: "创建起始时间",
                        have_to: false,
                    },
                    {
                        name: "create_time_end",
                        type: String,
                        mean: " 创建结束时间",
                        have_to: false,
                    },
                    {
                        name: "begin_time",
                        type: String,
                        mean: "一次称重起始时间",
                        have_to: false,
                    },
                    {
                        name: "end_time",
                        type: String,
                        mean: "一次称重结束时间",
                        have_to: false,
                    },
                    {
                        name: "page_no",
                        type: Number,
                        mean: "页码，缺省情况为第一页;每页 20 条数据",
                        have_to: false,
                    },
                    {
                        name: "driver_id",
                        type: String,
                        mean: "司机身份证号",
                        have_to: false,
                    },
                    {
                        name: "exp_status",
                        type: Number,
                        mean: "排除的状态",
                        have_to: false,
                    },
                ]
            },
            result: g_order_found_result
        },
    },
    "/api/order/get": {
        module: 'order',
        resource: 'vehicle_order_info',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'get_order', [body.order_number]);
        },
        help_info: {
            title: "查找派车单",
            describe: "参数是搜索条件",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: 'order_number',
                        type: String,
                        mean: "订单号",
                        have_to: true,
                    },
                ]
            },
            result: g_order_found_result
        },
    },

    "/api/order/get_registered_order": {
        module: 'order',
        resource: 'vehicle_check_in',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'get_registered_order', []);
        },
        help_info: {
            title: "获取已经排号的订单信息",
            describe: "返回数据是按照排号顺序排序的",
            result: g_order_found_result
        },
    },
    "/api/order/check_in": {
        module: 'order',
        resource: 'vehicle_check_in',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            return await request_rpc('order_center', 'order_check_in', [body.order_number, body.is_check_in, name]);
        },
        help_info: {
            title: "车辆排号",
            describe: "未入场时可以排号",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "is_check_in",
                        type: Boolean,
                        mean: "排号还是取消排号",
                        have_to: true,
                    },
                    {
                        name: "opt_name",
                        type: String,
                        mean: "操作人, 不存在或为空则记录为当前调用用户",
                        have_to: false,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否排号成功",
            },
        },
    },
    "/api/order/call": {
        module: 'order',
        resource: 'vehicle_check_in',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            return await request_rpc('order_center', 'order_call', [body.order_number, body.is_call, name]);
        },
        help_info: {
            title: "叫车进场",
            describe: "只能叫已经排号的车辆进场",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "is_call",
                        type: Boolean,
                        mean: "叫号还是取消叫号",
                        have_to: true,
                    },
                    {
                        name: "opt_name",
                        type: String,
                        mean: "操作人, 不存在或为空则记录为当前调用用户",
                        have_to: false,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否叫号成功",
            },
        },
    },
    "/api/order/confirm": {
        module: 'order',
        resource: 'vehicle_check_in',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            return await request_rpc('order_center', 'order_confirm', [body.order_number, body.is_confirm, name]);
        },
        help_info: {
            title: "确认装卸货",
            describe: "只能对已经叫号的车辆确认装卸货",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "is_confirm",
                        type: Boolean,
                        mean: "确认还是取消确认",
                        have_to: true,
                    },
                    {
                        name: "opt_name",
                        type: String,
                        mean: "操作人, 不存在或为空则记录为当前调用用户",
                        have_to: false,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否确认成功",
            },
        },
    },
    "/api/order/set_seal_no": {
        module: 'order',
        resource: 'vehicle_check_in',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'order_set_seal_no', [body.order_number, body.seal_no]);
        },
        help_info: {
            title: "设置铅封号",
            describe: "缺省情况下铅封号为空",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "seal_no",
                        type: String,
                        mean: " 铅封号",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否设置成功",
            },
        },
    },
    "/api/order/rollback": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            return await request_rpc('order_center', 'order_rollback_weight', [body.order_number, name]);
        },
        help_info: {
            title: "回退一次重量",
            describe: "回退一次重量",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "opt_name",
                        type: String,
                        mean: "操作人",
                        have_to: false,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否成功",
            },
        },
    },
    "/api/order/push_gate": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'order_push_gate', [body.order_number, body.opt_name]);
        },
        help_info: {
            title: "推送进出信息",
            describe: "第一次推送为进入，第二次为出",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "opt_name",
                        type: String,
                        mean: "操作人",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否进出成功",
            },
        },
    },
    "/api/order/push_weight": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            let name = body.opt_name;
            if (!name) {
                name = await request_rpc('rbac_center', 'get_name_by_token', [body.token]);
            }
            return await request_rpc('order_center', 'order_push_weight', [body.order_number, body.weight, name]);
        },
        help_info: {
            title: "推送重量",
            describe: "根据派车单状态可能记录为皮重或毛重",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "order_number",
                        type: String,
                        mean: "派车单号",
                        have_to: true,
                    },
                    {
                        name: "weight",
                        type: Number,
                        mean: "重量",
                        have_to: true,
                    },
                    {
                        name: "opt_name",
                        type: String,
                        mean: "操作人",
                        have_to: false,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否记录成功",
            },
        },
    },
    "/api/get_scale_sm_info": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'get_scale_sm_info', []);
        },
        help_info: {
            title: "获取称重状态",
            describe: "能获取到称重状态和所属的磅配置",
            result: {
                type: Object,
                mean: '当前磅的配置和状态',
                explain: [
                    {
                        name: 'cur_state',
                        type: String,
                        mean: "当前状态"
                    },
                    {
                        name: 'cur_plate',
                        type: String,
                        mean: "当前车牌"
                    },
                    {
                        name: 'cur_weight',
                        type: Number,
                        mean: "当前重量"
                    },
                    {
                        name: 'front_gate_is_close',
                        type: Boolean,
                        mean: "前道闸是否关闭"
                    },
                    {
                        name: 'back_gate_is_close',
                        type: Boolean,
                        mean: "后道闸是否关闭"
                    },
                    g_scale_set_info,
                ],
            },
        },
    },
    "/api/get_gate_sm_info": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'get_gate_sm_info', []);
        },
        help_info: {
            title: "获取大门状态",
            describe: "能获取到大门的配置",
            result: {
                type: Object,
                mean: '当前门的配置',
                explain: [
                    g_scale_set_info,
                ],
            },
        },
    },
    "/api/reset_scale_sm": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'reset_scale_sm', [body.sm_id]);
        },
        help_info: {
            title: "重置磅",
            describe: "把磅的状态重置为空闲",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "sm_id",
                        type: Number,
                        mean: "磅编号",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: " 是否成功",
            },
        },
    },
    "/api/confirm_scale": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'confirm_scale', [body.sm_id]);
        },
        help_info: {
            title: "手动开始称重",
            describe: "当设备无法确认车辆完全上磅时，可以手动开始称重",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "sm_id",
                        type: Number,
                        mean: "磅编号",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: " 是否成功",
            },
        },
    },
    "/api/gate_ctrl": {
        module: 'device',
        resource: 'all_device',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'gate_ctrl', [body.device_id, body.is_open], true);
        },
        help_info: {
            title: "控制道闸",
            describe: "指定设备 ID 对应的道闸开或关",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "device_id",
                        type: Number,
                        mean: "设备编号",
                        have_to: true,
                    },
                    {
                        name: "is_open",
                        type: Boolean,
                        mean: "开或关, true->开, false->关",
                        have_to: true,
                    }
                ]
            },
            result: {
                type: Boolean,
                mean: "默认成功",
            },
        },
    },
    "/api/plate_cam_cap": {
        module: 'device',
        resource: 'all_device',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'plate_cam_cap', [body.device_id], true);
        },
        help_info: {
            title: "触发抓拍机识别车牌",
            describe: "车辆靠近时若没有自动触发，可调用此接口手动触发",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "device_id",
                        type: Number,
                        mean: "设备编号",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "默认成功",
            },
        },
    },
    "/api/cap_picture": {
        module: 'device',
        resource: 'all_device',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'cap_picture_slow', [body.device_id]);
        },
        help_info: {
            title: "抓拍机拍照",
            describe: "抓拍机拍照",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "device_id",
                        type: Number,
                        mean: "设备编号",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: String,
                mean: "图片路径",
            },
        },
    },
    "/api/device_mock/push_plate": {
        module: 'device',
        resource: 'all_device',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'push_plate_read', [body.device_id, body.plate_no], true);
        },
        help_info: {
            title: "车牌触发",
            describe: "用于仿冒车牌触发",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "device_id",
                        type: Number,
                        mean: "设备id",
                        have_to: true,
                    },
                    {
                        name: "plate_no",
                        type: String,
                        mean: " 车牌号",
                        have_to: true,
                    }
                ]
            },
            result: {
                type: Boolean,
                mean: "默认成功",
            },
        },
    },
    "/api/req_que/get": {
        module: 'order',
        resource: 'vehicle_order_info',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'get_req_que', []);
        },
        help_info: {
            title: "获取第三方请求队列",
            describe: "如果有第三方请求未完成，队列则不为空",
            result: {
                type: Boolean,
                mean: "默认成功",
            },
        },
    },
    "/api/req_que/pop": {
        module: 'order',
        resource: 'vehicle_order_info',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('order_center', 'pop_out_req', [body.req_id]);
        },
        help_info: {
            title: "弹出请求队列中的元素",
            describe: "弹出后则不发送该请求",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "req_id",
                        type: Number,
                        mean: "请求编号",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: Array,
                mean: '队列中的内容',
                explain: [
                    {
                        name: 'req_url',
                        type: String,
                        mean: "请求路径"
                    },
                    {
                        name: 'req_body',
                        type: String,
                        mean: "请求内容"
                    },
                    {
                        name: 'id',
                        type: Number,
                        mean: "请求编号"
                    },
                ],
            },
        },
    },
    "/api/device_run_time": {
        module: 'order',
        resource: 'vehicle_scale',
        is_write: false,
        no_need_rabc: false,
        handler: async function (body) {
            return await request_rpc('device_management', 'get_device_run_time', []);
        },
        help_info: {
            title: "获取所有设备的运行时间",
            describe: "获取所有设备的运行时间",
            result: {
                type: Array,
                mean: '设备信息',
                explain: [
                    {
                        name: 'name',
                        type: String,
                        mean: "设备名"
                    },
                    {
                        name: 'id',
                        type: Number,
                        mean: "设备编号"
                    },
                    {
                        name: 'stay_time',
                        type: String,
                        mean: "运行时间"
                    },
                ],
            },
        },
    },
    "/api/update": {
        module: 'order',
        resource: 'stuff',
        is_write: true,
        no_need_rabc: false,
        handler: async function (body) {
            var update_file = '/tmp/' + body.file;
            const util = require('node:util');
            const exec = util.promisify(require('node:child_process').exec);
            await exec(`cp ${update_file} /root/install.sh`);
            return await request_rpc('config_management', 'reboot_system', []);
        },
        help_info: {
            title: "更新程序",
            describe: "需要先上传更新文件，然后填入返回的文件编号",
            params: {
                type: Object,
                have_to: true,
                explain: [
                    {
                        name: "file",
                        type: String,
                        mean: "文件编号",
                        have_to: true,
                    },
                ]
            },
            result: {
                type: Boolean,
                mean: "是否更新成功",
            },
        },
    },
}
function api_param_walk_check(api_param_req, input) {
    let ret = "params input wrong";
    if (input != undefined) {
        if (Object.prototype.toString.call(api_param_req.type()) == Object.prototype.toString.call(input)) {
            ret = "";
        }
        else {
            ret = " require " + api_param_req.type.name + " but input " + Object.prototype.toString.call(input);
        }
    }
    else {
        if (!api_param_req.have_to) {
            ret = "";
        }
        else {
            ret = " param missed";
        }
    }

    if (ret.length == 0 && input) {
        if (api_param_req.type == Object) {
            for (let index = 0; index < api_param_req.explain.length; index++) {
                const element = api_param_req.explain[index];
                let sub_ret = api_param_walk_check(element, _.get(input, element.name));
                if (sub_ret.length > 0) {
                    ret = "." + element.name + sub_ret;
                    break;
                }
            }
        }
        else if (api_param_req.type == Array) {
            for (let index = 0; index < api_param_req.explain.length; index++) {
                const element = api_param_req.explain[index];
                let sub_ret = api_param_walk_check(element, _.get(input[0], element.name));
                if (sub_ret.length > 0) {
                    ret = "." + element.name + sub_ret;
                    break;
                }
            }
        }
    }

    return ret;
}
function check_api_param(api_content, body) {
    let ret = "params input wrong";
    let api_p = _.get(api_content, 'help_info.params');
    if (api_p) {
        ret = api_param_walk_check(api_p, body);
    }
    else {
        ret = "";
    }

    return ret;
}
Object.keys(g_api_permisson).forEach(key => {
    let api_content = g_api_permisson[key];
    app.post(key, async (req, res) => {
        let ret = {
            err_msg: '无权限',
        };
        let pc_ret = check_api_param(api_content, req.body);
        if (pc_ret.length == 0) {
            try {
                let verify_ret = true;
                if (!api_content.no_need_rabc) {
                    verify_ret = await verify_rbac(req.headers.token, api_content.module, api_content.resource, api_content.is_write);
                }
                if (verify_ret && api_content.handler) {
                    let token_body = req.body;
                    token_body.token = req.headers.token;
                    let resp = await api_content.handler(token_body);
                    if (resp != undefined) {
                        ret.result = resp;
                    }
                    else {
                        ret.result = true;
                    }
                    ret.err_msg = "";
                }
            } catch (error) {
                ret.err_msg = error;
                console.log(error);
                if (error instanceof gen_exp) {
                    ret.err_msg = error.msg;
                }
            }
        }
        else {
            ret.err_msg = pc_ret;
        }
        let s_ret = JSON.stringify(ret, (key, value) => {
            if (value instanceof Int64) {
                return value.toNumber();
            } else {
                return value;
            }
        });
        res.send(JSON.parse(s_ret));
    });
});
function make_param_help(params) {
    let ret = [];

    let rows = [];
    if (params.name) {
        ret.push({
            p: params.name
        });
    }
    let sub_p = [];
    params.explain.forEach(pe => {
        rows.push([pe.name, pe.type.name, pe.have_to.toString(), pe.mean]);
        if (pe.type == Object || pe.type == Array) {
            sub_p.push(pe);
        }
    });
    ret.push({
        table: {
            headers: ["字段名", "类型", "是否必填", "描述"],
            rows: rows,
        },
    });

    sub_p.forEach(sp => {
        ret = ret.concat(make_param_help(sp));
    });

    return ret;
}

function make_result_help(result) {
    let ret = [];

    if (result.name) {
        ret.push({
            p: result.name
        });
    }
    let sub_p = [];
    if (result.explain) {
        let rows = [];
        result.explain.forEach(pe => {
            rows.push([pe.name, pe.type.name, pe.mean]);
            if (pe.type == Object || pe.type == Array) {
                sub_p.push(pe);
            }
        });
        ret.push({
            table: {
                headers: ["字段", "类型", "描述"],
                rows: rows,
            },
        });
    }
    else {
        ret.push({
            table: {
                headers: ["类型", "描述"],
                rows: [[result.type.name, result.mean]],
            },
        })
    }

    sub_p.forEach(sp => {
        ret = ret.concat(make_result_help(sp));
    });

    return ret;
}


app.get('/api/help', (req, res) => {
    let out_json = [];
    Object.keys(g_api_permisson).forEach(key => {
        let api = g_api_permisson[key];
        let ali = api.help_info;
        if (ali) {
            out_json.push({
                h1: ali.title
            });
            out_json.push({
                code: {
                    content: key
                }
            });
            out_json.push({
                h2: "描述"
            });
            out_json.push({
                p: ali.describe
            });
            out_json.push({
                h2: "参数"
            });
            if (ali.params) {
                let tph = make_param_help(ali.params);
                tph.forEach(sp => {
                    out_json.push(sp);
                });
            }
            else {
                out_json.push({
                    p: "无"
                });
            }
            out_json.push({
                h2: "返回"
            });
            if (ali.result) {
                let tph = make_result_help(ali.result)
                console.log(JSON.stringify(tph));
                tph.forEach(sp => {
                    out_json.push(sp);
                });
            }
            else {
                out_json.push({
                    p: "无"
                });
            }
        }
    });
    const MarkdownIt = require('markdown-it');
    const mdTocAndAnchor = require('markdown-it-toc-and-anchor').default;

    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
    });

    md.use(mdTocAndAnchor, {
        toc: true,
        tocFirstLevel: 1,
        tocLastLevel: 6,
        wrapHeadingTextInAnchor: true
    });

    let markdownText = json2md(out_json);
    markdownText =
        `
# 概述
+ 本文档中所有接口使用 POST 方法
+ 除登录接口之外，需要先调用登录接口获取 token，然后在请求头中带上 token 才能调用其他接口
+ 每个接口的参数和返回值都是 JSON 格式
+ 接口返回的对象中会携带两个字段，err_msg 和 result
+ err_msg 为空字符串表示成功，否则表示失败
+ result字段是真正的接口返回值，每个接口的返回值都不一样，具体参考接口文档
    ` + markdownText;
    const htmlContent = md.render(markdownText);
    const html = `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@4.0.0/github-markdown.min.css">
    <title>接口文档</title>
    <style>
        #toc {
            position: fixed;
            left: 0;
            top: 0;
            width: 300px;
            height: 100%;
            overflow: auto;
            border-right: 1px solid #000;
        }
        #content {
            margin-left: 310px;
        }
        #toc a {
            display: block;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div id="toc"></div>
    <article class="markdown-body">
    <div id="content">${htmlContent}</div>
    </article>
    <script>
    window.onload = function() {
        const toc = document.getElementById('toc');
        const links = document.querySelectorAll('#content h1 a');

        links.forEach((link, index) => {
            const newLink = document.createElement('a');
            newLink.href = link.href;
            newLink.textContent = (index + 1) + '. ' +link.textContent;
            toc.appendChild(newLink);
        });
    }
    </script>
</body>
</html>
`;
    res.send(html);
});


app.listen(port, () => {
    console.log('rest is runing');
    setTimeout(() => {
        request_rpc("device_management", "init_all_set", [], true);
    }, 1500);
});