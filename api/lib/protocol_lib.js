const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
const moment = require('moment');
const db_opt = require('../db_opt');

function create_api_error(message) {
    const error = new Error(message);
    error.err_msg = message;
    return error;
}

function need_protocol(stuff) {
    return Boolean(stuff?.protocol_doc_path);
}

function get_signers(stuff) {
    if (!stuff?.protocol_signers) {
        return ['司机'];
    }
    const signers = stuff.protocol_signers.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    return signers.length > 0 ? signers : ['司机'];
}

const BR_TAG = '<w:br';
const T_TAG = '<w:t';
const T_CLOSE = '</w:t>';
const PARA_CLOSE = '</w:p>';
const MAX_DOCX_XML_LENGTH = 5 * 1024 * 1024;

function extract_paragraph_text(para) {
    let result = '';
    let index = 0;
    while (index < para.length) {
        const brIndex = para.indexOf(BR_TAG, index);
        const textIndex = para.indexOf(T_TAG, index);
        if (brIndex === -1 && textIndex === -1) {
            break;
        }
        const useBr = brIndex !== -1 && (textIndex === -1 || brIndex < textIndex);
        if (useBr) {
            const closeIndex = para.indexOf('/>', brIndex);
            if (closeIndex === -1) {
                break;
            }
            result += '\n';
            index = closeIndex + 2;
            continue;
        }
        const openEnd = para.indexOf('>', textIndex);
        if (openEnd === -1) {
            break;
        }
        const closeIndex = para.indexOf(T_CLOSE, openEnd + 1);
        if (closeIndex === -1) {
            break;
        }
        result += para.slice(openEnd + 1, closeIndex);
        index = closeIndex + T_CLOSE.length;
    }
    return result;
}

function trim_trailing_newlines(text) {
    let end = text.length;
    while (end > 0 && text[end - 1] === '\n') {
        end -= 1;
    }
    return end === text.length ? text : text.slice(0, end);
}

function is_hex_char(code) {
    return (code >= 48 && code <= 57)
        || (code >= 97 && code <= 102)
        || (code >= 65 && code <= 70);
}

function is_hex_segment(segment, length) {
    if (segment.length !== length) {
        return false;
    }
    for (let i = 0; i < length; i += 1) {
        if (!is_hex_char(segment.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}

function extract_docx_text(doc_path) {
    const fullPath = path.resolve('/database' + doc_path);
    if (!fs.existsSync(fullPath)) {
        return '';
    }
    const content = fs.readFileSync(fullPath, 'binary');
    const zip = new PizZip(content);
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
        return '';
    }
    const xml = docFile.asText();
    if (xml.length > MAX_DOCX_XML_LENGTH) {
        return '';
    }
    const paragraphs = xml.split(PARA_CLOSE);
    const lines = [];
    paragraphs.forEach((para) => {
        lines.push(extract_paragraph_text(para));
    });
    return trim_trailing_newlines(lines.join('\n'));
}

function is_uuid_filename(name) {
    if (typeof name !== 'string' || name.length !== 36) {
        return false;
    }
    return is_hex_segment(name.slice(0, 8), 8)
        && name[8] === '-'
        && is_hex_segment(name.slice(9, 13), 4)
        && name[13] === '-'
        && is_hex_segment(name.slice(14, 18), 4)
        && name[18] === '-'
        && is_hex_segment(name.slice(19, 23), 4)
        && name[23] === '-'
        && is_hex_segment(name.slice(24, 36), 12);
}

function get_doc_title(doc_path, doc_content) {
    if (!doc_path) {
        return '协议内容';
    }
    const base = path.basename(doc_path, path.extname(doc_path));
    if (base && !is_uuid_filename(base)) {
        return base;
    }
    const firstLine = (doc_content || '').split('\n').map((s) => s.trim()).find(Boolean);
    if (firstLine && firstLine.length <= 40) {
        return firstLine;
    }
    return '协议内容';
}

module.exports = {
    need_protocol,
    get_signers,
    extract_docx_text,
    get_doc_title,
    plan_protocol_signed: async function (plan) {
        if (!need_protocol(plan.stuff)) {
            return true;
        }
        const required = get_signers(plan.stuff);
        const signs = await plan.getPlan_protocol_signs();
        const signed_names = new Set(signs.filter((s) => s.sign_pic).map((s) => s.signer_name));
        return required.every((name) => signed_names.has(name));
    },
    get_plan_protocol_info: async function (plan) {
        const stuff = plan.stuff;
        if (!need_protocol(stuff)) {
            return {
                doc_title: '',
                doc_content: '',
                signers: [],
                all_signed: true,
            };
        }
        const required = get_signers(stuff);
        const signs = await plan.getPlan_protocol_signs();
        const sign_map = {};
        signs.forEach((s) => {
            if (s.sign_pic) {
                sign_map[s.signer_name] = s;
            }
        });
        const doc_content = extract_docx_text(stuff.protocol_doc_path);
        return {
            doc_title: get_doc_title(stuff.protocol_doc_path, doc_content),
            doc_content: doc_content,
            signers: required.map((name) => ({
                name,
                signed: !!sign_map[name],
                sign_pic: sign_map[name] ? sign_map[name].sign_pic : '',
                sign_time: sign_map[name] ? sign_map[name].sign_time : '',
            })),
            all_signed: required.every((name) => !!sign_map[name]),
        };
    },
    save_sign: async function (plan, signer_name, sign_pic) {
        if (!need_protocol(plan.stuff)) {
            throw create_api_error('该计划无需签署协议');
        }
        const required = get_signers(plan.stuff);
        if (!required.includes(signer_name)) {
            throw create_api_error('无效的签名人');
        }
        if (!sign_pic) {
            throw create_api_error('签名不能为空');
        }
        const signs = await plan.getPlan_protocol_signs({ where: { signer_name } });
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        if (signs.length > 0) {
            signs[0].sign_pic = sign_pic;
            signs[0].sign_time = now;
            await signs[0].save();
        } else {
            await plan.createPlan_protocol_sign({
                signer_name,
                sign_pic,
                sign_time: now,
            });
        }
        return { result: true };
    },
};
