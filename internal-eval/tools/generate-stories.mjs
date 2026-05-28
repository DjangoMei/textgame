import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const outputDir = path.join(projectRoot, "internal-eval", "generated");
const latestPath = path.join(outputDir, "latest.json");
const batchManifestPath = path.join(outputDir, "batches.json");
const batchId = `volcengine-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const targetCount = Number.parseInt(process.argv[2] || "20", 10);
const concurrency = Math.max(1, Number.parseInt(process.env.EVAL_GENERATE_CONCURRENCY || "3", 10));
const apiBaseUrl = process.env.EVAL_LLM_API_BASE_URL || "http://127.0.0.1:4173";
const forcedThemeId = String(process.env.EVAL_STORY_THEME_ID || "").trim();
const excludedThemeIds = String(process.env.EVAL_EXCLUDE_THEME_ID || "")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const batchLabelOverride = String(process.env.EVAL_BATCH_LABEL || "").trim();
const promptRevisionOverride = String(process.env.EVAL_PROMPT_REVISION || "").trim();

const STORY_MIN_CHARS = 300;
const STORY_MAX_CHARS = 450;
const EVAL_STORY_MAX_CHARS = 600;
const STORY_REPAIR_MIN_CHARS = 260;
const STORY_REPAIR_MAX_CHARS = 500;
const AUTO_LABEL_REVISION = "codex-batch-label-v4-setting-fit";
const GENERAL_PROMPT_REVISION = "story-keywords-v6";
const ROMANCE_PROMPT_REVISION = "story-romance-v3";

const SETTING_WORLDVIEW_OPTIONS = [
  { id: "modern-urban", label: "现代都市", prompt: "故事发生在当代城市或近似现实的现代社会，可包含行业、社区、网络、交通、医疗、教育、商业等现实空间；不主动加入超自然设定。" },
  { id: "ancient-history", label: "古代历史", prompt: "故事发生在架空或泛古代社会，可使用朝堂、边关、商路、宗族、工坊、礼法等古代空间与制度；不套用真实公众人物。" },
  { id: "oriental-wuxia", label: "东方武侠", prompt: "故事发生在江湖、门派、镖局、山庄、城镇或武林盟约之中；武功、门规、人情与江湖秩序构成世界规则。" },
  { id: "oriental-fantasy", label: "东方奇幻", prompt: "故事发生在原创东方幻想世界，可包含灵契、山海异兽、术法代价、民俗禁忌、神祇遗迹等世界规则。" },
  { id: "sword-magic", label: "剑与魔法", prompt: "故事发生在王国、城邦、学院、行会、遗迹、荒原或契约魔法构成的西式幻想世界；魔法规则需要具体且有代价。" },
  { id: "near-future", label: "近未来科幻", prompt: "故事发生在近未来城市、算法社会、生物工程设施、能源系统、记忆技术或自动化机构中；技术规则要具体可信。" },
  { id: "space-sci-fi", label: "太空科幻", prompt: "故事发生在星舰、空间站、殖民地、星门、外星生态或深空航行制度中；保持宏大但具体，不写成泛泛星际背景。" },
  { id: "post-apocalypse", label: "废土末世", prompt: "故事发生在灾变后的城市、荒野、避难所、移动聚落或资源稀缺社会；规则围绕生存、交换、污染、秩序重建展开。" },
  { id: "steampunk", label: "蒸汽朋克", prompt: "故事发生在蒸汽机械、齿轮都市、飞艇、工会、发明家和旧帝国结构并存的架空工业时代；机械规则要具体。" },
  { id: "mythic-legend", label: "神话传说", prompt: "故事发生在神话、传说、祭仪、神域边境或人与非人共存的世界；因果应服从誓约、禁忌、祭品或神意规则。" }
];

const STORY_THEME_OPTIONS = [
  { id: "suspense", label: "悬疑", prompt: "以谜团、线索、误导、隐藏真相和逐步逼近的危险为核心；叙事要有紧张感和信息差。" },
  { id: "romance", label: "爱情", prompt: "以亲密关系、误会、牺牲、承诺、信任或情感选择为核心；文字更感性细腻，但仍要有明确行动危机。" },
  { id: "power", label: "权谋", prompt: "以利益交换、身份博弈、联盟背叛、制度缝隙和权力代价为核心；叙事更冷静克制。" },
  { id: "crime", label: "犯罪", prompt: "以案件、违法交易、追捕、证据、勒索、卧底或灰色秩序为核心；冲突要具体且有现实压力。" },
  { id: "adventure", label: "冒险", prompt: "以探索未知地点、机关、旅途、追逐、危险选择和发现为核心；节奏更明快，行动性更强。" },
  { id: "survival", label: "生存", prompt: "以资源短缺、环境压迫、逃生、感染、灾害或极限困境为核心；每个选择都要牵动生死代价。" },
  { id: "family", label: "亲情", prompt: "以家庭、血缘、养育、保护、代际秘密或亲人之间的选择为核心；情绪更内敛真切。" },
  { id: "revenge", label: "复仇", prompt: "以旧债、背叛、冤屈、追索真相和代价反噬为核心；叙事应有压抑的推进感。" },
  { id: "war", label: "战争", prompt: "以战场、阵营、军令、平民代价、补给、撤离或战略误判为核心；冲突要落到主角的具体选择上。" },
  { id: "heist", label: "盗取潜入", prompt: "以潜入、偷取、替换、骗局、安保漏洞和时间窗口为核心；叙事要有计划感和临场变数。" }
];

const RANDOM_MOTIFS = [
  "断裂罗盘",
  "海底列车",
  "会说谎的药瓶",
  "写不出结尾的契约",
  "只在正午发光的钥匙",
  "被盐封住的航标",
  "拒绝报时的机械鸟",
  "能交换名字的渡船",
  "失重温室",
  "长出第二道影子的门",
  "倒放的审判记录",
  "无人认领的星图",
  "会篡改证词的录音匣",
  "只承认一半血缘的族谱",
  "每次开门都会少一人的舱门",
  "需要两人同时签字的赦免令",
  "记录谎言体温的腕环",
  "会把伤口转移给亲人的护符",
  "只能保存最后一句话的黑匣子",
  "写满陌生名字的通缉令",
  "倒计时的继承印章",
  "只能指向背叛者的灯塔",
  "需要牺牲记忆才能启动的引擎",
  "会把地图改成遗书的墨水",
  "只在审判前夜开放的桥",
  "能复制声音却复制不了沉默的面具",
  "每次交易都会抹掉一段关系的账簿",
  "拒绝显示归途的车票",
  "能听见未来歉意的贝壳",
  "只为失败者亮起的路标",
  "把承诺刻成债务的银针",
  "会把救援信号转成求婚词的电台",
  "藏着第二份遗嘱的机械心脏",
  "只能由仇人打开的急救箱",
  "每说一次真相就裂开的徽章",
  "记录最后一次拥抱的冷冻舱",
  "不会熄灭的煤油灯",
  "写着明天日期的船票",
  "每翻一页就老一岁的账本",
  "会吞掉回声的井",
  "只在谎言里开花的藤蔓",
  "能称量悔意的铜秤",
  "被冰封的求救信",
  "反向生长的影子",
  "只认脚步声的门锁",
  "失去北方的星盘",
  "每次握手都会少一枚齿轮",
  "会记录沉默次数的怀表",
  "只在退潮时显形的碑文",
  "能赎回一小时的沙漏",
  "拒绝载活人的纸船",
  "写着陌生童年的照片",
  "每敲一次就换一段记忆的铜钟",
  "会把口供折成纸鹤的印泥",
  "只能照出背叛的铜镜",
  "被封在琥珀里的警报声",
  "每次点燃都会改名的蜡烛",
  "会把伤疤拼成地图的绷带",
  "只接受失败誓言的门票",
  "没有收件人的遗物箱",
  "会偷走脚印的雪",
  "写在掌纹里的通行证",
  "只能救一个人的降落伞",
  "把求救声压成唱片的留声机",
  "会把名字烧成灰的火漆",
  "只在伤口愈合前打开的抽屉",
  "每次签名都会换主人的房契",
  "倒悬的城市地图",
  "会把雨水变成证词的玻璃瓶",
  "能锁住梦境的银钥孔",
  "记录未寄出道歉的邮袋",
  "会吞掉坐标的导航仪",
  "只接收未来噪音的收音机",
  "每次合照都会少一张脸的相机",
  "把誓言翻译成债条的译码机",
  "需要敌人指纹启动的电梯",
  "会把脚步倒放的走廊",
  "写着主角死因的车厢号",
  "只在失信者手中融化的硬币",
  "会把药效转给旁人的针管",
  "每打开一次就缩短航程的船舱",
  "能测出恐惧重量的秤砣",
  "不收钱只收秘密的售票窗",
  "被涂黑的救援名单",
  "会把城市折成纸面的风筝",
  "只在断电时工作的义眼",
  "能把歌声变成门禁码的磁带",
  "每次报警都会删除一条证词的终端",
  "会把求婚戒指变成手铐的盒子",
  "只能由背叛者点亮的矿灯",
  "记录最后一次呼吸的潜水表",
  "会把胜利改写成欠条的奖杯",
  "只对仇人的血脉开锁的柜门",
  "每次祈祷都会亮错方向的神像",
  "被折断却仍在导航的桅杆",
  "能听见地下水位的银杯",
  "只在战败旗帜下显形的路书",
  "会把口令改成童谣的电报机",
  "每说一句真话就下沉的祭台",
  "写有两种判决的法槌",
  "只能保存半段记忆的胶卷",
  "会把人影钉在墙上的铆钉",
  "只在伤员之间传递的红绳",
  "能偷走签名的羽毛笔",
  "每次开锁都会多一道门的钥匙串",
  "拒绝靠岸的救生艇",
  "写着反向坐标的航海日志",
  "会把疼痛寄给家人的邮票",
  "只在无罪者手中变重的法典",
  "每次转身都会换出口的楼梯",
  "能交换影子的灯芯",
  "被缝进制服里的遗嘱",
  "只认旧伤疤的身份牌",
  "会把战争日期提前的日历",
  "记录未发生爆炸的黑板",
  "只能在失眠者眼中显形的路牌",
  "会把承诺录成噪声的耳机",
  "每次熄灯都会多一份遗书的床头灯",
  "被锁进蜂鸣器里的求救码"
];

const partItemSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["text", "role", "quote", "item"] },
    value: { type: "string" },
    replacementOptions: {
      type: "array",
      description: "仅 quote 需要。提前由 AI 原创生成 3 个台词替换候选：第 1 个同话题反义，第 2 个同风格换话题，第 3 个荒诞搞笑无厘头。三项都不绑定结局。",
      items: { type: "string" }
    }
  },
  required: ["type", "value"],
  additionalProperties: false
};

const storySchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "故事标题，12 个汉字以内" },
    prefixParts: { type: "array", items: partItemSchema },
    editableParts: { type: "array", items: partItemSchema },
    suffixText: { type: "string", description: "特殊情节之后的故事后文，必须导向坏结局" },
    endingType: { type: "string", enum: ["bad"], description: "初始故事必须是坏结局，只能返回 bad" },
    endingJudgement: { type: "string", description: "一句话说明为什么这是坏结局" },
    protagonistNames: { type: "array", items: { type: "string" } },
    allRoleNames: { type: "array", items: { type: "string" } }
  },
  required: ["title", "prefixParts", "editableParts", "suffixText", "endingType", "endingJudgement", "protagonistNames", "allRoleNames"],
  additionalProperties: false
};

function pickRandomOption(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function shuffleOptions(options) {
  const result = [...options];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function buildGenerationPlans(count) {
  const forcedTheme = forcedThemeId
    ? STORY_THEME_OPTIONS.find(option => option.id === forcedThemeId || option.label === forcedThemeId)
    : null;
  if (forcedThemeId && !forcedTheme) {
    throw new Error(`未知故事主题：${forcedThemeId}`);
  }
  const motifQueue = [];
  while (motifQueue.length < count) motifQueue.push(...shuffleOptions(RANDOM_MOTIFS));
  const themePool = STORY_THEME_OPTIONS.filter(option => {
    return !excludedThemeIds.includes(option.id) && !excludedThemeIds.includes(option.label);
  });
  if (!forcedTheme && !themePool.length) {
    throw new Error("没有可用的故事主题，请检查 EVAL_EXCLUDE_THEME_ID。");
  }
  return Array.from({ length: count }, (_, index) => ({
    worldview: pickRandomOption(SETTING_WORLDVIEW_OPTIONS),
    storyTheme: forcedTheme || pickRandomOption(themePool),
    motif: motifQueue[index]
  }));
}

function renderPromptTemplate(template, values) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function parseConfig(text) {
  const config = {};
  text.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.+?)\s*$/);
    if (match) config[match[1]] = match[2];
  });
  return config;
}

async function readText(relativePath) {
  return (await readFile(path.join(projectRoot, relativePath), "utf8")).trim();
}

function getStoryPromptContext(worldview, storyTheme, motif) {
  return {
    worldview_id: worldview.id,
    worldview_label: worldview.label,
    worldview_prompt: worldview.prompt,
    story_theme_id: storyTheme.id,
    story_theme_label: storyTheme.label,
    story_theme_prompt: storyTheme.prompt,
    motif,
    motif_summary: `随机意象：${motif}`,
    motif_instruction: `用户未填写核心要素/意象；本轮随机使用“${motif}”，并让它成为故事冲突、关键物件或解法的一部分。`
  };
}

async function buildInitialStoryPrompt(context) {
  const randomSeed = Math.random().toString(36).slice(2, 10);
  const values = { ...context, random_seed: randomSeed };
  const isRomance = context.story_theme_id === "romance" || context.story_theme_label === "爱情";
  const [storyBase, returnRules, romanceRules] = await Promise.all([
    readText("prompts/story-base.md"),
    readText("prompts/story-return-rules.md"),
    isRomance ? readText("prompts/story-romance.md") : Promise.resolve("")
  ]);
  return `${renderPromptTemplate(storyBase, context)}\n\n${renderPromptTemplate(returnRules, values)}\n\n${renderPromptTemplate(romanceRules, values)}`.trim();
}

async function callLLM({ providerId, apiKey, model, schemaName, schema, prompt, temperature = 0.72, maxTokens = 2400 }) {
  const promptWithSchema = `${prompt}

只输出一个 JSON 对象，不要 Markdown，不要解释。必须符合结构：
${JSON.stringify(schema, null, 2)}`;

  const requestBody = {
    model,
    temperature,
    max_tokens: maxTokens,
    stream: false,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "你是中文文字冒险游戏的叙事引擎，擅长写实、武侠、奇幻、剑与魔法、科幻等背景。只输出合法 JSON，不要解释。必须使用中文，写具体行动故事，不写案例分析或英文故事；玩家目标是把坏结局改成好结局，但候选改写必须包含失败、中立和成功的不同可能。"
      },
      {
        role: "user",
        content: promptWithSchema
      }
    ]
  };

  const response = await fetch(`${apiBaseUrl}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: providerId, apiKey, requestBody, schemaName })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("模型响应中没有可解析文本。");
  return JSON.parse(stripCodeFence(outputText));
}

function extractOutputText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map(part => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.content === "string") return part.content;
      return "";
    }).join("").trim();
  }
  const deltaContent = data?.choices?.[0]?.delta?.content;
  return typeof deltaContent === "string" ? deltaContent.trim() : "";
}

function stripCodeFence(text) {
  let value = String(text).trim();
  if (value.startsWith("```")) {
    const firstLineEnd = value.indexOf("\n");
    if (firstLineEnd >= 0) value = value.slice(firstLineEnd + 1).trim();
    if (value.endsWith("```")) value = value.slice(0, -3).trim();
  }
  return value;
}

function partsToText(parts) {
  return Array.isArray(parts) ? parts.map(part => String(part?.value || "")).join("") : "";
}

function renderStoryPayloadText(payload) {
  return [
    renderPartsForReading(payload.prefixParts),
    renderPartsForReading(payload.editableParts),
    String(payload.suffixText || "").trim()
  ].filter(Boolean).join("");
}

function renderPartsForReading(parts) {
  if (!Array.isArray(parts)) return "";
  let output = "";

  parts.forEach(part => {
    const value = String(part?.value || "").trim();
    if (!value) return;
    if (part.type === "quote") {
      const quoted = `“${trimSpeechMarks(value)}”`;
      output += /[：:]\s*$/.test(output) ? quoted : `说：${quoted}`;
      return;
    }
    output += value;
  });

  return output;
}

function trimSpeechMarks(value) {
  let text = String(value || "").trim();
  const pairs = [
    ["“", "”"],
    ["\"", "\""],
    ["「", "」"],
    ["『", "』"],
    ["‘", "’"],
    ["'", "'"]
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const [left, right] of pairs) {
      if (text.startsWith(left) && text.endsWith(right) && text.length > left.length + right.length) {
        text = text.slice(left.length, text.length - right.length).trim();
        changed = true;
      }
    }
  }
  return text;
}

function countChars(text) {
  return Array.from(String(text).replace(/\s/g, "")).length;
}

function splitNaturalParagraphs(text) {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!normalized) return [];

  const manualParagraphs = normalized
    .split(/\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
  if (manualParagraphs.length > 1) return manualParagraphs;

  const sentences = normalized
    .match(/[^。！？!?；;]+[。！？!?；;」』”"]*/g) || [normalized];
  const paragraphs = [];
  let current = "";

  sentences.forEach(sentence => {
    const next = sentence.trim();
    if (!next) return;
    const merged = current ? `${current}${next}` : next;
    if (current && countChars(merged) > 115) {
      paragraphs.push(current);
      current = next;
    } else {
      current = merged;
    }
  });

  if (current) paragraphs.push(current);
  return paragraphs.length ? paragraphs : [normalized];
}

function normalizeStoryLineBreaks(text) {
  return splitNaturalParagraphs(text)
    .map(paragraph => paragraph.replace(/^\s+/, "").replace(/\s+$/, ""))
    .join("\n\n");
}

function normalizeStoryPayload(payload) {
  if (!payload || !Array.isArray(payload.prefixParts) || !Array.isArray(payload.editableParts)) {
    throw new Error("AI 返回的故事结构不完整。");
  }
  const storyText = normalizeStoryLineBreaks(renderStoryPayloadText(payload));
  return {
    title: String(payload.title || "未命名").trim().slice(0, 24),
    storyText,
    endingType: "bad",
    endingJudgement: String(payload.endingJudgement || "").trim(),
    originalQuote: getFirstQuote(payload.editableParts),
    replacementOptions: getFirstQuoteOptions(payload.editableParts),
    protagonistNames: Array.isArray(payload.protagonistNames) ? payload.protagonistNames : [],
    allRoleNames: Array.isArray(payload.allRoleNames) ? payload.allRoleNames : [],
    rawStory: payload
  };
}

function annotateCase(item) {
  const features = getCaseFeatures(item);
  const standard = getEvaluationStandard(item);
  const flags = {
    formatError: !item.title || !item.storyText || !features.quoteFormatted || features.length < 120,
    corruptText: features.repeatedPhrase || /undefined|null|\[object Object\]/i.test(item.storyText),
    promptMismatch: features.nonStoryOutput || !item.worldview || !item.theme,
    lengthIssue: features.length < STORY_MIN_CHARS || features.length > EVAL_STORY_MAX_CHARS,
    unsafe: false
  };

  const scores = {
    logic: clampScore(Math.round(rawScoreForDimension("logic", item, features, flags))),
    emotion: clampScore(Math.round(rawScoreForDimension("emotion", item, features, flags))),
    prose: clampScore(Math.round(rawScoreForDimension("prose", item, features, flags))),
    tension: clampScore(Math.round(rawScoreForDimension("tension", item, features, flags)))
  };

  return {
    reviewed: true,
    evaluationStandard: standard,
    flags,
    scores,
    annotator: "Codex",
    notes: buildAnnotationNotes(item, features, flags, scores),
    updatedAt: new Date().toISOString(),
    autoCompletedBy: "codex",
    autoCompletedRevision: AUTO_LABEL_REVISION
  };
}

function getCaseFeatures(item) {
  const text = String(item.storyText || "");
  const length = countChars(text);
  const paragraphCount = text.split(/\n+/).map(part => part.trim()).filter(Boolean).length;
  const quoteFormatted = /[说道问喊答]：[“"][^”"]+[”"]/.test(text) || /[：:][“"][^”"]+[”"]/.test(text);
  const badEndingSignals = /(失败|死亡|被困|失去|葬身|陷入|惩罚|封印|灰烬|绝境|无法|毁|崩|吞没|监狱|牺牲|破灭|暴露|围住|冻结|困局)/.test(text);
  const roleJoinIssue = /[一-龥·]{2,}(工会|宴会|却脸色|生死一线|在雷恩|正当她|山庄弟子|商队深入)/.test(text);
  const repeatedPhrase = hasRepeatedChunk(text);
  const emotionalSignals = /(父|母|师父|妹妹|亲|承诺|希望|恐惧|绝望|冤|复仇|守护|失去|救|愧|泪|痛)/.test(text);
  const concreteSignals = /(钥匙|罗盘|药瓶|星图|航标|温室|契约|齿轮|渡船|审判|孢子|工会|祭品|飞艇|芯片|匣|井|门|刀|枪)/.test(text);
  const agencySignals = /(决定|选择|举起|握紧|冲|潜入|追|喊|说|打开|签下|按下|转动|交出)/.test(text);
  const sensorySignals = /(冷|热|腥|疼|光|影|烟|风|雨|盐|铁|蒸汽|灰|黑暗|震|刺耳|灼|颤|潮|血)/.test(text);
  const threatSignals = /(倒计时|逼近|围|枪|刀|追|坠|爆|警报|锁|毒|火|吞没|封|审判|通缉|失控|裂开|坍塌)/.test(text);
  const innerConflictSignals = /(犹豫|愧疚|不舍|颤|沉默|想起|眼眶|喉咙|心脏|害怕|决绝|苦笑|悔|明白)/.test(text);
  const romanceSignals = /(爱|恋人|未婚|婚|戒指|拥抱|亲吻|告白|分手|重逢|错过|相认|约定|承诺|旧信|照片|不舍|信任|误会|守候|牵手|心跳|眼眶|喉咙|掌心|道歉|原谅)/.test(text);
  const relationshipCostSignals = /(失去|错过|无法相认|不再相信|忘记|离开|关系|承诺|破裂|告别|再也|陌生|背叛|成全|放手|牺牲|等待)/.test(text);
  const nonStoryOutput = /(故事大纲|经验总结|案例分析|Markdown|JSON|无法生成|英文故事)/i.test(text);

  return {
    length,
    paragraphCount,
    quoteFormatted,
    badEndingSignals,
    roleJoinIssue,
    repeatedPhrase,
    emotionalSignals,
    concreteSignals,
    agencySignals,
    sensorySignals,
    threatSignals,
    innerConflictSignals,
    romanceSignals,
    relationshipCostSignals,
    nonStoryOutput
  };
}

function getEvaluationStandard(item) {
  return item?.themeId === "romance" || item?.theme === "爱情" ? "romance" : "general";
}

function rawScoreForDimension(key, item, features, flags) {
  if (flags.formatError || flags.corruptText) return 1.8;
  if (getEvaluationStandard(item) === "romance") {
    return rawRomanceScoreForDimension(key, features, flags);
  }
  const theme = item.theme || "";
  let score = 2.55;
  if (flags.lengthIssue) score -= 0.25;
  if (features.roleJoinIssue) score -= 0.25;

  if (key === "logic") {
    score += features.badEndingSignals ? 0.45 : -0.75;
    score += features.agencySignals ? 0.35 : -0.3;
    score += features.concreteSignals ? 0.25 : -0.25;
    score -= flags.promptMismatch ? 0.9 : 0;
    score -= features.length > 650 ? 0.3 : 0;
  }

  if (key === "emotion") {
    score += features.emotionalSignals ? 0.4 : -0.45;
    score += features.innerConflictSignals ? 0.3 : -0.15;
    score += /亲情|爱情|复仇/.test(theme) && features.emotionalSignals ? 0.25 : 0;
    score -= /悬疑|盗取潜入|犯罪|战争/.test(theme) && !features.emotionalSignals ? 0.25 : 0;
  }

  if (key === "prose") {
    score += features.paragraphCount >= 4 ? 0.3 : (features.paragraphCount >= 3 ? 0.15 : -0.25);
    score += features.concreteSignals ? 0.25 : -0.25;
    score += features.sensorySignals ? 0.25 : -0.15;
    score -= features.roleJoinIssue ? 0.55 : 0;
    score -= features.length > 650 ? 0.3 : 0;
  }

  if (key === "tension") {
    score += features.badEndingSignals ? 0.35 : -0.35;
    score += features.threatSignals ? 0.35 : -0.25;
    score += features.agencySignals ? 0.2 : -0.1;
    score += /悬疑|生存|复仇|盗取潜入|冒险|战争|犯罪/.test(theme) ? 0.2 : 0;
    score -= features.length > 680 ? 0.25 : 0;
  }

  return Math.min(4.2, Math.max(1, score));
}

function rawRomanceScoreForDimension(key, features, flags) {
  let score = 2.45;
  if (flags.lengthIssue) score -= 0.2;
  if (features.roleJoinIssue) score -= 0.35;

  if (key === "logic") {
    score += features.badEndingSignals ? 0.25 : -0.25;
    score += features.agencySignals ? 0.15 : -0.1;
    score += features.relationshipCostSignals ? 0.25 : -0.15;
    score -= flags.promptMismatch ? 0.7 : 0;
  }

  if (key === "emotion") {
    score += features.romanceSignals ? 0.65 : -0.9;
    score += features.relationshipCostSignals ? 0.45 : -0.45;
    score += features.innerConflictSignals ? 0.45 : -0.35;
    score += features.emotionalSignals ? 0.25 : -0.25;
  }

  if (key === "prose") {
    score += features.paragraphCount >= 4 ? 0.25 : -0.3;
    score += features.sensorySignals ? 0.45 : -0.35;
    score += features.innerConflictSignals ? 0.25 : -0.15;
    score += features.romanceSignals ? 0.2 : -0.2;
    score -= features.roleJoinIssue ? 0.55 : 0;
  }

  if (key === "tension") {
    score += features.relationshipCostSignals ? 0.35 : -0.2;
    score += features.badEndingSignals ? 0.2 : -0.25;
    score += features.threatSignals ? 0.15 : 0;
    score += features.agencySignals ? 0.1 : -0.1;
  }

  return Math.min(4.3, Math.max(1, score));
}

function buildAnnotationNotes(item, features, flags, scores) {
  const notes = [];
  const isRomance = getEvaluationStandard(item) === "romance";
  if (flags.lengthIssue) notes.push(`篇幅约 ${features.length} 字，超出 300-600 字评测范围`);
  if (flags.formatError) notes.push("格式或关键台词呈现需要复核");
  if (flags.corruptText) notes.push("存在疑似重复/异常文本");
  if (flags.promptMismatch) notes.push("坏结局信号或题材贴合度不足");
  if (features.roleJoinIssue) notes.push("局部角色名与叙述粘连，影响阅读流畅度");
  if (isRomance) {
    if (scores.logic >= 4) notes.push("关系选择与坏结局因果清楚");
    if (scores.logic <= 2) notes.push("关系变化与失败结果衔接偏跳");
    if (scores.emotion >= 4) notes.push("亲密关系、代价和内心反应较完整");
    if (scores.emotion <= 2) notes.push("情感锚点不足或停留在告白说明");
    if (scores.prose >= 4) notes.push("身体反应、感官细节和关系物件较稳定");
    if (scores.prose <= 2) notes.push("爱情表达偏直白或解释感较重");
    if (scores.tension >= 4) notes.push("关系压力和失去感较足");
    if (scores.tension <= 2) notes.push("关系危机偏弱");
  } else {
    if (scores.logic >= 4) notes.push("主角行动与坏结局因果达到较好水平");
    if (scores.logic <= 2) notes.push("关键因果有跳步");
    if (scores.emotion >= 4) notes.push("人物动机、代价和内心反应较完整");
    if (scores.emotion <= 2) notes.push("情绪更多停留在事件说明");
    if (scores.prose >= 4) notes.push("意象、动作和感官细节较稳定");
    if (scores.prose <= 2) notes.push("表达偏生硬");
    if (scores.tension >= 4) notes.push("冲突递进和临场压力较足");
    if (scores.tension <= 2) notes.push("故事张力偏弱");
  }

  return `${isRomance ? "Codex爱情标准评测" : "Codex批量评测"}：${notes.length ? notes.join("；") : "整体可读，未发现硬伤"}。`;
}

function hasRepeatedChunk(text) {
  const compact = String(text || "").replace(/\s/g, "");
  for (let size = 12; size <= 28; size += 4) {
    for (let index = 0; index + size * 2 <= compact.length; index += 1) {
      const chunk = compact.slice(index, index + size);
      if (chunk && chunk === compact.slice(index + size, index + size * 2)) return true;
    }
  }
  return false;
}

function clampScore(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 3;
  return Math.min(5, Math.max(1, number));
}

function getStoryPayloadLength(payload) {
  if (!payload) return 0;
  return countChars(`${partsToText(payload.prefixParts)}${partsToText(payload.editableParts)}${String(payload.suffixText || "")}`);
}

async function repairStoryLengthPayload(payload, config) {
  const repairPrompt = [
    "下面是一份已生成的中文文字冒险故事 JSON，但总字数明显偏离目标。",
    `请在不保留旧 editableParts 的前提下，先把完整故事重写到 ${STORY_MIN_CHARS}-${STORY_MAX_CHARS} 字之间，再重新拆分 prefixParts、editableParts、suffixText。`,
    "请固定写成 4 个自然段、8-10 个完整句，删除背景百科、旁支角色、额外反转和重复心理描写；全文不要超过 520 字。",
    "重要：必须在重写后的故事里重新挑选由主角亲口说出的关键台词作为唯一 quote；不要先沿用旧 quote 再缩写/扩写。",
    "故事需自然分成起势、关键情节、结局三段语感；prefixParts 和 suffixText 可以用换行形成中文小说式自然段落；JSON 字段仍按原 schema 返回，不要输出 Markdown。",
    "原 JSON：",
    JSON.stringify(payload)
  ].join("\n");

  return callLLM({
    providerId: "volcengine",
    apiKey: config.defaultApiKey,
    model: config.defaultModel,
    schemaName: "segmented_story",
    schema: storySchema,
    prompt: repairPrompt,
    temperature: 0.55,
    maxTokens: 2200
  });
}

function getFirstQuote(parts) {
  const quote = Array.isArray(parts) ? parts.find(part => part?.type === "quote") : null;
  return String(quote?.value || "").trim();
}

function getFirstQuoteOptions(parts) {
  const quote = Array.isArray(parts) ? parts.find(part => part?.type === "quote") : null;
  return Array.isArray(quote?.replacementOptions) ? quote.replacementOptions : [];
}

async function generateOne(index, config, plan) {
  const worldview = plan?.worldview || pickRandomOption(SETTING_WORLDVIEW_OPTIONS);
  const storyTheme = plan?.storyTheme || pickRandomOption(STORY_THEME_OPTIONS);
  const motif = plan?.motif || pickRandomOption(RANDOM_MOTIFS);
  const context = getStoryPromptContext(worldview, storyTheme, motif);

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const prompt = await buildInitialStoryPrompt(context);
      const raw = await callLLM({
        providerId: "volcengine",
        apiKey: config.defaultApiKey,
        model: config.defaultModel,
        schemaName: "segmented_story",
        schema: storySchema,
        prompt
      });
      let storyPayload = raw;
      for (let repairAttempt = 1; repairAttempt <= 2; repairAttempt += 1) {
        const rawLength = getStoryPayloadLength(storyPayload);
        if (rawLength >= STORY_REPAIR_MIN_CHARS && rawLength <= STORY_REPAIR_MAX_CHARS) break;
        console.log(`[${index + 1}/${targetCount}] repair ${repairAttempt}/2 length ${rawLength}`);
        storyPayload = await repairStoryLengthPayload(storyPayload, config);
      }
      const normalized = normalizeStoryPayload(storyPayload);
      return {
        id: `${batchId}-${String(index + 1).padStart(2, "0")}`,
        title: normalized.title,
        worldview: worldview.label,
        worldviewId: worldview.id,
        theme: storyTheme.label,
        themeId: storyTheme.id,
        motif,
        provider: "volcengine",
        model: config.defaultModel,
        storyText: normalized.storyText,
        modelOutcome: normalized.endingType,
        modelJudgement: normalized.endingJudgement,
        originalQuote: normalized.originalQuote,
        replacementOptions: normalized.replacementOptions,
        protagonistNames: normalized.protagonistNames,
        allRoleNames: normalized.allRoleNames,
        source: batchId,
        createdAt: new Date().toISOString(),
        rawStory: normalized.rawStory
      };
    } catch (error) {
      lastError = error;
      console.log(`[${index + 1}/${targetCount}] retry ${attempt}/3: ${error.message}`);
    }
  }
  throw lastError || new Error("生成失败。");
}

async function main() {
  if (!Number.isFinite(targetCount) || targetCount <= 0) {
    throw new Error("生成数量必须是正整数。");
  }

  const config = parseConfig(await readText("config/app-config.md"));
  if (config.defaultProvider !== "volcengine") {
    console.log(`当前默认服务商是 ${config.defaultProvider}，本次仍按请求使用 volcengine。`);
  }
  if (!config.defaultApiKey || !config.defaultModel) {
    throw new Error("缺少 defaultApiKey 或 defaultModel。");
  }

  await mkdir(outputDir, { recursive: true });
  const cases = Array(targetCount).fill(null);
  const generationPlans = buildGenerationPlans(targetCount);
  console.log(`batch ${batchId}`);
  console.log(`target ${targetCount}`);
  console.log(`concurrency ${concurrency}`);

  let nextIndex = 0;
  async function worker(workerId) {
    while (nextIndex < targetCount) {
      const index = nextIndex;
      nextIndex += 1;
      console.log(`[${index + 1}/${targetCount}] worker ${workerId} generating`);
      const item = await generateOne(index, config, generationPlans[index]);
      item.label = annotateCase(item);
      cases[index] = item;
      console.log(`[${index + 1}/${targetCount}] ok ${item.title} / ${item.worldview} / ${item.theme}`);
      await writeBatch(config, cases.filter(Boolean));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targetCount) }, (_, index) => worker(index + 1))
  );

  const batchPath = path.join(outputDir, `${batchId}.json`);
  const payload = buildBatchPayload(config, cases.filter(Boolean));
  await writeFile(batchPath, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(latestPath, JSON.stringify(payload, null, 2), "utf8");
  await upsertBatchManifest(payload, batchPath);
  console.log(`wrote ${latestPath}`);
}

function buildBatchPayload(config, cases) {
  const isRomanceBatch = cases.length > 0 && cases.every(item => getEvaluationStandard(item) === "romance");
  return {
    batchId,
    generatedAt: new Date().toISOString(),
    provider: "volcengine",
    model: config.defaultModel,
    labelRevision: AUTO_LABEL_REVISION,
    batchLabel: batchLabelOverride || (isRomanceBatch ? "爱情 v3" : "PE v6"),
    promptRevision: promptRevisionOverride || (isRomanceBatch ? ROMANCE_PROMPT_REVISION : GENERAL_PROMPT_REVISION),
    cases
  };
}

async function writeBatch(config, cases) {
  await writeFile(latestPath, JSON.stringify(buildBatchPayload(config, cases), null, 2), "utf8");
}

async function upsertBatchManifest(payload, batchPath) {
  let manifest = { batches: [] };
  try {
    manifest = JSON.parse(await readFile(batchManifestPath, "utf8"));
  } catch {
    manifest = { batches: [] };
  }
  if (!Array.isArray(manifest.batches)) manifest.batches = [];

  const entry = {
    batchId: payload.batchId,
    label: payload.batchLabel,
    path: `./generated/${path.basename(batchPath)}`,
    count: Array.isArray(payload.cases) ? payload.cases.length : 0,
    generatedAt: payload.generatedAt,
    promptRevision: payload.promptRevision,
    labelRevision: payload.labelRevision
  };
  manifest.batches = [
    ...manifest.batches.filter(item => item.batchId !== payload.batchId && item.path !== entry.path),
    entry
  ].sort((a, b) => String(a.generatedAt || "").localeCompare(String(b.generatedAt || "")));
  await writeFile(batchManifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
