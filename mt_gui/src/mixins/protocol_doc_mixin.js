import { load_docx_html } from '@/utils/protocol_doc.js';

export default {
    data() {
        return {
            doc_title: '',
            doc_path: '',
            doc_html: '',
            doc_loading: false,
            doc_error: '',
            signers: [],
        };
    },
    methods: {
        signPicUrl(path) {
            return this.$convert_attach_url(path);
        },
        applyProtocolResponse(resp) {
            this.doc_title = resp.doc_title;
            this.doc_path = resp.doc_path || '';
            this.doc_html = resp.doc_html || '';
            this.signers = resp.signers || [];
            if (this.doc_title) {
                uni.setNavigationBarTitle({ title: this.doc_title });
            }
        },
        loadDocxPreview: async function () {
            if (!this.doc_path) {
                this.doc_html = '';
                this.doc_error = '协议文件不存在';
                return;
            }
            if (this.doc_html) {
                this.doc_loading = false;
                this.doc_error = '';
                return;
            }
            // #ifdef H5
            this.doc_loading = true;
            this.doc_error = '';
            try {
                this.doc_html = await load_docx_html(this.doc_path, this.$convert_attach_url);
                if (!this.doc_html) {
                    this.doc_error = '协议内容加载失败';
                }
            } catch (error) {
                console.error(error);
                this.doc_error = '协议内容加载失败';
            } finally {
                this.doc_loading = false;
            }
            // #endif
            // #ifndef H5
            this.doc_loading = false;
            this.doc_error = '协议内容加载失败';
            // #endif
        },
    },
};
