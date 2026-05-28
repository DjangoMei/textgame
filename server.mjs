import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
const preferredPort = Number.parseInt(process.env.PORT || "4173", 10);
const listenHost = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const usageStorePath = process.env.USAGE_STORE_PATH || path.join(root, "data", "usage-limits.json");
const maxTokensPerRequest = readPositiveInteger(process.env.MAX_TOKENS_PER_REQUEST, 2200);
const allowedOrigins = parseCsv(process.env.ALLOWED_ORIGINS);
const providers = {
  siliconflow: {
    name: "SiliconFlow",
    chatUrl: "https://api.siliconflow.cn/v1/chat/completions",
    envKeys: ["SILICONFLOW_API_KEY"]
  },
  volcengine: {
    name: "火山方舟",
    chatUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    envKeys: ["ARK_API_KEY", "VOLCENGINE_ARK_API_KEY"]
  }
};
let usageQueue = Promise.resolve();

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

    if (request.method === "OPTIONS" && requestUrl.pathname.startsWith("/api/")) {
      response.writeHead(204, getCorsHeaders(request));
      response.end();
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/llm") {
      await handleLLMProxy(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/siliconflow") {
      await handleLLMProxy(request, response, "siliconflow");
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: { message: "Method not allowed" } });
      return;
    }

    await serveStatic(requestUrl.pathname, request.method === "HEAD", response);
  } catch (error) {
    sendJson(response, 500, { error: { message: error.message || "Server error" } }, getCorsHeaders(request));
  }
});

async function handleLLMProxy(request, response, forcedProviderId = "") {
  const corsHeaders = getCorsHeaders(request);
  const payload = await readJsonBody(request);
  const providerId = forcedProviderId || payload.provider || "siliconflow";
  const provider = providers[providerId];
  if (!provider) {
    sendJson(response, 400, { error: { message: "不支持的模型服务商。" } }, corsHeaders);
    return;
  }

  const apiKey = getProviderApiKey(provider);
  const requestBody = sanitizeRequestBody(payload.requestBody);

  if (!apiKey) {
    sendJson(response, 500, { error: { message: `服务端未配置 ${provider.name} API Key。请设置 ${provider.envKeys.join(" / ")} 环境变量后重启服务。` } }, corsHeaders);
    return;
  }

  if (!requestBody || typeof requestBody !== "object") {
    sendJson(response, 400, { error: { message: "请求内容不完整。" } }, corsHeaders);
    return;
  }

  const quota = await consumeDailyQuota(providerId);
  if (!quota.allowed) {
    sendJson(response, 429, {
      error: {
        message: `${provider.name} 今日公共额度已用完，请明天再试。`
      },
      quota
    }, corsHeaders);
    return;
  }

  const upstream = await fetch(provider.chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  const text = await upstream.text();
  response.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders
  });
  response.end(text);
}

function sanitizeRequestBody(requestBody) {
  if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) return requestBody;
  return {
    ...requestBody,
    stream: false,
    max_tokens: Math.min(
      readPositiveInteger(requestBody.max_tokens, maxTokensPerRequest),
      maxTokensPerRequest
    )
  };
}

function getProviderApiKey(provider) {
  return provider.envKeys.map(key => process.env[key]).find(Boolean);
}

function getDailyLimit(providerId) {
  const envKey = `DAILY_REQUEST_LIMIT_${providerId.toUpperCase()}`;
  return readPositiveInteger(process.env[envKey], readPositiveInteger(process.env.DAILY_REQUEST_LIMIT, 100));
}

async function consumeDailyQuota(providerId) {
  return withUsageLock(async () => {
    const limit = getDailyLimit(providerId);
    if (limit <= 0) {
      return { allowed: true, day: getUsageDay(), used: 0, limit: 0, remaining: null };
    }

    const day = getUsageDay();
    const store = await readUsageStore();
    store[day] ||= {};
    const used = Number.isFinite(store[day][providerId]) ? store[day][providerId] : 0;
    if (used >= limit) {
      return { allowed: false, day, used, limit, remaining: 0 };
    }

    const nextUsed = used + 1;
    store[day][providerId] = nextUsed;
    pruneUsageStore(store, day);
    await writeUsageStore(store);
    return { allowed: true, day, used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed) };
  });
}

function withUsageLock(task) {
  const next = usageQueue.then(task, task);
  usageQueue = next.catch(() => {});
  return next;
}

async function readUsageStore() {
  try {
    const raw = await readFile(usageStorePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeUsageStore(store) {
  await mkdir(path.dirname(usageStorePath), { recursive: true });
  await writeFile(usageStorePath, JSON.stringify(store, null, 2), "utf8");
}

function pruneUsageStore(store, currentDay) {
  for (const day of Object.keys(store)) {
    if (day !== currentDay) delete store[day];
  }
}

function getUsageDay() {
  return new Date().toISOString().slice(0, 10);
}

function readPositiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function parseCsv(value = "") {
  return String(value)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function getCorsHeaders(request) {
  const origin = request.headers.origin || "";
  const allowOrigin = getAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function getAllowedOrigin(origin) {
  if (!allowedOrigins.length) return "*";
  if (!origin) return allowedOrigins[0];
  return allowedOrigins.includes(origin) ? origin : "null";
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error("请求内容过大。");
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(urlPath, headOnly, response) {
  const cleanPath = decodeURIComponent(urlPath).split("?")[0];
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (filePath !== root && !filePath.startsWith(rootWithSep)) {
    sendJson(response, 403, { error: { message: "Forbidden" } });
    return;
  }

  try {
    await readFile(filePath);
  } catch {
    sendJson(response, 404, { error: { message: "Not found" } });
    return;
  }

  const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });

  if (headOnly) {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

function sendJson(response, status, value, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  response.end(JSON.stringify(value));
}

let port = Number.isFinite(preferredPort) ? preferredPort : 4173;

server.on("error", error => {
  if (error.code === "EADDRINUSE" && port < preferredPort + 20) {
    port += 1;
    server.listen(port, listenHost);
    return;
  }

  console.error(error);
  process.exit(1);
});

server.on("listening", () => {
  console.log(`无尽故事实验室：http://${listenHost}:${port}`);
});

server.listen(port, listenHost);
