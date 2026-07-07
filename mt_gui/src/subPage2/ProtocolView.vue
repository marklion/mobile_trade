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

            <view v-if="signedSigners.length > 0" class="protocol-sign-zone">
                <view
                    v-for="signer in signedSigners"
                    :key="signer.name"
                    class="sign-slot"
                >
                    <view class="sign-slot-head">
                        <text class="sign-slot-label">{{ signer.name }}</text>
                        <text v-if="signer.sign_time" class="sign-slot-time">{{ signer.sign_time }}</text>
                    </view>
                    <image
                        class="sign-slot-img"
                        :src="signPicUrl(signer.sign_pic)"
                        mode="aspectFit"
                    />
                </view>
            </view>
        </view>
    </scroll-view>
</view>
</template>

<script>
import ProtocolDocPreview from '@/components/ProtocolDocPreview.vue';
import protocolDocMixin from '@/mixins/protocol_doc_mixin.js';

export default {
    name: 'ProtocolView',
    components: {
        ProtocolDocPreview,
    },
    mixins: [protocolDocMixin],
    data() {
        return {
            plan_id: 0,
        };
    },
    computed: {
        signedSigners() {
            return (this.signers || []).filter((s) => s.signed && s.sign_pic);
        },
    },
    methods: {
        loadProtocol: async function () {
            if (!this.plan_id) {
                return;
            }
            this.doc_loading = true;
            this.doc_error = '';
            const resp = await this.$send_req('/global/get_plan_protocol', {
                plan_id: this.plan_id,
            });
            this.applyProtocolResponse(resp);
            await this.loadDocxPreview();
        },
    },
    onLoad(option) {
        this.plan_id = Number.parseInt(option.plan_id, 10) || 0;
        this.loadProtocol();
    },
};
</script>

<style scoped lang="scss">
@import '@/styles/protocol_page.scss';
</style>
