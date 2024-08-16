const db_opt = require('../db_opt');
module.exports = {
    cleanDriverData: async function () {
        let sq = db_opt.get_sq();
        // 启动事务
        const transaction = await sq.transaction();
        try {
            const drivers = await sq.models.driver.findAll({ transaction });
    
            await Promise.all(drivers.map(async (driver) => {
                // 匹配tab制表符与空格符
                if (/[\t\s]/g.test(driver.name) || /[\t\s]/g.test(driver.phone) || /[\t\s]/g.test(driver.id_card)) {
                    const cleanedName = driver.name.replace(/[\t\s]/g, '');
                    // const cleanedPhone = driver.phone.replace(/[\t\s]/g, '');
                    const cleanedIdCard = driver.id_card.replace(/[\t\s]/g, '');
    
                    // 检查是否存在重复记录
                    const duplicateDriver = await sq.models.driver.findOne({
                        where: {
                            id: { [db_opt.Op.ne]: driver.id },
                            name: cleanedName,
                            id_card:cleanedIdCard+'',
                            deletedAt: { [db_opt.Op.eq]: null }
                        },
                        transaction
                    });
    
                    if (duplicateDriver) {
                        // 关联计划、合同、车队、考试
                        const relatedTables = ['plan', 'sc_content', 'vehicle_set', 'exam'];
                        await Promise.all(relatedTables.map(table => 
                            sq.models[table].update(
                                { driverId: duplicateDriver.id },
                                { 
                                    where: { driverId: driver.id },
                                    transaction
                                }
                            )
                        ));
                    }
                    // driver记录逻辑删除
                    await driver.destroy({ transaction })
                    // driver记录物理删除
                    // await driver.destroy({ transaction , force:true})
                }
            }));
            // 提交事务
            await transaction.commit();
            console.info('============数据清理完成===========');
        } catch (error) {
            console.error('driver数据清理过程中发生错误:', error);
            // 回滚事务
            await transaction.rollback();
        }
    }
}
