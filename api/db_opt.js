const { Sequelize, DataTypes, Op } = require('sequelize');
const cls = require('cls-hooked');
const namespace = cls.createNamespace('my-very-own-namespace');
Sequelize.useCLS(namespace);

function getDecimalValue(fieldName) {
    return function () {
        const value = this.getDataValue(fieldName);
        return value === null ? null : parseFloat(value);
    };
}
function get_db_handle() {
    const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        host: process.env.DB_HOST,
        define: {
            freezeTableName: true,
            charset: 'utf8mb4'
        },
        logging: function (sql, time) {
            if (time > 100) {
                console.log(time + '->' + sql);
            }
        },
        benchmark: true,
        pool: {
            max: 10,
            min: 0,
            acquire: 2000,
            idle: 10000
        },
        retry: {
            match: [
                /ETIMEDOUT/,
                /EHOSTUNREACH/,
                /ECONNRESET/,
                /ECONNREFUSED/,
                /EPIPE/,
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            max: 5 // 最大重试次数
        }
    });
    return sequelize;
}
let g_sq;

let db_opt = {
    Op: Op,
    model: {
        rbac_user: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            online_token: { type: DataTypes.STRING },
            online_time: { type: DataTypes.STRING },
            open_id: { type: DataTypes.STRING },
            phone: { type: DataTypes.STRING, unique: true },
            photo_path: { type: DataTypes.STRING },
            password: { type: DataTypes.STRING },
            email: { type: DataTypes.STRING },
            fixed: { type: DataTypes.BOOLEAN },
            prefer_order_begin_offset: { type: DataTypes.INTEGER, defaultValue: 0 },
            prefer_order_end_offset: { type: DataTypes.INTEGER, defaultValue: 1 },
            signature_pic: { type: DataTypes.STRING },
        },
        global_replace_form: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            replace_weighingSheet: { type: DataTypes.STRING, default: '称重单' },
            replace_count: { type: DataTypes.STRING, default: '载重量替换文字' },
            replace_fw_info: { type: DataTypes.STRING, default: '一次称重替换文字' },
            replace_sw_info: { type: DataTypes.STRING, default: '二次称重替换文字' },
            order_company: { type: DataTypes.STRING, default: '下单公司替换文字' },
            transportation_company: { type: DataTypes.STRING, default: '运输公司替换文字' },
            replace_p_time: { type: DataTypes.STRING, default: '首次计量时间替换文字' },
            replace_m_time: { type: DataTypes.STRING, default: '末次计量时间替换文字' },
            replace_seal_no: { type: DataTypes.STRING, default: '封号替换文字' },
        },
        rbac_role: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            description: { type: DataTypes.STRING },
            is_readonly: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        rbac_module: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, unique: true },
            description: { type: DataTypes.STRING },
        },
        company: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, unique: true },
            script: { type: DataTypes.STRING },
            address: { type: DataTypes.STRING(2048) },
            contact: { type: DataTypes.STRING(2048) },
            attachment: { type: DataTypes.STRING },
            third_key: { type: DataTypes.STRING },
            third_url: { type: DataTypes.STRING },
            third_token: { type: DataTypes.STRING },
            stamp_pic: { type: DataTypes.STRING },
            zc_url: { type: DataTypes.STRING },
            zh_ssid: { type: DataTypes.STRING },
            event_types: { type: DataTypes.STRING },
            remote_event_url: { type: DataTypes.STRING },
            driver_notice: { type: DataTypes.STRING(4000) },
            notice: { type: DataTypes.STRING(4000) },
            zc_rpc_url: { type: DataTypes.STRING },
            zczh_back_end: { type: DataTypes.STRING },
            zczh_back_token: { type: DataTypes.STRING },
            pos_lat: { type: DataTypes.DECIMAL(12, 9), defaultValue: 0, get: getDecimalValue('pos_lat') },
            pos_lon: { type: DataTypes.DECIMAL(12, 9), defaultValue: 0, get: getDecimalValue('pos_lon') },
            distance_limit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('distance_limit') },
            zc_phone: { type: DataTypes.STRING },
            check_in_stay_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },
            logo: { type: DataTypes.STRING },
            price_impact_plan: { type: DataTypes.BOOLEAN, defaultValue: false },
            hide_impact_selector: { type: DataTypes.BOOLEAN, defaultValue: false },
            pressure_config: { type: DataTypes.BOOLEAN, defaultValue: false },
            check_qualification: { type: DataTypes.BOOLEAN, defaultValue: false },
            qualification_expiration_date: { type: DataTypes.STRING(20) },
            verify_pay_by_cash: { type: DataTypes.BOOLEAN, defaultValue: false },
            show_sc_in_field: { type: DataTypes.BOOLEAN, defaultValue: false },
            buy_config_hard: { type: DataTypes.BOOLEAN, defaultValue: false },
            push_messages_writable_roles: { type: DataTypes.BOOLEAN, defaultValue: false },
            ticket_hasOrhasnt_place: { type: DataTypes.BOOLEAN, defaultValue: false },
            access_control_permission: { type: DataTypes.BOOLEAN, defaultValue: false },
            support_location_detail: { type: DataTypes.BOOLEAN, defaultValue: false },
            barriergate_control_permission: { type: DataTypes.BOOLEAN, defaultValue: false },
            is_the_order_display_price: { type: DataTypes.BOOLEAN, defaultValue: false },
            is_allowed_order_return: { type: DataTypes.BOOLEAN, defaultValue: false },
            change_finished_order_price_switch: { type: DataTypes.BOOLEAN, defaultValue: false },
            dup_not_permit: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        plan: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            plan_time: { type: DataTypes.STRING },
            unit_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('unit_price') },
            status: { type: DataTypes.INTEGER, defaultValue: 0 },
            comment: { type: DataTypes.STRING },
            from_bidding: { type: DataTypes.BOOLEAN, defaultValue: false },
            count: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('count') },
            p_weight: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('p_weight') },
            m_weight: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('m_weight') },
            p_time: { type: DataTypes.STRING },
            m_time: { type: DataTypes.STRING },
            use_for: { type: DataTypes.STRING },
            drop_address: { type: DataTypes.STRING },
            register_time: { type: DataTypes.STRING },
            register_number: { type: DataTypes.INTEGER, defaultValue: 0 },
            register_comment: { type: DataTypes.STRING },
            enter_time: { type: DataTypes.STRING },
            manual_close: { type: DataTypes.BOOLEAN, defaultValue: false },
            call_time: { type: DataTypes.STRING },
            is_buy: { type: DataTypes.BOOLEAN, defaultValue: false },
            ticket_no: { type: DataTypes.STRING },
            seal_no: { type: DataTypes.STRING },
            trans_company_name: { type: DataTypes.STRING },
            enter_count: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('enter_count') },
            enter_attachment: { type: DataTypes.STRING },
            confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
            is_proxy: { type: DataTypes.BOOLEAN, defaultValue: false },
            is_repeat: { type: DataTypes.BOOLEAN, defaultValue: false },
            fapiao_delivered: { type: DataTypes.BOOLEAN, defaultValue: false },
            drop_take_zone_name: { type: DataTypes.STRING },
            checkout_delay: { type: DataTypes.BOOLEAN, defaultValue: false },
            first_weight: { type: DataTypes.STRING, defaultValue: '' },
            second_weight: { type: DataTypes.STRING, defaultValue: '' },
            first_weight_fileList: { type: DataTypes.TEXT, defaultValue: '' },
            second_weight_fileList: { type: DataTypes.TEXT, defaultValue: '' },
            dup_info: { type: DataTypes.STRING },
            expect_weight: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('expect_weight') },
            arrears: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('arrears') },
            outstanding_vehicles: { type: DataTypes.INTEGER, defaultValue: 0, },
            subsidy_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('subsidy_price') },
            king_dee_comment: { type: DataTypes.STRING },
        },
        vehicle: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            plate: { type: DataTypes.STRING, unique: true },
            is_behind: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        driver: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            phone: { type: DataTypes.STRING, unique: true },
            id_card: { type: DataTypes.STRING },
            open_id: { type: DataTypes.STRING },
            signature_pic: { type: DataTypes.STRING },
        },
        stuff: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('price') },
            comment: { type: DataTypes.STRING },
            next_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('next_price') },
            change_last_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },
            expect_count: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('expect_count') },
            need_sc: { type: DataTypes.BOOLEAN, defaultValue: false },
            use_for_buy: { type: DataTypes.BOOLEAN, defaultValue: false },
            need_enter_weight: { type: DataTypes.BOOLEAN, defaultValue: false },
            no_need_register: { type: DataTypes.BOOLEAN, defaultValue: false },
            close_time: { type: DataTypes.STRING },
            delay_days: { type: DataTypes.INTEGER, defaultValue: 0 },
            next_comment: { type: DataTypes.STRING },
            next_operator: { type: DataTypes.STRING },
            need_exam: { type: DataTypes.BOOLEAN, defaultValue: false },
            concern_fapiao: { type: DataTypes.BOOLEAN, defaultValue: false },
            checkout_delay: { type: DataTypes.BOOLEAN, defaultValue: false },
            manual_weight: { type: DataTypes.BOOLEAN, defaultValue: false },
            ticket_prefix: { type: DataTypes.STRING },
            need_expect_weight: { type: DataTypes.BOOLEAN, defaultValue: false },
            stuff_code: { type: DataTypes.STRING },
            close_today: { type: DataTypes.BOOLEAN, defaultValue: false },
            second_unit: { type: DataTypes.STRING },
            coefficient: { type: DataTypes.DECIMAL(12, 2), defaultValue: 1.00, get: getDecimalValue('coefficient') },
            add_base: { type: DataTypes.STRING },
            auto_confirm_goods: { type: DataTypes.BOOLEAN, defaultValue: false },
            second_unit_decimal: { type: DataTypes.INTEGER, defaultValue: 2 },
            delay_checkout_time: { type: DataTypes.STRING },
            last_delay_checkout: { type: DataTypes.STRING },
            need_driver_sign: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        contract: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            sign_time: { type: DataTypes.STRING },
            balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('balance') },
            begin_time: { type: DataTypes.STRING },
            end_time: { type: DataTypes.STRING },
            number: { type: DataTypes.STRING },
            customer_code: { type: DataTypes.STRING },
        },
        plan_history: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            time: { type: DataTypes.STRING },
            operator: { type: DataTypes.STRING },
            action_type: { type: DataTypes.STRING },
        },
        balance_history: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            time: { type: DataTypes.STRING },
            operator: { type: DataTypes.STRING },
            comment: { type: DataTypes.STRING },
            cash_increased: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('cash_increased') },
        },
        archive_plan: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            content: { type: DataTypes.TEXT },
        },
        price_history: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            time: { type: DataTypes.STRING },
            operator: { type: DataTypes.STRING },
            comment: { type: DataTypes.STRING },
            new_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('new_price') },
        },
        sc_req: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            need_attach: { type: DataTypes.BOOLEAN, defaultValue: false },
            need_input: { type: DataTypes.BOOLEAN, defaultValue: false },
            need_expired: { type: DataTypes.BOOLEAN, defaultValue: false },
            belong_type: { type: DataTypes.INTEGER, defaultValue: 0 },
            prompt: { type: DataTypes.STRING },
            add_to_export: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        sc_content: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            expired_time: { type: DataTypes.STRING },
            attachment: { type: DataTypes.STRING },
            input: { type: DataTypes.STRING },
            passed: { type: DataTypes.BOOLEAN, defaultValue: false },
            checker: { type: DataTypes.STRING },
            comment: { type: DataTypes.STRING },
            check_time: { type: DataTypes.STRING },
        },
        bidding_config: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('total') },
            comment: { type: DataTypes.STRING },
            min: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('min') },
            max: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('max') },
            total_turn: { type: DataTypes.INTEGER, defaultValue: 0 },
            pay_first: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('pay_first') },
            status: { type: DataTypes.INTEGER, defaultValue: 0 },
            customer_confirm_time: { type: DataTypes.STRING },
            confirm_opt_name: { type: DataTypes.STRING },
            price_hide: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        bidding_turn: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            finish: { type: DataTypes.BOOLEAN, defaultValue: false },
            begin_time: { type: DataTypes.STRING, allowNull: false },
            end_time: { type: DataTypes.STRING, allowNull: false },
            turn: { type: DataTypes.INTEGER, defaultValue: 0 },
        },
        bidding_item: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('price') },
            time: { type: DataTypes.STRING },
            accept: { type: DataTypes.BOOLEAN, defaultValue: false },
            win: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        hd_base_info: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            base_id: { type: DataTypes.STRING },
            unit: { type: DataTypes.STRING },
            type: { type: DataTypes.STRING },
            code: { type: DataTypes.STRING },
            pid: { type: DataTypes.STRING },
        },
        dc_status: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            mac: { type: DataTypes.STRING },
            status: { type: DataTypes.INTEGER, defaultValue: 0 },
        },
        vehicle_team: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
        },
        vehicle_set: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        },
        export_record: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            create_time: { type: DataTypes.STRING },
            url: { type: DataTypes.STRING },
        },
        question: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING(4000) },
        },
        option_answer: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING(4000) },
            is_correct: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        exam_paper: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            pass_score: { type: DataTypes.INTEGER, defaultValue: 80 },
        },
        exam: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            score: { type: DataTypes.INTEGER, defaultValue: 0 },
            sign_pic: { type: DataTypes.STRING },
        },
        exam_answer: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        },
        blacklist: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            reason: { type: DataTypes.STRING, allowNull: true },
        },
        sys_notice: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            message: { type: DataTypes.STRING },
            creator_name: { type: DataTypes.STRING },
            is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        drop_take_zone: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
        },
        field_check_table: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            template_path: { type: DataTypes.STRING },
            require_before_call: { type: DataTypes.BOOLEAN, defaultValue: false },
            require_before_confirm: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        field_check_item: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            need_input: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        fc_plan_table: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            finish_time: { type: DataTypes.STRING },
        },
        fc_check_result: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            pass_time: { type: DataTypes.STRING },
            input: { type: DataTypes.STRING },
        },
        u8c_config: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            system_code: { type: DataTypes.STRING },
            usercode: { type: DataTypes.STRING },
            password: { type: DataTypes.STRING },
            url: { type: DataTypes.STRING },
            corpid: { type: DataTypes.STRING },
            cbiztype_sale: { type: DataTypes.STRING },
            cdeptid_sale: { type: DataTypes.STRING },
            csalecorpid: { type: DataTypes.STRING },
            ccalbodyid: { type: DataTypes.STRING },
            ccurrencytypeid: { type: DataTypes.STRING },
            cbiztype_buy: { type: DataTypes.STRING },
            cdeptid_buy: { type: DataTypes.STRING },
            cpurorganization: { type: DataTypes.STRING },
            idiscounttaxtype: { type: DataTypes.STRING },
            ntaxrate_buy: { type: DataTypes.STRING },
            vnote: { type: DataTypes.STRING },
            coperatorid: { type: DataTypes.STRING },
        },
        u8c_order_info: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            run_log: { type: DataTypes.TEXT },
            error_msg: { type: DataTypes.TEXT },
            operator: { type: DataTypes.STRING },
            time: { type: DataTypes.STRING },
            is_running: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        delegate: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            code: { type: DataTypes.STRING },
            stamp_pic: { type: DataTypes.STRING },
        },
        sct_scale_item: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            type: { type: DataTypes.STRING },
        },
        plan_sct_info: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            value: { type: DataTypes.STRING },
        },
        subsidy_gate_discount: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            gate: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('gate') },
            discount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('discount') },
            amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('amount') },
        },
        subsidy_record: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            range: { type: DataTypes.STRING },
            status: { type: DataTypes.STRING },
            order_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        },
        extra_info_config: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: DataTypes.STRING },
        },
        extra_info_content: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            content: { type: DataTypes.STRING },
        },
        king_dee_start_config: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            clientId: { type: DataTypes.STRING },
            clientSecret: { type: DataTypes.STRING },
            app_key: { type: DataTypes.STRING },
            app_secret: { type: DataTypes.STRING },
            stock_id: { type: DataTypes.STRING },
            unit_id: { type: DataTypes.STRING },
            last_check_timestamp: { type: DataTypes.STRING },
            outerInstanceId: { type: DataTypes.STRING },
            emp_number: { type: DataTypes.STRING },
            cess: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, get: getDecimalValue('cess') },
            need_checkout: { type: DataTypes.BOOLEAN, defaultValue: false },
            need_audit: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        audit_config: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            url: { type: DataTypes.STRING },
            content_template:{ type: DataTypes.TEXT },
        },
        audit_record: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            url: { type: DataTypes.STRING },
            body: { type: DataTypes.TEXT },
            submit_token: { type: DataTypes.STRING },
            submiter: { type: DataTypes.STRING },
            auditer: { type: DataTypes.STRING },
            submit_time: { type: DataTypes.STRING },
            audit_time: { type: DataTypes.STRING },
            close_time: { type: DataTypes.STRING },
            comment: { type: DataTypes.STRING },
        },
        king_dee_error:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            error_string: { type: DataTypes.TEXT },
        },
    },
    make_associate: function (_sq) {
        _sq.models.rbac_user.belongsToMany(_sq.models.rbac_role, { through: 'rbac_user_role' });
        _sq.models.rbac_role.belongsToMany(_sq.models.rbac_user, { through: 'rbac_user_role' });
        _sq.models.rbac_role.belongsToMany(_sq.models.rbac_module, { through: 'rbac_role_module' });
        _sq.models.rbac_module.belongsToMany(_sq.models.rbac_role, { through: 'rbac_role_module' });
        _sq.models.rbac_user.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.rbac_user);
        _sq.models.rbac_role.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.rbac_role);
        _sq.models.rbac_module.belongsToMany(_sq.models.company, { through: 'company_module' });
        _sq.models.company.belongsToMany(_sq.models.rbac_module, { through: 'company_module' });

        _sq.models.export_record.belongsTo(_sq.models.rbac_user);
        _sq.models.rbac_user.hasMany(_sq.models.export_record);

        _sq.models.stuff.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.stuff);
        _sq.models.contract.belongsTo(_sq.models.company, { as: 'buy_company' });
        _sq.models.contract.belongsTo(_sq.models.company, { as: 'sale_company' });
        _sq.models.company.hasMany(_sq.models.contract, { as: 'buy_contracts', foreignKey: 'buyCompanyId' });
        _sq.models.company.hasMany(_sq.models.contract, { as: 'sale_contracts', foreignKey: 'saleCompanyId' });
        _sq.models.stuff.belongsToMany(_sq.models.contract, { through: 'contract_stuff' });
        _sq.models.contract.belongsToMany(_sq.models.stuff, { through: 'contract_stuff' });
        _sq.models.balance_history.belongsTo(_sq.models.contract);
        _sq.models.contract.hasMany(_sq.models.balance_history);
        _sq.models.price_history.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.price_history);

        _sq.models.plan.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.plan);
        _sq.models.plan.belongsTo(_sq.models.vehicle, { as: 'main_vehicle' });
        _sq.models.plan.belongsTo(_sq.models.vehicle, { as: 'behind_vehicle' });
        _sq.models.vehicle.hasMany(_sq.models.plan, { foreignKey: 'mainVehicleId' });
        _sq.models.vehicle.hasMany(_sq.models.plan, { foreignKey: 'behindVehicleId' });
        _sq.models.plan.belongsTo(_sq.models.driver);
        _sq.models.driver.hasMany(_sq.models.plan);
        _sq.models.plan.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.plan);
        _sq.models.plan_history.belongsTo(_sq.models.plan);
        _sq.models.plan.hasMany(_sq.models.plan_history);
        _sq.models.archive_plan.belongsTo(_sq.models.plan);
        _sq.models.plan.hasOne(_sq.models.archive_plan);
        _sq.models.rbac_user.belongsToMany(_sq.models.contract, { through: 'user_contract' });
        _sq.models.contract.belongsToMany(_sq.models.rbac_user, { through: 'user_contract' });
        _sq.models.plan.belongsTo(_sq.models.rbac_user);
        _sq.models.rbac_user.hasMany(_sq.models.plan);

        _sq.models.sc_req.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.sc_req);
        _sq.models.sc_content.belongsTo(_sq.models.sc_req);
        _sq.models.sc_req.hasMany(_sq.models.sc_content);
        _sq.models.sc_content.belongsTo(_sq.models.vehicle);
        _sq.models.vehicle.hasMany(_sq.models.sc_content);
        _sq.models.sc_content.belongsTo(_sq.models.driver);
        _sq.models.driver.hasMany(_sq.models.sc_content);

        _sq.models.bidding_config.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.bidding_config);
        _sq.models.bidding_turn.belongsTo(_sq.models.bidding_config);
        _sq.models.bidding_config.hasMany(_sq.models.bidding_turn);
        _sq.models.bidding_item.belongsTo(_sq.models.bidding_turn);
        _sq.models.bidding_turn.hasMany(_sq.models.bidding_item);
        _sq.models.bidding_item.belongsTo(_sq.models.rbac_user);
        _sq.models.rbac_user.hasMany(_sq.models.bidding_item);

        _sq.models.hd_base_info.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.hd_base_info);

        _sq.models.dc_status.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.dc_status);

        _sq.models.vehicle_set.belongsTo(_sq.models.vehicle, { as: 'main_vehicle' });
        _sq.models.vehicle_set.belongsTo(_sq.models.vehicle, { as: 'behind_vehicle' });
        _sq.models.vehicle.hasMany(_sq.models.vehicle_set, { foreignKey: 'mainVehicleId' });
        _sq.models.vehicle.hasMany(_sq.models.vehicle_set, { foreignKey: 'behindVehicleId' });
        _sq.models.vehicle_set.belongsTo(_sq.models.driver);
        _sq.models.driver.hasMany(_sq.models.vehicle_set);

        _sq.models.vehicle_team.belongsTo(_sq.models.rbac_user);
        _sq.models.rbac_user.hasMany(_sq.models.vehicle_team);
        _sq.models.vehicle_set.belongsTo(_sq.models.vehicle_team);
        _sq.models.vehicle_team.hasMany(_sq.models.vehicle_set);

        _sq.models.option_answer.belongsTo(_sq.models.question);
        _sq.models.global_replace_form.belongsTo(_sq.models.company);
        _sq.models.company.hasOne(_sq.models.global_replace_form);
        _sq.models.question.hasMany(_sq.models.option_answer);
        _sq.models.question.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.question);
        _sq.models.question.belongsToMany(_sq.models.exam_paper, { through: 'paper_question' });
        _sq.models.exam_paper.belongsToMany(_sq.models.question, { through: 'paper_question' });
        _sq.models.exam.belongsTo(_sq.models.exam_paper);
        _sq.models.exam_paper.hasMany(_sq.models.exam);
        _sq.models.exam.belongsTo(_sq.models.plan);
        _sq.models.plan.hasMany(_sq.models.exam);
        _sq.models.exam.belongsTo(_sq.models.driver);
        _sq.models.driver.hasMany(_sq.models.exam);
        _sq.models.exam_paper.belongsToMany(_sq.models.stuff, { through: 'paper_stuff' });
        _sq.models.stuff.belongsToMany(_sq.models.exam_paper, { through: 'paper_stuff' });
        _sq.models.exam_answer.belongsTo(_sq.models.option_answer);
        _sq.models.option_answer.hasMany(_sq.models.exam_answer);
        _sq.models.exam_answer.belongsTo(_sq.models.exam);
        _sq.models.exam.hasMany(_sq.models.exam_answer);
        _sq.models.blacklist.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.blacklist);
        _sq.models.blacklist.belongsTo(_sq.models.vehicle);
        _sq.models.vehicle.hasMany(_sq.models.blacklist);
        _sq.models.blacklist.belongsTo(_sq.models.driver);
        _sq.models.driver.hasMany(_sq.models.blacklist);
        _sq.models.bidding_item.hasOne(_sq.models.plan);
        _sq.models.plan.belongsTo(_sq.models.bidding_item);

        _sq.models.drop_take_zone.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.drop_take_zone);

        _sq.models.field_check_table.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.field_check_table);
        _sq.models.field_check_item.belongsTo(_sq.models.field_check_table);
        _sq.models.field_check_table.hasMany(_sq.models.field_check_item);
        _sq.models.field_check_table.belongsTo(_sq.models.rbac_role);
        _sq.models.rbac_role.hasMany(_sq.models.field_check_table);

        _sq.models.fc_plan_table.belongsTo(_sq.models.field_check_table);
        _sq.models.field_check_table.hasMany(_sq.models.fc_plan_table);
        _sq.models.fc_plan_table.belongsTo(_sq.models.plan);
        _sq.models.plan.hasMany(_sq.models.fc_plan_table);
        _sq.models.fc_plan_table.belongsTo(_sq.models.rbac_user);
        _sq.models.rbac_user.hasMany(_sq.models.fc_plan_table);
        _sq.models.fc_check_result.belongsTo(_sq.models.fc_plan_table);
        _sq.models.fc_plan_table.hasMany(_sq.models.fc_check_result);
        _sq.models.fc_check_result.belongsTo(_sq.models.field_check_item);
        _sq.models.field_check_item.hasMany(_sq.models.fc_check_result);

        _sq.models.company.hasOne(_sq.models.u8c_config);
        _sq.models.u8c_config.belongsTo(_sq.models.company);
        _sq.models.plan.belongsTo(_sq.models.u8c_order_info);
        _sq.models.u8c_order_info.hasMany(_sq.models.plan);
        _sq.models.u8c_order_info.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.u8c_order_info);

        _sq.models.delegate.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.delegate);
        _sq.models.delegate.hasMany(_sq.models.contract);
        _sq.models.contract.belongsTo(_sq.models.delegate);
        _sq.models.delegate.hasMany(_sq.models.plan);
        _sq.models.plan.belongsTo(_sq.models.delegate);

        _sq.models.sct_scale_item.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.sct_scale_item);
        _sq.models.plan_sct_info.belongsTo(_sq.models.sct_scale_item);
        _sq.models.sct_scale_item.hasMany(_sq.models.plan_sct_info);
        _sq.models.plan_sct_info.belongsTo(_sq.models.plan);
        _sq.models.plan.hasMany(_sq.models.plan_sct_info);

        _sq.models.subsidy_gate_discount.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.subsidy_gate_discount);
        _sq.models.subsidy_record.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.subsidy_record);
        _sq.models.balance_history.belongsTo(_sq.models.subsidy_record);
        _sq.models.subsidy_record.hasMany(_sq.models.balance_history);

        _sq.models.company.hasMany(_sq.models.extra_info_config);
        _sq.models.extra_info_config.belongsTo(_sq.models.company);
        _sq.models.extra_info_config.hasMany(_sq.models.extra_info_content);
        _sq.models.extra_info_content.belongsTo(_sq.models.extra_info_config);
        _sq.models.plan.hasMany(_sq.models.extra_info_content);
        _sq.models.extra_info_content.belongsTo(_sq.models.plan);

        _sq.models.king_dee_start_config.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasOne(_sq.models.king_dee_start_config);

        _sq.models.audit_config.belongsTo(_sq.models.rbac_role);
        _sq.models.rbac_role.hasMany(_sq.models.audit_config);
        _sq.models.audit_record.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.audit_record);

        _sq.models.company.hasMany(_sq.models.king_dee_error);
        _sq.models.king_dee_error.belongsTo(_sq.models.company);
    },
    install: async function () {
        console.log('run install');
        let sq = this.get_sq();
        Object.keys(this.model).forEach((key) => {
            sq.define(key, this.model[key], { paranoid: true });
        });
        this.make_associate(sq);
        await sq.sync({ alter: { drop: false } });
        g_sq = sq;
    },
    get_sq: function () {
        let ret = null;
        if (!g_sq) {
            g_sq = get_db_handle();
        }
        ret = g_sq;

        return ret;
    }
};

module.exports = db_opt;