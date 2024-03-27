const { Sequelize, DataTypes, Op } = require('sequelize');
function get_db_handle() {
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: '/database/mt.db',
        dialectModule: require('/usr/local/lib/node_modules/sqlite3'),
        define: {
            freezeTableName: true,
        },
        logging: function (sql, time) {
            console.log(time + '->' + sql);
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
        },
        contract: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            sign_time: { type: DataTypes.STRING },
            balance: { type: DataTypes.FLOAT, defaultValue: 0 },
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