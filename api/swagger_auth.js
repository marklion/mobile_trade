const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const db_opt = require('./db_opt');
const rbac_lib = require('./lib/rbac_lib');

const COOKIE_NAME = 'swagger_admin_token';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function getSwaggerStaticPath() {
    const candidates = [
        path.join(__dirname, 'swagger-ui-dist'),
        path.join(__dirname, 'node_modules/swagger-ui-dist'),
    ];
    try {
        candidates.push(require('swagger-ui-dist/absolute-path')());
    } catch (e) {
        // ignore
    }
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, 'swagger-ui-bundle.js'))) {
            return candidate;
        }
    }
    throw new Error('swagger-ui-dist not found, run npm install in api/');
}

function isSwaggerStaticAsset(req) {
    const url_path = (req.url || '').split('?')[0];
    if (url_path.endsWith('/swagger-ui-init.js')) {
        return false;
    }
    return /\.(?:css|js|png|map|html|txt)$/i.test(url_path);
}

function parseCookie(req, name) {
    const header = req.headers.cookie || '';
    const parts = header.split(';');
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith(name + '=')) {
            return decodeURIComponent(trimmed.slice(name.length + 1));
        }
    }
    return '';
}

function getLoginHtml(error_msg = '') {
    const error_block = error_msg
        ? `<p style="color:#c0392b;margin:0 0 12px;">${error_msg}</p>`
        : '';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>接口文档登录</title>
    <style>
        body { font-family: sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        form { background: #fff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.08); width: 320px; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        p.desc { color: #666; font-size: 14px; margin: 0 0 20px; }
        label { display: block; margin-bottom: 6px; font-size: 14px; }
        input { width: 100%; box-sizing: border-box; padding: 8px 10px; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 4px; }
        button { width: 100%; padding: 10px; border: 0; border-radius: 4px; background: #1677ff; color: #fff; font-size: 15px; cursor: pointer; }
    </style>
</head>
<body>
    <form method="post" action="/api/swagger/login">
        <h1>接口文档登录</h1>
        <p class="desc">使用系统账号登录后可调试接口</p>
        ${error_block}
        <label for="phone">手机号</label>
        <input id="phone" name="phone" type="text" autocomplete="username" required>
        <label for="password">密码</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button type="submit">登录</button>
    </form>
</body>
</html>`;
}

async function verifySwaggerCredentials(phone, password) {
    const sq = db_opt.get_sq();
    const user = await sq.models.rbac_user.findOne({
        where: {
            [db_opt.Op.and]: [
                { phone: phone },
                { password: password },
            ],
        },
    });
    if (user || password === process.env.DEFAULT_PWD) {
        return rbac_lib.user_login(phone);
    }
    return '';
}

async function isSwaggerTokenValid(token) {
    if (!token) {
        return false;
    }
    const user = await rbac_lib.get_user_by_token(token);
    return !!user;
}

async function requireSwaggerAdmin(req, res, next) {
    if (isSwaggerStaticAsset(req)) {
        return next();
    }
    const token = parseCookie(req, COOKIE_NAME);
    if (await isSwaggerTokenValid(token)) {
        req.swagger_admin_token = token;
        return next();
    }
    if (req.method === 'GET') {
        return res.status(401).send(getLoginHtml());
    }
    return res.status(401).send('需要登录');
}

function getCookieOptions() {
    return {
        httpOnly: true,
        path: '/api',
        sameSite: 'lax',
    };
}

async function handleSwaggerLogin(req, res) {
    const phone = (req.body.phone || '').trim();
    const password = req.body.password || '';
    const token = await verifySwaggerCredentials(phone, password);
    if (!token) {
        return res.status(401).send(getLoginHtml('账号或密码错误'));
    }
    res.cookie(COOKIE_NAME, token, {
        ...getCookieOptions(),
        maxAge: COOKIE_MAX_AGE_MS,
    });
    return res.redirect(302, '/api/swagger/');
}

function handleSwaggerLogout(req, res) {
    res.clearCookie(COOKIE_NAME, getCookieOptions());
    return res.redirect(302, '/api/swagger/');
}

function buildInitScript(user_token) {
    const token_json = JSON.stringify(user_token);
    return `
window.onload = function() {
  var swaggerOptions = {
    url: '/api/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout",
    requestInterceptor: function(request) {
      request.headers = request.headers || {};
      request.headers.token = ${token_json};
      return request;
    }
  };
  var ui = SwaggerUIBundle(swaggerOptions);
  ui.preauthorizeApiKey('token', ${token_json});
  window.ui = ui;

  var logoutBar = document.createElement('div');
  logoutBar.style.cssText = 'position:fixed;top:10px;right:20px;z-index:9999;';
  var logoutLink = document.createElement('a');
  logoutLink.href = '/api/swagger/logout';
  logoutLink.textContent = '退出登录';
  logoutLink.style.cssText = 'padding:6px 14px;background:#fff;border:1px solid #ddd;border-radius:4px;color:#333;text-decoration:none;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;';
  logoutLink.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = '/api/swagger/logout?_=' + Date.now();
  });
  logoutBar.appendChild(logoutLink);
  document.body.appendChild(logoutBar);
};`;
}

function serveDynamicInit(req, res, next) {
    const path = (req.url || '').split('?')[0];
    if (path.endsWith('/swagger-ui-init.js')) {
        res.set('Content-Type', 'application/javascript');
        return res.send(buildInitScript(req.swagger_admin_token));
    }
    return next();
}

function serveSwaggerAssets() {
    const staticPath = getSwaggerStaticPath();
    return express.static(staticPath, { index: false });
}

function buildSwaggerUiOptions() {
    return {
        customSiteTitle: '掌易助理接口调试web',
        swaggerOptions: {
            url: '/api/openapi.json',
        },
    };
}

function setupSwaggerUi(swaggerUi) {
    return (req, res, next) => {
        const trimmed = (req.url || '').split('?')[0];
        if (trimmed !== '/' && trimmed !== '') {
            return next();
        }
        return swaggerUi.setup(null, buildSwaggerUiOptions())(req, res, next);
    };
}

module.exports = {
    requireSwaggerAdmin,
    handleSwaggerLogin,
    handleSwaggerLogout,
    serveDynamicInit,
    serveSwaggerAssets,
    setupSwaggerUi,
};
