const group_lib = require('../lib/group_lib');
const rbac_lib = require('../lib/rbac_lib');

module.exports = {
    name: 'group',
    description: '集团管理',
    methods: {
        group_company_user_list: {
            name: '集团母公司用户列表',
            description: '分页列出母公司用户，供数据权限里选择用户（走集团模块权限）',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                all_user: {
                    type: Array,
                    mean: '用户列表',
                    explain: {
                        id: { type: Number, mean: '用户id', example: 1 },
                        name: { type: String, mean: '姓名', example: '张三' },
                        phone: { type: String, mean: '手机号', example: '13800138000' },
                    },
                },
            },
            func: async (body, token) => {
                await group_lib.assert_group_manager_token(token);
                const company = await rbac_lib.get_company_by_token(token);
                const { count, rows } = await rbac_lib.get_all_users(company, body.pageNo);
                return { all_user: rows, total: count };
            },
        },
        group_member_candidate_list: {
            name: '可添加为成员的公司（分页）',
            description: '排除已是集团、本主体、已绑定为某集团成员的公司；每页 20 条',
            is_write: false,
            is_get_api: true,
            params: {},
            result: {
                candidates: {
                    type: Array,
                    mean: '候选公司',
                    explain: {
                        id: { type: Number, mean: '公司id', example: 1 },
                        name: { type: String, mean: '公司名', example: '子公司' },
                    },
                },
            },
            func: async (body, token) => {
                const { company } = await group_lib.assert_group_manager_token(token);
                const pageNo = body.pageNo != null ? body.pageNo : 0;
                return await group_lib.list_member_candidates_paged(company.id, pageNo);
            },
        },
        group_member_list: {
            name: '集团成员公司列表',
            description: '当前集团下的成员公司',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                members: {
                    type: Array,
                    mean: '成员列表',
                    explain: {
                        id: { type: Number, mean: '关联id', example: 1 },
                        member_company_id: { type: Number, mean: '成员公司id', example: 2 },
                        member_company_name: { type: String, mean: '成员公司名', example: '子公司' },
                    },
                },
            },
            func: async (body, token) => {
                const { company } = await group_lib.assert_group_manager_token(token);
                const members = await group_lib.list_members(company.id);
                return { members };
            },
        },
        group_member_add: {
            name: '集团添加成员公司',
            description: '添加成员公司',
            is_write: true,
            is_get_api: false,
            params: {
                member_company_id: { type: Number, have_to: true, mean: '成员公司id', example: 1 },
            },
            result: { result: { type: Boolean, mean: '结果', example: true } },
            func: async (body, token) => {
                const { company } = await group_lib.assert_group_manager_token(token);
                await group_lib.add_member(company.id, body.member_company_id);
                return { result: true };
            },
        },
        group_member_remove: {
            name: '集团移除成员公司',
            description: '移除成员公司',
            is_write: true,
            is_get_api: false,
            params: {
                member_company_id: { type: Number, have_to: true, mean: '成员公司id', example: 1 },
            },
            result: { result: { type: Boolean, mean: '结果', example: true } },
            func: async (body, token) => {
                const { company } = await group_lib.assert_group_manager_token(token);
                await group_lib.remove_member(company.id, body.member_company_id);
                return { result: true };
            },
        },
        group_grant_list: {
            name: '集团数据权限列表',
            description: '成员公司数据对集团内用户的授权',
            is_write: false,
            is_get_api: false,
            params: {},
            result: {
                grants: {
                    type: Array,
                    mean: '授权列表',
                    explain: {
                        id: { type: Number, mean: '记录id', example: 1 },
                        member_company_id: { type: Number, mean: '成员公司id', example: 2 },
                        member_company_name: { type: String, mean: '成员公司名', example: 'A公司' },
                        user_id: { type: Number, mean: '用户id', example: 3 },
                        user_name: { type: String, mean: '用户姓名', example: '张三' },
                        user_phone: { type: String, mean: '手机号', example: '13800138000' },
                        can_view: { type: Boolean, mean: '可查看', example: true },
                        can_operate: { type: Boolean, mean: '可操作', example: false },
                    },
                },
            },
            func: async (body, token) => {
                const { company } = await group_lib.assert_group_manager_token(token);
                const grants = await group_lib.list_grants(company.id);
                return { grants };
            },
        },
        group_grant_upsert: {
            name: '集团数据权限保存',
            description: '指定成员公司数据对某用户的查看/操作权限',
            is_write: true,
            is_get_api: false,
            params: {
                member_company_id: { type: Number, have_to: true, mean: '成员公司id', example: 1 },
                user_id: { type: Number, have_to: true, mean: '集团内用户id', example: 2 },
                can_view: { type: Boolean, have_to: true, mean: '可查看', example: true },
                can_operate: { type: Boolean, have_to: true, mean: '可操作', example: false },
            },
            result: { result: { type: Boolean, mean: '结果', example: true } },
            func: async (body, token) => {
                const { company } = await group_lib.assert_group_manager_token(token);
                await group_lib.upsert_grant(
                    company.id,
                    body.member_company_id,
                    body.user_id,
                    body.can_view,
                    body.can_operate
                );
                return { result: true };
            },
        },
        group_grant_delete: {
            name: '集团数据权限删除',
            description: '删除一条成员公司数据授权',
            is_write: true,
            is_get_api: false,
            params: {
                member_company_id: { type: Number, have_to: true, mean: '成员公司id', example: 1 },
                user_id: { type: Number, have_to: true, mean: '用户id', example: 2 },
            },
            result: { result: { type: Boolean, mean: '结果', example: true } },
            func: async (body, token) => {
                const { company } = await group_lib.assert_group_manager_token(token);
                await group_lib.delete_grant(company.id, body.member_company_id, body.user_id);
                return { result: true };
            },
        },
    },
};
