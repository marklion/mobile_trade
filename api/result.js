/**
 * 数组元素：文档里常用「单字段对象」描述标量列表（如 operate_member_company_ids: [{ member_company_id: 2 }]），
 * 实际接口返回 [2]。此时不能把数字当对象按 key 拷贝，否则会得到 {}。
 */
function copy_array_element(template_item, actual_item) {
    const tmpl_type = Object.prototype.toString.call(template_item);
    const act_type = Object.prototype.toString.call(actual_item);
    if (tmpl_type === '[object Object]' && act_type !== '[object Object]') {
        const keys = Object.keys(template_item);
        if (keys.length === 1) {
            const sample = template_item[keys[0]];
            if (Object.prototype.toString.call(sample) === act_type) {
                return actual_item;
            }
        }
    }
    return copy_by_key(template_item, actual_item);
}

function copy_by_key(source, target) {
    let ret = {};
    Object.keys(source).forEach((itr) => {
        let element = source[itr];
        let source_type = Object.prototype.toString.call(element);
        let target_type = Object.prototype.toString.call(target[itr]);
        if (target[itr] != undefined && source_type == target_type) {
            if (source_type == '[object Object]') {
                ret[itr] = copy_by_key(element, target[itr]);
            } else if (target_type == '[object Array]') {
                ret[itr] = [];
                target[itr].forEach((sub_itr) => {
                    ret[itr].push(copy_array_element(element[0], sub_itr));
                });
            } else {
                ret[itr] = target[itr];
            }
        }
    });
    return ret;
}

function make_result(result, reason = 'undefined error message', result_define = {}) {
    let ret = { err_msg: reason };
    if (null != result && result_define != {}) {
        ret = { result: copy_by_key(result_define, result), err_msg: '' };
    }

    return ret;
}

module.exports = make_result;