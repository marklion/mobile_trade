const express = require('express');
const json2md = require('json2md');
const moment = require('moment');


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.help_info = [];

let mkapi = require('./api_utils');
const db_opt = require('./db_opt');
const rbac_lib = require('./lib/rbac_lib');

async function module_install(admin_role_id, app, module) {
    let mo = module;
    await rbac_lib.connect_role2module(admin_role_id, (await rbac_lib.add_module(mo.name, mo.description)).id );
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


app.listen(8080, () => console.log('Server running on port 8080'));