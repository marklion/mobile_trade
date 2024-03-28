// 本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID：2  8 14，营业执照号： 9  1       11010  8  MA 01L12L X Q）专用，请尊重知识产权，勿私下传播，违者追究法律责任。
export default class WebGLActiveInfo {
    className = 'WebGLActiveInfo';

    constructor({
        type, name, size
    }) {
        this.type = type;
        this.name = name;
        this.size = size;
    }
}