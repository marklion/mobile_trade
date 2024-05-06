const plan_lib = require('../lib/plan_lib');
module.exports = {
    fetch_driver: {
        name: '获取或创建司机',
        description: '获取或创建司机',
        need_rbac: true,
        is_write: true,
        is_get_api: false,
        params: {
            name: { type: String, have_to: false, mean: '司机姓名', example: '张三' },
            id_card: { type: String, have_to: false, mean: '司机身份证', example: '1234567890' },
            phone: { type: String, have_to: true, mean: '司机电话', example: '18911992582' },
        },
        result: {
            id: { type: Number, mean: '司机ID', example: 1 },
            name: { type: String, mean: '司机姓名', example: '张三' },
            id_card: { type: String, mean: '司机身份证', example: '1234567890' },
            phone: { type: String, mean: '司机电话', example: '18911992582' },
        },
        func: async function (body, token) {
            return (await plan_lib.fetch_driver(body.name, body.phone, body.id_card)).toJSON();
        },
    },
    fetch_vehicle: {
        name: '获取或创建车辆信息',
        description: '获取或创建车辆信息',
        need_rbac: true,
        is_write: true,
        is_get_api: false,
        params: {
            plate: { type: String, have_to: true, mean: '车牌', example: '车牌' },
        },
        result: {
            id: { type: Number, mean: '车辆ID', example: 1 },
            plate: { type: String, mean: '车牌', example: '车牌' },
            is_behind: { type: Boolean, mean: '是否挂车', example: true },
        },
        func: async function (body, token) {
            let lastChar = body.plate.charAt(body.plate.length - 1);
            return await plan_lib.fetch_vehicle(body.plate, (lastChar === '挂'));
        },
    },
}