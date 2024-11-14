const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const db_opt = require('../db_opt');
const util_lib = require('./util_lib');
const sq = db_opt.get_sq();
const archiver = require('archiver');
const uuid = require('uuid');
const fc_content = [
    sq.models.field_check_item,
    sq.models.rbac_role,
    sq.models.stuff,
];
module.exports = {
    add_fc_table: async function (name, stuff_id) {
        let stuff = await sq.models.stuff.findByPk(stuff_id);
        let exist_fc_tables = await stuff.getField_check_tables({ where: { name: name } });
        if (exist_fc_tables.length > 0) {
            return;
        }
        let target_ft = await sq.models.field_check_table.create({ name: name });
        await target_ft.setStuff(stuff);
    },
    del_fc_table: async function (id) {
        let exist_fc = await this.get_fc_table(id);
        if (exist_fc) {
            await exist_fc.destroy();
        }
    },
    get_fc_table: async function (id, full = false) {
        let include_content = [];
        if (full) {
            include_content = fc_content
        }

        return await sq.models.field_check_table.findByPk(id, {
            include: include_content,
        });
    },
    get_all_fc_table: async function (stuff_id, pageNo) {
        let stuff = await sq.models.stuff.findByPk(stuff_id);
        return {
            total: await stuff.countField_check_tables(),
            fc_table: await stuff.getField_check_tables({
                offset: 20 * pageNo,
                limit: 20,
                include: fc_content,
            }),
        };
    },
    add_item2fc_table: async function (fc_id, item_name) {
        let fc_table = await this.get_fc_table(fc_id);
        let exist_fc_item = await fc_table.getField_check_items({ where: { name: item_name } });
        if (exist_fc_item.length > 0) {
            return;
        }
        let new_one = await sq.models.field_check_item.create({ name: item_name });
        await new_one.setField_check_table(fc_table);
    },
    get_fc_item: async function (item_id) {
        return await sq.models.field_check_item.findByPk(item_id, {
            include: [{
                model: sq.models.field_check_table,
                include: [sq.models.stuff]
            }]
        });
    },
    del_fc_item: async function (item_id) {
        let exist_fc = await this.get_fc_item(item_id);
        if (exist_fc) {
            await exist_fc.destroy();
        }
    },
    get_fc_plan_table: async function (plan_id, pageNo) {
        let plan = await sq.models.plan.findByPk(plan_id);
        let ret = await this.get_all_fc_table(plan.stuffId, pageNo);
        for (let index = 0; index < ret.fc_table.length; index++) {
            const element = ret.fc_table[index];
            let fc_plan_tables = await element.getFc_plan_tables({
                where: {
                    planId: plan_id
                },
                include: [{
                    model: sq.models.fc_check_result,
                    include: [sq.models.field_check_item]
                }, sq.models.rbac_user]
            });
            if (fc_plan_tables.length == 1) {
                element.fc_plan_table = fc_plan_tables[0];
            }
        }
        return { fc_plan_tables: ret.fc_table, total: ret.total };
    },
    prepare_empty_fc: async function (plan_id) {
        let plan = await sq.models.plan.findByPk(plan_id);
        let stuff = await plan.getStuff();
        let fc_tables = await stuff.getField_check_tables();
        for (let index = 0; index < fc_tables.length; index++) {
            const element = fc_tables[index];
            let exist_fc_plan_tables = await element.getFc_plan_tables({ where: { planId: plan_id } });
            if (exist_fc_plan_tables.length > 0) {
                continue;
            }
            let new_one = await sq.models.fc_plan_table.create();
            await element.addFc_plan_table(new_one);
            await new_one.setPlan(plan);
            let fc_items = await element.getField_check_items();
            for (let j = 0; j < fc_items.length; j++) {
                const item = fc_items[j];
                await new_one.createFc_check_result({ fieldCheckItemId: item.id });
            }
        }
    },
    get_all_fc_plan_table: async function (plan) {
        let pageNo = 0;
        let ret = [];
        let tmp_ret = [];
        do {
            tmp_ret = (await this.get_fc_plan_table(plan.id, pageNo)).fc_plan_tables;
            tmp_ret.forEach(item => {
                let tmp = item.toJSON()
                if (item.fc_plan_table) {
                    tmp.fc_plan_table = item.fc_plan_table.toJSON();
                }
                ret.push(tmp);
            });
            pageNo++;
        } while (tmp_ret.length > 0);

        return ret;
    },
    make_fc_for_export: async function (fc_plan_table, plan) {
        let ret = {};
        if (fc_plan_table.fc_plan_table) {
            for (let index = 0; index < fc_plan_table.fc_plan_table.fc_check_results.length; index++) {
                const element = fc_plan_table.fc_plan_table.fc_check_results[index];
                if (element && element.field_check_item) {
                    ret[element.field_check_item.name] = element.pass_time ? '通过' : '未通过';
                }
            }
            if (fc_plan_table.fc_plan_table.finish_time) {
                ret.checker = fc_plan_table.fc_plan_table.rbac_user.name;
                ret.finish_time = fc_plan_table.fc_plan_table.finish_time;
            }
            ret.table_name = fc_plan_table.name;
            ret.stuff_name = plan.stuff.name;
            ret.company_name = plan.stuff.company.name;
            ret.main_vehicle = plan.main_vehicle.plate;
            ret.behind_vehicle = plan.behind_vehicle.plate;
        }
        if (!ret.finish_time) {
            ret = undefined;
        }

        return ret;
    },
    make_file_by_fc_result: async function (fc_result, template_path) {
        // 读取模板文件
        const content = fs.readFileSync(template_path, 'binary');

        // 创建PizZip实例
        const zip = new PizZip(content);

        // 创建Docxtemplater实例
        const doc = new Docxtemplater(zip, {
            parser: tag => ({
                get: s => s === '.' ? tag : tag.split('.').reduce((a, b) => a && a[b], s)
            }),
            xmlOptions: {
                parser: DOMParser,
                serializer: XMLSerializer
            }
        });
        // 填充模板
        doc.setData(fc_result);
        try {
            // 渲染文档
            doc.render();
        } catch (error) {
            console.error('Error rendering document:', error);
            throw error;
        }

        // 生成新的Word文件
        let filename = `fc_${fc_result.main_vehicle}-${fc_result.behind_vehicle}-${fc_result.finish_time}.docx`;
        let download_path = path.resolve('/database/uploads/', filename);
        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        fs.writeFileSync(download_path, buf);

        console.log('Document generated successfully!');
        return download_path;
    },
    export_fc: async function (plans) {
        let ret = '';
        let filePaths = [];
        for (let index = 0; index < plans.length; index++) {
            const plan = plans[index];
            let fc_plan_tables = plan.fc_info;
            for (let jndex = 0; jndex < fc_plan_tables.length; jndex++) {
                const fc_plan_table = fc_plan_tables[jndex];
                let fc_result_table = await this.make_fc_for_export(fc_plan_table, plan);
                if (fc_result_table) {
                    let template_path = fc_plan_table.template_path;
                    if (template_path) {
                        let tmp_doc = await this.make_file_by_fc_result(fc_result_table, '/database' + template_path);
                        filePaths.push(tmp_doc);
                    }
                }
            }
        }

        let download_path = `/uploads/fc_${uuid.v4().split('-')[0]}.zip`;
        const outputPath = `/database${download_path}`;
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            console.log('ZIP文件创建成功,大小:' + archive.pointer() + ' bytes');
            // 删除打包前的文件
            await Promise.all(filePaths.map(async (filePath) => {
                try {
                    const absolutePath = path.resolve(filePath);
                    await fs.promises.unlink(absolutePath);
                    console.log(`文件已删除: ${absolutePath}`);
                } catch (err) {
                    console.error(`无法删除文件 ${absolutePath}: ${err.message}`);
                }
            }));
        });

        archive.on('error', (err) => {
            console.error('ZIP文件创建失败: ' + err.message);
        });

        archive.pipe(output);
        await Promise.all(filePaths.map(async (filePath) => {
            const absolutePath = path.resolve(filePath);
            try {
                const fileName = absolutePath.match(/fc_(.*)/)[1];
                await archive.file(absolutePath, { name: `现场检查表_${fileName}` });
                console.log(`文件已添加到ZIP: ${absolutePath}`);
            } catch (err) {
                console.error(`无法访问文件 ${absolutePath}: ${err.message}`);
            }
        }));
        archive.finalize()
        ret = download_path;

        return ret;
    },
    upload_fc_table_template: async function (fc_table_id, file_path) {
        let fc_table = await this.get_fc_table(fc_table_id);
        fc_table.template_path = file_path;
        await fc_table.save();
    },
}