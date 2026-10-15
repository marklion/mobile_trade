const db_opt = require('../db_opt');
const rbac_lib = require('./rbac_lib');

const DEVICE_ACTIONS = [
    { name: 'gate_open', description: '开门/开闸' },
    { name: 'gate_close', description: '关门/关闸' },
    { name: 'confirm_scale', description: '确认计量' },
    { name: 'reset_scale', description: '复位计量' },
    { name: 'trigger_cap', description: '触发抓拍' },
    { name: 'take_pic', description: '拍照' },
];

function action_label(action) {
    const found = DEVICE_ACTIONS.find((item) => item.name === action);
    return found ? found.description : action;
}

function assert_valid_action(action) {
    if (!DEVICE_ACTIONS.some((item) => item.name === action)) {
        throw { err_msg: '不支持的设备动作: ' + action };
    }
}

module.exports = {
    DEVICE_ACTIONS,
    action_label,
    get_all_actions: function () {
        return DEVICE_ACTIONS.slice();
    },
    bind: async function (company, device_name, action, role_id) {
        assert_valid_action(action);
        if (!company) {
            throw { err_msg: '公司不存在' };
        }
        const device = String(device_name || '').trim();
        if (!device) {
            throw { err_msg: '设备名称不能为空' };
        }
        const sq = db_opt.get_sq();
        const role = await sq.models.rbac_role.findByPk(role_id);
        if (!role || role.companyId !== company.id) {
            throw { err_msg: '角色不存在' };
        }
        const [row, created] = await sq.models.device_permission_binding.findOrCreate({
            where: {
                companyId: company.id,
                device_name: device,
                action: action,
                rbacRoleId: role_id,
            },
            defaults: {
                companyId: company.id,
                device_name: device,
                action: action,
                rbacRoleId: role_id,
            },
        });
        if (!created) {
            throw { err_msg: '绑定关系已存在' };
        }
        return row;
    },
    unbind: async function (company, binding_id) {
        if (!company) {
            throw { err_msg: '公司不存在' };
        }
        const sq = db_opt.get_sq();
        const row = await sq.models.device_permission_binding.findByPk(binding_id);
        if (!row || row.companyId !== company.id) {
            throw { err_msg: '绑定关系不存在' };
        }
        await row.destroy();
        return true;
    },
    list: async function (company, device_name) {
        if (!company) {
            throw { err_msg: '公司不存在' };
        }
        const sq = db_opt.get_sq();
        const where = { companyId: company.id };
        if (device_name) {
            where.device_name = String(device_name).trim();
        }
        const rows = await sq.models.device_permission_binding.findAll({
            where: where,
            include: [{
                model: sq.models.rbac_role,
                attributes: ['id', 'name', 'description'],
            }],
            order: [['id', 'ASC']],
        });
        return rows.map((row) => {
            const json = row.toJSON();
            return {
                id: json.id,
                device_name: json.device_name,
                action: json.action,
                action_name: action_label(json.action),
                role_id: json.rbacRoleId,
                role_name: json.rbac_role ? json.rbac_role.name : '',
                role_description: json.rbac_role ? (json.rbac_role.description || '') : '',
            };
        });
    },
    assert_allowed: async function (token, company, device_name, action) {
        if (!company || !company.device_permission_control) {
            return;
        }
        assert_valid_action(action);
        const user = await rbac_lib.get_user_by_token(token);
        if (!user) {
            throw { err_msg: '未登录' };
        }
        const roles = await user.getRbac_roles();
        const role_ids = roles.map((role) => role.id);
        if (role_ids.length === 0) {
            throw { err_msg: '无设备操作权限' };
        }
        const sq = db_opt.get_sq();
        const binding = await sq.models.device_permission_binding.findOne({
            where: {
                companyId: company.id,
                device_name: String(device_name || '').trim(),
                action: action,
                rbacRoleId: { [db_opt.Op.in]: role_ids },
            },
        });
        if (!binding) {
            throw { err_msg: '无设备操作权限: ' + action_label(action) };
        }
    },
};
