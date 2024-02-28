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