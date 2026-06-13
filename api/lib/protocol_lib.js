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
    const paragraphs = xml.split(/<\/w:p>/);
    const lines = [];
    paragraphs.forEach((para) => {
        const texts = [];
        const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let m;
        while ((m = re.exec(para)) !== null) {
            if (m[1]) {
                texts.push(m[1]);
            }
        }
        const line = texts.join('');
        if (line.trim()) {
            lines.push(line.trim());
        }
    });
    return lines.join('\n');
}

function is_uuid_filename(name) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
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
                need_protocol: false,
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
            need_protocol: true,
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
