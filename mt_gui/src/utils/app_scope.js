/** 与首页「统计范围」共用：订单列表等页读取同一上下文 */
const KEY_STAT_CTX = 'app_stat_context_company_id';
const KEY_OPERATE_IDS = 'app_group_operate_member_ids_json';

export function persistStatContext(companyId) {
    if (companyId === null || companyId === undefined || companyId === '') {
        try {
            uni.removeStorageSync(KEY_STAT_CTX);
        } catch (e) {
            /* ignore */
        }
        return;
    }
    uni.setStorageSync(KEY_STAT_CTX, companyId);
}

export function readStatContext() {
    try {
        const v = uni.getStorageSync(KEY_STAT_CTX);
        if (v === '' || v === undefined || v === null) {
            return null;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    } catch (e) {
        return null;
    }
}

export function persistOperateMemberIds(ids) {
    try {
        uni.setStorageSync(KEY_OPERATE_IDS, JSON.stringify(Array.isArray(ids) ? ids : []));
    } catch (e) {
        /* ignore */
    }
}

export function readOperateMemberIds() {
    try {
        const s = uni.getStorageSync(KEY_OPERATE_IDS);
        if (!s) {
            return [];
        }
        const a = JSON.parse(s);
        return Array.isArray(a) ? a : [];
    } catch (e) {
        return [];
    }
}
