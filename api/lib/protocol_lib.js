const fs = require('node:fs');
const path = require('node:path');
const PizZip = require('pizzip');
const moment = require('moment');
const uuid = require('uuid');
const db_opt = require('../db_opt');

function create_api_error(message) {
    const error = new Error(message);
    error.err_msg = message;
    return error;
}

function normalize_attach_path(attach_path) {
    if (attach_path === undefined || attach_path === null) {
        return '';
    }
    let normalized = String(attach_path).trim().replace(/^["']|["']$/g, '');
    if (!normalized) {
        return '';
    }
    if (/^https?:\/\//i.test(normalized)) {
        try {
            normalized = new URL(normalized).pathname;
        } catch (error) {
            return '';
        }
    }
    if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
    }
    return normalized;
}

function resolve_storage_full_path(attach_path) {
    const normalized = normalize_attach_path(attach_path);
    if (!normalized) {
        return '';
    }
    return path.resolve(`/database${normalized}`);
}

async function read_attach_file_buffer(attach_path) {
    const normalized = normalize_attach_path(attach_path);
    if (!normalized) {
        throw create_api_error('协议文件不存在');
    }
    const full_path = resolve_storage_full_path(normalized);
    if (full_path && fs.existsSync(full_path)) {
        return fs.readFileSync(full_path);
    }
    const hosts = [
        process.env.REMOTE_HOST,
        process.env.INTERNAL_BASE_URL,
        'http://127.0.0.1:8080',
    ].filter(Boolean);
    for (const host of hosts) {
        const base = String(host).replace(/\/$/, '');
        const url = `${base}${normalized}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                continue;
            }
            const array_buffer = await response.arrayBuffer();
            if (array_buffer.byteLength > 0) {
                return Buffer.from(array_buffer);
            }
        } catch (error) {
            // try next host
        }
    }
    throw create_api_error('协议文件不存在');
}

function need_protocol(stuff) {
    return Boolean(normalize_attach_path(stuff?.protocol_doc_path));
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
    const fullPath = resolve_storage_full_path(doc_path);
    if (!fullPath || !fs.existsSync(fullPath)) {
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

function escape_xml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function build_text_paragraph_xml(text) {
    const safe = escape_xml(text);
    return `<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
}

function get_next_rel_id(rels_xml) {
    let max_id = 0;
    for (const match of rels_xml.matchAll(/Id="rId(\d+)"/g)) {
        const n = Number.parseInt(match[1], 10);
        if (n > max_id) {
            max_id = n;
        }
    }
    return max_id + 1;
}

function build_inline_image_xml(r_id, doc_pr_id, media_name, cx, cy) {
    return `<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:r><w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:docPr id="${doc_pr_id}" name="${media_name}"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                            <pic:cNvPr id="0" name="${media_name}"/>
                            <pic:cNvPicPr/>
                        </pic:nvPicPr>
                        <pic:blipFill>
                            <a:blip r:embed="${r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                            <a:stretch><a:fillRect/></a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                            <a:xfrm>
                                <a:off x="0" y="0"/>
                                <a:ext cx="${cx}" cy="${cy}"/>
                            </a:xfrm>
                            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                        </pic:spPr>
                    </pic:pic>
                </a:graphicData>
            </a:graphic>
        </wp:inline>
    </w:drawing></w:r></w:p>`;
}

function embed_image_in_zip(zip, rels_xml, image_path) {
    const full_path = resolve_storage_full_path(image_path);
    if (!full_path || !fs.existsSync(full_path)) {
        return { rels_xml, image_xml: '' };
    }
    const image_buffer = fs.readFileSync(full_path);
    const ext = path.extname(full_path) || '.png';
    const media_name = `img_${uuid.v4()}${ext}`;
    zip.file(`word/media/${media_name}`, image_buffer);

    const new_id_num = get_next_rel_id(rels_xml);
    const new_r_id = `rId${new_id_num}`;
    const rel_entry = `<Relationship Id="${new_r_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${media_name}"/>`;
    const updated_rels = rels_xml.replace('</Relationships>', `${rel_entry}</Relationships>`);

    const cx = 4 * 360000;
    const cy = 1.4 * 360000;
    const image_xml = build_inline_image_xml(new_r_id, new_id_num, media_name, cx, cy);
    return { rels_xml: updated_rels, image_xml };
}

async function append_signatures_to_docx(doc_path, signers) {
    const content = await read_attach_file_buffer(doc_path);
    const zip = new PizZip(content);
    const doc_file = zip.file('word/document.xml');
    if (!doc_file) {
        throw create_api_error('协议文件格式错误');
    }
    let xml = doc_file.asText();
    const rels_path = 'word/_rels/document.xml.rels';
    let rels_xml = zip.files[rels_path]
        ? zip.files[rels_path].asText()
        : '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

    let append_xml = build_text_paragraph_xml('');
    signers.forEach((signer) => {
        if (!signer.sign_pic) {
            return;
        }
        const label = signer.sign_time
            ? `${signer.name}（${signer.sign_time}）`
            : signer.name;
        append_xml += build_text_paragraph_xml(label);
        const embedded = embed_image_in_zip(zip, rels_xml, signer.sign_pic);
        rels_xml = embedded.rels_xml;
        append_xml += embedded.image_xml;
    });

    const sect_pr_index = xml.lastIndexOf('<w:sectPr');
    if (sect_pr_index !== -1) {
        xml = xml.slice(0, sect_pr_index) + append_xml + xml.slice(sect_pr_index);
    } else {
        const body_close = xml.lastIndexOf('</w:body>');
        if (body_close === -1) {
            throw create_api_error('协议文件格式错误');
        }
        xml = xml.slice(0, body_close) + append_xml + xml.slice(body_close);
    }
    zip.file('word/document.xml', xml);
    zip.file(rels_path, rels_xml);
    return zip.generate({ type: 'nodebuffer' });
}

function sanitize_filename_part(name) {
    return String(name || '').replace(/[\\/:*?"<>|]/g, '_');
}

function generate_protocol_filename(plan, doc_title) {
    const main_plate = plan.main_vehicle?.plate || '无主车';
    const behind_plate = plan.behind_vehicle?.plate || '无挂车';
    const title = sanitize_filename_part(doc_title || '协议');
    return `协议签署_${title}_${main_plate}-${behind_plate}_${plan.id}.docx`;
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
                doc_path: '',
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
        const doc_path = normalize_attach_path(stuff.protocol_doc_path);
        return {
            doc_title: get_doc_title(doc_path, doc_content),
            doc_path,
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
    generate_signed_docx_buffer: async function (plan) {
        if (!need_protocol(plan.stuff)) {
            throw create_api_error('该计划无需签署协议');
        }
        const info = await this.get_plan_protocol_info(plan);
        if (!info.all_signed) {
            throw create_api_error('协议尚未全部签署');
        }
        const signed_signers = info.signers.filter((s) => s.sign_pic);
        return {
            buffer: await append_signatures_to_docx(info.doc_path, signed_signers),
            filename: generate_protocol_filename(plan, info.doc_title),
        };
    },
    append_signatures_to_docx,
    generate_protocol_filename,
};
