const fs = require('fs');
const path = require('path');
const http = require('http');
const { SerialPort } = require('serialport');

const PORT = 39109;
const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = process.env.SCALE_AGENT_CONFIG || path.join(APP_DIR, 'scale_agent.config.json');
const SCRIPT_MAX_LEN = 2048;

function extractExpression(script) {
  const text = String(script || '').trim();
  if (!text || text.length > SCRIPT_MAX_LEN) {
    throw new TypeError('script 无效或过长');
  }

  if (text.startsWith('function')) {
    const marker = 'return ';
    const idx = text.indexOf(marker);
    if (idx < 0) {
      throw new TypeError('script 函数体必须包含 return 表达式');
    }
    let expr = text.slice(idx + marker.length).trim();
    if (expr.endsWith('}')) {
      expr = expr.slice(0, -1).trim();
    }
    if (expr.endsWith(';')) {
      expr = expr.slice(0, -1).trim();
    }
    return expr;
  }

  const arrow = text.indexOf('=>');
  if (arrow >= 0) {
    let expr = text.slice(arrow + 2).trim();
    if (expr.startsWith('{')) {
      const marker = 'return ';
      const idx = expr.indexOf(marker);
      if (idx < 0) {
        throw new TypeError('script 箭头函数体必须包含 return 表达式');
      }
      expr = expr.slice(idx + marker.length).trim();
      if (expr.endsWith('}')) {
        expr = expr.slice(0, -1).trim();
      }
      if (expr.endsWith(';')) {
        expr = expr.slice(0, -1).trim();
      }
    }
    return expr;
  }

  return text;
}

/** 仅允许 array[下标] 与四则 / 位运算，拒绝任意代码执行。 */
function compileExpression(expr) {
  const source = String(expr || '').trim();
  if (!source) {
    throw new TypeError('script 表达式为空');
  }

  let i = 0;
  const peek = () => source[i];
  const next = () => source[i++];

  function skipWs() {
    while (i < source.length && source[i] <= ' ') {
      i += 1;
    }
  }

  function parsePrimary() {
    skipWs();
    if (i >= source.length) {
      throw new TypeError('script 表达式不完整');
    }

    if (peek() === '(') {
      next();
      const value = parseBitwiseOr();
      skipWs();
      if (peek() !== ')') {
        throw new TypeError('script 缺少右括号');
      }
      next();
      return value;
    }

    if (source.startsWith('array[', i)) {
      i += 'array['.length;
      skipWs();
      let num = '';
      while (i < source.length && source[i] >= '0' && source[i] <= '9') {
        num += next();
      }
      skipWs();
      if (!num || peek() !== ']') {
        throw new TypeError('script 仅支持 array[非负整数]');
      }
      next();
      const index = Number(num);
      return (array) => array[index];
    }

    if ((peek() >= '0' && peek() <= '9') || peek() === '.') {
      let num = '';
      while (i < source.length && ((source[i] >= '0' && source[i] <= '9') || source[i] === '.')) {
        num += next();
      }
      const literal = Number(num);
      if (Number.isNaN(literal)) {
        throw new TypeError('script 数字字面量无效');
      }
      return () => literal;
    }

    if (peek() === '+' || peek() === '-' || peek() === '~') {
      const op = next();
      const inner = parsePrimary();
      return (array) => {
        const v = inner(array);
        if (op === '+') return +v;
        if (op === '-') return -v;
        return ~v;
      };
    }

    throw new TypeError(`script 含有不允许的内容: ${source.slice(i, i + 16)}`);
  }

  function parseMulDiv() {
    let left = parsePrimary();
    for (;;) {
      skipWs();
      const op = peek();
      if (op !== '*' && op !== '/' && op !== '%') {
        return left;
      }
      next();
      const right = parsePrimary();
      const prev = left;
      left = (array) => {
        const a = prev(array);
        const b = right(array);
        if (op === '*') return a * b;
        if (op === '/') return a / b;
        return a % b;
      };
    }
  }

  function parseAddSub() {
    let left = parseMulDiv();
    for (;;) {
      skipWs();
      const op = peek();
      if (op !== '+' && op !== '-') {
        return left;
      }
      next();
      const right = parseMulDiv();
      const prev = left;
      left = (array) => {
        const a = prev(array);
        const b = right(array);
        return op === '+' ? a + b : a - b;
      };
    }
  }

  function parseShift() {
    let left = parseAddSub();
    for (;;) {
      skipWs();
      if (source.startsWith('<<', i)) {
        i += 2;
        const right = parseAddSub();
        const prev = left;
        left = (array) => prev(array) << right(array);
      } else if (source.startsWith('>>>', i)) {
        i += 3;
        const right = parseAddSub();
        const prev = left;
        left = (array) => prev(array) >>> right(array);
      } else if (source.startsWith('>>', i)) {
        i += 2;
        const right = parseAddSub();
        const prev = left;
        left = (array) => prev(array) >> right(array);
      } else {
        return left;
      }
    }
  }

  function parseBitwiseAnd() {
    let left = parseShift();
    for (;;) {
      skipWs();
      if (peek() !== '&' || source.startsWith('&&', i)) {
        return left;
      }
      next();
      const right = parseShift();
      const prev = left;
      left = (array) => prev(array) & right(array);
    }
  }

  function parseBitwiseXor() {
    let left = parseBitwiseAnd();
    for (;;) {
      skipWs();
      if (peek() !== '^') {
        return left;
      }
      next();
      const right = parseBitwiseAnd();
      const prev = left;
      left = (array) => prev(array) ^ right(array);
    }
  }

  function parseBitwiseOr() {
    let left = parseBitwiseXor();
    for (;;) {
      skipWs();
      if (peek() !== '|' || source.startsWith('||', i)) {
        return left;
      }
      next();
      const right = parseBitwiseXor();
      const prev = left;
      left = (array) => prev(array) | right(array);
    }
  }

  const compiled = parseBitwiseOr();
  skipWs();
  if (i !== source.length) {
    throw new TypeError(`script 含有不允许的内容: ${source.slice(i, i + 16)}`);
  }
  return compiled;
}

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
    this._parse = compileExpression(extractExpression(script));

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
    this._port.on('error', (err) => console.error('[OutputHelper] 串口错误'));
    this._port.on('data', (chunk) => this._onData(chunk));
    await new Promise((resolve, reject) => {
      this._port.open((err) => {
        if (err) {
          // 避免把设备路径等敏感信息写入日志
          reject(new Error('串口打开失败'));
          return;
        }
        resolve();
      });
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
    } catch {
      console.error('[OutputHelper] 脚本执行失败');
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
    throw new Error('配置文件不存在');
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
  });

  const shutdown = async () => {
    await helper.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(() => {
  console.error('scale_agent 启动失败');
  process.exit(1);
});
