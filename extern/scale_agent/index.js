const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const { SerialPort } = require('serialport');

const PORT = 39109;
const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = process.env.SCALE_AGENT_CONFIG || path.join(APP_DIR, 'scale_agent.config.json');

/** 仅允许函数表达式 / 箭头函数，防止配置脚本注入任意语句。 */
const SCRIPT_PATTERN =
  /^\s*(?:function\s*\([^)]*\)\s*\{[\s\S]*\}|(?:\([^)]*\)|[\w$]+)\s*=>[\s\S]+)\s*$/;

/**
 * 打开串口，按脚本处理字节数组，结果供 scale() 返回。
 * 配置示例：
 *   { "serial": "COM1", "baudRate": 9600, "script": "function (array) { return array[0] + array[1]; }" }
 */
class OutputHelper {
  _weight = 0;
  _port = null;
  _parse = null;

  scale() {
    return this._weight;
  }

  async apply(serial, script, baudRate = 9600) {
    const text = String(script || '').trim();
    if (!SCRIPT_PATTERN.test(text)) {
      throw new TypeError(
        'script 必须是函数，例如: function (array) { return array[0] + array[1]; }',
      );
    }
    let fn;
    try {
      fn = vm.runInNewContext(`(${text})`, Object.create(null), {
        timeout: 1000,
        displayErrors: true,
      });
    } catch (err) {
      throw new TypeError(`script 无法解析为函数: ${err.message}`);
    }
    if (typeof fn !== 'function') {
      throw new TypeError('script 必须是函数，例如: function (array) { return array[0] + array[1]; }');
    }
    this._parse = fn;

    if (this._port) {
      await new Promise((resolve) => this._port.close(() => resolve()));
      this._port = null;
    }

    const pathName = String(serial || '').trim();
    if (!pathName) {
      console.log('[OutputHelper] 串口为空，仅提供 HTTP 服务');
      return;
    }

    this._port = new SerialPort({
      path: pathName,
      baudRate: Number(baudRate) || 9600,
      autoOpen: false,
    });
    this._port.on('error', (err) => console.error('[OutputHelper] 串口错误:', err.message));
    this._port.on('data', (chunk) => this._onData(chunk));
    await new Promise((resolve, reject) => {
      this._port.open((err) => (err ? reject(err) : resolve()));
    });
    console.log('[OutputHelper] 串口已打开');
  }

  _onData(chunk) {
    try {
      const array = Array.from(chunk);
      const value = this._parse(array);
      if (value === null || value === undefined) {
        return;
      }
      const n = Number(value);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        this._weight = n;
      }
    } catch (err) {
      console.error('[OutputHelper] 脚本执行失败:', err.message);
    }
  }

  async close() {
    if (!this._port) {
      return;
    }
    await new Promise((resolve) => this._port.close(() => resolve()));
    this._port = null;
  }
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`配置文件不存在: ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

async function main() {
  const config = loadConfig();
  const helper = new OutputHelper();
  await helper.apply(config.serial, config.script, config.baudRate);

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'GET' && req.url === '/scale') {
      const body = JSON.stringify({ scale: helper.scale() });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ err: 'not found' }));
  });

  server.listen(PORT, () => {
    console.log(`scale_agent 已启动: http://localhost:${PORT}/scale`);
    console.log(`配置文件: ${CONFIG_PATH}`);
  });

  const shutdown = async () => {
    await helper.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('scale_agent 启动失败:', err.message);
  process.exit(1);
});
