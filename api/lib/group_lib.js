const db_opt = require('../db_opt');
const rbac_lib = require('./rbac_lib');

const GROUP_ROLE_NAME = '集团管理员';

module.exports = {
    is_super_admin_user: function (user) {
        return user && user.phone === '18911992582';
    },

    assert_group_manager_token: async function (token) {
        const user = await rbac_lib.get_user_by_token(token);
        const company = await rbac_lib.get_company_by_token(token);
        if (!user || !company) {
            throw { err_msg: '未登录' };
        }
        if (!company.is_group) {
            throw { err_msg: '当前公司不是集团' };
        }
        if (module.exports.is_super_admin_user(user)) {
            return { user, company };
        }
        if (company.group_admin_user_id == null || company.group_admin_user_id !== user.id) {
            throw { err_msg: '仅集团管理员可操作' };
        }
        return { user, company };
    },

    convert_company_to_group: async function (company_id, admin_user_id) {
        const sq = db_opt.get_sq();
        const company = await sq.models.company.findByPk(company_id);
        if (!company) {
            throw { err_msg: '公司不存在' };
        }
        const admin_user = await sq.models.rbac_user.findByPk(admin_user_id);
        if (!admin_user) {
            throw { err_msg: '集团管理员用户不存在' };
        }
        if (admin_user.companyId !== company.id) {
            throw { err_msg: '指定用户必须属于该公司' };
        }
        const group_module = await rbac_lib.add_module('group', '集团管理');
        company.is_group = true;
        company.group_admin_user_id = admin_user_id;
        company.parentGroupCompanyId = null;
        await company.save();
        let role = await sq.models.rbac_role.findOne({
            where: { name: GROUP_ROLE_NAME, companyId: company.id },
        });
        if (!role) {
            role = await rbac_lib.add_role(GROUP_ROLE_NAME, '集团成员公司与跨公司数据权限', false, company);
        }
        await rbac_lib.connect_role2module(role.id, group_module.id);
        await rbac_lib.bind_company2module(company.id, group_module.id);
        await rbac_lib.connect_user2role(admin_user_id, role.id);
        return company;
    },

    list_home_users_plain: async function (group_company_id) {
        const sq = db_opt.get_sq();
        const rows = await sq.models.rbac_user.findAll({
            where: { companyId: group_company_id },
            attributes: ['id', 'name', 'phone'],
            order: [['id', 'ASC']],
        });
        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
        }));
    },

    list_member_candidates_paged: async function (group_company_id, pageNo) {
        const sq = db_opt.get_sq();
        const Op = db_opt.Op;
        const limit = 20;
        const offset = Math.max(0, pageNo) * limit;
        /* 老库 is_group 可能为 NULL，仅 false/NULL 视为非集团；勿用 NOT IN (含 NULL) 会整表查空 */
        const where = {
            [Op.or]: [{ is_group: false }, { is_group: null }],
            id: { [Op.ne]: group_company_id },
            parentGroupCompanyId: null,
        };
        const { count, rows } = await sq.models.company.findAndCountAll({
            where,
            limit,
            offset,
            order: [['id', 'ASC']],
            attributes: ['id', 'name'],
        });
        return {
            candidates: rows.map((r) => ({ id: r.id, name: r.name })),
            total: count,
        };
    },

    list_members: async function (group_company_id) {
        const sq = db_opt.get_sq();
        const rows = await sq.models.company.findAll({
            where: { parentGroupCompanyId: group_company_id },
            attributes: ['id', 'name'],
            order: [['id', 'ASC']],
        });
        return rows.map((r) => ({
            id: r.id,
            member_company_id: r.id,
            member_company_name: r.name || '',
        }));
    },

    add_member: async function (group_company_id, member_company_id) {
        const sq = db_opt.get_sq();
        if (group_company_id === member_company_id) {
            throw { err_msg: '不能将集团自身加为成员' };
        }
        const group_c = await sq.models.company.findByPk(group_company_id);
        const member_c = await sq.models.company.findByPk(member_company_id);
        if (!group_c || !group_c.is_group) {
            throw { err_msg: '集团不存在' };
        }
        if (!member_c) {
            throw { err_msg: '成员公司不存在' };
        }
        if (member_c.is_group) {
            throw { err_msg: '不能将集团主体作为成员公司' };
        }
        if (member_c.parentGroupCompanyId != null) {
            if (member_c.parentGroupCompanyId === group_company_id) {
                throw { err_msg: '已是本集团成员' };
            }
            throw { err_msg: '该公司已加入其他集团' };
        }
        member_c.parentGroupCompanyId = group_company_id;
        await member_c.save();
    },

    remove_member: async function (group_company_id, member_company_id) {
        const sq = db_opt.get_sq();
        const member_c = await sq.models.company.findByPk(member_company_id);
        if (!member_c || member_c.parentGroupCompanyId !== group_company_id) {
            throw { err_msg: '成员不存在' };
        }
        member_c.parentGroupCompanyId = null;
        await member_c.save();
        await sq.models.group_member_data_grant.destroy({
            where: { groupCompanyId: group_company_id, memberCompanyId: member_company_id },
        });
    },

    list_grants: async function (group_company_id) {
        const sq = db_opt.get_sq();
        const rows = await sq.models.group_member_data_grant.findAll({
            where: { groupCompanyId: group_company_id },
            include: [
                { model: sq.models.company, as: 'grant_member_company', attributes: ['id', 'name'] },
                { model: sq.models.rbac_user, as: 'rbac_user', attributes: ['id', 'name', 'phone'] },
            ],
            order: [['id', 'ASC']],
        });
        return rows.map((r) => ({
            id: r.id,
            member_company_id: r.memberCompanyId,
            member_company_name: r.grant_member_company ? r.grant_member_company.name : '',
            user_id: r.rbacUserId,
            user_name: r.rbac_user ? r.rbac_user.name : '',
            user_phone: r.rbac_user ? r.rbac_user.phone : '',
            can_view: r.can_view,
            can_operate: r.can_operate,
        }));
    },

    upsert_grant: async function (group_company_id, member_company_id, rbac_user_id, can_view, can_operate) {
        const sq = db_opt.get_sq();
        const member_c = await sq.models.company.findByPk(member_company_id);
        if (!member_c || member_c.parentGroupCompanyId !== group_company_id) {
            throw { err_msg: '该公司不是本集团成员' };
        }
        const grant_user = await sq.models.rbac_user.findByPk(rbac_user_id);
        if (!grant_user || grant_user.companyId !== group_company_id) {
            throw { err_msg: '被授权用户须属于集团母公司' };
        }
        let row = await sq.models.group_member_data_grant.findOne({
            where: { groupCompanyId: group_company_id, memberCompanyId: member_company_id, rbacUserId: rbac_user_id },
        });
        if (row) {
            row.can_view = !!can_view;
            row.can_operate = !!can_operate;
            await row.save();
        } else {
            row = await sq.models.group_member_data_grant.create({
                groupCompanyId: group_company_id,
                memberCompanyId: member_company_id,
                rbacUserId: rbac_user_id,
                can_view: !!can_view,
                can_operate: !!can_operate,
            });
        }
        return row;
    },

    delete_grant: async function (group_company_id, member_company_id, rbac_user_id) {
        const sq = db_opt.get_sq();
        const row = await sq.models.group_member_data_grant.findOne({
            where: { groupCompanyId: group_company_id, memberCompanyId: member_company_id, rbacUserId: rbac_user_id },
        });
        if (row) {
            await row.destroy();
        }
    },

    user_has_member_data_access: async function (user_id, member_company_id, need_write) {
        const sq = db_opt.get_sq();
        const user = await sq.models.rbac_user.findByPk(user_id);
        if (!user || !user.companyId) {
            return false;
        }
        const home = await sq.models.company.findByPk(user.companyId);
        if (!home || !home.is_group) {
            return false;
        }
        const member_c = await sq.models.company.findByPk(member_company_id);
        if (!member_c || member_c.parentGroupCompanyId !== home.id) {
            return false;
        }
        const grant = await sq.models.group_member_data_grant.findOne({
            where: { groupCompanyId: home.id, memberCompanyId: member_company_id, rbacUserId: user_id },
        });
        if (!grant) {
            return false;
        }
        if (need_write) {
            return grant.can_operate === true;
        }
        return grant.can_view === true || grant.can_operate === true;
    },

    resolve_stat_company: async function (token, stat_context_company_id) {
        const home = await rbac_lib.get_company_by_token(token);
        if (!home) {
            return null;
        }
        if (stat_context_company_id === undefined || stat_context_company_id === null || stat_context_company_id === '') {
            return home;
        }
        const id = Number(stat_context_company_id);
        if (!Number.isFinite(id) || id === home.id) {
            return home;
        }
        const user = await rbac_lib.get_user_by_token(token);
        if (!user) {
            return null;
        }
        if (!home.is_group) {
            throw { err_msg: '无权限切换统计主体' };
        }
        const sq = db_opt.get_sq();
        const member_c = await sq.models.company.findByPk(id);
        if (!member_c || member_c.parentGroupCompanyId !== home.id) {
            throw { err_msg: '无权限查看该公司统计' };
        }
        const grant = await sq.models.group_member_data_grant.findOne({
            where: {
                groupCompanyId: home.id,
                memberCompanyId: id,
                rbacUserId: user.id,
                can_view: true,
            },
        });
        if (!grant) {
            throw { err_msg: '无权限查看该公司统计' };
        }
        return member_c;
    },

    list_home_stat_scopes: async function (token) {
        const user = await rbac_lib.get_user_by_token(token);
        const home = await rbac_lib.get_company_by_token(token);
        if (!user || !home) {
            return { scopes: [] };
        }
        const scopes = [{ id: home.id, name: home.name || `公司${home.id}` }];
        if (!home.is_group) {
            return { scopes };
        }
        const sq = db_opt.get_sq();
        const rows = await sq.models.group_member_data_grant.findAll({
            where: {
                groupCompanyId: home.id,
                rbacUserId: user.id,
                can_view: true,
            },
            include: [{ model: sq.models.company, as: 'grant_member_company', attributes: ['id', 'name'] }],
            order: [['memberCompanyId', 'ASC']],
        });
        const seen = new Set([home.id]);
        for (const r of rows) {
            if (seen.has(r.memberCompanyId)) {
                continue;
            }
            seen.add(r.memberCompanyId);
            const nm = r.grant_member_company && r.grant_member_company.name;
            scopes.push({ id: r.memberCompanyId, name: nm || `公司${r.memberCompanyId}` });
        }
        return { scopes };
    },
};
