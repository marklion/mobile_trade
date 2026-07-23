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

function parseByte(value, name) {
  if (value === null || value === undefined || value === '') {
    throw new TypeError(`请配置 ${name}`);
  }
  const n = typeof value === 'string' ? Number.parseInt(value, 0) : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new TypeError(`${name} 必须是 0~255 的字节值，当前: ${value}`);
  }
  return n;
}

class OutputHelper {
  _weight = 0;
  _port = null;
  _buf = [];
  _parse = null;
  _frameSize = 0;
  _frameHead = 0;
  _frameTail = 0;
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

  async apply(serial, script, baudRate = 9600, frameSize = 0, frameHead = 0x02, frameTail = 0x03) {
    this._parse = compileScript(script);
    this._frameSize = Math.max(0, Number(frameSize) || 0);
    this._frameHead = parseByte(frameHead, 'frameHead');
    this._frameTail = parseByte(frameTail, 'frameTail');
    this._buf = [];
    this._opened = false;
    this._gotData = false;

    if (this._frameSize < 2) {
      throw new TypeError('frameSize 至少为 2（需容纳帧头和帧尾）');
    }

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

  _formatChunk(chunk) {
    return Array.from(chunk, (b) => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
  }

  _appendChunk(chunk) {
    this._gotData = true;
    for (const b of chunk) {
      this._buf.push(b);
    }
    if (this._buf.length > BUF_MAX) {
      console.log('[OutputHelper] buffer 溢出，丢弃:', this._formatChunk(this._buf));
      this._buf = [];
    }
  }

  _tryParse(bytes) {
    try {
      return toFiniteNumber(this._parse(bytes));
    } catch {
      return null;
    }
  }

  _matchFrame(frame) {
    return frame.length === this._frameSize
      && frame[0] === this._frameHead
      && frame[this._frameSize - 1] === this._frameTail;
  }

 
  _processBuffer() {
    const need = this._frameSize;
    while (this._buf.length >= need) {
      const frame = this._buf.slice(0, need);
      if (!this._matchFrame(frame)) {
        console.log('[OutputHelper] 帧校验失败，丢弃 buffer:', this._formatChunk(this._buf));
        this._buf = [];
        return;
      }
      const result = this._tryParse(frame);
      if (result === null) {
        console.log('[OutputHelper] 脚本解析失败，丢弃 buffer:', this._formatChunk(this._buf));
        this._buf = [];
        return;
      }
      this._weight = result;
      this._buf.splice(0, need);
    }
  }

  _onData(chunk) {
    this._appendChunk(chunk);
    this._processBuffer();
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
  await helper.apply(
    config.serial,
    config.script,
    config.baudRate,
    config.frameSize,
    config.frameHead,
    config.frameTail,
  );

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
