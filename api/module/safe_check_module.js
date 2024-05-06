const api_param_result_define = require('../api_param_result_define');
const plan_lib = require('../lib/plan_lib');
const rbac_lib = require('../lib/rbac_lib');
const sc_lib = require('../lib/sc_lib');
module.exports = {
    name: 'sc',
    description: '安检管理',
    methods: {
        fetch_req: {
            name: '新增或修改安检需求',
            description: '新增或修改安检需求',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 },
                name: { type: String, have_to: true, mean: '需求名称', example: '安检需求' },
                need_attach: { type: Boolean, have_to: true, mean: '是否需要附件', example: true },
                need_input: { type: Boolean, have_to: true, mean: '是否需要输入', example: true },
                need_expired: { type: Boolean, have_to: true, mean: '是否需要过期时间', example: true },
                belong_type: { type: Number, have_to: true, mean: '所属类型,0->司乘,1->主车,2->挂车', example: 0 },
                prompt: { type: String, have_to: false, mean: '提示', example: '请输入' }
            },
            result: api_param_result_define.sc_req_detail,
            func: async function (body, token) {
                return await sc_lib.fetch_sc_req(body, token, body.stuff_id);
            },
        },
        get_req: {
            name: '获取安检需求',
            description: '获取安检需求',
            need_rbac: true,
            is_write: false,
            is_get_api: true,
            params: {
                stuff_id: { type: Number, have_to: true, mean: '货物ID', example: 1 }
            },
            result: {
                reqs: { type: Array, mean: '需求列表', explain: sc_lib.sc_req_detail }
            },
            func: async function (body, token) {

                return await sc_lib.get_sc_req(body.stuff_id, token, body.pageNo);
            },
        },
        del_req: {
            name: '删除安检需求',
            description: '删除安检需求',
            need_rbac: true,
            is_write: true,
            is_get_api: false,
            params: {
                req_id: { type: Number, have_to: true, mean: '需求ID', example: 1 }
            },
            result: {
                result: { type: Boolean, mean: '结果', example: true },
            },
            func: async function (body, token) {
                await sc_lib.del_sc_req(body.req_id, token);
                return { result: true };
            },
        },
    }
}