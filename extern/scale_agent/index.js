const fs = require('fs');
const path = require('path');
const http = require('http');
const readline = require('readline');
const yaml = require('js-yaml');
const { SerialPort } = require('serialport');

const PORT = 39109;
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'scale_agent.config.json');
const SCRIPT_MAX_LENGTH = 8000;
const SCRIPT_EXPRESSION_MAX_LENGTH = 2000;

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
    return 'function (arrayBuffer) { return arrayBuffer[0] + arrayBuffer[1]; }';
  }
  return raw.replace(
    /^function\s*\(([^)]*)\)\s*:\s*Number\s*\{/,
    'function ($1) {'
  );
}

function parseScriptShape(scriptText) {
  const normalized = normalizeScriptText(scriptText);
  if (!normalized) {
    throw new Error('脚本不能为空');
  }
  if (normalized.length > SCRIPT_MAX_LENGTH) {
    throw new Error(`脚本长度不能超过 ${SCRIPT_MAX_LENGTH} 个字符`);
  }
  const match = normalized.match(/^function\s*\(([^)]*)\)\s*\{([\s\S]*)\}$/);
  if (!match) {
    throw new Error('脚本格式错误，示例: function (arrayBuffer):Number { return arrayBuffer[0] + arrayBuffer[1]; }');
  }
  const paramName = String(match[1] || '').trim();
  if (!paramName || !/^[A-Za-z_]\w*$/.test(paramName)) {
    throw new Error('脚本参数名错误');
  }
  const body = String(match[2] || '').trim();
  const bodyMatch = body.match(/^return\s+([\s\S]*?);?$/);
  if (!bodyMatch) {
    throw new Error('脚本函数体仅允许 return 表达式');
  }
  const expression = String(bodyMatch[1] || '').trim();
  if (!expression) {
    throw new Error('return 表达式不能为空');
  }
  if (expression.length > SCRIPT_EXPRESSION_MAX_LENGTH) {
    throw new Error(`return 表达式长度不能超过 ${SCRIPT_EXPRESSION_MAX_LENGTH} 个字符`);
  }
  return { normalized, paramName, expression };
}

function tokenizeExpression(expression) {
  const tokens = [];
  let index = 0;
  const pushToken = (type, value) => tokens.push({ type, value });
  while (index < expression.length) {
    const ch = expression[index];
    if (/\s/.test(ch)) {
      index += 1;
      continue;
    }
    if ('()+-*/%'.includes(ch)) {
      pushToken('op', ch);
      index += 1;
      continue;
    }
    if (expression.startsWith('0x', index) || expression.startsWith('0X', index)) {
      let j = index + 2;
      while (j < expression.length && /[0-9a-fA-F]/.test(expression[j])) {
        j += 1;
      }
      const value = Number(expression.slice(index, j));
      if (!Number.isFinite(value)) {
        throw new Error('表达式中包含非法数字');
      }
      pushToken('number', value);
      index = j;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = index + 1;
      while (j < expression.length && /[0-9.]/.test(expression[j])) {
        j += 1;
      }
      const value = Number(expression.slice(index, j));
      if (!Number.isFinite(value)) {
        throw new Error('表达式中包含非法数字');
      }
      pushToken('number', value);
      index = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = index + 1;
      while (j < expression.length && /[A-Za-z0-9_]/.test(expression[j])) {
        j += 1;
      }
      const identifier = expression.slice(index, j);
      while (j < expression.length && /\s/.test(expression[j])) {
        j += 1;
      }
      if (expression[j] !== '[') {
        throw new Error(`表达式变量不允许: ${identifier}`);
      }
      j += 1;
      while (j < expression.length && /\s/.test(expression[j])) {
        j += 1;
      }
      let k = j;
      while (k < expression.length && /[0-9]/.test(expression[k])) {
        k += 1;
      }
      if (k === j) {
        throw new Error('数组下标必须是非负整数');
      }
      while (k < expression.length && /\s/.test(expression[k])) {
        k += 1;
      }
      if (expression[k] !== ']') {
        throw new Error('数组下标语法错误');
      }
      pushToken('ref', { identifier, idx: Number(expression.slice(j, k)) });
      index = k + 1;
      continue;
    }
    throw new Error(`表达式包含不支持的字符: ${ch}`);
  }
  return tokens;
}

function compileExpression(expression, allowedIdentifiers) {
  const tokens = tokenizeExpression(expression);
  const precedence = { 'u+': 3, 'u-': 3, '*': 2, '/': 2, '%': 2, '+': 1, '-': 1 };
  const output = [];
  const operators = [];
  const isLeftAssoc = (op) => !op.startsWith('u');
  let prevType = 'start';

  const pushOperator = (op) => {
    while (operators.length > 0) {
      const top = operators[operators.length - 1];
      if (top === '(') {
        break;
      }
      const topP = precedence[top] || 0;
      const curP = precedence[op] || 0;
      if (topP > curP || (topP === curP && isLeftAssoc(op))) {
        output.push({ type: 'op', value: operators.pop() });
      } else {
        break;
      }
    }
    operators.push(op);
  };

  tokens.forEach((token) => {
    if (token.type === 'number' || token.type === 'ref') {
      if (token.type === 'ref' && !allowedIdentifiers.has(token.value.identifier)) {
        throw new Error(`表达式变量不允许: ${token.value.identifier}`);
      }
      output.push(token);
      prevType = 'value';
      return;
    }
    if (token.type !== 'op') {
      throw new Error('表达式语法错误');
    }
    if (token.value === '(') {
      operators.push('(');
      prevType = '(';
      return;
    }
    if (token.value === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push({ type: 'op', value: operators.pop() });
      }
      if (operators.length === 0 || operators.pop() !== '(') {
        throw new Error('括号不匹配');
      }
      prevType = 'value';
      return;
    }
    if ('+-*/%'.includes(token.value)) {
      let op = token.value;
      if ((op === '+' || op === '-') && (prevType === 'start' || prevType === '(' || prevType === 'op')) {
        op = op === '+' ? 'u+' : 'u-';
      }
      pushOperator(op);
      prevType = 'op';
      return;
    }
    throw new Error(`表达式不支持操作符: ${token.value}`);
  });

  while (operators.length > 0) {
    const op = operators.pop();
    if (op === '(') {
      throw new Error('括号不匹配');
    }
    output.push({ type: 'op', value: op });
  }

  return (arrayBuffer) => {
    const stack = [];
    output.forEach((token) => {
      if (token.type === 'number') {
        stack.push(token.value);
        return;
      }
      if (token.type === 'ref') {
        const idx = token.value.idx;
        const value = idx >= 0 && idx < arrayBuffer.length ? arrayBuffer[idx] : 0;
        stack.push(safeNumber(value));
        return;
      }
      if (token.value === 'u+' || token.value === 'u-') {
        const a = stack.pop();
        if (a === undefined) {
          throw new Error('表达式语法错误');
        }
        stack.push(token.value === 'u+' ? +a : -a);
        return;
      }
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) {
        throw new Error('表达式语法错误');
      }
      if (token.value === '+') {
        stack.push(a + b);
      } else if (token.value === '-') {
        stack.push(a - b);
      } else if (token.value === '*') {
        stack.push(a * b);
      } else if (token.value === '/') {
        stack.push(b === 0 ? 0 : a / b);
      } else if (token.value === '%') {
        stack.push(b === 0 ? 0 : a % b);
      } else {
        throw new Error(`表达式不支持操作符: ${token.value}`);
      }
    });
    if (stack.length !== 1) {
      throw new Error('表达式语法错误');
    }
    return stack[0];
  };
}

function compileScaleScript(scriptText) {
  const { normalized, paramName, expression } = parseScriptShape(scriptText);
  const evaluator = compileExpression(expression, new Set([paramName, 'arrayBuffer', 'array', 'arrary']));
  return {
    source: normalized,
    run(arrayBuffer) {
      return safeNumber(evaluator(Array.from(arrayBuffer || [])));
    },
  };
}

class OutputHelper {
  constructor() {
    this.serialName = '';
    this.baudRate = 9600;
    this.scriptText = 'function (arrayBuffer) { return arrayBuffer[0] + arrayBuffer[1]; }';
    this.compiledScript = compileScaleScript(this.scriptText);
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
      currentScale: this.scale(),
      lastBytes: this.lastBytes,
    };
  }

  async applyConfig({ serial, baudRate, script }) {
    if (baudRate !== undefined) {
      const parsedBaudRate = Math.floor(safeNumber(baudRate));
      if (parsedBaudRate <= 0) {
        throw new Error('波特率必须是正整数');
      }
      this.baudRate = parsedBaudRate;
    }
    if (script !== undefined) {
      this.compiledScript = compileScaleScript(script);
      this.scriptText = normalizeScriptText(script);
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

    const nowArray = Array.from(chunk);
    this.lastBytes = nowArray;

    try {
      const result = this.compiledScript.run(nowArray);
      this.scaleValue = safeNumber(result);
    } catch (err) {
      console.error('[output_helper] 脚本执行失败:', err.message);
    }
  }
}

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {
      serial: '',
      baudRate: 9600,
      script: 'function (arrayBuffer) { return arrayBuffer[0] + arrayBuffer[1]; }',
    };
  }
  const text = fs.readFileSync(configPath, 'utf8');
  const ext = path.extname(configPath).toLowerCase();
  if (ext === '.yml' || ext === '.yaml') {
    return yaml.load(text) || {};
  }
  return JSON.parse(text);
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
  console.log('  script <解析脚本>        例如: script function (arrayBuffer) { return arrayBuffer[4] + arrayBuffer[6]; }');
  console.log('  save                     保存并应用配置');
  console.log('  show                     显示当前状态');
  console.log('  help                     显示帮助');
  console.log('  exit                     退出程序');
  console.log('  支持脚本格式: function (arrayBuffer):Number { ... } 或 function (arrayBuffer) { ... }');
  console.log('  return 表达式仅支持: arrayBuffer[i]/array[i]/arrary[i]、数字、()+-*/%');
  console.log('');
}

async function main() {
  const configPath = process.env.SCALE_AGENT_CONFIG || DEFAULT_CONFIG_PATH;
  const output_helper = new OutputHelper();

  let config = loadConfig(configPath);
  let draftSerial = config.serial || '';
  let draftBaudRate = Math.floor(safeNumber(config.baudRate || 9600)) || 9600;
  let draftScript = normalizeScriptText(config.script);

  await output_helper.applyConfig({
    serial: draftSerial,
    baudRate: draftBaudRate,
    script: draftScript,
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
    if (input.startsWith('script ')) {
      draftScript = input.slice('script '.length).trim();
      console.log('脚本草稿已更新');
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
