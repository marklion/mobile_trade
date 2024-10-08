const db_opt = require('../db_opt')
module.exports = {
    plan_detail_include() {
        return [
            { model: db_opt.get_sq().models.company, paranoid: false },
            { model: db_opt.get_sq().models.rbac_user, paranoid: false },
            { model: db_opt.get_sq().models.vehicle, as: 'main_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.vehicle, as: 'behind_vehicle', paranoid: false },
            { model: db_opt.get_sq().models.driver, paranoid: false },
            { model: db_opt.get_sq().models.stuff, include: [db_opt.get_sq().models.company], paranoid: false },
            { model: db_opt.get_sq().models.plan_history, paranoid: false, separate: true, order: [[db_opt.get_sq().fn('TIMESTAMP', db_opt.get_sq().col('time')), 'ASC']] },
            {
                model: db_opt.get_sq().models.bidding_item, paranoid: false, include: [{
                    model: db_opt.get_sq().models.bidding_turn,
                    include: [{
                        model: db_opt.get_sq().models.bidding_config
                    }]
                }]
            }
        ];
    },
    get_single_plan_by_id: async function (_plan_id) {
        let ret = {};
        let sq = db_opt.get_sq();
        ret = await sq.models.plan.findByPk(_plan_id, {
            include: this.plan_detail_include()
        });

        return ret;
    }
}
