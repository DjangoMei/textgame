# 无尽故事实验室

这是从 `index (18).html` 的功能重新整理出来的本地项目。核心玩法是：AI 生成一篇 400-500 字左右的中文故事，把故事拆成固定前文、关键情节、后续正文；用户只能替换关键情节里的台词。台词的 3 个候选项会随故事一起由 AI 生成，其中第 3 个要求为荒诞搞笑风格；用户也可以手动填写改写台词。每次替换后，改动点之后的故事会重新生成。

## 启动

```powershell
cd C:\Users\Admin\Documents\文字游戏\endless-story-lab
.\start-local.ps1
```

浏览器打开终端里显示的本地地址即可。默认地址通常是：

```text
http://127.0.0.1:4173
```

## API Key 与服务商

API Key 只由后端服务读取，前端页面不会显示、保存或发送 API Key。页面连接区只负责选择 SiliconFlow / 火山方舟以及模型名或 Endpoint ID。

启动前需要设置对应服务商的环境变量，让本地服务代为调用：

```powershell
$env:SILICONFLOW_API_KEY="sk-..."
$env:ARK_API_KEY="ark-..."
.\start-local.ps1
```

火山方舟模型栏默认使用接入点 `ep-20260522175712-qq28w`，也可填写其他 Model ID 或推理接入点 ID，例如 `ep-...`。页面也会把 `doubao-seed-2.0-lite`、`doubao-seed-2.0-mini` 这样的短名自动转换成可调用的完整 ID。

如果后端没有配置 Key，可以点击「载入示例」先体验改写流程；真正生成故事需要重启服务并配置环境变量。

## 故事模板

用户界面不会展示完整故事 Prompt，只提供世界观选择和核心要素/意象输入。实际生成规则放在 `prompts/` 目录：

- `prompts/story-base.md`：初始故事主模板。
- `prompts/story-return-rules.md`：初始故事返回结构和补充规则。
- `prompts/continuation.md`：改写台词后的续写和结局判定模板。

本地运行时每次生成都会重新读取这些 md 文件；保存后刷新或直接再次生成即可生效。

## 公共发布与每日额度

不要把真实 API Key 写进前端源码、`config/app-config.md` 或 itch.io 上传包。公开发布时必须单独部署一个 HTTPS 后端代理服务，把 Key 放在服务端环境变量里：

```powershell
$env:ARK_API_KEY="你的火山方舟 Key"
$env:SILICONFLOW_API_KEY="你的 SiliconFlow Key"
$env:DAILY_REQUEST_LIMIT="100"
$env:DAILY_REQUEST_LIMIT_VOLCENGINE="80"
$env:DAILY_REQUEST_LIMIT_SILICONFLOW="20"
$env:MAX_TOKENS_PER_REQUEST="2200"
$env:HOST="0.0.0.0"
.\start-local.ps1
```

额度规则：

- `DAILY_REQUEST_LIMIT` 是默认每日请求上限，默认值为 100。
- `DAILY_REQUEST_LIMIT_VOLCENGINE` 和 `DAILY_REQUEST_LIMIT_SILICONFLOW` 可以分别覆盖服务商额度。
- 所有真实模型请求都经由后端代理并消耗服务端额度。
- 计数按 UTC 日期存储在 `data/usage-limits.json`，可用 `USAGE_STORE_PATH` 改到持久化目录。
- `MAX_TOKENS_PER_REQUEST` 会限制单次请求的 `max_tokens`，避免单次调用过大。

这些限制保护的是代理服务的公共额度。为了更稳，还建议在火山方舟和 SiliconFlow 控制台设置硬性消费上限或余额告警。

## 个人域名部署

当前本机通过个人主页静态目录和 Cloudflare Tunnel 暴露生产入口：

```text
https://djangomei.com/textgame/
```

本地后台服务由 LaunchAgent `com.djangomei.textgame` 运行，实际部署目录是：

```text
/Users/djangomei/textgame-service
```

Cloudflare Tunnel `djangomei-homepage` 会把 `api.djangomei.com/api/llm` 转发到 `http://127.0.0.1:4173`，同一个 `api.djangomei.com` 根入口仍保留给既有游戏服务。开发仓库更新后，同步部署目录并重启服务：

```bash
./scripts/sync-local-deploy.sh
./scripts/sync-homepage-static.sh
launchctl kickstart -k gui/$(id -u)/com.djangomei.textgame
```

生产服务会读取部署目录中的 `.env`。如果需要启用真实模型请求，在 `/Users/djangomei/textgame-service/.env` 写入 `ARK_API_KEY` 或 `SILICONFLOW_API_KEY` 后重启服务；不要把 `.env` 提交进 Git。个人主页中的静态前端会通过 `https://api.djangomei.com/api/llm` 调用后端代理。

## 发布到 itch.io

itch.io 的 HTML5 上传包只能运行静态网页文件，不能运行本项目里的 `server.mjs` 本地代理。线上版本必须配置一个可公开访问的 HTTPS 后端代理：

1. 不要在代码或上传包里写入真实 API Key。
2. 把 `ARK_API_KEY` / `SILICONFLOW_API_KEY` 配到后端代理服务环境变量。
3. 打包时通过 `-ProxyUrl` 或 `ITCH_LLM_PROXY_URL` 写入代理地址。
4. 如果只想展示玩法流程，可以不配置代理，使用「载入示例」体验。

打包上传文件：

```powershell
.\scripts\package-itch.ps1 -ProxyUrl "https://你的代理服务域名"
```

如果你习惯用环境变量，也可以先设置 `ITCH_LLM_PROXY_URL`，再运行 `npm run package:itch` 或 `.\scripts\package-itch.ps1`。

使用 `-ProxyUrl` 后，上传包会进入后端代理模式：页面不会包含真实 Key，只会包含代理地址。

然后在 itch.io 项目里选择 HTML 类型，上传：

```text
dist/endless-story-lab-itch.zip
```

压缩包根目录会包含 `index.html`、`src/`、`assets/`、`prompts/` 和 `config/`。封面图可以使用 `assets/cover-square.png` 或 `assets/cover-square-art.png`。
