function moneyFormatter(money) {
    const n = Number.parseFloat(money);
    if (Number.isNaN(n)) {
        return '0.00';
    }
    return n.toFixed(2).toString().split('').reverse().join('').replace(/(\d{3})/g, '$1,')
        .replace(/,$/, '').split('').reverse().join('');
}

function apply_delegate(data, opts, stamp_path) {
    if (!data.delegate_name) {
        return stamp_path;
    }
    if (opts.is_internal) {
        data.company_name = data.delegate_name;
        return stamp_path;
    }
    data.order_company_name = data.delegate_name;
    return data.delegate_stamp_path || stamp_path;
}

function build_base_rows(data) {
    const rows = [
        { label: '物料', value: data.stuff_name },
        { label: '磅单号', value: data.ticket_no },
        { label: data.order_company || '下单公司', value: data.company_name },
    ];
    if (data.company_contact) {
        rows.push({ label: '联系方式', value: data.company_contact });
    }
    rows.push(
        { label: '主车号', value: data.plate },
        { label: '挂车号', value: data.behind_plate },
    );
    return rows;
}

function apply_second_unit(data, rows, count_value) {
    if (!(data.second_unit && data.coefficient)) {
        return count_value;
    }
    const su_value = Number.parseFloat(data.coefficient * data.count).toFixed(data.second_unit_decimal);
    rows.unshift({ label: '原始计量', value: data.count });
    return su_value + data.second_unit;
}

function append_weight_rows(data, rows, plan_sct_infos) {
    if (data.fw_info && plan_sct_infos.length <= 0) {
        rows.push({ label: data.replace_fw_info || '一次计量', value: data.fw_info });
    }
    if (data.sw_info && plan_sct_infos.length <= 0) {
        rows.push({ label: data.replace_sw_info || '二次计量', value: data.sw_info });
    }

    if (data.m_time && data.p_time) {
        rows.push(
            { label: '毛重', value: data.m_weight },
            { label: data.replace_m_time || '过毛时间', value: data.m_time },
            { label: '皮重', value: data.p_weight },
            { label: data.replace_p_time || '过皮时间', value: data.p_time },
        );
    } else if ((data.m_time || data.p_time) && plan_sct_infos.length <= 0) {
        rows.push({ label: '计量时间', value: data.m_time || data.p_time });
    }
}

function append_extra_rows(data, rows) {
    if (data.seal_no) {
        rows.push({ label: data.replace_seal_no || '封签号', value: data.seal_no });
    }
    if (data.trans_company_name) {
        rows.push({ label: data.transportation_company || '运输公司', value: data.trans_company_name });
    }
    if (data.drop_address) {
        rows.push({ label: '卸货地址', value: data.drop_address });
    }

    (data.plan_sct_infos || []).forEach((item) => {
        rows.push({
            label: item.sct_scale_item?.name,
            value: item.value,
        });
    });

    (data.extra_infos || []).forEach((item) => {
        if (item?.content) {
            rows.push({ label: item.title, value: item.content });
        }
    });
}

function build_ticket_view(ticket, opts = {}) {
    const data = ticket ? { ...ticket } : {};
    let stamp_path = apply_delegate(data, opts, data.stamp_path || '');

    const dec_title = data.is_buy ? '入厂' : '出厂';
    const title = (data.order_company_name || '') + dec_title + (data.replace_weighingSheet || '称重单');

    const count_label = data.replace_count || '装载量';
    const rows = build_base_rows(data);
    const count_value = apply_second_unit(data, rows, moneyFormatter(data.count));
    const plan_sct_infos = data.plan_sct_infos || [];
    append_weight_rows(data, rows, plan_sct_infos);
    append_extra_rows(data, rows);

    const mobile_host = (process.env.REMOTE_MOBILE_HOST || '').replace(/\/$/, '');
    const qr_content = opts.qr_content
        || (mobile_host ? `${mobile_host}/subPage1/Ticket?id=${data.id}` : `Ticket?id=${data.id}`);

    return {
        id: data.id,
        title,
        count_label,
        count_value,
        rows: rows.filter((r) => r?.label),
        stamp_path,
        plate: data.plate || '',
        behind_plate: data.behind_plate || '',
        qr_content,
    };
}

module.exports = {
    moneyFormatter,
    build_ticket_view,
};
