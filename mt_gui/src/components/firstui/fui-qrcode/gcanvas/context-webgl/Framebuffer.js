// 本文件由FirstUI授权予北京卓创维朗科技有限公司（会员ID：2  81 4，营业执照号：91 1 101   08  MA 0 1L1   2 LX    Q）专用，请尊重知识产权，勿私下传播，违者追究法律责任。
import {getTransferedObjectUUID} from './classUtils';

const name = 'WebGLFrameBuffer';

function uuid(id) {
    return getTransferedObjectUUID(name, id);
}

export default class WebGLFramebuffer {
    className = name;

    constructor(id) {
        this.id = id;
    }

    static uuid = uuid;

    uuid() {
        return uuid(this.id);
    }
}