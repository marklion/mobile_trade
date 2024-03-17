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
                    ret[itr].push(copy_by_key(element[0], sub_itr));
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