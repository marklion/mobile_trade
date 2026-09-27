// 将大模型生成的“图表结构JSON”（不含具体数值）与导出的CSV数据合并，得到可直接渲染的图表/表格数据。
// 结构约定见 conf/chart_prompt_template.txt：series[].encode 指明列名，或 type: 'table' + columns 指明表格列。

function parseCsvText(text) {
    if (!text) {
        return { headers: [], rows: [] };
    }
    text = text.replace(/^\uFEFF/, '');
    const lines = text.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
    if (!lines.length) {
        return { headers: [], rows: [] };
    }
    const parseLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cur += ch;
                }
            } else if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                result.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        result.push(cur);
        return result;
    };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
        const values = parseLine(line);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] !== undefined ? values[idx] : '';
        });
        return row;
    });
    return { headers, rows };
}

function to_number(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function resolve_encode_field(encodeVal) {
    return Array.isArray(encodeVal) ? encodeVal[0] : encodeVal;
}

function apply_categories(axis, categories) {
    const withData = (a) => (a && a.type === 'value' ? a : Object.assign({}, a, { data: categories }));
    if (Array.isArray(axis)) {
        return axis.map(withData);
    }
    return withData(axis || { type: 'category' });
}

// structure: 大模型生成、去除代码块围栏后 JSON.parse 得到的对象
// rows: parseCsvText(...).rows
// 返回 { kind: 'table', columns, rows } 或 { kind: 'chart', option }，解析失败返回 null
function buildChartPayload(structure, rows) {
    if (!structure || typeof structure !== 'object') {
        return null;
    }
    if (structure.type === 'table' || (Array.isArray(structure.columns) && !structure.series)) {
        return { kind: 'table', columns: structure.columns || [], rows: rows || [] };
    }

    const option = JSON.parse(JSON.stringify(structure));
    delete option.type;
    const seriesList = Array.isArray(option.series) ? option.series : (option.series ? [option.series] : []);
    const hasEncode = seriesList.some((s) => s && s.encode);
    if (!hasEncode || !rows || !rows.length) {
        // 结构里已自带具体数据（兼容旧格式）或没有可用数据，直接使用原结构
        return { kind: 'chart', option };
    }

    const isPie = seriesList.some((s) => s.type === 'pie');
    if (isPie) {
        option.series = seriesList.map((s) => {
            const nameField = resolve_encode_field(s.encode && s.encode.itemName);
            const valueField = resolve_encode_field(s.encode && s.encode.value);
            const resolved = Object.assign({}, s);
            delete resolved.encode;
            resolved.data = rows.map((r) => ({ name: r[nameField], value: to_number(r[valueField]) }));
            return resolved;
        });
    } else {
        const xField = resolve_encode_field(seriesList[0].encode && seriesList[0].encode.x)
            || resolve_encode_field(option.dataset && option.dataset.dimensions && option.dataset.dimensions[0]);
        const categories = xField ? rows.map((r) => r[xField]) : rows.map((r, idx) => String(idx + 1));
        option.series = seriesList.map((s) => {
            const yField = resolve_encode_field(s.encode && s.encode.y);
            const resolved = Object.assign({}, s);
            delete resolved.encode;
            resolved.data = rows.map((r) => to_number(r[yField]));
            return resolved;
        });
        option.xAxis = apply_categories(option.xAxis, categories);
    }
    delete option.dataset;
    return { kind: 'chart', option };
}

export { parseCsvText, buildChartPayload };
