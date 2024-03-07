const { Sequelize, DataTypes, Op } = require('sequelize');
function get_db_handle() {
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: '/database/mt.db',
        dialectModule: require('/usr/local/lib/node_modules/sqlite3'),
        define: {
            freezeTableName:true,
        },
    });
    return  sequelize;
}
let g_sq;

let db_opt = {
    Op: Op,
    model:{
        rbac_user: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING},
            online_token: { type: DataTypes.STRING },
            online_time: { type: DataTypes.STRING },
            wx_openid: { type: DataTypes.STRING },
            phone: { type: DataTypes.STRING, unique: true },
            photo_path: { type: DataTypes.STRING },
        },
        rbac_role: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING},
            description: { type: DataTypes.STRING },
            is_readonly: { type: DataTypes.BOOLEAN },
        },
        rbac_module: {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, unique: true },
            description: { type: DataTypes.STRING },
        },
        company:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, unique: true },
        },
        plan:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            plan_time: { type: DataTypes.STRING },
            unit_price: { type: DataTypes.FLOAT },
            status: { type: DataTypes.INTEGER },
            comment: { type: DataTypes.STRING },
            from_bidding: { type: DataTypes.BOOLEAN },
            count: { type: DataTypes.FLOAT },
            p_weight: { type: DataTypes.FLOAT },
            m_weight: { type: DataTypes.FLOAT },
            p_time: { type: DataTypes.STRING },
            m_time: { type: DataTypes.STRING },
            use_for: { type: DataTypes.STRING },
            drop_address: { type: DataTypes.STRING },
            register_time: { type: DataTypes.STRING },
            register_number: { type: DataTypes.INTEGER },
        },
        vehicle:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            plate: { type: DataTypes.STRING, unique: true },
            is_behind: { type: DataTypes.BOOLEAN },
        },
        driver:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            phone: { type: DataTypes.STRING},
            id_card: { type: DataTypes.STRING},
            wx_openid: { type: DataTypes.STRING, unique: true},
        },
        stuff:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING },
            price: { type: DataTypes.FLOAT },
            comment: { type: DataTypes.STRING },
            next_price: { type: DataTypes.FLOAT },
            change_last_minutes: { type: DataTypes.INTEGER },
            expect_count: { type: DataTypes.FLOAT },
        },
        contract:{
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            sign_time: { type: DataTypes.STRING },
            balance: { type: DataTypes.FLOAT },
        },
        plan_history:{
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
            cash_increased: { type: DataTypes.FLOAT },
        },
    },
    make_associate:function(_sq){
        _sq.models.rbac_user.belongsToMany(_sq.models.rbac_role, {through: 'rbac_user_role'});
        _sq.models.rbac_role.belongsToMany(_sq.models.rbac_user, {through: 'rbac_user_role'});
        _sq.models.rbac_role.belongsToMany(_sq.models.rbac_module, {through: 'rbac_role_module'});
        _sq.models.rbac_module.belongsToMany(_sq.models.rbac_role, {through: 'rbac_role_module'});
        _sq.models.rbac_user.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.rbac_user);
        _sq.models.rbac_role.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.rbac_role);
        _sq.models.rbac_module.belongsToMany(_sq.models.company, {through: 'company_module'});
        _sq.models.company.belongsToMany(_sq.models.rbac_module, {through: 'company_module'});

        _sq.models.stuff.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.stuff);
        _sq.models.contract.belongsTo(_sq.models.company, {as: 'buy_company'});
        _sq.models.contract.belongsTo(_sq.models.company, {as: 'sale_company'});
        _sq.models.company.hasMany(_sq.models.contract, {as: 'buy_contracts', foreignKey: 'buyCompanyId'});
        _sq.models.company.hasMany(_sq.models.contract, {as: 'sale_contracts', foreignKey: 'saleCompanyId'});
        _sq.models.stuff.belongsToMany(_sq.models.contract, {through: 'contract_stuff'});
        _sq.models.contract.belongsToMany(_sq.models.stuff, {through: 'contract_stuff'});
        _sq.models.balance_history.belongsTo(_sq.models.contract);
        _sq.models.contract.hasMany(_sq.models.balance_history);

        _sq.models.plan.belongsTo(_sq.models.company);
        _sq.models.company.hasMany(_sq.models.plan);
        _sq.models.plan.belongsTo(_sq.models.vehicle, {as: 'main_vehicle'});
        _sq.models.plan.belongsTo(_sq.models.vehicle, {as: 'behind_vehicle'});
        _sq.models.vehicle.hasMany(_sq.models.plan, {foreignKey: 'mainVehicleId'});
        _sq.models.vehicle.hasMany(_sq.models.plan, {foreignKey: 'behindVehicleId'});
        _sq.models.plan.belongsTo(_sq.models.driver);
        _sq.models.driver.hasMany(_sq.models.plan);
        _sq.models.plan.belongsTo(_sq.models.stuff);
        _sq.models.stuff.hasMany(_sq.models.plan);
        _sq.models.plan_history.belongsTo(_sq.models.plan);
        _sq.models.plan.hasMany(_sq.models.plan_history);

    },
    install: async function(){
        console.log('run install');
        let sq = this.get_sq();
        Object.keys(this.model).forEach((key)=>{
            sq.define(key, this.model[key], {paranoid: true});
        });
        this.make_associate(sq);
        await sq.sync({ alter: {drop:false}});
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