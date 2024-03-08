const moment = require('moment');
module.exports = {
    check_in: async function (_plan) {
        _plan.register_time = moment().format('YYYY-MM-DD HH:mm:ss');
        _plan.register_number = 1;
        await _plan.save();
    },
}