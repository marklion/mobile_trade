function make_result(result, reason='undefined error message') {
    let ret = {err_msg:reason};
    if (null != result) {
        ret = {result:result, err_msg:''};
    }

    return ret;
}

module.exports = make_result;