<template>
<view class="signature-config-wrap">
    <view style="margin-bottom: 32rpx; border: 2px solid #e0e0e0; border-radius: 8rpx; padding: 16rpx; background: #fafafa;">
        <fui-autograph ref="autographRef" :width="width" :height="height" :background="background" :lineWidth="lineWidth" :color="color" :tips="tips" @ready="() => { autographReady = true }" />
    </view>
    <view style="display: flex; justify-content: space-around;">
        <fui-button text="重签" type="warning" btnSize="mini" @click="handleRedraw" />
        <fui-button text="确认签名" type="primary" btnSize="mini" @click="handleSave" />
        <fui-button text="取消" type="gray" btnSize="mini" @click="goBack" />
    </view>
</view>
</template>

<script>
import FuiAutograph from '@/components/firstui/fui-autograph/fui-autograph.vue';

export default {
    name: 'ProtocolSignPad',
    components: {
        FuiAutograph,
    },
    data() {
        return {
            plan_id: 0,
            open_id: '',
            signer_name: '',
            width: 650,
            height: 450,
            background: '#e8e8e8',
            lineWidth: 5,
            color: '#181818',
            tips: '请签名！',
            autographReady: false,
        };
    },
    methods: {
        goBack() {
            uni.navigateBack();
        },
        handleRedraw() {
            if (this.$refs.autographRef) {
                this.$refs.autographRef.redraw();
            }
        },
        handleSave() {
            if (!this.$refs.autographRef) {
                return;
            }
            this.$refs.autographRef.drawComplete(async (imgPath) => {
                if (!imgPath) {
                    uni.showToast({ title: '请先签名', icon: 'none' });
                    return;
                }
                try {
                    const filePath = await this.uploadSignatureImage(imgPath);
                    const resp = await this.$send_req('/global/driver_sign_protocol', {
                        plan_id: this.plan_id,
                        open_id: this.open_id,
                        signer_name: this.signer_name,
                        sign_pic: filePath,
                    });
                    uni.showToast({ title: '签名成功', icon: 'success' });
                    const pages = getCurrentPages();
                    const prev = pages[pages.length - 2];
                    if (prev && prev.$vm && prev.$vm.loadProtocol) {
                        await prev.$vm.loadProtocol();
                        if (resp.all_signed && prev.$vm.onAllSigned) {
                            prev.$vm.onAllSigned();
                        }
                    }
                    uni.navigateBack();
                } catch (error) {
                    console.error(error);
                    uni.showToast({ title: '保存失败', icon: 'none' });
                }
            });
        },
        parseUploadFilePath(data) {
            if (typeof data === 'object' && data) {
                return data.file_path || data.url || '';
            }
            if (typeof data !== 'string') {
                return '';
            }
            if (data.startsWith('{')) {
                try {
                    const parsed = JSON.parse(data);
                    return parsed.file_path || parsed.url || '';
                } catch (parseError) {
                    console.warn('upload response JSON parse failed', parseError);
                    return data;
                }
            }
            return data;
        },
        uploadSignatureImage(imgPath) {
            return new Promise((resolve, reject) => {
                uni.uploadFile({
                    url: this.$remote_url() + '/api/v1/upload_file',
                    filePath: imgPath,
                    name: 'file',
                    header: {
                        token: uni.getStorageSync('token'),
                    },
                    success: (res) => {
                        const filePath = this.parseUploadFilePath(res.data);
                        if (filePath) {
                            resolve(filePath);
                        } else {
                            reject(new Error('上传失败，未获取到文件路径'));
                        }
                    },
                    fail: reject,
                });
            });
        },
    },
    onLoad(option) {
        this.plan_id = Number.parseInt(option.plan_id, 10) || 0;
        this.open_id = option.open_id || '';
        this.signer_name = option.signer_name || '';
        if (this.signer_name) {
            uni.setNavigationBarTitle({
                title: this.signer_name + '签字',
            });
        }
    },
};
</script>

<style scoped>
.signature-config-wrap {
    padding: 32rpx;
}
</style>
