function make_plugin_map() {
    let normal = require('./normal')
    let hnmhg= require('./hnmhg')
    return {
        normal: normal,
        hnmhg:hnmhg,
    }
}
module.exports = {
    get_plugin_by_name: function (name) {
        return make_plugin_map()[name];
    },
}