const { OpenAI } = require("openai");
const fs = require("fs");

// ========== 配置项 ==========
const QWEN_MODEL = "qwen3.7-plus";
const MAX_CONCURRENT_LLM = 5;
const LLM_TIMEOUT = 300000;
const LLM_MAX_RETRY = 2;

// 延迟加载 ESM-only 的 p-limit，并复用同一个限制器
let limitConcurrencyPromise;
function getLimitConcurrency() {
    if (!limitConcurrencyPromise) {
        limitConcurrencyPromise = import("p-limit").then(({ default: pLimit }) => (
            pLimit(MAX_CONCURRENT_LLM)
        ));
    }
    return limitConcurrencyPromise;
}

// OpenAI兼容客户端
const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: "https://llm-7nvsavd7n3gjmza6.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    timeout: LLM_TIMEOUT,
});

/**
 * 内部调用千问，带重试逻辑
 * @param {Array} messages
 * @param {Object} params
 * @param {number} retryCount
 * @returns {Promise<{content:string, usage:object}>}
 */
async function _rawCallWithRetry(messages, params = {}, retryCount = 0) {
    try {
        const stream = await openai.chat.completions.create({
            model: QWEN_MODEL,
            messages,
            temperature: params.temperature ?? 0.7,
            top_p: params.top_p ?? 0.8,
            enable_thinking: params.enable_thinking ?? true,
            stream: true,
            stream_options: { include_usage: true },
        });

        let content = "";
        let usage;
        let hasReasoning = false;
        let hasContent = false;
        for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta;
            const reasoning = delta?.reasoning_content;
            if (reasoning) {
                if (!hasReasoning) {
                    process.stdout.write("[Qwen思考] ");
                    hasReasoning = true;
                }
                process.stdout.write(reasoning);
            }
            const text = delta?.content;
            if (text) {
                if (!hasContent) {
                    process.stdout.write("\n[Qwen回答] ");
                    hasContent = true;
                }
                process.stdout.write(text);
                content += text;
            }
            if (chunk.usage) {
                usage = chunk.usage;
            }
        }
        process.stdout.write("\n");

        return {
            content: content.trim(),
            usage,
        };
    } catch (err) {
        const status = err?.status || err?.response?.status;
        const isRetryable = (
            status === 429 ||
            (status >= 500 && status < 600) ||
            err.code === "ECONNABORTED" ||
            err.code === "ETIMEDOUT"
        );

        if (isRetryable && retryCount < LLM_MAX_RETRY) {
            const waitMs = 1000 * (retryCount + 1);
            console.warn(`[Qwen重试] 第${retryCount + 1}次，等待${waitMs}ms, status:${status}`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            return _rawCallWithRetry(messages, params, retryCount + 1);
        }

        let errMsg = "Qwen调用失败";
        if (status === 401) errMsg = "API Key无效或权限错误";
        if (status === 429) errMsg = "平台接口限流，重试后仍然失败";
        if (err.code === "ETIMEDOUT") errMsg = "请求大模型超时";

        const error = new Error(errMsg);
        error.status = status;
        error.raw = err;
        throw error;
    }
}

/**
 * 对外暴露的主函数
 * @param {string} inputText 用户输入文本
 * @param {string} [systemPrompt] 系统提示词，可选
 * @param {Object} [opt] 模型参数 {temperature, top_p, max_tokens}
 * @returns {Promise<string>} 返回模型输出纯文本
 */
async function qwenChat(inputText, systemPrompt = "你是专业助手，回答简洁清晰", opt = {}) {
    if (typeof inputText !== "string" || inputText.trim() === "") {
        throw new Error("inputText必须为非空字符串");
    }

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: inputText.trim() }
    ];

    // 加入并发排队控制
    const limitConcurrency = await getLimitConcurrency();
    const result = await limitConcurrency(() => _rawCallWithRetry(messages, opt));

    console.log(`[Qwen] prompt_tokens:${result.usage?.prompt_tokens ?? 0}, completion_tokens:${result.usage?.completion_tokens ?? 0}`);
    return result.content;
}

function make_export_prompt(export_description, phone) {
    let temp = fs.readFileSync("/conf/export_prompt_template.txt", "utf-8");
    temp = temp.replace("{{export_description}}", export_description);
    temp = temp.replace("{{phone}}", phone);
    return temp;
}

function make_chart_prompt(chart_description, csv_file_path) {
    let csv_content = fs.readFileSync(csv_file_path, "utf-8");
    let csv_first_10_lines = csv_content.split("\n").slice(0, 10).join("\n");
    let temp = fs.readFileSync("/conf/chart_prompt_template.txt", "utf-8");
    temp = temp.replace("{{chart_description}}", chart_description);
    temp = temp.replace("{{csv_first_10_lines}}", csv_first_10_lines);
    return temp;
}


module.exports = {
    qwenChat,
    make_export_prompt,
    make_chart_prompt,
};
