const { Worker, isMainThread, parentPort } = require('worker_threads');
if (!isMainThread) {
    const jimp = require('jimp').default;
    const fs = require('fs');
    const path = require('path');
    const uuid = require('uuid');

    async function encodeJpeg(image, targetFileSize) {
        let buffer = await image.quality(85).getBufferAsync(jimp.MIME_JPEG);
        if (buffer.byteLength > targetFileSize) {
            buffer = await image.quality(60).getBufferAsync(jimp.MIME_JPEG);
        }
        return buffer;
    }

    function saveJpeg(buffer) {
        const filePath = '/uploads/' + uuid.v4() + '.jpg';
        fs.writeFileSync('/database' + filePath, buffer);
        return filePath;
    }

    async function compressImage(filePath) {
        const targetWidth = 1280;
        const targetFileSize = 200 * 1024;
        const absPath = '/database' + filePath;
        const ext = path.extname(filePath).toLowerCase();
        const originalSize = fs.statSync(absPath).size;
        const image = await jimp.read(absPath);
        const canKeepOriginal = ['.jpg', '.jpeg'].includes(ext)
            && originalSize <= targetFileSize
            && image.bitmap.width <= targetWidth;
        if (canKeepOriginal) {
            return filePath;
        }
        if (image.bitmap.width > targetWidth) {
            image.resize(targetWidth, jimp.AUTO);
        }
        const buffer = await encodeJpeg(image, targetFileSize);
        const compressedPath = saveJpeg(buffer);
        try {
            fs.unlinkSync(absPath);
        } catch (e) {
            console.error('删除原图失败:', e.message);
        }
        return compressedPath;
    }

    async function mergeImages(picList) {
        const beginTime = Date.now();
        const targetWidth = 800;
        const resizedImages = [];
        for (const file of picList) {
            const image = await jimp.read('/database' + file);
            if (image.bitmap.width > targetWidth) {
                image.resize(targetWidth, jimp.AUTO);
            }
            resizedImages.push(image);
        }
        const canvasWidth = Math.max(...resizedImages.map(image => image.bitmap.width));
        const canvasHeight = resizedImages.reduce(
            (sum, image) => sum + image.bitmap.height, 0
        );
        const mergedImage = await jimp.create(canvasWidth, canvasHeight, 0xffffffff);
        let offsetY = 0;
        for (const image of resizedImages) {
            mergedImage.composite(image, 0, offsetY);
            offsetY += image.bitmap.height;
        }
        const buffer = await encodeJpeg(mergedImage, 500 * 1024);
        const filePath = saveJpeg(buffer);
        console.log('resize time:', Date.now() - beginTime);
        return filePath;
    }

    parentPort.on('message', async (job) => {
        try {
            let result;
            if (job.type === 'compress') {
                result = await compressImage(job.filePath);
            } else if (job.type === 'merge') {
                result = await mergeImages(job.picList);
            } else {
                throw new Error('未知图片任务');
            }
            parentPort.postMessage({ result });
        } catch (error) {
            parentPort.postMessage({ error: error.message });
        }
    });
}
else {
    const express = require('express');
    const json2md = require('json2md');
    const moment = require('moment');
    const king_dee_start_lib = require('./lib/king_dee_start_lib');
    const cash_lib = require('./lib/cash_lib');
    const app = express();
    app.help_info = [];
    app.openapi_paths = {};
    const os = require('os');
    const cgroupFs = require('fs');
    function getCpuLimitCores() {
        const envCpuLimit = Number(process.env.CPU_LIMIT_CORES);
        if (!Number.isNaN(envCpuLimit) && envCpuLimit > 0) {
            return envCpuLimit;
        }
        try {
            const [quota, period] = cgroupFs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(' ');
            if (quota !== 'max') {
                const quotaValue = Number(quota);
                const periodValue = Number(period);
                if (quotaValue > 0 && periodValue > 0) {
                    return quotaValue / periodValue;
                }
            }
        } catch (e) { }
        try {
            const quotaValue = Number(cgroupFs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8').trim());
            const periodValue = Number(cgroupFs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8').trim());
            if (quotaValue > 0 && periodValue > 0) {
                return quotaValue / periodValue;
            }
        } catch (e) { }
        return typeof os.availableParallelism === 'function'
            ? os.availableParallelism()
            : os.cpus().length;
    }
    const totalCpuCores = getCpuLimitCores();
    const cpuLimitCores = totalCpuCores * 0.9;
    let lastCpuUsage = process.cpuUsage();
    let lastCpuSampleTime = process.hrtime.bigint();
    let cpuUsageCores = 0;
    const cpuSampleTimer = setInterval(() => {
        const currentCpuUsage = process.cpuUsage();
        const currentSampleTime = process.hrtime.bigint();
        const elapsedMicros = Number(currentSampleTime - lastCpuSampleTime) / 1000;
        const usedMicros = currentCpuUsage.user - lastCpuUsage.user
            + currentCpuUsage.system - lastCpuUsage.system;
        cpuUsageCores = usedMicros / elapsedMicros;
        lastCpuUsage = currentCpuUsage;
        lastCpuSampleTime = currentSampleTime;
    }, 1000);
    cpuSampleTimer.unref();

    const activeRequests = new Map();
    const activeTimerTasks = new Map();
    let nextRequestId = 0;
    let nextTimerTaskId = 0;
    function getCpuActivity(now) {
        const requests = Array.from(activeRequests.values()).map(item => ({
            method: item.method,
            path: item.path,
            elapsed_ms: now - item.startedAt,
        })).sort((a, b) => b.elapsed_ms - a.elapsed_ms);
        const activeImageJobs = [];
        for (const worker of imageWorkers) {
            if (worker.currentImageJob) {
                activeImageJobs.push({
                    type: worker.currentImageJob.task.type,
                    elapsed_ms: now - worker.currentImageJob.startedAt,
                });
            }
        }
        const queuedImageJobs = imageJobQueue.map(job => ({
            type: job.task.type,
            waiting_ms: now - job.createdAt,
        }));
        const timerTasks = Array.from(activeTimerTasks.values()).map(item => ({
            name: item.name,
            elapsed_ms: now - item.startedAt,
        })).sort((a, b) => b.elapsed_ms - a.elapsed_ms);
        const possibleCauses = [];
        if (activeImageJobs.length > 0 || queuedImageJobs.length > 0) {
            possibleCauses.push(`图片处理：执行中 ${activeImageJobs.length}，排队 ${queuedImageJobs.length}`);
        }
        if (timerTasks.length > 0) {
            possibleCauses.push(`定时任务：${timerTasks.map(item => item.name).join('、')}`);
        }
        if (requests.length > 0) {
            const paths = [...new Set(requests.map(item => item.path))].slice(0, 5);
            possibleCauses.push(`进行中的请求：${paths.join('、')}`);
        }
        if (possibleCauses.length === 0) {
            possibleCauses.push('未捕获到活动任务，可能是短时任务、垃圾回收或 CPU 采样延迟');
        }
        return {
            possible_causes: possibleCauses,
            active_request_count: requests.length,
            active_requests: requests.slice(0, 20),
            image_tasks: {
                concurrency: imageConcurrency,
                active: activeImageJobs,
                queued: queuedImageJobs.slice(0, 20),
                queued_count: queuedImageJobs.length,
            },
            timer_tasks: timerTasks,
        };
    }
    const recordCpuUsage = require('./cpu_record')(getCpuActivity);

    app.use((req, res, next) => {
        if (cpuUsageCores >= cpuLimitCores) {
            recordCpuUsage(req, cpuUsageCores, cpuLimitCores, totalCpuCores);
            res.set('Retry-After', '1');
            console.log(`current cpu usage:${cpuUsageCores}`);

            return res.status(503).send({
                err_msg: '服务器繁忙，请稍后重试',
                result: null,
            });
        }
        const requestId = ++nextRequestId;
        activeRequests.set(requestId, {
            method: req.method,
            path: req.path,
            startedAt: Date.now(),
        });
        const clearActiveRequest = () => activeRequests.delete(requestId);
        res.once('finish', clearActiveRequest);
        res.once('close', clearActiveRequest);
        return next();
    });
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    let mkapi = require('./api_utils');
    const db_opt = require('./db_opt');
    const rbac_lib = require('./lib/rbac_lib');
    async function module_install(admin_role_id, app, module) {
        let mo = module;
        await rbac_lib.connect_role2module(admin_role_id, (await rbac_lib.add_module(mo.name, mo.description)).id);
        Object.keys(mo.methods).forEach(itr => {
            let method_name = itr;
            let method = mo.methods[itr];
            let need_rbac = true;
            if (mo.name === 'global') {
                need_rbac = method.need_rbac;
            } else if (mo.name === 'group') {
                need_rbac = method.need_rbac !== undefined ? method.need_rbac : false;
            } else if (method.need_rbac !== undefined) {
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
        await module_install(role.id, app, require('./module/tplus_module'));
        await module_install(role.id, app, require('./module/approval_module'));
        await module_install(role.id, app, require('./module/group_module'));
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
    const imageConcurrency = Math.max(1, Math.floor(totalCpuCores) - 1);
    const maxImageQueueSize = imageConcurrency * 4;
    const imageWorkers = new Set();
    const idleImageWorkers = [];
    const imageJobQueue = [];
    let imageWorkersClosed = false;

    function dispatchImageJobs() {
        while (!imageWorkersClosed && idleImageWorkers.length > 0 && imageJobQueue.length > 0) {
            const worker = idleImageWorkers.shift();
            const job = imageJobQueue.shift();
            job.startedAt = Date.now();
            worker.currentImageJob = job;
            worker.postMessage(job.task);
        }
    }

    function createImageWorker() {
        const worker = new Worker(__filename);
        worker.currentImageJob = null;
        imageWorkers.add(worker);
        idleImageWorkers.push(worker);
        worker.on('message', (data) => {
            const job = worker.currentImageJob;
            worker.currentImageJob = null;
            if (job) {
                if (data && data.error) {
                    job.reject(new Error(data.error));
                } else {
                    job.resolve(data.result);
                }
            }
            if (!imageWorkersClosed) {
                idleImageWorkers.push(worker);
            }
            dispatchImageJobs();
        });
        worker.on('error', (error) => {
            const job = worker.currentImageJob;
            worker.currentImageJob = null;
            if (job) {
                job.reject(error);
            }
        });
        worker.on('exit', (code) => {
            imageWorkers.delete(worker);
            const idleIndex = idleImageWorkers.indexOf(worker);
            if (idleIndex >= 0) {
                idleImageWorkers.splice(idleIndex, 1);
            }
            const job = worker.currentImageJob;
            worker.currentImageJob = null;
            if (job) {
                job.reject(new Error(`图片处理 Worker 异常退出: ${code}`));
            }
            if (!imageWorkersClosed && imageJobQueue.length > 0) {
                createImageWorker();
            }
            dispatchImageJobs();
        });
    }

    function runImageTask(task) {
        if (imageWorkersClosed) {
            return Promise.reject(new Error('图片服务正在关闭'));
        }
        if (imageJobQueue.length >= maxImageQueueSize) {
            const error = new Error('图片处理繁忙，请稍后重试');
            error.code = 'IMAGE_WORKER_BUSY';
            return Promise.reject(error);
        }
        return new Promise((resolve, reject) => {
            imageJobQueue.push({ task, resolve, reject, createdAt: Date.now() });
            if (idleImageWorkers.length === 0 && imageWorkers.size < imageConcurrency) {
                createImageWorker();
            }
            dispatchImageJobs();
        });
    }

    function closeImageWorkers() {
        imageWorkersClosed = true;
        while (imageJobQueue.length > 0) {
            imageJobQueue.shift().reject(new Error('图片服务正在关闭'));
        }
        for (const worker of imageWorkers) {
            worker.terminate();
        }
    }

    function sendImageTaskError(res, error) {
        if (error.code === 'IMAGE_WORKER_BUSY') {
            res.set('Retry-After', '5');
            return res.status(503).send({ result: '', err_msg: error.message });
        }
        return res.status(500).send({ result: '', err_msg: error.message });
    }

    const multer = require('multer');
    const wx_api_util = require('./lib/wx_api_util');
    const upload = multer({
        dest: '/database/uploads/',
        limits: { fileSize: 20 * 1024 * 1024 },
    });
    function uploadSingleFile(req, res, next) {
        upload.single('file')(req, res, (error) => {
            if (!error) {
                return next();
            }
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).send({ err_msg: '文件不能超过20MB' });
            }
            return res.status(400).send({ err_msg: error.message });
        });
    }
    async function compress_uploaded_image(filePath) {
        const path = require('path');
        const imageExts = ['.jpg', '.jpeg', '.png', '.bmp', '.webp', '.gif'];
        const ext = path.extname(filePath).toLowerCase();
        if (!imageExts.includes(ext)) {
            return filePath;
        }
        return runImageTask({ type: 'compress', filePath });
    }
    app.post('/api/v1/upload_file', uploadSingleFile, async (req, res) => {
        const path = require('path');
        const fs = require('fs');
        try {
            let fileExtension = path.extname(req.file.originalname);
            const uuid = require('uuid');
            const real_file_name = uuid.v4();
            let filePath = '/uploads/' + real_file_name + fileExtension;
            await fs.promises.rename(req.file.path, '/database' + filePath);
            const need_compress = req.query.compress === '1' || req.body.compress === '1' || req.body.compress === true;
            if (need_compress) {
                filePath = await compress_uploaded_image(filePath);
            }
            res.send(filePath);
        } catch (err) {
            if (err.code === 'IMAGE_WORKER_BUSY') {
                res.set('Retry-After', '5');
                return res.status(503).send({ err_msg: err.message });
            }
            console.error(err);
            res.status(500).send({ err_msg: '文件上传失败' });
        }
    });

    app.use('/uploads', express.static('/database/uploads'));
    app.use('/logo_res', express.static('/database/logo_res'));

    app.post('/api/v1/merge_pics', async (req, res) => {
        let body = req.body;
        let pic_list = body.pic_list;
        if (!Array.isArray(pic_list) || pic_list.length === 0) {
            res.send({ result: '', err_msg: 'pic_list 参数不合法' });
            return;
        }
        if (pic_list.length > 9) {
            res.send({ result: '', err_msg: '一次最多合并9张图片' });
            return;
        }
        if (!pic_list.every(file => typeof file === 'string' && file.startsWith('/uploads/'))) {
            res.send({ result: '', err_msg: '图片路径不合法' });
            return;
        }
        try {
            const result = await runImageTask({ type: 'merge', picList: pic_list });
            res.send({ result, err_msg: '' });
        } catch (error) {
            sendImageTaskError(res, error);
        }
    });
    app.get('/api/v1/download_ticket', async (req, res) => {
        let id = req.query.id;
        let resp = await global_module.methods.download_ticket.func({ id: id });
        res.download('/database' + resp.url);
    })
    const { buildOpenApiSpec } = require('./openapi_utils');
    const swaggerUi = require('swagger-ui-express');
    const swaggerAuth = require('./swagger_auth');

    app.post('/api/swagger/login', swaggerAuth.handleSwaggerLogin);
    app.get('/api/swagger/logout', swaggerAuth.handleSwaggerLogout);
    app.get('/api/openapi.json', swaggerAuth.requireSwaggerAdmin, (req, res) => {
        res.json(buildOpenApiSpec(app.openapi_paths));
    });

    app.use('/api/swagger', swaggerAuth.serveSwaggerAssets());
    app.use('/api/swagger', swaggerAuth.requireSwaggerAdmin);
    app.use('/api/swagger', swaggerAuth.serveDynamicInit);
    app.use('/api/swagger', swaggerAuth.setupSwaggerUi(swaggerUi));

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
    const t_plus_lib = require('./lib/t_plus_lib');
    legacy_api.install(app);

    if (fs.existsSync('/database/map.json')) {
        wx_api_util.openid_map.load_map()
    } else {
        wx_api_util.openid_map.sync_map()
    }
    const g_timer_node_set = [];
    function add_min_timer(min_count, name, func) {
        g_timer_node_set.push({
            min_last: min_count - 1,
            min_count: min_count - 1,
            name: name,
            func: func
        });
    }
    function trackTimerTask(name, task) {
        const taskId = ++nextTimerTaskId;
        activeTimerTasks.set(taskId, { name, startedAt: Date.now() });
        const clearTask = () => activeTimerTasks.delete(taskId);
        if (task && typeof task.finally === 'function') {
            task.finally(clearTask);
        } else {
            clearTask();
        }
    }

    add_min_timer(60*24, '微信 openid 同步', async () => {
        await wx_api_util.openid_map.sync_map();
    });
    add_min_timer(10, '自动关闭计划', async () => {
        await plan_lib.auto_close_plan();
    });
    add_min_timer(1, '每分钟任务调度', async () => {
        console.log('1 min timer');
        trackTimerTask('竞价超时处理', bidding_lib.stop_timeup_bt());
        trackTimerTask('定时调价', plan_lib.stuff_price_timeout());
        trackTimerTask('自动取消签到', field_lib.auto_uncheck_in());
        trackTimerTask('自动签出', plan_lib.walk_through2checkout());
        trackTimerTask('T+ 自动结算', t_plus_lib.walk_through_tplus_settle());
        trackTimerTask('自动叫号', field_lib.auto_call_vehicle());
    });
    add_min_timer(6, '金蝶预存款同步', async () => {
        let sq = db_opt.get_sq();
        let all_configs = await sq.models.king_dee_start_config.findAll({ group: ['clientId'] });
        for (let one_config of all_configs) {
            let new_charge_array = await king_dee_start_lib.get_pre_credit(one_config)
            for (let one_charge of new_charge_array) {
                let contract = await sq.models.contract.findOne({
                    where: {
                        customer_code: one_charge.customer_code,
                    },
                    include: [{
                        model: sq.models.stuff,
                        required: true,
                        where: { id: one_config.stuffId }
                    }]
                });
                let comment = '金蝶预存款同步:' + one_charge.bill_no;
                let privious_histories = await contract.getBalance_histories({
                    where:{
                        comment: comment,
                        cash_increased: one_charge.amount,
                    }
                });
                if (privious_histories.length == 0) {
                    await cash_lib.charge_by_username_and_contract('金蝶系统', contract, one_charge.amount, comment);
                }
            }
        }
    });
    add_min_timer(5, 'old_zczh 超时处理', async () => {
        console.log('5 min timer');
        await old_zczh.proc_timeout_5min();
    });

    app.post('/api/v1/internal_timeout', async (req, res) => {
        let body = req.body;
        if (body.pwd = process.env.DEFAULT_PWD) {
            for (let index = 0; index < g_timer_node_set.length; index++) {
                const element = g_timer_node_set[index];
                if (element.min_last == 0) {
                    trackTimerTask(element.name, element.func());
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
    const listenPort = process.env.PORT != null && process.env.PORT !== '' ? Number(process.env.PORT) : 8080;
    let server = app.listen(listenPort, () => console.log('Server running on port ' + listenPort));
    process.on('SIGINT', () => {
        console.log('SIGINT signal received. Closing server...');
        closeImageWorkers();
        server.close();
    });
}