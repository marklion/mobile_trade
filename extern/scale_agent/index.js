const fs = require('fs');
const path = require('path');
const http = require('http');
const readline = require('readline');
const yaml = require('js-yaml');
const { SerialPort } = require('serialport');

const PORT = 39109;
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'scale_agent.config.json');

function safeNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return 0;
  }
  return n;
}

function parseByteIndex(value, fallback) {
  const idx = Math.floor(safeNumber(value));
  if (idx < 0) {
    return fallback;
  }
  return idx;
}

function computeScaleByFixedFormula(array, firstIndex, secondIndex) {
  const values = Array.isArray(array) ? array : [];
  return safeNumber(values[firstIndex]) + safeNumber(values[secondIndex]);
}

class OutputHelper {
  constructor() {
    this.serialName = '';
    this.baudRate = 9600;
    this.firstByteIndex = 0;
    this.secondByteIndex = 1;
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
      firstByteIndex: this.firstByteIndex,
      secondByteIndex: this.secondByteIndex,
      currentScale: this.scale(),
      lastBytes: this.lastBytes,
    };
  }

  async applyConfig({ serial, baudRate, firstByteIndex, secondByteIndex }) {
    if (baudRate !== undefined) {
      const parsedBaudRate = Math.floor(safeNumber(baudRate));
      if (parsedBaudRate <= 0) {
        throw new Error('波特率必须是正整数');
      }
      this.baudRate = parsedBaudRate;
    }
    if (firstByteIndex !== undefined) {
      this.firstByteIndex = parseByteIndex(firstByteIndex, this.firstByteIndex);
    }
    if (secondByteIndex !== undefined) {
      this.secondByteIndex = parseByteIndex(secondByteIndex, this.secondByteIndex);
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
      const result = computeScaleByFixedFormula(nowArray, this.firstByteIndex, this.secondByteIndex);
      this.scaleValue = safeNumber(result);
    } catch (err) {
      console.error('[output_helper] 固定公式计算失败:', err.message);
    }
  }
}

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {
      serial: '',
      baudRate: 9600,
      firstByteIndex: 0,
      secondByteIndex: 1,
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
  console.log('  idx1 <字节下标>          例如: idx1 0');
  console.log('  idx2 <字节下标>          例如: idx2 1');
  console.log('  save                     保存并应用配置');
  console.log('  show                     显示当前状态');
  console.log('  help                     显示帮助');
  console.log('  exit                     退出程序');
  console.log('  当前计算公式固定为: array[idx1] + array[idx2]');
  console.log('');
}

async function main() {
  const configPath = process.env.SCALE_AGENT_CONFIG || DEFAULT_CONFIG_PATH;
  const output_helper = new OutputHelper();

  let config = loadConfig(configPath);
  let draftSerial = config.serial || '';
  let draftBaudRate = Math.floor(safeNumber(config.baudRate || 9600)) || 9600;
  let draftFirstByteIndex = parseByteIndex(config.firstByteIndex, 0);
  let draftSecondByteIndex = parseByteIndex(config.secondByteIndex, 1);

  await output_helper.applyConfig({
    serial: draftSerial,
    baudRate: draftBaudRate,
    firstByteIndex: draftFirstByteIndex,
    secondByteIndex: draftSecondByteIndex,
  });

  const server = createServer(output_helper);
  server.listen(PORT, () => {
    console.log(`scale_agent 已启动: http://localhost:${PORT}/scale`);
    console.log(`配置文件: ${configPath}`);
    printHelp();
    console.log(`当前串口: ${draftSerial || '(未设置)'}`);
    console.log(`当前波特率: ${draftBaudRate}`);
    console.log(`当前取值下标: idx1=${draftFirstByteIndex}, idx2=${draftSecondByteIndex}`);
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
      console.log(`  公式: array[${draftFirstByteIndex}] + array[${draftSecondByteIndex}] (固定)`);
      console.log('运行状态:');
      console.log(`  生效下标: idx1=${state.firstByteIndex}, idx2=${state.secondByteIndex}`);
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
          firstByteIndex: draftFirstByteIndex,
          secondByteIndex: draftSecondByteIndex,
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
      console.log('已固定公式，不再支持 script 命令');
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
    if (input.startsWith('idx1 ')) {
      draftFirstByteIndex = parseByteIndex(input.slice('idx1 '.length).trim(), draftFirstByteIndex);
      console.log(`idx1 草稿已更新: ${draftFirstByteIndex}`);
      rl.prompt();
      return;
    }
    if (input.startsWith('idx2 ')) {
      draftSecondByteIndex = parseByteIndex(input.slice('idx2 '.length).trim(), draftSecondByteIndex);
      console.log(`idx2 草稿已更新: ${draftSecondByteIndex}`);
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
