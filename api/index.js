const express = require('express');
const json2md = require('json2md');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const moment = require('moment');
const mergeImg = require('merge-img');
const jimp = require('jimp').default;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.help_info = [];
if (!isMainThread) {
    const { pic_list } = workerData;
    const targetWidth = 800; // 设定目标宽度
    const targetFileSize = 100 * 1024; // 设定目标文件大小

    (async () => {
        try {
            let begin_time = new Date().getTime();
            const resizedImages = await Promise.all(
                pic_list.map(async (file) => {
                    const image = await jimp.read('/database' + file);
                    image.resize(targetWidth, jimp.AUTO);
                    let quality = 100;
                    let buffer = await image.getBufferAsync(jimp.MIME_JPEG);
                    while (buffer.byteLength > targetFileSize && quality > 0) {
                        quality -= 5;
                        image.quality(quality);
                        buffer = await image.getBufferAsync(jimp.MIME_JPEG);
                    }
                    return image.getBufferAsync(jimp.MIME_PNG);
                })
            );
            const mergedImage = await mergeImg(resizedImages, {
                direction: true
            });

            let end_time = new Date().getTime();
            console.log('resize time:', end_time - begin_time);
            const uuid = require('uuid');
            const real_file_name = uuid.v4();
            const filePath = '/uploads/' + real_file_name + '.jpg';
            await mergedImage.write('/database' + filePath);
            parentPort.postMessage(filePath);
        } catch (error) {
            parentPort.postMessage({ error: error.message });
        }
    })();
}
else {
    let mkapi = require('./api_utils');
    const db_opt = require('./db_opt');
    const rbac_lib = require('./lib/rbac_lib');
    async function module_install(admin_role_id, app, module) {
        let mo = module;
        await rbac_lib.connect_role2module(admin_role_id, (await rbac_lib.add_module(mo.name, mo.description)).id);
        let need_rbac = true;
        Object.keys(mo.methods).forEach(itr => {
            let method_name = itr;
            let method = mo.methods[itr];
            if (mo.name === 'global') {
                need_rbac = method.need_rbac;
            }
            mkapi('/' + mo.name + '/' + method_name,
                mo.name, method.is_write, need_rbac,
                method.params, method.result, method.name,
                method.description, method.is_get_api).add_handler(
                    method.func
                ).install(app);
        });
    }

    async function init_super_user() {
        await db_opt.install();
        let sq = db_opt.get_sq();
        let user_one = await sq.models.rbac_user.findOrCreate({
            where: { phone: '18911992582' },
            defaults: {
                name: 'admin',
                online_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            }
        });

        let role = await rbac_lib.add_role('admin', '超级管理员', false, null);
        if (user_one[0] && role) {
            await rbac_lib.connect_user2role(user_one[0].id, role.id);
        }
        await module_install(role.id, app, require('./module/global_module'));
        await module_install(role.id, app, require('./module/customer_module'));
        await module_install(role.id, app, require('./module/sale_management_module'));
        await module_install(role.id, app, require('./module/bidding_module'));
        await module_install(role.id, app, require('./module/stuff_module'));
        await module_install(role.id, app, require('./module/safe_check_module'));
        await module_install(role.id, app, require('./module/cash_module'));
        await module_install(role.id, app, require('./module/scale_module'));
        await module_install(role.id, app, require('./module/rbac_module'));
        await module_install(role.id, app, require('./module/buy_management_module'));
        await module_install(role.id, app, require('./module/supplier_module'));
        await module_install(role.id, app, require('./module/exam_module'));
        await module_install(role.id, app, require('./module/u8c_module'));
        let all_modules = await sq.models.rbac_module.findAll();
        for (let index = 0; index < all_modules.length; index++) {
            const element = all_modules[index];
            mkapi('/rbac/verify_' + element.name + '_write', element.name, true, true, {}, {
                result: { type: Boolean, mean: '无意义', example: true }
            }, element.name + '权限读写校验', '验证是否有' + element.description + '的读写权限').add_handler(async (body, token) => {
                return { result: true };
            }).install(app);
            mkapi('/rbac/verify_' + element.name + '_read', element.name, false, true, {}, {
                result: { type: Boolean, mean: '无意义', example: true }
            }, element.name + '权限只读校验', '验证是否有' + element.description + '的读权限').add_handler(async (body, token) => {
                return { result: true };
            }).install(app);
        }
    }
    init_super_user();
    const multer = require('multer');
    const wx_api_util = require('./lib/wx_api_util');
    const upload = multer({ dest: '/database/uploads/' });
    app.post('/api/v1/upload_file', upload.single('file'), (req, res) => {
        const path = require('path');
        const fs = require('fs');
        let fileExtension = path.extname(req.file.originalname);
        fs.readFile(req.file.path, (err, data) => {
            if (err) {
                console.error(err);
                res.send({ err_msg: '文件读取失败' });
                return;
            }
            let base64Content = data.toString('base64');
            const decodedData = Buffer.from(base64Content, 'base64');
            const uuid = require('uuid');
            real_file_name = uuid.v4();
            const filePath = '/uploads/' + real_file_name + fileExtension;
            fs.writeFileSync('/database' + filePath, decodedData);
            res.send(filePath);
        });
    });
    app.post('/api/v1/merge_pics', async (req, res) => {
        let body = req.body;
        let pic_list = body.pic_list;
        const worker = new Worker(__filename, {
            workerData: { pic_list }
        });

        worker.on('message', (filePath) => {
            res.send({ result: filePath, err_msg: '' });
        });

        worker.on('error', (error) => {
            res.status(500).send({ result: '', err_msg: error.message });
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                res.status(500).send({ result: '', err_msg: `Worker stopped with exit code ${code}` });
            }
            console.log('Worker stopped with exit code', code);
        });
    });
    app.get('/api/v1/download_ticket', async (req, res) => {
        let id = req.query.id;
        let resp = await global_module.methods.download_ticket.func({ id: id });
        res.download('/database' + resp.url);
    })
    app.get('/api/help', (req, res) => {
        let out_json = app.help_info;
        const MarkdownIt = require('markdown-it');
        const mdTocAndAnchor = require('markdown-it-toc-and-anchor').default;

        const md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true,
        });

        md.use(mdTocAndAnchor, {
            toc: true,
            tocFirstLevel: 1,
            tocLastLevel: 6,
            wrapHeadingTextInAnchor: true
        });

        let markdownText = json2md(out_json);
        markdownText =
            `
# 概述
+ 本文档中所有接口使用 POST 方法
+ 除登录接口之外，需要先调用登录接口获取 token，然后在请求头中带上 token 才能调用其他接口
+ 每个接口的参数和返回值都是 JSON 格式
+ 接口返回的对象中会携带两个字段，err_msg 和 result
+ err_msg 为空字符串表示成功，否则表示失败
+ result字段是真正的接口返回值，每个接口的返回值都不一样，具体参考接口文档
    ` + markdownText;
        const htmlContent = md.render(markdownText);
        const html = `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@4.0.0/github-markdown.min.css">
    <title>接口文档</title>
    <style>
        #toc {
            position: fixed;
            left: 0;
            top: 0;
            width: 400px;
            height: 100%;
            overflow: auto;
            border-right: 1px solid #000;
        }
        #content {
            margin-left: 410px;
        }
        #toc a {
            display: block;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div id="toc"></div>
    <article class="markdown-body">
    <div id="content">${htmlContent}</div>
    </article>
    <script>
    window.onload = function() {
        const toc = document.getElementById('toc');
        const links = document.querySelectorAll('#content h1 a');
        let titels = [];
        links.forEach((link, index) => {
            const newLink = document.createElement('a');
            newLink.href = link.href;
            newLink.textContent = link.textContent;
            titels.push(newLink);
        });
        titels.sort((a, b) => {
            return a.textContent.localeCompare(b.textContent);
        });
        titels.forEach((link,index) => {
            link.textContent = (index + 1) + '. ' +link.textContent;
            toc.appendChild(link);
        });
    }
    </script>
</body>
</html>
`;
        res.send(html);
    });
    const fs = require('fs');
    const legacy_api = require('./legacy_api');
    const plan_lib = require('./lib/plan_lib');
    const global_module = require('./module/global_module');
    const bidding_lib = require('./lib/bidding_lib');
    const old_zczh = require('./plugin/old_zczh');
    const field_lib = require('./lib/field_lib');
    legacy_api.install(app);

    if (fs.existsSync('/database/map.json')) {
        wx_api_util.openid_map.load_map()
    } else {
        wx_api_util.openid_map.sync_map()
    }
    const g_timer_node_set = [];
    function add_min_timer(min_count, func) {
        g_timer_node_set.push({
            min_last: min_count - 1,
            min_count: min_count - 1,
            func: func
        });
    }

    add_min_timer(207, async () => {
        await wx_api_util.openid_map.sync_map();
    });
    add_min_timer(10, async () => {
        await plan_lib.auto_close_plan();
    });
    add_min_timer(1, async () => {
        console.log('1 min timer');
        bidding_lib.stop_timeup_bt();
        plan_lib.stuff_price_timeout();
        field_lib.auto_uncheck_in();
    });
    add_min_timer(2, async () => {
        console.log('2 min timer');
    });
    add_min_timer(5, async () => {
        console.log('5 min timer');
        old_zczh.proc_timeout_5min();
        plan_lib.walk_through2checkout();
    });

    app.post('/api/v1/internal_timeout', async (req, res) => {
        let body = req.body;
        if (body.pwd = process.env.DEFAULT_PWD) {
            for (let index = 0; index < g_timer_node_set.length; index++) {
                const element = g_timer_node_set[index];
                if (element.min_last == 0) {
                    element.func();
                    element.min_last = element.min_count;
                }
                else {
                    element.min_last--;
                }
            }
        }
        res.send({ err_msg: '' });
    });




    process.on('uncaughtException', (err) => {
        console.error('An uncaught error occurred!');
        console.error(err.stack);
    });
    let server = app.listen(8080, () => console.log('Server running on port 8080'));
    process.on('SIGINT', () => {
        console.log('SIGINT signal received. Closing server...');
        server.close();
    });
}