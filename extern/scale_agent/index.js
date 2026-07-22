const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const { SerialPort } = require('serialport');

const PORT = 39109;
const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = process.env.SCALE_AGENT_CONFIG || path.join(APP_DIR, 'scale_agent.config.json');
const SCRIPT_MAX_LEN = 8192;
const BUF_MAX = 4096;


function compileScript(script) {
  const text = String(script || '').trim();
  if (!text || text.length > SCRIPT_MAX_LEN) {
    throw new TypeError('script 无效或过长');
  }
  if (!text.startsWith('function') && !text.includes('=>')) {
    throw new TypeError('script 必须是函数');
  }
  let fn;
  try {
    fn = vm.runInNewContext(`(${text})`, Object.create(null), {
      timeout: 1000,
      displayErrors: true,
    }); // NOSONAR
  } catch (err) {
    throw new TypeError(`script 无法解析: ${err?.message ?? err}`);
  }
  if (typeof fn !== 'function') {
    throw new TypeError('script 必须是函数');
  }
  return fn;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    this._frameSize = Math.max(0, Number(frameSize) || 0);
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

    await this._openPort(pathName, baudRate);
  }

  async _openPort(pathName, baudRate) {
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

  _appendChunk(chunk) {
    this._gotData = true;
    for (const b of chunk) {
      this._buf.push(b);
    }
    if (this._buf.length > BUF_MAX) {
      this._buf.splice(0, this._buf.length - 512);
    }
  }

  _tryParse(bytes) {
    try {
      return toFiniteNumber(this._parse(bytes));
    } catch {
      return null;
    }
  }

  _drainFixedFrames() {
    while (this._buf.length >= this._frameSize) {
      const frame = this._buf.slice(0, this._frameSize);
      const n = this._tryParse(frame);
      if (n === null) {
        this._buf.shift();
        continue;
      }
      this._weight = n;
      this._buf.splice(0, this._frameSize);
    }
  }

  _drainVariableFrames() {
    let progressed = true;
    while (progressed && this._buf.length > 0) {
      progressed = false;
      for (let len = this._buf.length; len >= 1; len -= 1) {
        const n = this._tryParse(this._buf.slice(0, len));
        if (n === null || n === 0) {
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

  _onData(chunk) {
    this._appendChunk(chunk);
    if (this._frameSize > 0) {
      this._drainFixedFrames();
      return;
    }
    this._drainVariableFrames();
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

function createServer(helper) {
  return http.createServer((req, res) => {
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
}

async function main() {
  const config = loadConfig();
  const helper = new OutputHelper();
  await helper.apply(config.serial, config.script, config.baudRate, config.frameSize);

  const server = createServer(helper);
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
  console.error('scale_agent 启动失败:', err?.message ?? err);
  process.exit(1);
});
