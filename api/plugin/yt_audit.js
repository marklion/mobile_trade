const db_opt = require('../db_opt');
module.exports = {
    convert_audit_content: async function (body, url) {
        let ret = '';
        if (url == '/stuff/change_price_by_plan') {
            let plan_array = body.plan_id.split(',');
            ret = `申请修改订单单价为${body.unit_price}, 修改原因：${body.comment}, 共${plan_array.length}单`;
        }
        else if (url == '/stuff/change_price')
        {
            let stuff = await db_opt.get_sq().models.stuff.findByPk(body.stuff_id);
            ret = `申请修改物料【${stuff.name}】单价为${body.price}, 修改原因：${body.comment}`;
        }
        return ret;
    }
}