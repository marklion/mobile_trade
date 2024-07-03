const { Sequelize, DataTypes, Op } = require('sequelize');
const cls = require('cls-hooked');
const namespace = cls.createNamespace('my-very-own-namespace');
Sequelize.useCLS(namespace);
function get_db_handle() {
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: '/database/mt.db',
        dialectModule: require('/usr/local/lib/node_modules/sqlite3'),
        define: {
            freezeTableName: true,
        },
        logging: function (sql, time) {
            if (time > 200) {
                console.log(time + '->' + sql);
            }
        },
        benchmark: true,
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
            address: { type: DataTypes.STRING },
            contact: { type: DataTypes.STRING },
            attachment: { type: DataTypes.STRING },
            third_key: { type: DataTypes.STRING },
            third_url: { type: DataTypes.STRING },
            third_token: { type: DataTypes.STRING },
            stamp_pic: { type: DataTypes.STRING },
            zc_url: { type: DataTypes.STRING },
            zh_ssid: { type: DataTypes.STRING },
            event_types: { type: DataTypes.STRING },
            remote_event_url: { type: DataTypes.STRING },
            driver_notice: { type: DataTypes.STRING },
            notice: { type: DataTypes.STRING },
            zc_rpc_url: { type: DataTypes.STRING },
            zczh_back_end: { type: DataTypes.STRING },
            zczh_back_token: { type: DataTypes.STRING },
            pos_lat: { type: DataTypes.FLOAT, defaultValue: 0 },
            pos_lon: { type: DataTypes.FLOAT, defaultValue: 0 },
            distance_limit: { type: DataTypes.FLOAT, defaultValue: 0 },
            zc_phone: { type: DataTypes.STRING },
        },
        plan: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            plan_time: { type: DataTypes.STRING },
            unit_price: { type: DataTypes.FLOAT, defaultValue: 0 },
            status: { type: DataTypes.INTEGER, defaultValue: 0 },
            comment: { type: DataTypes.STRING },
            from_bidding: { type: DataTypes.BOOLEAN, defaultValue: false },
            count: { type: DataTypes.FLOAT, defaultValue: 0 },
            p_weight: { type: DataTypes.FLOAT, defaultValue: 0 },
            m_weight: { type: DataTypes.FLOAT, defaultValue: 0 },
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
            enter_count: { type: DataTypes.FLOAT, defaultValue: 0 },
            enter_attachment: { type: DataTypes.STRING },
            confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
            is_proxy: { type: DataTypes.BOOLEAN, defaultValue: false },
            is_repeat: { type: DataTypes.BOOLEAN, defaultValue: false },
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
        },
        stuff: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            price: { type: DataTypes.FLOAT, defaultValue: 0 },
            comment: { type: DataTypes.STRING },
            next_price: { type: DataTypes.FLOAT, defaultValue: 0 },
            change_last_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },
            expect_count: { type: DataTypes.FLOAT, defaultValue: 0 },
            need_sc: { type: DataTypes.BOOLEAN, defaultValue: false },
            use_for_buy: { type: DataTypes.BOOLEAN, defaultValue: false },
            need_enter_weight: { type: DataTypes.BOOLEAN, defaultValue: false },
            no_need_register: { type: DataTypes.BOOLEAN, defaultValue: false },
            close_time: { type: DataTypes.STRING },
            delay_days: { type: DataTypes.INTEGER, defaultValue: 0 },
            next_comment: { type: DataTypes.STRING },
            next_operator: { type: DataTypes.STRING },
        },
        contract: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            sign_time: { type: DataTypes.STRING },
            balance: { type: DataTypes.FLOAT, defaultValue: 0 },
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
            cash_increased: { type: DataTypes.FLOAT, defaultValue: 0 },
        },
        archive_plan: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            content: { type: DataTypes.STRING },
        },
        price_history: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            time: { type: DataTypes.STRING },
            operator: { type: DataTypes.STRING },
            comment: { type: DataTypes.STRING },
            new_price: { type: DataTypes.FLOAT, defaultValue: 0 },
        },
        sc_req: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            need_attach: { type: DataTypes.BOOLEAN, defaultValue: false },
            need_input: { type: DataTypes.BOOLEAN, defaultValue: false },
            need_expired: { type: DataTypes.BOOLEAN, defaultValue: false },
            belong_type: { type: DataTypes.INTEGER, defaultValue: 0 },
            prompt: { type: DataTypes.STRING },
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
            total: { type: DataTypes.FLOAT, defaultValue: 0 },
            comment: { type: DataTypes.STRING },
            min: { type: DataTypes.FLOAT, defaultValue: 0 },
            max: { type: DataTypes.FLOAT, defaultValue: 0 },
            total_turn: { type: DataTypes.INTEGER, defaultValue: 0 },
            pay_first: { type: DataTypes.FLOAT, defaultValue: 0 },
            status: { type: DataTypes.INTEGER, defaultValue: 0 },
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
            price: { type: DataTypes.FLOAT, defaultValue: 0 },
            time: { type: DataTypes.STRING },
            accept: { type: DataTypes.BOOLEAN, defaultValue: false },
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
        vehicle_set:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        },
        export_record:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            create_time: { type: DataTypes.STRING },
            url: { type: DataTypes.STRING },
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
    },
    install: async function () {
        console.log('run install');
        let sq = this.get_sq();
        await sq.query("PRAGMA synchronous = OFF");
        await sq.query("PRAGMA journal_mode = DELETE");
        await sq.query("PRAGMA temp_store = 2");
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