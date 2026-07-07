// #ifdef H5
import mammoth from 'mammoth';
// #endif

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
    // #ifdef H5
    const url = convert_attach_url(doc_path);
    const array_buffer = await fetch_docx_array_buffer(url);
    const result = await mammoth.convertToHtml({ arrayBuffer: array_buffer });
    return result.value || '';
    // #endif
    // #ifndef H5
    return '';
    // #endif
}
