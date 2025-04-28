const db_opt = require('../db_opt')
const path = require('path')
const fs = require('fs')
module.exports = {
    plan_detail_include() {
        return [
            {
                model: db_opt.get_sq().models.company,
                include: [db_opt.get_sq().models.global_replace_form],
                paranoid: false
            },
            { model: db_opt.get_sq().models.rbac_user, paranoid: false },
            { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.driver, paranoid: false },
            {
                model: db_opt.get_sq().models.stuff,
                include: [
                    {
                        model: db_opt.get_sq().models.company,
                        include: [db_opt.get_sq().models.global_replace_form],
                        paranoid: false
                    },
                    db_opt.get_sq().models.drop_take_zone
                ],
                paranoid: false
            },
            { model: db_opt.get_sq().models.plan_history, paranoid: false, separate: true, order: [[db_opt.get_sq().fn('TIMESTAMP', db_opt.get_sq().col('time')), 'ASC'], ['id', 'ASC']] },
            {
                model: db_opt.get_sq().models.bidding_item, paranoid: false, include: [{
                    model: db_opt.get_sq().models.bidding_turn,
                    include: [{
                        model: db_opt.get_sq().models.bidding_config
                    }]
                }]
            },
            { model: db_opt.get_sq().models.delegate, paranoid: false },
            {
                model: db_opt.get_sq().models.plan_sct_info, paranoid: false,
                include: [{
                    model: db_opt.get_sq().models.sct_scale_item,
                }],
                separate: true,
                order:[['id', 'ASC']]
            },
        ];
    },
    get_single_plan_by_id: async function (_plan_id) {
        let ret = {};
        let sq = db_opt.get_sq();
        ret = await sq.models.plan.findByPk(_plan_id, {
            include: this.plan_detail_include()
        });

        return ret;
    },
    get_private_prefix_url: async function () {
        let ret = '';
        const filePath = path.resolve('/database/private_url_prefix.txt');
        try {
            if (fs.existsSync(filePath)) {
                ret = await fs.promises.readFile(filePath, 'utf-8');
            }
        } catch (error) {
            console.error(':', error);
        }
        return ret;
    },
}
