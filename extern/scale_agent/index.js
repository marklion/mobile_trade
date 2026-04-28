const fs = require('fs');
const path = require('path');
const http = require('http');
const readline = require('readline');
const yaml = require('js-yaml');
const { SerialPort } = require('serialport');

const PORT = 39109;
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'scale_agent.config.json');
const SCRIPT_MAX_LENGTH = 8000;
const FRAME_START = 0x02;
const FRAME_END_A = 0x03;
const FRAME_END_B = 0x0d;

function safeNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return 0;
  }
  return n;
}

function normalizeScriptText(scriptText) {
  const raw = String(scriptText || '').trim();
  if (!raw) {
    return '';
  }
  return raw.replace(
    /^function\s*\(([^)]*)\)\s*:\s*Number\s*\{/,
    'function ($1) {'
  );
}

function compileScaleScript(scriptText) {
  const normalized = normalizeScriptText(scriptText);
  if (!normalized) {
    throw new Error('脚本不能为空');
  }
  if (normalized.length > SCRIPT_MAX_LENGTH) {
    throw new Error(`脚本长度不能超过 ${SCRIPT_MAX_LENGTH} 个字符`);
  }
  let scriptFn;
  try {
    scriptFn = (new Function(`return (${normalized});`))();
  } catch (error) {
    throw new Error(`脚本编译失败: ${error.message}`);
  }
  if (typeof scriptFn !== 'function') {
    throw new Error('脚本必须是函数，例如: function (frameArray, helpers) { return 0; }');
  }
  return {
    source: normalized,
    run(frameArray, helpers) {
      const ret = scriptFn(Array.from(frameArray || []), helpers);
      if (ret === null || ret === undefined) {
        return null;
      }
      const value = Number(ret);
      if (Number.isNaN(value) || !Number.isFinite(value)) {
        throw new Error('脚本返回值必须是数字、null 或 undefined');
      }
      return value;
    },
  };
}

function normalizeByte(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    const intValue = Math.floor(value);
    if (intValue < 0 || intValue > 255) {
      throw new Error(`${fieldName} 必须在 0~255`);
    }
    return intValue;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  let parsed = NaN;
  if (text.toLowerCase().startsWith('0x')) {
    parsed = parseInt(text, 16);
  } else if (/^[0-9a-fA-F]{2}$/.test(text)) {
    parsed = parseInt(text, 16);
  } else if (/^\d+$/.test(text)) {
    parsed = parseInt(text, 10);
  }
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
    throw new Error(`${fieldName} 格式错误: ${value}`);
  }
  return parsed;
}

function normalizeByteList(values, fieldName) {
  if (values === undefined || values === null) {
    return [];
  }
  if (!Array.isArray(values)) {
    throw new Error(`${fieldName} 必须是数组`);
  }
  return values
    .map((value) => normalizeByte(value, fieldName))
    .filter((value) => value !== null);
}

function normalizeFrameParsers(frameParsers) {
  const source = Array.isArray(frameParsers) && frameParsers.length > 0
    ? frameParsers
    : [];
  return source.map((item, idx) => {
    const parser = item || {};
    const parserType = String(parser.parserType || '').trim();
    if (!parserType) {
      throw new Error(`frameParsers[${idx}] 缺少 parserType`);
    }
    const name = String(parser.name || `${parserType}_${idx + 1}`).trim();
    const options = parser.options && typeof parser.options === 'object'
      ? parser.options
      : {};
    const normalized = {
      name,
      enabled: parser.enabled !== false,
      parserType,
      startByte: normalizeByte(parser.startByte, `frameParsers[${idx}].startByte`),
      endByte: normalizeByte(parser.endByte, `frameParsers[${idx}].endByte`),
      secondByteIn: normalizeByteList(parser.secondByteIn, `frameParsers[${idx}].secondByteIn`),
      minLength: Math.max(0, Math.floor(safeNumber(parser.minLength || 0))),
      maxLength: Math.max(0, Math.floor(safeNumber(parser.maxLength || 0))),
      divisor: safeNumber(parser.divisor || 1) || 1,
      options,
    };
    if (normalized.maxLength > 0 && normalized.maxLength < normalized.minLength) {
      throw new Error(`frameParsers[${idx}] maxLength 不能小于 minLength`);
    }
    return normalized;
  });
}

function frameMatchesParser(frame, parser) {
  if (!Array.isArray(frame) || frame.length < 2 || !parser.enabled) {
    return false;
  }
  if (parser.startByte !== null && frame[0] !== parser.startByte) {
    return false;
  }
  if (parser.endByte !== null && frame[frame.length - 1] !== parser.endByte) {
    return false;
  }
  if (parser.minLength > 0 && frame.length < parser.minLength) {
    return false;
  }
  if (parser.maxLength > 0 && frame.length > parser.maxLength) {
    return false;
  }
  if (parser.secondByteIn.length > 0 && !parser.secondByteIn.includes(frame[1])) {
    return false;
  }
  const acceptableLengths = Array.isArray(parser.options.acceptableLengths)
    ? parser.options.acceptableLengths.map((v) => Math.floor(safeNumber(v))).filter((v) => v > 0)
    : [];
  if (acceptableLengths.length > 0 && !acceptableLengths.includes(frame.length)) {
    return false;
  }
  return true;
}

function parseBySignedTailDigits(frame, parser) {
  const options = parser.options || {};
  const digitStartIndex = Math.max(0, Math.floor(safeNumber(options.digitStartIndex || 2)));
  const digitEndOffset = Math.max(0, Math.floor(safeNumber(options.digitEndOffset || 1)));
  const tailDigits = Math.max(1, Math.floor(safeNumber(options.tailDigits || 6)));
  const negativeSecondBytes = normalizeByteList(
    options.negativeSecondBytes || [0x2d],
    `${parser.name}.options.negativeSecondBytes`
  );
  const digitEndExclusive = Math.max(digitStartIndex, frame.length - digitEndOffset);
  const digits = [];
  for (let i = digitStartIndex; i < digitEndExclusive; i += 1) {
    const ch = frame[i];
    if (ch >= 0x30 && ch <= 0x39) {
      digits.push(ch - 0x30);
    }
  }
  if (digits.length === 0) {
    return null;
  }
  const tail = digits.slice(-tailDigits);
  let value = 0;
  for (let i = 0; i < tail.length; i += 1) {
    value = value * 10 + tail[i];
  }
  if (negativeSecondBytes.includes(frame[1])) {
    value = -value;
  }
  return safeNumber(value / parser.divisor);
}

function parseByTldStyle(frame, parser) {
  const options = parser.options || {};
  const dotMask = Math.max(0, Math.floor(safeNumber(options.dotMask || 0x07)));
  const baseExponent = Math.floor(safeNumber(options.baseExponent || 2));
  const digitStartIndex = Math.max(0, Math.floor(safeNumber(options.digitStartIndex || 4)));
  const digitCount = Math.max(1, Math.floor(safeNumber(options.digitCount || 6)));
  if (frame.length <= digitStartIndex) {
    return null;
  }
  let powNumber = baseExponent - (frame[1] & dotMask);
  if (powNumber > 0) {
    powNumber = 0;
  }
  let rawValue = 0;
  for (let i = 0; i < digitCount; i += 1) {
    const byteValue = frame[digitStartIndex + i];
    const digit = byteValue >= 0x30 && byteValue <= 0x39 ? byteValue - 0x30 : 0;
    rawValue += digit * Math.pow(10, digitCount - 1 + powNumber - i);
  }
  return safeNumber(rawValue / parser.divisor);
}

function parseFrameByConfig(frame, frameParsers) {
  for (let i = 0; i < frameParsers.length; i += 1) {
    const parser = frameParsers[i];
    if (!frameMatchesParser(frame, parser)) {
      continue;
    }
    if (parser.parserType === 'signedTailDigits') {
      const value = parseBySignedTailDigits(frame, parser);
      if (value !== null) {
        return value;
      }
      continue;
    }
    if (parser.parserType === 'tldStyle') {
      const value = parseByTldStyle(frame, parser);
      if (value !== null) {
        return value;
      }
      continue;
    }
  }
  return null;
}

function getDefaultConfig() {
  return {
    serial: '',
    baudRate: 9600,
    script: '',
    frameParsers: [],
  };
}

function parseJsonConfigWithComments(text) {
  const raw = String(text || '');
  const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(withoutLineComments);
}

class OutputHelper {
  constructor() {
    const defaults = getDefaultConfig();
    this.serialName = '';
    this.baudRate = 9600;
    this.scriptText = defaults.script;
    this.compiledScript = null;
    this.frameParsers = normalizeFrameParsers(defaults.frameParsers);
    this.scaleValue = 0;
    this.lastBytes = [];
    this.serialPort = null;
    this.serialBuffer = Buffer.alloc(0);
  }

  scale() {
    return safeNumber(this.scaleValue);
  }

  getState() {
    return {
      serial: this.serialName,
      baudRate: this.baudRate,
      script: this.scriptText,
      frameParsers: this.frameParsers,
      currentScale: this.scale(),
      lastBytes: this.lastBytes,
    };
  }

  async applyConfig({ serial, baudRate, script, frameParsers }) {
    if (baudRate !== undefined) {
      const parsedBaudRate = Math.floor(safeNumber(baudRate));
      if (parsedBaudRate <= 0) {
        throw new Error('波特率必须是正整数');
      }
      this.baudRate = parsedBaudRate;
    }
    if (frameParsers !== undefined) {
      this.frameParsers = normalizeFrameParsers(frameParsers);
    }
    if (script !== undefined) {
      this.compiledScript = compileScaleScript(script);
      this.scriptText = normalizeScriptText(script);
    }
    if (!this.compiledScript) {
      throw new Error('脚本不能为空');
    }
    if (serial !== undefined) {
      this.serialName = String(serial || '').trim();
      await this.reopenSerial();
    }
  }

  async reopenSerial() {
    this.serialBuffer = Buffer.alloc(0);
    if (this.serialPort) {
      await new Promise((resolve) => {
        this.serialPort.close(() => resolve());
      });
      this.serialPort = null;
    }
    if (!this.serialName) {
      console.log('[output_helper] 串口为空，等待配置...');
      return;
    }

    this.serialPort = new SerialPort({
      path: this.serialName,
      baudRate: this.baudRate,
      autoOpen: false,
    });

    this.serialPort.on('error', (err) => {
      console.error('[output_helper] 串口错误:', err.message);
    });

    this.serialPort.on('data', (chunk) => {
      this.handleData(chunk);
    });

    await new Promise((resolve, reject) => {
      this.serialPort.open((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    console.log(`[output_helper] 串口已打开: ${this.serialName}, 波特率: ${this.baudRate}`);
  }

  handleData(chunk) {
    this.serialBuffer = Buffer.concat([this.serialBuffer, chunk]);
    if (this.serialBuffer.length > 4096) {
      this.serialBuffer = this.serialBuffer.slice(-4096);
    }

    while (this.serialBuffer.length > 0) {
      const stxPos = this.serialBuffer.indexOf(FRAME_START);
      if (stxPos < 0) {
        this.serialBuffer = Buffer.alloc(0);
        break;
      }
      if (stxPos > 0) {
        this.serialBuffer = this.serialBuffer.slice(stxPos);
      }

      const etxPos = this.serialBuffer.indexOf(FRAME_END_A, 1);
      const crPos = this.serialBuffer.indexOf(FRAME_END_B, 1);
      let endPos = -1;
      if (etxPos >= 0 && crPos >= 0) {
        endPos = Math.min(etxPos, crPos);
      } else if (etxPos >= 0) {
        endPos = etxPos;
      } else if (crPos >= 0) {
        endPos = crPos;
      }
      if (endPos < 0) {
        break;
      }

      const frame = this.serialBuffer.slice(0, endPos + 1);
      this.serialBuffer = this.serialBuffer.slice(endPos + 1);
      const frameArray = Array.from(frame);
      this.lastBytes = frameArray;

      try {
        const parsedValue = this.compiledScript.run(frameArray, {
          parseFrameByConfig,
          frameParsers: this.frameParsers,
        });
        if (parsedValue !== null && parsedValue !== undefined) {
          this.scaleValue = safeNumber(parsedValue);
        } else {
          console.warn('[output_helper] 脚本未返回有效重量:', frameArray);
        }
      } catch (err) {
        console.error('[output_helper] 脚本执行失败:', err.message);
      }
    }
  }
}

function loadConfig(configPath) {
  const defaults = getDefaultConfig();
  if (!fs.existsSync(configPath)) {
    return defaults;
  }
  const text = fs.readFileSync(configPath, 'utf8');
  const ext = path.extname(configPath).toLowerCase();
  let loaded = {};
  if (ext === '.yml' || ext === '.yaml') {
    loaded = yaml.load(text) || {};
  } else {
    loaded = parseJsonConfigWithComments(text);
  }
  return {
    ...defaults,
    ...loaded,
    frameParsers: Array.isArray(loaded.frameParsers) && loaded.frameParsers.length > 0
      ? loaded.frameParsers
      : defaults.frameParsers,
  };
}

function saveConfig(configPath, data) {
  const ext = path.extname(configPath).toLowerCase();
  if (ext === '.yml' || ext === '.yaml') {
    fs.writeFileSync(configPath, yaml.dump(data), 'utf8');
    return;
  }
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
}

function createServer(output_helper) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'GET' && req.url === '/scale') {
      const body = JSON.stringify({ scale: output_helper.scale() });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('ok');
      return;
    }
    res.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(JSON.stringify({ err: 'not found' }));
  });
  return server;
}

function printHelp() {
  console.log('');
  console.log('命令说明:');
  console.log('  serial <串口名>          例如: serial COM1');
  console.log('  baud <波特率>            例如: baud 9600');
  console.log('  script <解析脚本>        例如: script function (frameArray, helpers) { return helpers.parseFrameByConfig(frameArray, helpers.frameParsers); }');
  console.log('  save                     保存并应用配置');
  console.log('  show                     显示当前状态');
  console.log('  help                     显示帮助');
  console.log('  exit                     退出程序');
  console.log('');
}

async function main() {
  const configPath = process.env.SCALE_AGENT_CONFIG || DEFAULT_CONFIG_PATH;
  const output_helper = new OutputHelper();

  let config = loadConfig(configPath);
  let draftSerial = config.serial || '';
  let draftBaudRate = Math.floor(safeNumber(config.baudRate || 9600)) || 9600;
  let draftScript = normalizeScriptText(config.script);
  let draftFrameParsers = Array.isArray(config.frameParsers) ? config.frameParsers : [];

  await output_helper.applyConfig({
    serial: draftSerial,
    baudRate: draftBaudRate,
    script: draftScript,
    frameParsers: draftFrameParsers,
  });

  const server = createServer(output_helper);
  server.listen(PORT, () => {
    console.log(`scale_agent 已启动: http://localhost:${PORT}/scale`);
    console.log(`配置文件: ${configPath}`);
    printHelp();
    console.log(`当前串口: ${draftSerial || '(未设置)'}`);
    console.log(`当前波特率: ${draftBaudRate}`);
    console.log(`当前脚本: ${draftScript}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'scale_agent> ',
  });

  rl.prompt();
  rl.on('line', async (line) => {
    const input = String(line || '').trim();
    if (!input) {
      rl.prompt();
      return;
    }
    if (input === 'help') {
      printHelp();
      rl.prompt();
      return;
    }
    if (input === 'show') {
      const state = output_helper.getState();
      console.log('当前配置草稿:');
      console.log(`  串口: ${draftSerial || '(未设置)'}`);
      console.log(`  波特率: ${draftBaudRate}`);
      console.log(`  脚本: ${draftScript}`);
      console.log('运行状态:');
      console.log(`  scale: ${state.currentScale}`);
      console.log(`  lastBytes: [${state.lastBytes.join(', ')}]`);
      rl.prompt();
      return;
    }
    if (input === 'exit') {
      rl.close();
      return;
    }
    if (input === 'save') {
      try {
        config = {
          serial: draftSerial,
          baudRate: draftBaudRate,
          script: draftScript,
          frameParsers: draftFrameParsers,
        };
        saveConfig(configPath, config);
        await output_helper.applyConfig(config);
        console.log('配置已保存并生效');
      } catch (err) {
        console.error('保存失败:', err.message);
      }
      rl.prompt();
      return;
    }
    if (input.startsWith('serial ')) {
      draftSerial = input.slice('serial '.length).trim();
      console.log(`串口草稿已更新: ${draftSerial || '(空)'}`);
      rl.prompt();
      return;
    }
    if (input.startsWith('baud ')) {
      const nextBaudRate = Math.floor(safeNumber(input.slice('baud '.length).trim()));
      if (nextBaudRate <= 0) {
        console.log('波特率必须是正整数');
      } else {
        draftBaudRate = nextBaudRate;
        console.log(`波特率草稿已更新: ${draftBaudRate}`);
      }
      rl.prompt();
      return;
    }
    if (input.startsWith('script ')) {
      const nextScript = input.slice('script '.length).trim();
      try {
        compileScaleScript(nextScript);
        draftScript = normalizeScriptText(nextScript);
        console.log('脚本草稿已更新');
      } catch (err) {
        console.log(`脚本无效: ${err.message}`);
      }
      rl.prompt();
      return;
    }
    console.log('未知命令，输入 help 查看可用命令');
    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('正在退出...');
    if (output_helper.serialPort && output_helper.serialPort.isOpen) {
      await new Promise((resolve) => output_helper.serialPort.close(() => resolve()));
    }
    server.close(() => {
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error('scale_agent 启动失败:', err.message);
  process.exit(1);
});
