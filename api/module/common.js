const db_opt = require('../db_opt');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const moment = require('moment');
async function do_export_later(token, name, func) {
    let user = await rbac_lib.get_user_by_token(token);
    await user.addExport_record(await db_opt.get_sq().models.export_record.create({
        name: name,
        url: '',
    }));
    setTimeout(async () => {
        let url = 'no';
        try {
            url = await func();
        } catch (error) {
            console.log(error);
        }
        let exist_record = await user.getExport_records({ where: { name: name, url: '' } });
        if (exist_record.length > 0) {
            exist_record[0].url = url;
            exist_record[0].create_time = moment().format('YYYY-MM-DD HH:mm:ss');
            await exist_record[0].save();
        }
    }, 200);
    return { result: true };
}
module.exports = {
    fetch_driver: {
        name: '获取或创建司机',
        description: '获取或创建司机',

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
    get_vehicle_pair: {
        name: '获取车辆历史数据',
        description: '获取车辆历史数据',
        is_write: false,
        is_get_api: true,
        params: {
        },
        result: {
            pairs: {
                type: Array, mean: '车辆对', explain: {
                    main_vehicle_plate: { type: String, mean: '主车车牌', example: '主车车牌' },
                    behind_vehicle_plate: { type: String, mean: '挂车车牌', example: '挂车车牌' },
                    driver_phone: { type: String, mean: '司机电话', example: '司机电话' },
                    driver_name: { type: String, mean: '司机姓名', example: '司机姓名' },
                }
            },
        },
        func: async function (body, token) {
            let ret = await plan_lib.get_self_vehicle_pairs(token, body.pageNo);
            return {
                pairs: ret.rows,
                total: ret.count
            }
        }
    },
    do_export_later:do_export_later,
    export_plans: function (func) {
        return {
            name: '导出计划',
            description: '导出计划',
            is_write: false,
            is_get_api: false,
            need_rbac: true,
            params: {
                start_time: { type: String, have_to: true, mean: '开始时间', example: '2020-01-01' },
                end_time: { type: String, have_to: true, mean: '结束时间', example: '2020-01-01' },
                stuff_id: { type: Number, have_to: false, mean: '物料ID', example: 12 },
                company_id: { type: Number, have_to: false, mean: '公司ID', example: 22 },
            },
            result: {
                result: { type: Boolean, mean: '导出结果', example: true },
            },
            func: async function (body, token) {
                return await do_export_later(token, '导出计划', async () => {
                    return await func(body, token);
                });
            }
        };
    },
}