const { calcTotalVolume } = require('./He2Volume_yingtong/helium_volume.js');
module.exports = {
    input_metas: [
        {
            name: "tank_volume",
            label: '罐容积(立方米)'
        },
        {
            name: 'pre_temperature',
            label: '初始温度(摄氏度))'
        },
        {
            name: 'pre_pressure',
            label: '初始压强(barg)'
        },
        {
            name: 'post_temperature',
            label: '最终温度(摄氏度)'
        },
        {
            name: 'post_pressure',
            label: '最终压强(barg)'
        }
    ],
    calc_count: async function (orig_count, input_content) {
        let ret = orig_count;
        let ic_object = JSON.parse(input_content);
        if (ic_object && ic_object.tank_volume != null && ic_object.pre_temperature != null && ic_object.pre_pressure != null && ic_object.post_temperature != null && ic_object.post_pressure != null) {
            const V = Number(ic_object.tank_volume);
            const T1 = Number(ic_object.pre_temperature);
            const P1 = Number(ic_object.pre_pressure);
            const T2 = Number(ic_object.post_temperature);
            const P2 = Number(ic_object.post_pressure);
            if (![V, T1, P1, T2, P2].every(Number.isFinite) || V <= 0) {
                throw { err_msg: '罐容积必须为正数，温度和压强必须为有效数字' };
            }
            ret = calcTotalVolume({
                D4: V,
                C7: T1,
                D7: P1,
                E7: T2,
                F7: P2
            });
        }

        return Number(ret.toFixed(2));
    },
    convert_to_export_record: async function (input_content) {
        return `温度: ${input_content.temperature}, 压强: ${input_content.pressure}`
    },
};