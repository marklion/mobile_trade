const db_opt = require('../db_opt');
// 正则验证车牌,验证通过返回true,不通过返回false
function isLicensePlate(str) {
    return /^(([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z](([0-9]{5}[DF])|([DF]([A-HJ-NP-Z0-9])[0-9]{4})))|([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳使领]))$/.test(str);
}
const regStr = /[\t\s]/g;
module.exports = {
    cleanDriverData: async function () {
        let sq = db_opt.get_sq();
        // 启动事务
        const transaction = await sq.transaction();
        try {
            const drivers = await sq.models.driver.findAll({ transaction });

            await Promise.all(drivers.map(async (driver) => {
                // 匹配tab制表符与空格符
                if (regStr.test(driver.name) || regStr.test(driver.phone) || regStr.test(driver.id_card)) {
                    const cleanedName = driver.name.replace(regStr, '');
                    const cleanedIdCard = driver.id_card.replace(regStr, '');
                    const cleanedPhone = driver.phone.replace(regStr, '');

                    // 检查是否存在重复记录
                    const duplicate = await sq.models.driver.findOne({
                        where: {
                            id: { [db_opt.Op.ne]: driver.id },
                            [db_opt.Op.or]:{
                                name: cleanedName,
                                id_card: cleanedIdCard + '',
                                phone: cleanedPhone,
                            }
                        },
                        transaction
                    });

                    if (duplicate) {
                        // 关联计划、车队、考试
                        const relatedTables = ['plan', 'vehicle_set', 'exam'];
                        await Promise.all(relatedTables.map(table =>
                            sq.models[table].update(
                                { driverId: duplicate.id },
                                {
                                    where: { driverId: driver.id },
                                    transaction
                                }
                            )
                        ));
                        // 记录逻辑删除
                        await driver.destroy({ transaction })
                    }
                    else {
                        // 去空格、制表符、转大写
                        await sq.query(
                            'UPDATE OR IGNORE driver SET name = :name AND phone = :phone AND id_card = :id_card WHERE id = :id',
                            {
                                replacements: { name: cleanedName, phone: cleanedPhone, id_card: cleanedIdCard, id: driver.id },
                                type: sq.QueryTypes.UPDATE,
                                transaction
                            }
                        );
                    }

                }
            }));
            // 提交事务
            await transaction.commit();
        } catch (error) {
            // 回滚事务
            await transaction.rollback();
            throw new Error('driver数据清理过程中发生错误');
        }
    },
    cleanVehicleData: async function () {
        let sq = db_opt.get_sq();
        // 启动事务
        const transaction = await sq.transaction();
        try {
            const vehicles = await sq.models.vehicle.findAll({ transaction });

            await Promise.all(vehicles.map(async (vehicle) => {
                const cleanedName = vehicle.plate.replace(regStr, '');
                if (isLicensePlate(cleanedName.toUpperCase())) {
                    // 检查是否存在重复记录
                    const duplicate = await sq.models.vehicle.findOne({
                        where: {
                            id: { [db_opt.Op.ne]: vehicle.id },//排除本身
                            plate: cleanedName
                        },
                        transaction
                    });
                    if (duplicate) {
                        const relatedTables = ['plan', 'vehicle_set', 'sc_content'];
                        await Promise.all(relatedTables.map((table) => {
                            if (table == "sc_content") {
                                // 更新 sc_content 表
                                sq.models[table].update(
                                    {
                                        vehicleId: duplicate.id
                                    },
                                    {
                                        where: {
                                            vehicleId: vehicle.id
                                        },
                                        transaction
                                    }
                                )
                            } else {
                                // 主车、挂车
                                const vehicleType = vehicle.is_behind ? 'behindVehicleId' : 'mainVehicleId';
                                // 更新 plan、vehicle_set 表 
                                sq.models[table].update(
                                    {
                                        [vehicleType]: duplicate.id
                                    },
                                    {
                                        where: {
                                            [vehicleType]: vehicle.id
                                        },
                                        transaction
                                    }
                                )
                            }
                        }
                        ))
                        // 删除重复记录
                        await vehicle.destroy({ transaction })

                    } else {
                            // 车牌号去空格、制表符、转大写
                            await sq.query(
                                'UPDATE OR IGNORE vehicle SET plate = :plate WHERE id = :id',
                                {
                                    replacements: { plate: cleanedName.toUpperCase(), id: vehicle.id },
                                    type: sq.QueryTypes.UPDATE,
                                    transaction
                                }
                            );
                    }
                }else{
                    // 删除非车牌数据
                    await vehicle.destroy({ transaction })
                }
            }));
            // 提交事务
            await transaction.commit();
        } catch (error) {
            // 回滚事务
            await transaction.rollback();
            throw new Error(error)
        }
    }
}
