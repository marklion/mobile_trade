module.exports = {
    input_metas: [
        {
            name: 'temperature',
            label: '温度'
        },
        {
            name: 'pressure',
            label: '压强'
        }
    ],
    calc_count: async function (orig_count, input_content) {
        let ret = orig_count;
        let ic_object = JSON.parse(input_content);
        if (ic_object && ic_object.temperature != null && ic_object.pressure != null) {
            const T = Number(ic_object.temperature);
            const P = Number(ic_object.pressure);
            ret = 1.0770e+00 - 3.9506e-03 * T + 1.0625e+00 * P +
                1.7250e-05 * T ** 2 - 3.8796e-03 * T * P - 5.8724e-04 * P ** 2 -
                2.5619e-07 * T ** 3 + 1.3951e-05 * T ** 2 * P + 4.2787e-06 * T * P ** 2 +
                6.2438e-07 * P ** 3 + 5.2606e-09 * T ** 4 - 4.5217e-08 * T ** 3 * P -
                1.9524e-08 * T ** 2 * P ** 2 - 5.1043e-09 * T * P ** 3 - 8.0673e-10 * P ** 4 -
                4.0746e-11 * T ** 5 + 8.8202e-11 * T ** 4 * P + 5.2277e-11 * T ** 3 * P ** 2 +
                1.4307e-11 * T ** 2 * P ** 3 + 4.5078e-12 * T * P ** 4 + 5.8827e-13 * P ** 5;
            ret *= orig_count * 1000;
        }
        return Number(ret.toFixed(2));
    },
    convert_to_export_record: async function (input_content) {
        return `温度: ${input_content.temperature}, 压强: ${input_content.pressure}`
    },
};