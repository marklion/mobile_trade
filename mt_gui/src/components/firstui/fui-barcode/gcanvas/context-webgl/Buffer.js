// 本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID：  281 4，营业执照号：9     1 1 1010 8MA01L 12  L    X  Q）专用，请尊重知识产权，勿私下传播，违者追究法律责任。
import {getTransferedObjectUUID} from './classUtils';

const name = 'WebGLBuffer';

function uuid(id) {
    return getTransferedObjectUUID(name, id);
}

export default class WebGLBuffer {
    className = name;

    constructor(id) {
        this.id = id;
    }

    static uuid = uuid;

    uuid() {
        return uuid(this.id);
    }
}