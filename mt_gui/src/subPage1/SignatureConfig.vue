<template>
    <view class="signature-config-wrap">
        <view style="margin-bottom: 32rpx; border: 2px solid #e0e0e0; border-radius: 8rpx; padding: 16rpx; background: #fafafa;">
            <fui-autograph ref="autographRef" :width="width" :height="height" :background="background"
                :lineWidth="lineWidth" :color="color" :tips="tips" @ready="() => { autographReady = true }" />
        </view>
        <view style="display: flex; justify-content: space-around;">
            <fui-button text="重签" type="warning" btnSize="mini" @click="handleRedraw" />
            <fui-button text="保存签名" type="primary" btnSize="mini" @click="handleSave" />
            <fui-button text="清除签名" type="danger" btnSize="mini" @click="handleClear" />
        </view>
        <view v-if="imgUrl" style="margin-top: 32rpx; text-align: center;">
            <fui-text text="签名图片预览" size="28" type="primary" />
            <image :src="imgUrl" mode="widthFix"
                style="width: 100%; max-width: 400px; margin-top: 16rpx; border: 1px solid #eee;" />
        </view> 
    </view>
</template>

<script>
import FuiAutograph from '@/components/firstui/fui-autograph/fui-autograph.vue';
export default {
    name: 'SignatureConfig',
    components: { FuiAutograph },
    data() {
        return {
            width: 650,
            height: 450,
            background: '#e8e8e8',
            lineWidth: 5,
            color: '#181818',
            tips: '请签名！',
            imgUrl: '',
            autographReady: false,
        };
    },
    methods: {
        handleAutographReady() {
            this.autographReady = true;
        },
        async loadUserSignature() {
            try {
                // 获取用户已有的签名
                const result = await this.$send_req('/sc/get_user_signature');
                if (result && result.signature_pic) {
                    this.imgUrl = this.$convert_attach_url(result.signature_pic);
                }
            } catch (error) {
                console.error('获取用户签名失败:', error);
            }
        },
        handleRedraw() {
            if (this.$refs.autographRef) {
                this.$refs.autographRef.redraw();
                this.imgUrl = '';
            }
        },
        handleSave() {
            if (this.$refs.autographRef) {
                this.$refs.autographRef.drawComplete(async (imgPath) => {
                    if (imgPath) {
                        try {
                            const uploadResult = await this.uploadSignatureImage(imgPath);
                            if (uploadResult) {
                                await this.saveSignatureToUser(uploadResult);
                                this.imgUrl = this.$convert_attach_url(uploadResult);
                                uni.showToast({
                                    title: '签名保存成功',
                                    icon: 'success'
                                });
                            }
                        } catch (error) {
                            console.error('保存签名失败:', error);
                            uni.showToast({
                                title: '保存失败',
                                icon: 'none'
                            });
                        }
                    } else {
                        uni.showToast({
                            title: '请先签名',
                            icon: 'none'
                        });
                    }
                });
            }
        },
        async uploadSignatureImage(imgPath) {
            return new Promise((resolve, reject) => {
                uni.uploadFile({
                    url: this.$remote_url() + '/api/v1/upload_file',
                    filePath: imgPath,
                    name: 'file',
                    header: {
                        'token': uni.getStorageSync('token'),
                    },
                    success: (res) => {
                        console.log('签名图片上传返回内容:', res.data);
                        try {
                            let filePath;
                            if (typeof res.data === 'string') {
                                try {
                                    const data = JSON.parse(res.data);
                                    filePath = data.file_path || data.url;
                                } catch (e) {
                                    filePath = res.data;
                                }
                            } else if (typeof res.data === 'object') {
                                filePath = res.data.file_path || res.data.url;
                            }
                            if (filePath) {
                                resolve(filePath);
                            } else {
                                reject(new Error('上传失败，未获取到文件路径'));
                            }
                        } catch (e) {
                            reject(new Error('上传响应解析失败: ' + res.data));
                        }
                    },
                    fail: (err) => {
                        reject(err);
                    }
                });
            });
        },
        async saveSignatureToUser(filePath) {
                await this.$send_req('/sc/update_user_signature', {
                signature_pic: filePath
            });
        },
        async handleClear() {
            try {
                await this.$send_req('/sc/update_user_signature', {
                    signature_pic: ''
                });
                this.imgUrl = '';
                uni.showToast({
                    title: '签名已清除',
                    icon: 'success'
                });
            } catch (error) {
                console.error('清除签名失败:', error);
                uni.showToast({
                    title: '清除失败',
                    icon: 'none'
                });
            }
        },
    },
    onLoad() {
        this.loadUserSignature();
    },
};
</script>

<style scoped>
.signature-config-wrap {
    padding: 32rpx;
}
</style>
