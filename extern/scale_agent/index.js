const fs = require('fs');
const path = require('path');
const http = require('http');
const { SerialPort } = require('serialport');

const PORT = 39109;
const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = process.env.SCALE_AGENT_CONFIG || path.join(APP_DIR, 'scale_agent.config.json');
const SCRIPT_MAX_LEN = 8192;
const BUF_MAX = 4096;

/**
 * 编译配置里的解析函数（本地可信配置）。
 * 无法解析时请返回 null；若仍返回 0，必须配置 frameSize，否则半包会把读数盖成 0。
 */
function compileScript(script) {
  const text = String(script || '').trim();
  if (!text || text.length > SCRIPT_MAX_LEN) {
    throw new TypeError('script 无效或过长');
  }
  const fn = new Function(`"use strict"; return (${text});`)();
  if (typeof fn !== 'function') {
    throw new TypeError('script 必须是函数');
  }
  return fn;
}

class OutputHelper {
  _weight = 0;
  _port = null;
  _buf = [];
  _parse = null;
  _frameSize = 0;
  _opened = false;
  _gotData = false;

  scale() {
    return this._weight;
  }

  status() {
    return {
      scale: this._weight,
      opened: this._opened,
      gotData: this._gotData,
      buf: this._buf.length,
    };
  }

  async apply(serial, script, baudRate = 9600, frameSize = 0) {
    this._parse = compileScript(script);
    this._frameSize = Number(frameSize) > 0 ? Number(frameSize) : 0;
    this._buf = [];
    this._opened = false;
    this._gotData = false;

    if (this._port) {
      await new Promise((resolve) => this._port.close(() => resolve()));
      this._port = null;
    }

    const pathName = String(serial || '').trim();
    if (!pathName) {
      console.log('[OutputHelper] 串口为空，仅提供 HTTP 服务');
      return;
    }

    const port = new SerialPort({
      path: pathName,
      baudRate: Number(baudRate) || 9600,
      autoOpen: false,
    });
    port.on('error', () => console.error('[OutputHelper] 串口错误'));
    port.on('data', (chunk) => this._onData(chunk));
    try {
      await new Promise((resolve, reject) => {
        port.open((err) => (err ? reject(err) : resolve()));
      });
      this._port = port;
      this._opened = true;
      console.log('[OutputHelper] 串口已打开');
    } catch {
      port.removeAllListeners();
      try {
        port.close(() => {});
      } catch {
        // ignore
      }
      this._port = null;
      this._opened = false;
      console.error('[OutputHelper] 串口打开失败，仅提供 HTTP 服务');
    }
  }

  _applyValue(value) {
    if (value === null || value === undefined) {
      return false;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return false;
    }
    this._weight = n;
    return true;
  }

  _onData(chunk) {
    this._gotData = true;
    for (const b of chunk) {
      this._buf.push(b);
    }
    if (this._buf.length > BUF_MAX) {
      this._buf.splice(0, this._buf.length - 512);
    }

    if (this._frameSize > 0) {
      // 定长帧：兼容「长度不对就返回 0」的现场脚本
      while (this._buf.length >= this._frameSize) {
        const frame = this._buf.slice(0, this._frameSize);
        let value;
        try {
          value = this._parse(frame);
        } catch {
          this._buf.shift();
          continue;
        }
        if (value === null || value === undefined) {
          this._buf.shift();
          continue;
        }
        const n = Number(value);
        if (!Number.isFinite(n)) {
          this._buf.shift();
          continue;
        }
        this._weight = n;
        this._buf.splice(0, this._frameSize);
      }
      return;
    }

    // 未配置 frameSize：从长到短试前缀；0 不作为“解析成功”（避免半包盖成 0）
    let progressed = true;
    while (progressed && this._buf.length > 0) {
      progressed = false;
      for (let len = this._buf.length; len >= 1; len -= 1) {
        let value;
        try {
          value = this._parse(this._buf.slice(0, len));
        } catch {
          continue;
        }
        if (value === null || value === undefined) {
          continue;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n === 0) {
          continue;
        }
        this._weight = n;
        this._buf.splice(0, len);
        progressed = true;
        break;
      }
      if (!progressed && this._buf.length >= 256) {
        this._buf.shift();
        progressed = true;
      }
    }
  }

  async close() {
    if (!this._port) {
      return;
    }
    await new Promise((resolve) => this._port.close(() => resolve()));
    this._port = null;
    this._opened = false;
  }
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('配置文件不存在');
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

async function main() {
  const config = loadConfig();
  const helper = new OutputHelper();
  await helper.apply(config.serial, config.script, config.baudRate, config.frameSize);

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'GET' && req.url === '/scale') {
      const body = JSON.stringify(helper.status());
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
  });

  const shutdown = async () => {
    await helper.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('scale_agent 启动失败:', err && err.message ? err.message : err);
  process.exit(1);
});
