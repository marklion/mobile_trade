import { load_docx_html, open_docx_file } from '@/utils/protocol_doc.js';

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
            this.doc_loading = true;
            this.doc_error = '';
            this.doc_html = '';
            try {
                this.doc_html = await load_docx_html(this.doc_path, this.$convert_attach_url);
            } catch (error) {
                console.error(error);
                this.doc_error = '协议预览失败，可尝试直接打开文件';
            } finally {
                this.doc_loading = false;
            }
        },
        openDocx: async function () {
            if (!this.doc_path) {
                return;
            }
            uni.showLoading({ title: '打开中...' });
            try {
                await open_docx_file(this.doc_path, this.$convert_attach_url);
            } catch (error) {
                console.error(error);
                uni.showToast({ title: '打开失败', icon: 'none' });
            } finally {
                uni.hideLoading();
            }
        },
    },
};
