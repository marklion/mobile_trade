/**
 * 氦气充装量 / 净体积计算模块
 * 复刻自 "副本氦气充装量计算表.xlsx" -> Vol_Calcu 工作表 L24 单元格
 *
 * 计算链路：
 *   L24 = SUM(L7:L22)            （其他行无数据时 = L7）
 *   Ln  = Jn - Kn                （净体积 = 初始体积 - 结束体积）
 *   Jn/Kn = 插值系数 × 容器体积 × (273.15+T_ref)/(273.15+21)
 *   插值系数：根据 (压力 psig, 温度 ℃) 在 Helium-PSI 物性表上
 *             先按温度取整定位列，再按压力在相邻两个整数 PSI 之间做线性插值
 *
 * 输入参数（对应 Excel 单元格）：
 *   D4 : 容器体积 (m³)
 *   C7 : 初始温度 (℃)
 *   D7 : 初始压力 (barg)
 *   E7 : 结束温度 (℃)
 *   F7 : 结束压力 (barg)
 *
 * 输出：净体积 (m³ @ 21℃)，对应 L24
 */

// 物性表：温度列 -20..50，压力行 1..3335 psig
const { temps, pressures, data } = require('./helium_table.json');

// 建索引，O(1) 查表
const tempIdx = new Map(temps.map((t, i) => [t, i]));
const pressIdx = new Map(pressures.map((p, i) => [p, i]));

/**
 * 查物性表：给定 psig 压力和温度(℃)，返回该点的体积系数
 * 复刻 Excel: 先 ROUNDDOWN/ROUNDUP 到相邻整数 PSI，再 FORECAST 线性插值
 */
function lookupHeliumCoefficient(pPsig, tCelsius) {
    // 温度取整（等价 Excel ROUND）
    const tRounded = Math.round(tCelsius);
    const ti = tempIdx.get(tRounded);
    if (ti === undefined) {
        throw new Error(`温度 ${tCelsius}℃ 取整后=${tRounded}℃ 超出表范围 [-20, 50]`);
    }

    // 压力向下/向上取整到整数 PSI
    const pLow = Math.floor(pPsig);
    const pHigh = Math.ceil(pPsig);
    const iLow = pressIdx.get(pLow);
    const iHigh = pressIdx.get(pHigh);
    if (iLow === undefined || iHigh === undefined) {
        throw new Error(`压力 ${pPsig} psig 超出表范围 [1, 3335]`);
    }

    const yLow = data[iLow][ti];
    const yHigh = data[iHigh][ti];

    // 等价 Excel: IF(AH=AI, AH, FORECAST(...))
    // 两个 PSI 整数点重合（即压力正好是整数 psig）时直接取值
    if (pLow === pHigh || yLow === yHigh) return yLow;

    // Excel FORECAST 两点线性插值：y = yLow + (yHigh-yLow)*(x-pLow)/(pHigh-pLow)
    return yLow + ((yHigh - yLow) * (pPsig - pLow)) / (pHigh - pLow);
}

/**
 * 计算某一状态（初始 or 结束）下的体积
 * @param {number} tempC     温度 ℃
 * @param {number} pressureBarg 压力 barg
 * @param {number} vesselVolume 容器体积 m³ (D4)
 * @param {number} tRef       参比温度 ℃ (H3，默认 21)
 */
function calcStateVolume(tempC, pressureBarg, vesselVolume, tRef = 21) {
    if (tempC == null || pressureBarg == null) return null;
    // barg -> psig（原表 IF($H$4="barg", p*14.5, p)；当前单位是 barg）
    const pPsig = pressureBarg * 14.5;
    const coef = lookupHeliumCoefficient(pPsig, tempC);
    // 温度折算到参比温度 21℃
    return coef * vesselVolume * ((273.15 + tRef) / (273.15 + 21));
}

/**
 * 主函数：复现 L24
 * @param {object} input
 * @param {number} input.D4  容器体积 m³
 * @param {number} input.C7  初始温度 ℃
 * @param {number} input.D7  初始压力 barg
 * @param {number} input.E7  结束温度 ℃
 * @param {number} input.F7  结束压力 barg
 * @returns {number|null} 净体积 m³，等价 L24；空输入返回 null
 */
function calcTotalVolume({ D4, C7, D7, E7, F7 }) {
    if (D4 == null) return null;
    const j7 = calcStateVolume(C7, D7, D4); // 初始体积
    const k7 = calcStateVolume(E7, F7, D4); // 结束体积
    if (j7 == null || k7 == null) return null;
    // L24 = SUM(L7:L22)，其他行无输入时 = L7 = J7 - K7
    return k7-j7;
}

module.exports = {
    calcTotalVolume,
    calcStateVolume,
    lookupHeliumCoefficient,
};
