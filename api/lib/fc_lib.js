const db_opt = require('../db_opt');
const sq = db_opt.get_sq();
const fc_content = [
    sq.models.field_check_item,
    sq.models.rbac_role,
    sq.models.stuff,
];
module.exports = {
    add_fc_table: async function (name, stuff_id) {
        let stuff = await sq.models.stuff.findByPk(stuff_id);
        let exist_fc_tables = await stuff.getField_check_tables({ where: { name: name } });
        if (exist_fc_tables.length > 0) {
            return;
        }
        let target_ft = await sq.models.field_check_table.create({ name: name });
        await target_ft.setStuff(stuff);
    },
    del_fc_table: async function (id) {
        let exist_fc = await this.get_fc_table(id);
        if (exist_fc) {
            await exist_fc.destroy();
        }
    },
    get_fc_table: async function (id, full = false) {
        let include_content = [];
        if (full) {
            include_content = fc_content
        }

        return await sq.models.field_check_table.findByPk(id, {
            include: include_content,
        });
    },
    get_all_fc_table: async function (stuff_id, pageNo) {
        let stuff = await sq.models.stuff.findByPk(stuff_id);
        return {
            total: await stuff.countField_check_tables(),
            fc_table: await stuff.getField_check_tables({
                offset: 20 * pageNo,
                limit: 20,
                include: fc_content,
            }),
        };
    },
    add_item2fc_table: async function (fc_id, item_name) {
        let fc_table = await this.get_fc_table(fc_id);
        let exist_fc_item = await fc_table.getField_check_items({ where: { name: item_name } });
        if (exist_fc_item.length > 0) {
            return;
        }
        let new_one = await sq.models.field_check_item.create({ name: item_name });
        await new_one.setField_check_table(fc_table);
    },
    get_fc_item: async function (item_id) {
        return await sq.models.field_check_item.findByPk(item_id, {
            include: [{
                model: sq.models.field_check_table,
                include: [sq.models.stuff]
            }]
        });
    },
    del_fc_item: async function (item_id) {
        let exist_fc = await this.get_fc_item(item_id);
        if (exist_fc) {
            await exist_fc.destroy();
        }
    },
    get_fc_plan_table: async function (plan_id, pageNo) {
        let plan = await sq.models.plan.findByPk(plan_id);
        let ret = await this.get_all_fc_table(plan.stuffId, pageNo);
        for (let index = 0; index < ret.fc_table.length; index++) {
            const element = ret.fc_table[index];
            let fc_plan_tables = await element.getFc_plan_tables({
                where: {
                    planId: plan_id
                },
                include: [{
                    model: sq.models.fc_check_result,
                    include: [sq.models.field_check_item]
                }, sq.models.rbac_user]
            });
            if (fc_plan_tables.length == 1) {
                element.fc_plan_table = fc_plan_tables[0];
            }
        }
        return { fc_plan_tables: ret.fc_table, total: ret.total };
    },
    prepare_empty_fc: async function (plan_id) {
        let plan = await sq.models.plan.findByPk(plan_id);
        let stuff = await plan.getStuff();
        let fc_tables = await stuff.getField_check_tables();
        for (let index = 0; index < fc_tables.length; index++) {
            const element = fc_tables[index];
            let exist_fc_plan_tables = await element.getFc_plan_tables({ where: { planId: plan_id } });
            if (exist_fc_plan_tables.length > 0) {
                continue;
            }
            let new_one = await sq.models.fc_plan_table.create();
            await element.addFc_plan_table(new_one);
            await new_one.setPlan(plan);
            let fc_items = await element.getField_check_items();
            for (let j = 0; j < fc_items.length; j++) {
                const item = fc_items[j];
                await new_one.createFc_check_result({ fieldCheckItemId: item.id });
            }
        }
    },
}