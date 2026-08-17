const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { build_ticket_view } = require('./ticket_schema');

const execFileAsync = promisify(execFile);

const BRAND = {
    primary: '#2F3FCF',
    primary2: '#465CFF',
    primary3: '#6B7CFF',
    pageBg: '#F4F6FB',
    text: '#1A1F36',
    label: '#9AA3B8',
    line: '#F5F7FC',
    cardBorder: '#EEF1F8',
    plateBg: '#F5D000',
    plateText: '#111111',
    white: '#FFFFFF',
};

function resolve_cn_font() {
    const candidates = [
        process.env.TICKET_PDF_FONT,
        '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    ].filter(Boolean);
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                return p;
            }
        } catch (e) {
            // ignore
        }
    }
    return null;
}

function resolve_local_attach(attach_path) {
    if (!attach_path || typeof attach_path !== 'string') {
        return null;
    }
    const normalized = attach_path.startsWith('/') ? attach_path : `/${attach_path}`;
    const abs = path.resolve(`/database${normalized}`);
    if (fs.existsSync(abs)) {
        return abs;
    }
    return null;
}

function attach_remote_bases() {
    const bases = [];
    const push = (v) => {
        if (!v || typeof v !== 'string') {
            return;
        }
        let base = v.trim().replace(/\/$/, '');
        base = base.replace(/\/mobile\/?#?$/, '');
        if (base && !bases.includes(base)) {
            bases.push(base);
        }
    };
    push(process.env.TICKET_ATTACH_BASE_URL);
    push(process.env.REMOTE_HOST);
    push(process.env.REMOTE_MOBILE_HOST);
    return bases;
}

/**
 * 解析附件绝对路径；本地没有时尝试从 REMOTE_HOST 等拉取并缓存到 /database
 */
async function resolve_attach(attach_path) {
    const local = resolve_local_attach(attach_path);
    if (local) {
        return local;
    }
    if (!attach_path || typeof attach_path !== 'string') {
        return null;
    }
    const normalized = attach_path.startsWith('/') ? attach_path : `/${attach_path}`;
    const abs = path.resolve(`/database${normalized}`);
    const axios = require('axios');
    for (const base of attach_remote_bases()) {
        const url = base + normalized;
        try {
            const resp = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000,
                validateStatus: (s) => s === 200,
            });
            await fs.promises.mkdir(path.dirname(abs), { recursive: true });
            await fs.promises.writeFile(abs, Buffer.from(resp.data));
            console.log('[ticket_pdf] cached attach', url, '->', abs);
            return abs;
        } catch (e) {
            console.warn('[ticket_pdf] fetch attach failed', url, e?.message);
        }
    }
    return null;
}

function display_value(v) {
    if (v === null || v === undefined || v === '') {
        return '-';
    }
    return String(v)
        .replace(/[\u2026\u22EF\u22EE]/g, '...')
        .replace(/[\u00B7\u2022\u2219\u30FB]/g, ' ')
        .replace(/[\u2014\u2013\u2012]/g, '-');
}

function is_latin_char(ch) {
    const code = ch.codePointAt(0);
    return code >= 0x20 && code <= 0x7e;
}

function split_font_runs(text) {
    const runs = [];
    let buf = '';
    let latin = null;
    for (const ch of text) {
        const isLatin = is_latin_char(ch);
        if (latin === null) {
            latin = isLatin;
            buf = ch;
            continue;
        }
        if (isLatin === latin) {
            buf += ch;
        } else {
            runs.push({ latin, text: buf });
            latin = isLatin;
            buf = ch;
        }
    }
    if (buf) {
        runs.push({ latin: !!latin, text: buf });
    }
    return runs;
}

function run_widths(doc, runs, fontSize) {
    return runs.map((run) => {
        doc.font(run.latin ? 'TicketLatin' : 'TicketCN').fontSize(fontSize);
        return doc.widthOfString(run.text);
    });
}

function measure_runs(doc, runs, fontSize) {
    return run_widths(doc, runs, fontSize).reduce((a, b) => a + b, 0);
}

function font_ascent(doc, fontName, fontSize) {
    doc.font(fontName).fontSize(fontSize);
    const font = doc._font;
    if (font && typeof font.ascender === 'number') {
        return (font.ascender / 1000) * fontSize;
    }
    return fontSize * 0.8;
}

function draw_text(doc, str, x, y, opts = {}) {
    const text = display_value(str);
    const fontSize = opts.size || 11;
    const color = opts.color || BRAND.text;
    const maxWidth = opts.width != null ? opts.width : 9999;
    const align = opts.align || 'left';
    const baselineY = y + font_ascent(doc, 'TicketCN', fontSize);
    const runs = split_font_runs(text);
    const widths = run_widths(doc, runs, fontSize);
    const totalW = widths.reduce((a, b) => a + b, 0);

    if (totalW > maxWidth && maxWidth > 8) {
        doc.font('TicketCN').fillColor(color).fontSize(fontSize).text(text, x, baselineY, {
            width: maxWidth,
            align,
            lineBreak: false,
            height: fontSize + 4,
            baseline: 'alphabetic',
        });
        return totalW;
    }

    let cursorX = x;
    if (align === 'right') {
        cursorX = x + maxWidth - totalW;
    } else if (align === 'center') {
        cursorX = x + (maxWidth - totalW) / 2;
    }

    for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        doc.font(run.latin ? 'TicketLatin' : 'TicketCN')
            .fillColor(color)
            .fontSize(fontSize)
            .text(run.text, cursorX, baselineY, {
                lineBreak: false,
                baseline: 'alphabetic',
            });
        cursorX += widths[i];
    }
    doc.font('TicketCN');
    return totalW;
}

function is_plate_row(row) {
    return !!row?.label && String(row.label).includes('车号');
}

function draw_plate_tag(doc, plate, x, y) {
    const text = display_value(plate);
    const fontSize = 11;
    const padX = 7;
    const padY = 5;
    const runs = split_font_runs(text);
    const tw = measure_runs(doc, runs, fontSize);
    const boxW = tw + padX * 2;
    const boxH = fontSize + padY * 2 + 2;

    doc.save();
    doc.lineWidth(1.2);
    doc.roundedRect(x, y, boxW, boxH, 3).fillAndStroke(BRAND.plateBg, BRAND.plateText);
    doc.restore();

    const textY = y + (boxH - fontSize) / 2 - 1;
    draw_text(doc, text, x + padX, textY, {
        size: fontSize,
        color: BRAND.plateText,
    });
    return boxW;
}

async function render_ticket_pdf(ticket, outputPath, opts = {}) {
    const view = build_ticket_view(ticket, opts);
    const fontPath = resolve_cn_font();
    if (!fontPath) {
        const err = new Error('未找到中文字体，请配置环境变量 TICKET_PDF_FONT');
        err.err_msg = err.message;
        throw err;
    }

    // 近似手机宽度
    const pageWidth = 390;
    const pagePad = 14;
    const contentX = pagePad;
    const contentW = pageWidth - pagePad * 2;

    const heroPad = 16;
    const qrBoxW = 92;
    const qrInner = 72;
    const heroCopyW = contentW - qrBoxW - 12;

    // 标题按宽度估算行数（多留行，避免 ellipsis 插入缺字形的 …）
    const title = display_value(view.title || '称重单');
    const approxTitleLines = Math.min(4, Math.max(2, Math.ceil(title.length / 12)));
    const titleH = approxTitleLines * 17;
    const plateRowH = view.plate ? 28 : 0;
    const heroH = heroPad + 14 + 8 + titleH + (plateRowH ? 10 + plateRowH : 0) + 28;

    const countH = 78;
    const rowH = 32;
    const infoPadY = 6;
    const infoH = infoPadY * 2 + Math.max(1, view.rows.length) * rowH;
    const shellGap = 14; // 白卡片上叠到蓝头
    const footerH = 28;
    const pageHeight = heroH + (countH + infoH - shellGap) + footerH + 8;

    const doc = new PDFDocument({
        size: [pageWidth, pageHeight],
        margin: 0,
        autoFirstPage: true,
        info: {
            Title: view.title,
            Author: '掌易助理',
            Subject: '电子磅单',
        },
    });

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.registerFont('TicketCN', fontPath);
    doc.registerFont('TicketLatin', 'Helvetica-Bold');
    doc.font('TicketCN');

    // 页面底色
    doc.rect(0, 0, pageWidth, pageHeight).fill(BRAND.pageBg);

    // ===== Hero（对齐前端蓝头）=====
    doc.save();
    // 简单渐变：上深下稍浅
    doc.rect(0, 0, pageWidth, heroH * 0.55).fill(BRAND.primary);
    doc.rect(0, heroH * 0.55, pageWidth, heroH * 0.45).fill(BRAND.primary2);
    doc.restore();

    const heroLeft = contentX;
    let hy = heroPad;

    draw_text(doc, '磅单详情', heroLeft, hy, {
        size: 10,
        color: '#FFFFFF',
        width: heroCopyW,
    });
    // 半透明感用浅白
    hy += 16;

    doc.font('TicketCN').fillColor(BRAND.white).fontSize(14).text(title, heroLeft, hy, {
        width: heroCopyW,
        height: titleH + 6,
        lineGap: 2,
    });
    hy += titleH + 10;

    if (view.plate) {
        let px = heroLeft;
        px += draw_plate_tag(doc, view.plate, px, hy) + 8;
        if (view.behind_plate) {
            draw_plate_tag(doc, view.behind_plate, px, hy);
        }
    }

    // 右侧二维码白卡片
    const qrBoxX = pageWidth - pagePad - qrBoxW;
    const qrBoxY = heroPad;
    const qrBoxH = qrBoxW + 18;
    doc.save();
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 8).fill(BRAND.white);
    doc.restore();

    try {
        const qrBuf = await QRCode.toBuffer(view.qr_content, {
            type: 'png',
            margin: 1,
            width: 200,
            errorCorrectionLevel: 'M',
        });
        const qrX = qrBoxX + (qrBoxW - qrInner) / 2;
        const qrY = qrBoxY + 8;
        doc.image(qrBuf, qrX, qrY, { width: qrInner, height: qrInner });
        draw_text(doc, '扫码核验', qrBoxX, qrY + qrInner + 2, {
            width: qrBoxW,
            size: 8,
            color: '#6B7280',
            align: 'center',
        });
    } catch (e) {
        console.warn('[ticket_pdf] qr render failed', e?.message);
    }

    // ===== Shell 白卡片（上叠蓝头）=====
    const shellX = contentX;
    const shellW = contentW;
    let sy = heroH - shellGap;

    // count-card：圆角顶 + 居中装载量
    doc.save();
    doc.roundedRect(shellX, sy, shellW, countH, 12).fill(BRAND.white);
    // 盖住下圆角，和下方 info 连成一体
    doc.rect(shellX, sy + countH - 12, shellW, 12).fill(BRAND.white);
    doc.restore();

    draw_text(doc, view.count_label || '装载量', shellX, sy + 16, {
        width: shellW,
        size: 11,
        color: BRAND.label,
        align: 'center',
    });
    draw_text(doc, view.count_value, shellX, sy + 34, {
        width: shellW,
        size: 28,
        color: BRAND.primary,
        align: 'center',
    });

    sy += countH;

    // info-card
    const infoTop = sy;
    doc.save();
    doc.rect(shellX, infoTop, shellW, infoH - 12).fill(BRAND.white);
    doc.roundedRect(shellX, infoTop, shellW, infoH, 12).fill(BRAND.white);
    // 盖住上圆角与 count 衔接
    doc.rect(shellX, infoTop, shellW, 12).fill(BRAND.white);
    doc.restore();

    // 细边框
    doc.save();
    doc.lineWidth(0.8).strokeColor(BRAND.cardBorder);
    doc.roundedRect(shellX, heroH - shellGap, shellW, countH + infoH, 12).stroke();
    doc.restore();

    const labelX = shellX + 14;
    const labelW = Math.floor(shellW * 0.34);
    const valueX = labelX + labelW + 8;
    // 所有行共用同一右边界，保证右对齐列齐平
    const valueRight = shellX + shellW - 14;

    let rowY = infoTop + infoPadY + 8;
    view.rows.forEach((row, idx) => {
        if (idx > 0) {
            doc.save();
            doc.strokeColor(BRAND.line).lineWidth(0.6)
                .moveTo(shellX + 12, rowY - 8)
                .lineTo(shellX + shellW - 12, rowY - 8)
                .stroke();
            doc.restore();
        }

        draw_text(doc, row.label, labelX, rowY, {
            width: labelW,
            size: 10,
            color: BRAND.label,
            align: 'left',
        });

        const plate = is_plate_row(row);
        // 右对齐：以 valueRight 为右边界
        draw_text(doc, row.value, valueX, rowY, {
            width: valueRight - valueX,
            size: 11,
            color: plate ? BRAND.plateText : BRAND.text,
            align: 'right',
        });

        rowY += rowH;
    });

    // 印章水印（对齐前端 Ticket.vue：卡片约 36% / 56%，透明度约 0.8）
    const stampAbs = await resolve_attach(view.stamp_path);
    if (stampAbs) {
        try {
            const stampSize = 130;
            const stampX = shellX + shellW * 0.36 - stampSize / 2;
            const stampY = infoTop + infoH * 0.56 - stampSize / 2;
            doc.opacity(0.8);
            doc.image(stampAbs, stampX, stampY, {
                width: stampSize,
                height: stampSize,
                fit: [stampSize, stampSize],
            });
            doc.opacity(1);
        } catch (e) {
            console.warn('[ticket_pdf] stamp render failed', e?.message);
        }
    } else if (view.stamp_path) {
        console.warn('[ticket_pdf] stamp missing locally and remote fetch failed:', view.stamp_path);
    }

    const genTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    draw_text(doc, '生成时间 ' + genTime, 0, pageHeight - 20, {
        width: pageWidth,
        size: 8,
        color: BRAND.label,
        align: 'center',
    });

    doc.end();

    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
        doc.on('error', reject);
    });

    return { outputPath, view };
}

async function pdf_to_png(pdfPath, pngPath, opts = {}) {
    const dpi = opts.dpi || 150;
    if (!pdfPath || !fs.existsSync(pdfPath)) {
        throw new Error('pdf_to_png: pdf 不存在 ' + pdfPath);
    }
    const outDir = path.dirname(pngPath);
    await fs.promises.mkdir(outDir, { recursive: true });
    const outBase = pngPath.replace(/\.png$/i, '');
    await execFileAsync('pdftocairo', [
        '-png',
        '-singlefile',
        '-r', String(dpi),
        pdfPath,
        outBase,
    ], { timeout: 60000 });

    const produced = outBase + '.png';
    if (!fs.existsSync(produced)) {
        throw new Error('pdf_to_png: 未生成 ' + produced);
    }
    if (path.resolve(produced) !== path.resolve(pngPath)) {
        await fs.promises.rename(produced, pngPath);
    }
    return pngPath;
}

module.exports = {
    build_ticket_view,
    render_ticket_pdf,
    pdf_to_png,
    resolve_cn_font,
    resolve_attach
};
