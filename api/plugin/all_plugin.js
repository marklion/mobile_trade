function make_plugin_map() {
    let normal = require('./normal')
    return {
        normal: normal
    }
}
module.exports = {
    get_plugin_by_name: function (name) {
        return make_plugin_map()[name];
    },
}