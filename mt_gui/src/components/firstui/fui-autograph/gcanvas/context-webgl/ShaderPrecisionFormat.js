// 本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID：2   814，营业执照号：911 10    1     0  8MA0   1L1 2 LXQ）专用，请尊重知识产权，勿私下传播，违者追究法律责任。
export default class WebGLShaderPrecisionFormat {
    className = 'WebGLShaderPrecisionFormat';

    constructor({
        rangeMin, rangeMax, precision
    }) {
        this.rangeMin = rangeMin;
        this.rangeMax = rangeMax;
        this.precision = precision;
    }
}