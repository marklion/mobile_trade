const { pinyin } = require('pinyin');

function buildPySearch(name) {
    if (!name) {
        return '';
    }
    const chars = [...name];
    let full = '';
    let initials = '';
    chars.forEach((ch) => {
        if (/[\u4e00-\u9fff]/.test(ch)) {
            const py = pinyin(ch, { style: 'normal' });
            const p = py[0][0].toLowerCase();
            full += p;
            initials += p[0];
        } else if (/[a-zA-Z0-9_]/.test(ch)) {
            const lower = ch.toLowerCase();
            full += lower;
            initials += lower;
        }
    });
    return full + initials;
}

module.exports = {
    buildPySearch,
};
