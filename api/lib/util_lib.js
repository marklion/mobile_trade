const db_opt = require('../db_opt')
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
                        include: [db_opt.get_sq().models.global_replace_form,
                        {
                            model: db_opt.get_sq().models.extra_info_config,
                            separate: true,
                            order: [['id', 'DESC']],
                        },
                        ],
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
                order: [['id', 'ASC']]
            },
            {
                model: db_opt.get_sq().models.extra_info_content,
                paranoid: false,
                include: [db_opt.get_sq().models.extra_info_config],
                separate: true,
                order: [['id', 'ASC']],
            }
        ];
    },
    get_single_plan_by_id: async function (_plan_id, _t) {
        let ret = {};
        let sq = db_opt.get_sq();
        let options = {
            include: this.plan_detail_include()
        }
        if (_t != undefined) {
            options.lock = _t.LOCK.UPDATE;
        }
        ret = await sq.models.plan.findByPk(_plan_id, options);

        return ret;
    }
}
