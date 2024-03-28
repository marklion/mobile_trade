// 本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID：28   14，营业执照号：9 1110108  MA0    1  L   1  2L X  Q）专用，请尊重知识产权，勿私下传播，违者追究法律责任。
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