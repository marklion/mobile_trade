const db_opt = require('../db_opt');
const rbac_lib = require('./rbac_lib');

const GROUP_ROLE_NAME = '集团管理员';

module.exports = {
    is_super_admin_user(user) {
        return user && user.phone === '18911992582';
    },

    async assert_group_manager_token(token) {
        const user = await rbac_lib.get_user_by_token(token);
        const company = await rbac_lib.get_company_by_token(token);
        if (!user || !company) {
            throw { err_msg: '未登录' };
        }
        if (!company.is_group) {
            throw { err_msg: '当前公司不是集团' };
        }
        if (this.is_super_admin_user(user)) {
            return { user, company };
        }
        if (company.group_admin_user_id == null || company.group_admin_user_id !== user.id) {
            throw { err_msg: '仅集团管理员可操作' };
        }
        return { user, company };
    },

    async convert_company_to_group(company_id, admin_user_id) {
        const sq = db_opt.get_sq();
        const company = await sq.models.company.findByPk(company_id);
        if (!company) {
            throw { err_msg: '公司不存在' };
        }
        if (company.is_group) {
            throw { err_msg: '已是集团' };
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

    async list_home_users_plain(group_company_id) {
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

    async list_member_candidates_paged(group_company_id, pageNo) {
        const sq = db_opt.get_sq();
        const Op = db_opt.Op;
        const bound = await sq.models.company_group_member.findAll({
            attributes: ['memberCompanyId'],
        });
        const excludeSet = new Set();
        for (const b of bound) {
            if (b.memberCompanyId != null) {
                excludeSet.add(b.memberCompanyId);
            }
        }
        excludeSet.add(group_company_id);
        const excludeArr = [...excludeSet];
        const limit = 20;
        const offset = Math.max(0, pageNo) * limit;
        /* 老库 is_group 可能为 NULL，仅 false/NULL 视为非集团；勿用 NOT IN (含 NULL) 会整表查空 */
        const where = {
            [Op.or]: [{ is_group: false }, { is_group: null }],
            id: { [Op.notIn]: excludeArr },
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

    async list_members(group_company_id) {
        const sq = db_opt.get_sq();
        const rows = await sq.models.company_group_member.findAll({
            where: { groupCompanyId: group_company_id },
            include: [{ model: sq.models.company, as: 'member_company', attributes: ['id', 'name'] }],
            order: [['id', 'ASC']],
        });
        return rows.map((r) => ({
            id: r.id,
            member_company_id: r.memberCompanyId,
            member_company_name: r.member_company ? r.member_company.name : '',
        }));
    },

    async add_member(group_company_id, member_company_id) {
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
        const dup = await sq.models.company_group_member.findOne({
            where: { memberCompanyId: member_company_id },
        });
        if (dup) {
            if (dup.groupCompanyId === group_company_id) {
                throw { err_msg: '已是本集团成员' };
            }
            throw { err_msg: '该公司已加入其他集团' };
        }
        await sq.models.company_group_member.create({
            groupCompanyId: group_company_id,
            memberCompanyId: member_company_id,
        });
    },

    async remove_member(group_company_id, member_company_id) {
        const sq = db_opt.get_sq();
        const row = await sq.models.company_group_member.findOne({
            where: { groupCompanyId: group_company_id, memberCompanyId: member_company_id },
        });
        if (!row) {
            throw { err_msg: '成员不存在' };
        }
        await row.destroy();
        await sq.models.group_member_data_grant.destroy({
            where: { groupCompanyId: group_company_id, memberCompanyId: member_company_id },
        });
    },

    async list_grants(group_company_id) {
        const sq = db_opt.get_sq();
        const rows = await sq.models.group_member_data_grant.findAll({
            where: { groupCompanyId: group_company_id },
            include: [
                { model: sq.models.company, as: 'grant_member_company', attributes: ['id', 'name'] },
                { model: sq.models.rbac_user, attributes: ['id', 'name', 'phone'] },
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

    async upsert_grant(group_company_id, member_company_id, rbac_user_id, can_view, can_operate) {
        const sq = db_opt.get_sq();
        const member_row = await sq.models.company_group_member.findOne({
            where: { groupCompanyId: group_company_id, memberCompanyId: member_company_id },
        });
        if (!member_row) {
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

    async delete_grant(group_company_id, member_company_id, rbac_user_id) {
        const sq = db_opt.get_sq();
        const row = await sq.models.group_member_data_grant.findOne({
            where: { groupCompanyId: group_company_id, memberCompanyId: member_company_id, rbacUserId: rbac_user_id },
        });
        if (row) {
            await row.destroy();
        }
    },

    async user_has_member_data_access(user_id, member_company_id, need_write) {
        const sq = db_opt.get_sq();
        const user = await sq.models.rbac_user.findByPk(user_id);
        if (!user || !user.companyId) {
            return false;
        }
        const home = await sq.models.company.findByPk(user.companyId);
        if (!home || !home.is_group) {
            return false;
        }
        const is_member = await sq.models.company_group_member.findOne({
            where: { groupCompanyId: home.id, memberCompanyId: member_company_id },
        });
        if (!is_member) {
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
};
