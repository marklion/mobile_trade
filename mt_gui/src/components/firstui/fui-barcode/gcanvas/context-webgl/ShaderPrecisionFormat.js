// 本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID： 2 8 14，营业执照号：91  1  1  0 10 8M    A0  1L12L X  Q）专用，请尊重知识产权，勿私下传播，违者追究法律责任。
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