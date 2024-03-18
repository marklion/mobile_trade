const mkapi = require('./api_utils');
const plan_lib = require('./plan_lib');
const db_opt = require('./db_opt');
const rbac_lib = require('./rbac_lib');
const sc_lib = require('./sc_lib');

const sc_req_detail = {
    id: { type: Number, have_to: true, mean: 'ID', example: 1 },
    name: { type: String, have_to: true, mean: '需求名称', example: '安检需求' },
    need_attach: { type: Boolean, have_to: true, mean: '是否需要附件', example: true },
    need_input: { type: Boolean, have_to: true, mean: '是否需要输入', example: true },
    need_expired: { type: Boolean, have_to: true, mean: '是否需要过期时间', example: true },
    belong_type: { type: Number, have_to: true, mean: '所属类型,0->司乘,1->主车,2->挂车', example: 0 },
    sc_content:{type:Object, have_to:false, mean:'安检内容', explain: {
        id: { type: Number, have_to: true, mean: 'ID', example: 1 },
        expired_time: { type: String, have_to: true, mean: '过期时间', example: '2020-01-01 00:00:00' },
        attachment: { type: String, have_to: true, mean: '附件', example: 'http://www.baidu.com' },
        input: { type: String, have_to: true, mean: '输入', example: '请输入' },
        passed: { type: Boolean, have_to: true, mean: '是否通过', example: true },
        checker: { type: String, have_to: true, mean: '检查人', example: '张三' },
    }},
}

function install(app) {
    mkapi('/sc/fetch_req', 'sc', true, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
        name: { type: String, have_to: true, mean: '需求名称', example: '安检需求' },
        need_attach: { type: Boolean, have_to: true, mean: '是否需要附件', example: true },
        need_input: { type: Boolean, have_to: true, mean: '是否需要输入', example: true },
        need_expired: { type: Boolean, have_to: true, mean: '是否需要过期时间', example: true },
        belong_type: { type: Number, have_to: true, mean: '所属类型,0->司乘,1->主车,2->挂车', example: 0 },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '新增或修改安检需求', '新增或修改安检需求').add_handler(async (body, token) => {
        await sc_lib.fetch_sc_req(body, token, body.stuff_id);
        return { result: true };
    }).install(app);
    mkapi('/sc/get_req', 'sc', false, true, {
        stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 }
    }, {
        reqs: { type: Array, mean: '需求列表', explain: sc_req_detail }
    }, '获取安检需求', '获取安检需求', true).add_handler(async (body, token) => {
        return await sc_lib.get_sc_req(body.stuff_id, token, body.pageNo);
    }).install(app);
    mkapi('/sc/del_req', 'sc', true, true, {
        req_id: { type: Number, have_to: true, mean: '需求ID', example: 1 }
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '删除安检需求', '删除安检需求').add_handler(async (body, token) => {
        await sc_lib.del_sc_req(body.req_id, token);
        return { result: true };
    }).install(app);
    mkapi('/sc/get_driver_req', 'none', false, false, {
        open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' },
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
    }, {
        reqs: { type: Array, mean: '需求列表', explain: sc_req_detail },
        passed: { type: Boolean, mean: '是否通过', example: true }
    }, '获取司机安检需求', '获取司机安检需求', true).add_handler(async (body, token) => {
        return await sc_lib.get_sc_driver_req(body.open_id, body.plan_id, body.pageNo);
    }).install(app);
    mkapi('/sc/upload_sc_content', 'none', true, false, {
        open_id: { type: String, have_to: true, mean: '司机open_id', example: 'oq5s-4k1d-4k1d-4k1d' },
        req_id: { type: Number, have_to: true, mean: '需求ID', example: 1 },
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 },
        input: { type: String, have_to: false, mean: '输入', example: '请输入' },
        attachment: { type: String, have_to: false, mean: '附件', example: 'http://www.baidu.com' },
        expired_time: { type: String, have_to: false, mean: '过期时间', example: '2020-01-01 00:00:00' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '上传安检内容', '上传安检内容').add_handler(async (body, token) => {
        await sc_lib.driver_upload_content(body.open_id, body.req_id, body.plan_id, body.input, body.attachment, body.expired_time);
        return {result: true};
    }).install(app);
    mkapi('/sc/delete_content', 'none', true, false, {
        content_id: { type: Number, have_to: true, mean: '内容ID', example: 1 },
        open_id:{type:String, have_to:true, mean:'司机open_id', example:'oq5s-4k1d-4k1d-4k1d' }
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '删除安检内容', '删除安检内容').add_handler(async (body, token) => {
        let sq = db_opt.get_sq();
        let sc_content = await sq.models.sc_content.findByPk(body.content_id);
        let driver = await sq.models.driver.findOne({where:{open_id:body.open_id}});
        let has_permission = false;
        if (sc_content && driver && !sc_content.passed)
        {
            let sc_req = await sc_content.getSc_req();
            if (sc_req)
            {
                let stuff = await sc_req.getStuff();
                if (stuff)
                {
                    let plan = await sq.models.plan.findOne({where:{
                        status:2,
                        driverId:driver.id,
                        stuffId:stuff.id,
                    }});
                    if (plan)
                    {
                        has_permission = true;
                        await sc_content.destroy();
                    }
                }
            }
        }
        if (!has_permission)
        {
            throw {err_msg:'无权限'};
        }
        return {result: true};
    }).install(app);
    mkapi('/sc/plan_status', 'sc', false, true, {
        plan_id: { type: Number, have_to: true, mean: '计划ID', example: 1 }
    }, {
        reqs: { type: Array, mean: '需求列表', explain: sc_req_detail },
        passed: { type: Boolean, mean: '是否通过', example: true }
    }, '获取计划安检状态', '获取计划安检状态', true).add_handler(async (body, token) => {
        return await sc_lib.get_plan_sc_status(body.plan_id, token, body.pageNo);
    }).install(app);
    mkapi('/sc/check', 'sc', true, true, {
        content_id: { type: Number, have_to: true, mean: '内容ID', example: 1 },
        comment: { type: String, have_to: false, mean: '不通过原因', example: '内容错误' },
    }, {
        result: { type: Boolean, mean: '结果', example: true }
    }, '安检审核', '安检审核').add_handler(async (body, token) => {
        await sc_lib.check_sc_content(body.content_id, token, body.comment);
        return { result: true };
    }).install(app);
}

module.exports = install;