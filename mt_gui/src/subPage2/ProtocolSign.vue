<template>
<view class="protocol-page">
    <scroll-view scroll-y class="protocol-scroll">
        <view class="protocol-body">
            <protocol-doc-preview
                :doc_loading="doc_loading"
                :doc_error="doc_error"
                :doc_path="doc_path"
                :doc_html="doc_html"
            />

            <view class="protocol-sign-zone">
                <view
                    v-for="signer in signers"
                    :key="signer.name"
                    class="sign-slot"
                >
                    <template v-if="signer.signed && signer.sign_pic">
                        <view class="sign-slot-head">
                            <text class="sign-slot-label">{{ signer.name }}</text>
                            <text v-if="signer.sign_time" class="sign-slot-time">{{ signer.sign_time }}</text>
                        </view>
                        <image
                            class="sign-slot-img"
                            :src="signPicUrl(signer.sign_pic)"
                            mode="aspectFit"
                        />
                    </template>
                    <view v-else class="sign-slot-btn-wrap">
                        <fui-button
                            :text="signer.name + '签字'"
                            type="primary"
                            btnSize="medium"
                            @click="openSign(signer)"
                        />
                    </view>
                </view>
            </view>
        </view>
    </scroll-view>
</view>
</template>

<script>
import ProtocolDocPreview from './components/ProtocolDocPreview.vue';
import protocolDocMixin from './mixins/protocol_doc_mixin.js';

export default {
    name: 'ProtocolSign',
    components: {
        ProtocolDocPreview,
    },
    mixins: [protocolDocMixin],
    data() {
        return {
            plan_id: 0,
            open_id: '',
        };
    },
    methods: {
        loadProtocol: async function () {
            if (!this.plan_id || !this.open_id) {
                return;
            }
            this.doc_loading = true;
            this.doc_error = '';
            const resp = await this.$send_req('/global/driver_get_protocol', {
                plan_id: this.plan_id,
                open_id: this.open_id,
            });
            if (!resp.signers || resp.signers.length === 0) {
                this.doc_loading = false;
                uni.navigateBack();
                return;
            }
            this.applyProtocolResponse(resp);
            if (resp.all_signed) {
                this.onAllSigned();
            }
            await this.loadDocxPreview();
        },
        openSign: function (signer) {
            if (signer.signed) {
                return;
            }
            uni.navigateTo({
                url: '/subPage2/ProtocolSignPad?plan_id=' + this.plan_id
                    + '&open_id=' + encodeURIComponent(this.open_id)
                    + '&signer_name=' + encodeURIComponent(signer.name),
            });
        },
        onAllSigned: function () {
            uni.showToast({ title: '协议签署完成', icon: 'success' });
            setTimeout(() => {
                uni.navigateBack();
            }, 800);
        },
    },
    onLoad(option) {
        this.plan_id = Number.parseInt(option.plan_id, 10) || 0;
        this.open_id = option.open_id || '';
        this.loadProtocol();
    },
    onShow() {
        if (this.plan_id && this.open_id) {
            this.loadProtocol();
        }
    },
};
</script>

<style scoped lang="scss">
@import '@/styles/protocol_page.scss';

.sign-slot-btn-wrap {
    width: 100%;
}
</style>
