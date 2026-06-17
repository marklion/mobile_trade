import mammoth from 'mammoth';

function fetch_docx_array_buffer(url) {
    return new Promise((resolve, reject) => {
        uni.request({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            success: (res) => {
                if (res.statusCode === 200 && res.data) {
                    resolve(res.data);
                    return;
                }
                reject(new Error('download failed'));
            },
            fail: reject,
        });
    });
}

export async function load_docx_html(doc_path, convert_attach_url) {
    const url = convert_attach_url(doc_path);
    const array_buffer = await fetch_docx_array_buffer(url);
    const result = await mammoth.convertToHtml({ arrayBuffer: array_buffer });
    return result.value || '';
}

export function open_docx_file(doc_path, convert_attach_url) {
    const url = convert_attach_url(doc_path);
    return new Promise((resolve, reject) => {
        uni.downloadFile({
            url,
            success: (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error('download failed'));
                    return;
                }
                uni.openDocument({
                    filePath: res.tempFilePath,
                    fileType: 'docx',
                    showMenu: true,
                    success: resolve,
                    fail: reject,
                });
            },
            fail: reject,
        });
    });
}
