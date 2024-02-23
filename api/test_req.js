const mkapi = require('./api_utils');
function install(app) {
    let test_api = mkapi('/test', 'none', 'none', false, false, {
        p1: { type: String, have_to: true, mean: '参数1-字符串', example: 'test1' },
        p2: { type: Number, have_to: true, mean: '参数2-数字', example: 123 },
        p3: {
            type: Object, have_to: false, mean: '参数3-对象',
            explain: {
                p3_1: { type: String, have_to: true, mean: '参数3-1-字符串', example: 'test3_1' },
                p3_2: {
                    type: Array, have_to: true, mean: '参数3-2-数组',
                    explain: {
                        p3_2_1: { type: String, have_to: true, mean: '数组元素-字符串', example: 'test3_2_1' },
                    }
                },
            },
        },
    }, {
        r1: { type: String, mean: '返回值-字符串', example: 'test_result' },
        r2: { type: Number, mean: '返回值-数字', example: 111 },
        r3: {
            type: Object, mean: '返回值-对象', explain: {
                r3_1: { type: String, mean: '返回值-对象-字符串', example: 'test3_1' },
                r3_2: {
                    type: Array, mean: '返回值-对象-数组',
                    explain: {
                        r3_2_1: { type: String, mean: '返回值-对象-数组-字符串', example: 'test3_2_1' },
                    }
                },
            },
        },
    }, '测试', '测试接口描述');
    test_api.add_handler(function (body, token) {
        return 'test_result';
    });
    test_api.install(app);
    app.help_info.push(test_api.make_help_info());
}

module.exports = install;