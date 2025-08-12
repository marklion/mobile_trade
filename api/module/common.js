const db_opt = require('../db_opt');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const moment = require('moment');
const util_lib = require('../lib/util_lib');
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
    order_update: {
        name: '更新订单',
        description: '更新订单',
        is_write: true,
        is_get_api: false,
        params: {
            plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
            plan_time: { type: String, have_to: false, mean: '计划时间', example: '2020-01-01 12:00:00' },
            main_vehicle_plate: { type: String, have_to: false, mean: '主车车牌', example: '主车车牌' },
            behind_vehicle_plate: { type: String, have_to: false, mean: '挂车车牌', example: '挂车车牌' },
            driver_phone: { type: String, have_to: false, mean: '司机电话', example: '19999991111' },
            trans_company_name: { type: String, have_to: false, mean: '承运公司', example: '承运公司名称' },
            comment: { type: String, have_to: false, mean: '备注', example: '备注' },
            use_for: { type: String, have_to: false, mean: '用途', example: '用途' },
            drop_address: { type: String, have_to: false, mean: '卸货地址', example: '卸货地址' },
        },
        result: {
            result: { type: Boolean, mean: '结果', example: true }
        },
        func: async function (body, token) {
            let main_vehicle_id = undefined;
            if (body.main_vehicle_plate) {
                main_vehicle_id = (await plan_lib.fetch_vehicle(body.main_vehicle_plate, false)).id;
            }
            let behind_vehicle_id = undefined;
            if (body.behind_vehicle_plate) {
                behind_vehicle_id = (await plan_lib.fetch_vehicle(body.behind_vehicle_plate, true)).id;
            }
            let driver_id = undefined;
            if (body.driver_phone) {
                let orig_driver = (await util_lib.get_single_plan_by_id(body.plan_id)).driver;
                driver_id = (await plan_lib.fetch_driver(orig_driver.name, body.driver_phone, orig_driver.id_card)).id;
            }
            await plan_lib.update_single_plan(body.plan_id, token, {
                plan_time: body.plan_time,
                main_vehicle_id: main_vehicle_id,
                behind_vehicle_id: behind_vehicle_id,
                driver_id: driver_id,
                comment: body.comment,
                use_for: body.use_for,
                drop_address: body.drop_address,
                trans_company_name: body.trans_company_name
            });
            return { result: true };
        },
    },
    contract_update: {
        name: '更新合同',
        description: '更新合同',
        is_write: true,
        is_get_api: false,
        params: {
            contract_id: { type: Number, have_to: true, mean: '合同ID', example: 1 },
            begin_time: { type: String, have_to: false, mean: '开始时间', example: '2020-01-01 12:00:00' },
            end_time: { type: String, have_to: false, mean: '结束时间', example: '2020-01-01 12:00:00' },
            number: { type: String, have_to: false, mean: '合同号', example: 1 },
            customer_code: { type: String, have_to: false, mean: '客户合同号', example: 1 },
        },
        result: {
            result: { type: Boolean, mean: '结果', example: true }
        },
        func: async function (body, token) {
            let company = await rbac_lib.get_company_by_token(token);
            let contract = await db_opt.get_sq().models.contract.findByPk(body.contract_id);
            if (await company.hasBuy_contract(contract) || await company.hasSale_contract(contract)) {
                await plan_lib.update_contract(body.contract_id, body.begin_time, body.end_time, body.number, body.customer_code);
            }
            else {
                throw { err_msg: '无权限' };
            }
            return { result: true };
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
    do_export_later: do_export_later,
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
                m_start_time: { type: String, have_to: false, mean: '开始时间（时：分：秒）', example: '2020-01-01 22:22:22' },
                m_end_time: { type: String, have_to: false, mean: '结束时间（时：分：秒）', example: '2020-01-01 22:22:22' },
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
    contract_res_detail_define: {
        id: { type: Number, mean: '合同ID', example: 1 },
        sign_time: { type: String, mean: '签订时间', example: '2020-01-01 12:00:00' },
        balance: { type: Number, mean: '余额', example: 1 },
        begin_time: { type: String, mean: '开始时间', example: '2020-01-01 12:00:00' },
        end_time: { type: String, mean: '结束时间', example: '2020-01-01 12:00:00' },
        number: { type: String, mean: '合同号', example: "abc" },
        customer_code: { type: String, mean: '客户合同号', example: "sss" },
        rbac_users: {
            type: Array, mean: '授权用户', explain: {
                id: { type: Number, mean: '用户ID', example: 1 },
                name: { type: String, mean: '用户姓名', example: '用户姓名' },
                phone: { type: String, mean: '用户电话', example: '用户电话' },
            }
        }
    }
}