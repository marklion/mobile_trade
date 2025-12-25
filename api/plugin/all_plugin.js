const normal = require('./normal')
const hnmhg = require('./hnmhg')
const old_zczh = require('./old_zczh')
const new_zczh = require('./new_zczh')
const yt_audit = require('./yt_audit')
function make_plugin_map() {
    return {
        normal: normal,
        hnmhg: hnmhg,
        old_zczh: old_zczh,
        new_zczh: new_zczh,
        yt_audit: yt_audit,
    }
}
module.exports = {
    get_plugin_by_name: function (name) {
        return make_plugin_map()[name];
    },
}