const sleep = (timeout) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout)
    })
}
module.exports = {
    get_open_id_by_code: async function (_code) {
        await sleep(5);
        return _code
    },
    get_phone_by_code: async function (_code) {
        await sleep(5);
        return _code;
    }
}