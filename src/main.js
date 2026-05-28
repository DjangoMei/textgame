const APP_CONFIG = {
  llmProxyUrl: normalizeConfigUrl(globalThis.ENDLESS_STORY_CONFIG?.llmProxyUrl),
  managedApiKeys: Boolean(globalThis.ENDLESS_STORY_CONFIG?.managedApiKeys)
};

const APP_SETTINGS_PATH = "./config/app-config.md";
const DEFAULT_APP_SETTINGS = {
  hideConnection: false,
  defaultProviderId: "volcengine",
  defaultModel: "ep-20260522175712-qq28w",
  defaultApiKey: ""
};

const PROVIDERS = {
  siliconflow: {
    id: "siliconflow",
    name: "SiliconFlow",
    apiKeyLabel: "SiliconFlow API Key",
    apiKeyPlaceholder: "sk-...",
    defaultModel: "MiniMaxAI/MiniMax-M2.5",
    modelPlaceholder: "MiniMaxAI/MiniMax-M2.5",
    chatUrl: "https://api.siliconflow.cn/v1/chat/completions",
    note: "使用 SiliconFlow 的 OpenAI 兼容接口。"
  },
  volcengine: {
    id: "volcengine",
    name: "火山方舟",
    apiKeyLabel: "火山方舟 API Key",
    apiKeyPlaceholder: "ARK_API_KEY",
    defaultModel: "ep-20260522175712-qq28w",
    modelPlaceholder: "ep-20260522175712-qq28w / Model ID",
    chatUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    note: "使用火山方舟 OpenAI 兼容接口；模型可填 Model ID 或推理接入点 ID。"
  }
};
const MODEL_ALIASES = {
  volcengine: {
    "doubao-seed-2.0-lite": "doubao-seed-2-0-lite-260215",
    "doubao-seed-2.0-mini": "doubao-seed-2-0-mini-260215",
    "doubao-seed-2-0-lite": "doubao-seed-2-0-lite-260215",
    "doubao-seed-2-0-mini": "doubao-seed-2-0-mini-260215"
  }
};
const DEFAULT_PROVIDER_ID = "volcengine";
const MAX_CHANGES = 3;
const CHALLENGE_MAX_ENERGY = 5;
const MIN_ORIGINAL_QUOTE_CHARS = 8;
const STORY_MIN_CHARS = 300;
const STORY_MAX_CHARS = 450;
const STORY_REPAIR_MIN_CHARS = 260;
const STORY_REPAIR_MAX_CHARS = 500;
const SECRET_GOOD_ENDING_PHRASE = "咕咕嘎嘎";
const PROMPT_TEMPLATE_PATHS = {
  storyBase: "./prompts/story-base.md",
  storyRomance: "./prompts/story-romance.md",
  storyReturnRules: "./prompts/story-return-rules.md",
  continuation: "./prompts/continuation.md"
};
const WORLDVIEW_OPTIONS = [
  { id: "realistic", label: "写实悬疑", prompt: "以现实社会、行业规则或地方秩序为基础，危机必须来自可理解的人和制度，不使用超自然力量。" },
  { id: "wuxia", label: "武侠江湖", prompt: "以门派、镖局、盟约、武学代价和江湖规矩推动冲突，力量边界要清楚。" },
  { id: "oriental-fantasy", label: "东方奇幻", prompt: "以原创神祇、灵契、山海异兽、术法代价或民俗禁忌构成世界规则。" },
  { id: "sword-magic", label: "剑与魔法", prompt: "以王国、行会、契约魔法、遗迹和魔法代价推动剧情，避免泛泛的勇者模板。" },
  { id: "near-future", label: "近未来科幻", prompt: "以近未来城市、算法制度、生物工程、能源设施或记忆技术为背景，技术规则要具体。" },
  { id: "space-opera", label: "太空歌剧", prompt: "以星舰、殖民地、舰队法、外星生态或深空航行制度推动冲突，保持宏大但具体。" },
  { id: "urban-weird", label: "都市异闻", prompt: "以现代城市中的隐秘规则、异常职业、地下组织或日常裂缝构成奇异感。" },
  { id: "alt-history", label: "历史架空", prompt: "以架空朝代、商路、官署、工坊、军制或礼法为基础，历史质感要可信但不套真实人物。" }
];
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

const UI_ASSETS = {
  worldviews: Object.fromEntries(
    SETTING_WORLDVIEW_OPTIONS.map(option => [option.id, `./assets/icons/worldview-${option.id}.png`])
  ),
  themes: Object.fromEntries(
    STORY_THEME_OPTIONS.map(option => [option.id, `./assets/icons/theme-${option.id}.png`])
  )
};

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

const continuationSchema = {
  type: "object",
  properties: {
    rewrittenEditableParts: {
      type: "array",
      description: "玩家改写后不再继续生成可编辑关键情节，必须返回空数组。",
      items: partItemSchema
    },
    rewrittenSuffix: { type: "string" },
    endingType: { type: "string", enum: ["bad", "neutral", "good"] },
    endingJudgement: { type: "string", description: "一句话判定玩家是否把坏结局改成了好结局" },
    changeSummary: { type: "string" }
  },
  required: ["rewrittenEditableParts", "rewrittenSuffix", "endingType", "endingJudgement", "changeSummary"],
  additionalProperties: false
};

const demoStory = {
  title: "钟楼纸月",
  prefixParts: [
    { type: "text", value: "雨停后的望潮镇还挂着雾。学徒修表匠" },
    { type: "role", value: "阿澄" },
    { type: "text", value: "在旧钟楼里发现一枚倒走的分针，分针每退一格，街上的人就忘掉一件昨天发生的小事。镇长" },
    { type: "role", value: "梁镇长" },
    { type: "text", value: "命他在午夜前修好大钟，并交出师父留下的" },
    { type: "item", value: "铜钥匙" },
    { type: "text", value: "。阿澄爬上机房，听见齿轮后传来熟悉的声音：" },
    { type: "quote", value: "别把月亮交出去" },
    { type: "text", value: "。他想起师父失踪那晚，钟楼也曾这样安静，连海风都像被谁关进了玻璃瓶。" }
  ],
  editableParts: [
    { type: "text", value: "他推开暗门，看见" },
    { type: "role", value: "云笙" },
    { type: "text", value: "捧着" },
    { type: "item", value: "纸月亮" },
    { type: "text", value: "站在齿轮中央，对他说：" },
    { type: "quote", value: "钟声一响，你就忘了我", replacementOptions: ["钟声晚点响也可以", "镇长偷走了明天", "让我替你留下，顺便把钟楼炖成一锅会认错人的云汤"] },
    { type: "text", value: "。阿澄终于明白，梁镇长要修的不是钟，而是封住全镇记忆的门。" }
  ],
  suffixText: "他把铜钥匙插进逆行的齿轮，却发现钥匙早被梁镇长调换。钟声提前一拍裂开，集市上的人没有想起昨天，反而忘掉了每个守夜人的名字。云笙手里的纸月亮化成灰，阿澄被困在钟声的缝隙里，只能一遍遍听见镇民感谢梁镇长救了他们。天亮时，望潮镇再也无人记得真正的海。",
  endingType: "bad",
  endingJudgement: "坏结局：阿澄和云笙失败，望潮镇的记忆被彻底封住。",
  protagonistNames: ["阿澄", "云笙"],
  allRoleNames: ["阿澄", "梁镇长", "云笙"]
};

const state = {
  currentTitle: "",
  originalPrefixParts: [],
  originalEditableParts: [],
  originalSuffixText: "",
  originalEndingType: "bad",
  originalEndingJudgement: "",
  originalProtagonistNames: [],
  originalAllRoleNames: [],
  prefixParts: [],
  editableParts: [],
  suffixText: "",
  endingType: "bad",
  endingJudgement: "",
  protagonistNames: [],
  allRoleNames: [],
  changeCount: 0,
  changes: [],
  selectedTarget: null,
  selectedValue: "",
  selectedOptionSource: "",
  selectedOptionIndex: null,
  isFinished: false,
  isBusy: false,
  suffixUnknown: false,
  pendingRegeneration: null,
  demoMode: false,
  gameMode: "experience",
  challengeEnergy: CHALLENGE_MAX_ENERGY,
  challengeGoodCount: 0,
  challengeLevel: 0,
  challengeActive: false,
  challengeFinished: false,
  recentRandomMotifs: []
};

const $ = selector => document.querySelector(selector);

const modeScreen = $("#modeScreen");
const appShell = $("#appShell");
const chooseExperienceBtn = $("#chooseExperienceBtn");
const chooseChallengeBtn = $("#chooseChallengeBtn");
const backToModeBtn = $("#backToModeBtn");
const providerSelect = $("#providerSelect");
const apiKeyLabel = $("#apiKeyLabel");
const apiKeyInput = $("#apiKeyInput");
const modelInput = $("#modelInput");
const toggleKeyBtn = $("#toggleKeyBtn");
const providerHint = $("#providerHint");
const storySettingsSection = $("#storySettingsSection");
const challengeStatus = $("#challengeStatus");
const energyCountEl = $("#energyCount");
const goodEndingCountEl = $("#goodEndingCount");
const challengeHint = $("#challengeHint");
const worldviewSelect = $("#worldviewSelect");
const storyThemeSelect = $("#storyThemeSelect");
const motifInput = $("#motifInput");
const generateBtn = $("#generateBtn");
const challengeStartBtn = $("#challengeStartBtn");
const nextLevelBtn = $("#nextLevelBtn");
const demoBtn = $("#demoBtn");
const storyTitleEl = $("#storyTitle");
const charCountEl = $("#charCount");
const editableInfoEl = $("#editableInfo");
const outcomeBadge = $("#outcomeBadge");
const storyEl = $("#story");
const outcomeNotice = $("#outcomeNotice");
const outcomeNoticeTitle = $("#outcomeNoticeTitle");
const outcomeNoticeText = $("#outcomeNoticeText");
let changeCountEl = $("#changeCount");
const logListEl = $("#logList");
const finishBtn = $("#finishBtn");
const resetBtn = $("#resetBtn");
const loading = $("#loading");
const loadingText = $("#loadingText");
const actionProgressFill = $("#actionProgressFill");
const progressPanel = $("#progressPanel");
const progressTitle = $("#progressTitle");
const progressElapsed = $("#progressElapsed");
const progressFill = $("#progressFill");
const progressCurrent = $("#progressCurrent");
const progressPercent = $("#progressPercent");
const progressSteps = $("#progressSteps");
const errorBox = $("#errorBox");
const endingPanel = $("#endingPanel");
const finalTitleEl = $("#finalTitle");
const finalStoryEl = $("#finalStory");
const endingTextEl = $("#endingText");
const modalMask = $("#modalMask");
const modalTitle = $("#modalTitle");
const modalDesc = $("#modalDesc");
const optionList = $("#optionList");
const applyBtn = $("#applyBtn");
const cancelBtn = $("#cancelBtn");
const modalWarning = $("#modalWarning");
const apiKeyField = apiKeyInput.closest(".field");
const connectionSection = providerSelect.closest(".pane-section");

const providerDrafts = Object.fromEntries(
  Object.entries(PROVIDERS).map(([id, provider]) => [
    id,
    { apiKey: "", model: provider.defaultModel }
  ])
);
let currentProviderId = DEFAULT_PROVIDER_ID;
let appSettings = { ...DEFAULT_APP_SETTINGS };
const iconPickers = [];

const progressState = {
  active: false,
  status: "idle",
  title: "",
  resultText: "",
  steps: [],
  startedAt: 0,
  finishedAt: 0,
  timerId: null
};

function startProgress(title, steps) {
  stopProgressTimer();
  progressState.active = true;
  progressState.status = "running";
  progressState.title = title;
  progressState.resultText = "";
  progressState.startedAt = performance.now();
  progressState.finishedAt = 0;
  progressState.steps = steps.map(step => ({
    ...step,
    status: "pending",
    detail: step.detail || "等待开始",
    startedAt: 0,
    finishedAt: 0,
    elapsedMs: 0
  }));
  progressPanel.hidden = false;
  progressState.timerId = window.setInterval(updateProgressUI, 250);
  updateProgressUI();
}

function setProgressStep(id, detail = "") {
  if (!id || !progressState.active) return;
  const step = progressState.steps.find(item => item.id === id);
  if (!step) return;
  const now = performance.now();

  progressState.steps.forEach(item => {
    if (item.status === "active" && item.id !== id) {
      closeProgressStepSegment(item, now);
    }
  });

  if (step.status !== "active") {
    step.startedAt = now;
    step.finishedAt = 0;
  }
  step.status = "active";
  if (detail) step.detail = detail;
  progressState.resultText = step.label;
  loadingText.textContent = step.label;
  updateProgressUI();
}

function completeProgressStep(id, detail = "") {
  if (!id || !progressState.active) return;
  const step = progressState.steps.find(item => item.id === id);
  if (!step) return;
  const now = performance.now();
  if (!step.startedAt) step.startedAt = now;
  closeProgressStepSegment(step, now);
  if (detail) step.detail = detail;
  updateProgressUI();
}

function finishProgress(message = "完成") {
  if (!progressState.active) return;
  const now = performance.now();
  progressState.steps.forEach(step => {
    if (step.status === "active") {
      closeProgressStepSegment(step, now);
    } else if (step.status === "pending") {
      step.status = "done";
      step.finishedAt = now;
    }
  });
  progressState.status = "done";
  progressState.resultText = message;
  progressState.finishedAt = performance.now();
  progressState.active = false;
  stopProgressTimer();
  updateProgressUI();
}

function failProgress(message = "操作失败") {
  if (!progressState.active) return;
  const activeStep = progressState.steps.find(step => step.status === "active");
  if (activeStep) {
    activeStep.detail = message;
    closeProgressStepSegment(activeStep, performance.now(), "error");
  }
  progressState.status = "error";
  progressState.resultText = message;
  progressState.finishedAt = performance.now();
  progressState.active = false;
  stopProgressTimer();
  updateProgressUI();
}

function stopProgressTimer() {
  if (progressState.timerId) {
    window.clearInterval(progressState.timerId);
    progressState.timerId = null;
  }
}

function closeProgressStepSegment(step, now, status = "done") {
  if (step.startedAt) {
    step.elapsedMs = (step.elapsedMs || 0) + Math.max(0, now - step.startedAt);
  }
  step.status = status;
  step.finishedAt = now;
  step.startedAt = 0;
}

function updateProgressUI() {
  if (progressPanel.hidden || !progressState.startedAt) return;
  const now = progressState.finishedAt || performance.now();
  const elapsed = now - progressState.startedAt;
  const percent = getProgressPercent(now);
  const activeStep = progressState.steps.find(step => step.status === "active");
  const currentText = progressState.status === "done"
    ? progressState.resultText
    : progressState.status === "error"
      ? `失败：${progressState.resultText}`
      : activeStep
        ? `${activeStep.label}：${activeStep.detail}`
        : "准备开始";

  progressTitle.textContent = progressState.title;
  progressElapsed.textContent = `总用时 ${formatDuration(elapsed)}`;
  progressFill.style.width = `${percent}%`;
  actionProgressFill.style.width = `${percent}%`;
  progressCurrent.textContent = currentText;
  progressPercent.textContent = `${percent}%`;
  progressSteps.innerHTML = progressState.steps.map(step => renderProgressStep(step, now)).join("");
}

function renderProgressStep(step, now) {
  const statusClass = step.status || "pending";
  const elapsed = getStepElapsed(step, now);
  const timeText = step.status === "pending" ? "未开始" : formatDuration(elapsed);
  return `
    <li class="progress-step ${statusClass}">
      <span class="progress-step-dot" aria-hidden="true"></span>
      <div class="progress-step-body">
        <strong>${escapeHTML(step.label)}</strong>
        <span>${escapeHTML(step.detail || "")}</span>
      </div>
      <time>${timeText}</time>
    </li>
  `;
}

function getProgressPercent(now) {
  if (progressState.status === "done") return 100;
  const total = Math.max(progressState.steps.length, 1);
  const doneCount = progressState.steps.filter(step => step.status === "done").length;
  const activeStep = progressState.steps.find(step => step.status === "active");
  const activeWeight = activeStep
    ? Math.min(0.88, Math.max(0.12, (now - activeStep.startedAt) / 14000))
    : 0;
  return Math.max(1, Math.min(99, Math.round(((doneCount + activeWeight) / total) * 100)));
}

function getStepElapsed(step, now) {
  const saved = step.elapsedMs || 0;
  if (!step.startedAt) return saved;
  return saved + Math.max(0, (step.finishedAt || now) - step.startedAt);
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "0.0 秒";
  if (ms < 1000) return `${Math.max(0.1, ms / 1000).toFixed(1)} 秒`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} 秒`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes} 分 ${seconds} 秒`;
}

function getOutcomeMeta(type = "bad") {
  const normalizedType = ["bad", "neutral", "good"].includes(type) ? type : "bad";
  const map = {
    bad: {
      className: "bad",
      label: "坏结局",
      result: "失败",
      defaultText: "仍然是坏结局：继续改写特殊情节，尝试救回故事。"
    },
    neutral: {
      className: "neutral",
      label: "中立结局",
      result: "失败",
      defaultText: "中立结局还不是胜利：故事没有彻底走向灾难，但也没有真正被拯救。"
    },
    good: {
      className: "good",
      label: "好结局",
      result: "成功",
      defaultText: "好结局：你已经把坏结局扭转成了更好的方向。"
    }
  };
  return map[normalizedType];
}

function normalizeEndingType(value, fallback = "bad") {
  return ["bad", "neutral", "good"].includes(value) ? value : fallback;
}

function getProvider(providerId) {
  return PROVIDERS[providerId] || PROVIDERS[DEFAULT_PROVIDER_ID];
}

async function loadAppSettings() {
  try {
    const response = await fetch(`${APP_SETTINGS_PATH}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(`无法读取应用配置：${APP_SETTINGS_PATH}`);
      }
      return { ...DEFAULT_APP_SETTINGS };
    }
    const text = await response.text();
    return { ...DEFAULT_APP_SETTINGS, ...parseAppSettingsMarkdown(text) };
  } catch (error) {
    console.warn("应用配置读取失败，已使用内置默认值。", error);
    return { ...DEFAULT_APP_SETTINGS };
  }
}

function parseAppSettingsMarkdown(markdown) {
  const result = {};
  String(markdown || "").split(/\r?\n/).forEach(line => {
    const cleaned = line
      .trim()
      .replace(/^[-*]\s+/, "")
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "");
    if (!cleaned || cleaned.startsWith(">") || cleaned.startsWith("---")) return;

    const colonIndex = cleaned.indexOf(":");
    if (colonIndex < 0) return;

    const rawKey = cleaned.slice(0, colonIndex).trim().toLowerCase().replace(/[\s_-]+/g, "");
    const rawValue = cleaned.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!rawKey) return;

    if (["hideconnection", "hideconnectionarea", "connectionhidden", "hideconnectpane"].includes(rawKey)) {
      result.hideConnection = parseBooleanConfig(rawValue, DEFAULT_APP_SETTINGS.hideConnection);
    } else if (["defaultprovider", "defaultproviderid", "provider", "providerid", "serviceprovider"].includes(rawKey)) {
      result.defaultProviderId = normalizeProviderConfig(rawValue);
    } else if (["defaultmodel", "model", "modelid", "endpoint", "endpointid"].includes(rawKey)) {
      result.defaultModel = rawValue || DEFAULT_APP_SETTINGS.defaultModel;
    } else if (["defaultapikey", "apikey", "api", "key"].includes(rawKey)) {
      result.defaultApiKey = rawValue || DEFAULT_APP_SETTINGS.defaultApiKey;
    }
  });
  return result;
}

function parseBooleanConfig(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "hide", "hidden"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off", "show", "visible"].includes(normalized)) return false;
  return fallback;
}

function normalizeProviderConfig(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["volcengine", "ark", "huoshan", "火山方舟"].includes(normalized)) return "volcengine";
  if (["siliconflow", "silicon", "硅基流动"].includes(normalized)) return "siliconflow";
  return PROVIDERS[normalized] ? normalized : DEFAULT_APP_SETTINGS.defaultProviderId;
}

function applyAppSettings(settings) {
  appSettings = { ...DEFAULT_APP_SETTINGS, ...(settings || {}) };
  const provider = getProvider(appSettings.defaultProviderId);
  providerDrafts[provider.id] = {
    apiKey: appSettings.defaultApiKey || "",
    model: appSettings.defaultModel || provider.defaultModel
  };
  if (connectionSection) {
    connectionSection.hidden = Boolean(appSettings.hideConnection);
  }
  return provider.id;
}

function getCurrentProvider() {
  return getProvider(providerSelect.value);
}

function saveProviderInputs(providerId = currentProviderId) {
  const provider = getProvider(providerId);
  providerDrafts[provider.id] = {
    apiKey: isManagedApiKeyMode() ? "" : apiKeyInput.value,
    model: modelInput.value || provider.defaultModel
  };
}

function applyProviderSelection(providerId) {
  const provider = getProvider(providerId);
  const draft = providerDrafts[provider.id] || {};

  currentProviderId = provider.id;
  providerSelect.value = provider.id;
  apiKeyLabel.textContent = provider.apiKeyLabel;
  apiKeyInput.placeholder = provider.apiKeyPlaceholder;
  modelInput.placeholder = provider.modelPlaceholder;
  apiKeyInput.value = draft.apiKey || "";
  modelInput.value = draft.model || provider.defaultModel;
  syncApiKeyControls();
  providerHint.textContent = `${provider.note} ${getConnectionNote()}`;
}

function getSelectedWorldview() {
  const selectedId = worldviewSelect?.value || SETTING_WORLDVIEW_OPTIONS[0].id;
  return SETTING_WORLDVIEW_OPTIONS.find(option => option.id === selectedId) || SETTING_WORLDVIEW_OPTIONS[0];
}

function getSelectedStoryTheme() {
  const selectedId = storyThemeSelect?.value || STORY_THEME_OPTIONS[0].id;
  return STORY_THEME_OPTIONS.find(option => option.id === selectedId) || STORY_THEME_OPTIONS[0];
}

function pickRandomOption(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function randomizeChallengeSettings() {
  const worldview = pickRandomOption(SETTING_WORLDVIEW_OPTIONS);
  const storyTheme = pickRandomOption(STORY_THEME_OPTIONS);
  const motif = getRandomMotif();
  worldviewSelect.value = worldview.id;
  storyThemeSelect.value = storyTheme.id;
  motifInput.value = motif;
  return { worldview, storyTheme, motif };
}

function getRandomMotif() {
  const recent = new Set(state.recentRandomMotifs);
  const candidates = RANDOM_MOTIFS.filter(motif => !recent.has(motif));
  const pool = candidates.length ? candidates : RANDOM_MOTIFS;
  const motif = pickRandomOption(pool);
  state.recentRandomMotifs = [motif, ...state.recentRandomMotifs.filter(item => item !== motif)].slice(0, 24);
  return motif;
}

function getStoryPromptContext() {
  const worldview = getSelectedWorldview();
  const storyTheme = getSelectedStoryTheme();
  const typedMotif = String(motifInput?.value || "").trim();
  const motif = typedMotif || getRandomMotif();
  return {
    worldview_id: worldview.id,
    worldview_label: worldview.label,
    worldview_prompt: worldview.prompt,
    story_theme_id: storyTheme.id,
    story_theme_label: storyTheme.label,
    story_theme_prompt: storyTheme.prompt,
    motif,
    motif_summary: typedMotif ? `用户指定：${typedMotif}` : `随机意象：${motif}`,
    motif_instruction: typedMotif
      ? `必须围绕用户指定的“${typedMotif}”设计核心冲突、关键物件或解法，不要只把它当作装饰。`
      : `用户未填写核心要素/意象；本轮随机使用“${motif}”，并让它成为故事冲突、关键物件或解法的一部分。`
  };
}

async function loadPromptTemplate(pathName) {
  const url = `${pathName}?v=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法读取故事模板：${pathName}`);
  }
  return (await response.text()).trim();
}

function renderPromptTemplate(template, values) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function describeChangeSource(changeRecord) {
  if (changeRecord.optionSource === "candidate") {
    const labels = ["同话题反义候选", "同风格换话题候选", "荒诞搞笑无厘头候选"];
    return `${labels[changeRecord.optionIndex] || "候选台词"}：不绑定任何结局，按实际因果效果判定。`;
  }
  if (changeRecord.optionSource === "custom") {
    return "玩家手动填写台词：不自动提高成功率。只有它明确命中核心危机、触发前文已有规则或给主角提供具体可执行行动，并完整解决危机，才可判好结局。";
  }
  return "来源未知：按台词实际效果严格判定。";
}

function getContinuationDirective(pending) {
  const newValue = pending?.changeRecord?.newValue || "";
  if (isSecretGoodEndingPhrase(newValue)) {
    return [
      "隐藏彩蛋规则：玩家的新台词是“咕咕嘎嘎”（可带标点）。",
      "你必须由 AI 续写后续故事，不能跳过叙事；但必须把“咕咕嘎嘎”合理化为当前世界观中有效的暗号、咒语、识别码、声纹口令、拟声误导、童谣残句或其他已可由前文规则解释的机制。",
      "rewrittenSuffix 必须写出它为什么在此刻有效，并让主角因此解决核心危机。",
      "endingType 必须返回 good；endingJudgement 和 changeSummary 必须说明“咕咕嘎嘎”如何造成好结局。"
    ].join("\n");
  }
  return [
    "普通改写规则：good 是例外，bad/neutral 更常见。只有新台词明确命中核心危机或关键规则，并让主角采取具体可执行行动，最终完整解决核心危机，才判 good。",
    "不要为了给 good 而临时发明新规则、新帮手、新道具、新权限或新背景。若新台词只是缓和局势、争取时间、让对手犹豫、保护部分证据或留下隐患，应判 neutral。",
    "如果新台词空泛、纯情绪化、搞错目标、只开玩笑、违背世界规则、拖延或没有改变核心危机，应判 bad。无法确认能完整解决危机时，优先 neutral，不要直接 good。"
  ].join("\n");
}

function normalizeModelForProvider(provider, value) {
  const model = String(value || provider.defaultModel).trim();
  if (!model) return provider.defaultModel;
  const aliases = MODEL_ALIASES[provider.id] || {};
  const normalizedKey = model.toLowerCase();
  return aliases[normalizedKey] || model;
}

function normalizeConfigUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isManagedApiKeyMode() {
  return APP_CONFIG.managedApiKeys && Boolean(APP_CONFIG.llmProxyUrl);
}

function getConfiguredProxyEndpoint() {
  if (!APP_CONFIG.llmProxyUrl) return "";
  return APP_CONFIG.llmProxyUrl.endsWith("/api/llm")
    ? APP_CONFIG.llmProxyUrl
    : `${APP_CONFIG.llmProxyUrl}/api/llm`;
}

function getLLMProxyEndpoint() {
  if (shouldUseLocalProxy()) return "/api/llm";
  return getConfiguredProxyEndpoint();
}

function syncApiKeyControls() {
  const isManaged = isManagedApiKeyMode();
  if (apiKeyField) apiKeyField.hidden = isManaged;
  toggleKeyBtn.hidden = isManaged;
  apiKeyInput.disabled = isManaged;
  if (isManaged) {
    apiKeyInput.value = "";
    apiKeyInput.type = "password";
    toggleKeyBtn.textContent = "显示 Key";
  }
}

function isLocalHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost"
    || host === "::1"
    || host === "0.0.0.0"
    || /^127\./.test(host)
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

function shouldUseLocalProxy() {
  return location.protocol !== "file:" && isLocalHostname(location.hostname);
}

function getConnectionNote() {
  if (isManagedApiKeyMode()) {
    return "发布版使用托管公共额度，API Key 不会发送到页面或写入发布包。";
  }
  if (shouldUseLocalProxy()) {
    return "本地运行时会优先使用本地代理；Key 只用于当前本地会话，不会写入项目文件。";
  }
  return "线上静态版本会从浏览器直连服务商；Key 只用于当前页面会话，不会写入项目文件。";
}

async function getDefaultStoryPrompt(context = getStoryPromptContext()) {
  const template = await loadPromptTemplate(PROMPT_TEMPLATE_PATHS.storyBase);
  return renderPromptTemplate(template, context);
}

function isRomanceContext(context) {
  return context?.story_theme_id === "romance" || context?.story_theme_label === "爱情";
}

async function callLLM({ schemaName, schema, prompt, temperature = 0.85, maxTokens = 2200, progress = {} }) {
  saveProviderInputs();
  const provider = getCurrentProvider();
  const managedApiKeys = isManagedApiKeyMode();
  const apiKey = managedApiKeys ? "" : apiKeyInput.value.trim();
  const model = normalizeModelForProvider(provider, modelInput.value);
  setProgressStep(progress.prepare, `服务商：${provider.name}；模型：${model}`);
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
        content: getSystemPrompt(schemaName)
      },
      {
        role: "user",
        content: promptWithSchema
      }
    ]
  };

  const proxyEndpoint = getLLMProxyEndpoint();
  const requestStartedAt = performance.now();
  setProgressStep(progress.request, "请求已发出，正在等待模型返回");
  let response = null;
  if (proxyEndpoint) {
    response = await fetch(proxyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: provider.id,
        apiKey: managedApiKeys ? undefined : apiKey,
        requestBody,
        schemaName
      })
    });
    if (proxyEndpoint === "/api/llm" && (response.status === 404 || response.status === 405) && provider.id === "siliconflow") {
      response = await fetch("/api/siliconflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, requestBody, schemaName })
      });
    } else if (response.status === 404 || response.status === 405) {
      throw new Error("当前运行中的本地服务还未加载火山方舟代理。请重新运行 start-local.ps1 后再使用火山方舟。");
    }
  } else {
    if (!apiKey) {
      throw new Error(`请先填写 ${provider.name} API Key，或配置托管代理地址后再发布。`);
    }
    try {
      response = await fetch(provider.chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
    } catch (error) {
      throw new Error(`浏览器无法直接连接 ${provider.name}。itch.io 只能托管静态网页；如果服务商不允许浏览器跨域请求，需要额外部署一个 HTTPS 代理服务。`);
    }
  }

  const requestDuration = performance.now() - requestStartedAt;
  setProgressStep(progress.parse, `收到响应，请求耗时 ${formatDuration(requestDuration)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.message || `请求失败，HTTP 状态码：${response.status}`;
    throw new Error(message);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error(`没有从 ${provider.name} 响应中读取到文本。请检查 Key、模型名或 Endpoint ID 是否正确。`);
  }

  try {
    const parsed = JSON.parse(stripCodeFence(outputText));
    completeProgressStep(progress.parse, "JSON 解析完成");
    return parsed;
  } catch {
    console.error("原始输出：", outputText);
    throw new Error("AI 返回的内容不是合法 JSON。可以重试一次，或换一个更稳定的模型。");
  }
}

function getSystemPrompt(schemaName) {
  if (schemaName === "continuation_story") {
    return "你是中文文字冒险游戏的严格裁判兼续写器。玩家目标是改写坏结局，但真正成功很少见，更多是失败或部分成功。只输出合法 JSON，不要解释。必须使用中文，保持原故事世界观，并按因果关系判定：普通宣言、情绪表达、玩笑、含糊承诺、临时发明的新机制或没有完整解决核心危机的台词不能判为好结局。";
  }
  return "你是中文文字冒险游戏的叙事引擎，擅长写实、武侠、奇幻、剑与魔法、科幻等背景。只输出合法 JSON，不要解释。必须使用中文，写具体行动故事，不写案例分析或英文故事；玩家目标是把坏结局改成好结局，但候选改写必须包含失败、中立和成功的不同可能。";
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
  if (typeof deltaContent === "string") return deltaContent.trim();

  console.warn("无法识别的模型响应结构：", data);
  return "";
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

async function buildInitialStoryPrompt() {
  const context = getStoryPromptContext();
  const randomSeed = Math.random().toString(36).slice(2, 10);
  const values = { ...context, random_seed: randomSeed };
  const [basePrompt, returnRules, romanceRules] = await Promise.all([
    getDefaultStoryPrompt(context),
    loadPromptTemplate(PROMPT_TEMPLATE_PATHS.storyReturnRules),
    isRomanceContext(context) ? loadPromptTemplate(PROMPT_TEMPLATE_PATHS.storyRomance) : Promise.resolve("")
  ]);

  return `${basePrompt}

${renderPromptTemplate(returnRules, values)}

${renderPromptTemplate(romanceRules, values)}`.trim();
}

function getStoryPayloadLength(payload) {
  if (!payload) return 0;
  const prefix = Array.isArray(payload.prefixParts) ? payload.prefixParts : [];
  const editable = Array.isArray(payload.editableParts) ? payload.editableParts : [];
  return countChars(partsToText(prefix) + partsToText(editable) + String(payload.suffixText || ""));
}

async function repairStoryLengthPayload(payload) {
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
    schemaName: "segmented_story",
    schema: storySchema,
    prompt: repairPrompt,
    temperature: 0.55,
    maxTokens: 2200,
    progress: { request: "request", parse: "parse" }
  });
}

function getContinuationSuffixTarget(fixedLength, oldSuffixLength) {
  const roomToMax = Math.max(80, STORY_MAX_CHARS - fixedLength);
  const roomToMin = Math.max(80, STORY_MIN_CHARS - fixedLength);
  const nearOldLength = Math.max(80, oldSuffixLength);
  return Math.max(roomToMin, Math.min(nearOldLength, roomToMax, 220));
}

async function buildContinuationPrompt(pending) {
  const fixedFront = partsToText(state.prefixParts);
  const fixedEditableText = partsToText(state.editableParts.slice(0, pending.startIndex));
  const oldRemainderText = partsToText(pending.oldRemainderParts);
  const oldRemainderLength = countChars(oldRemainderText);
  const oldSuffixLength = countChars(pending.oldSuffixText);
  const quoteCount = countPartsByType(pending.oldRemainderParts, "quote");
  const fixedLength = countChars(fixedFront + fixedEditableText);
  const suffixTarget = getContinuationSuffixTarget(fixedLength, oldSuffixLength);
  const changeSource = describeChangeSource(pending.changeRecord);
  const continuationDirective = getContinuationDirective(pending);
  const template = await loadPromptTemplate(PROMPT_TEMPLATE_PATHS.continuation);

  return renderPromptTemplate(template, {
    fixed_front: fixedFront,
    fixed_editable_text: fixedEditableText,
    old_remainder_text: oldRemainderText,
    old_suffix_text: pending.oldSuffixText,
    original_ending_type: state.endingType,
    original_ending_judgement: state.endingJudgement,
    change_record_json: JSON.stringify(pending.changeRecord),
    change_source: changeSource,
    continuation_directive: continuationDirective,
    all_changes_json: JSON.stringify(state.changes),
    protagonist_names: state.protagonistNames.join("、") || "未指定",
    old_remainder_length: oldRemainderLength,
    quote_count: quoteCount,
    suffix_target: suffixTarget,
    full_story_min: STORY_MIN_CHARS,
    full_story_max: STORY_MAX_CHARS,
    old_value: pending.changeRecord.oldValue,
    new_value: pending.changeRecord.newValue,
    fixed_length: fixedLength
  });
}

async function generateStory(options = {}) {
  const { demoMode = false, preserveChallenge = false } = options;
  try {
    setBusy(true, "AI 正在生成故事...");
    startProgress("AI 生成新故事", [
      { id: "prepare", label: "整理请求", detail: "合并 Prompt、模型和结构规则" },
      { id: "request", label: "等待 AI 返回", detail: "向模型请求分段故事 JSON" },
      { id: "parse", label: "解析 JSON", detail: "读取模型返回内容" },
      { id: "validate", label: "校验故事结构", detail: "检查字数、角色、台词和道具" },
      { id: "render", label: "更新故事", detail: "展示故事和关键情节" }
    ]);
    clearError();
    hideEnding();

    let normalized = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        setProgressStep("prepare", "读取故事模板和当前故事设定");
        const storyPrompt = await buildInitialStoryPrompt();
        let result = await callLLM({
          schemaName: "segmented_story",
          schema: storySchema,
          prompt: storyPrompt,
          temperature: 0.72,
          maxTokens: 2400,
          progress: { prepare: "prepare", request: "request", parse: "parse" }
        });
        setProgressStep("validate", `第 ${attempt} 次返回，正在校验故事结构`);
        const rawLength = getStoryPayloadLength(result);
        if (rawLength < STORY_REPAIR_MIN_CHARS || rawLength > STORY_REPAIR_MAX_CHARS) {
          setProgressStep("validate", `故事约 ${rawLength} 字，正在进行一次长度修正`);
          result = await repairStoryLengthPayload(result);
        }
        normalized = normalizeStoryPayload(result);
        completeProgressStep("validate", "故事结构可用");
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          setProgressStep("request", `第 ${attempt} 次未通过，正在自动重试`);
        }
      }
    }

    if (!normalized) throw lastError || new Error("故事生成失败，请重试。");
    setProgressStep("render", "准备渲染故事");
    loadStory(normalized, demoMode, { preserveChallenge });
    completeProgressStep("render", "故事已展示");
    finishProgress("故事生成完成");
  } catch (error) {
    failProgress(error.message);
    showError(error.message);
  } finally {
    setBusy(false);
  }
}

function loadDemoStory() {
  state.gameMode = "experience";
  loadStory(normalizeStoryPayload(demoStory), true, { preserveChallenge: false });
  clearError();
  hideEnding();
}

function loadStory(story, demoMode, options = {}) {
  const { preserveChallenge = false } = options;
  story = normalizeStoryParagraphPayload(story);
  state.currentTitle = story.title;
  state.originalPrefixParts = deepCopy(story.prefixParts);
  state.originalEditableParts = deepCopy(story.editableParts);
  state.originalSuffixText = story.suffixText;
  state.originalEndingType = story.endingType;
  state.originalEndingJudgement = story.endingJudgement;
  state.originalProtagonistNames = deepCopy(story.protagonistNames);
  state.originalAllRoleNames = deepCopy(story.allRoleNames);
  state.prefixParts = deepCopy(story.prefixParts);
  state.editableParts = deepCopy(story.editableParts);
  state.suffixText = story.suffixText;
  state.endingType = story.endingType;
  state.endingJudgement = story.endingJudgement;
  state.protagonistNames = deepCopy(story.protagonistNames);
  state.allRoleNames = deepCopy(story.allRoleNames);
  state.changeCount = 0;
  state.changes = [];
  state.selectedTarget = null;
  state.selectedValue = "";
  state.isFinished = false;
  state.suffixUnknown = false;
  state.pendingRegeneration = null;
  state.demoMode = demoMode;
  if (!preserveChallenge) {
    state.challengeActive = false;
    state.challengeFinished = false;
    state.challengeLevel = 0;
    state.challengeEnergy = CHALLENGE_MAX_ENERGY;
    state.challengeGoodCount = 0;
  }
  renderStory();
  updateUI();
}

function isChallengeMode() {
  return state.gameMode === "challenge";
}

function canRewriteStory() {
  if (!state.editableParts.length || state.isBusy || state.suffixUnknown || state.isFinished) return false;
  if (!isChallengeMode()) return true;
  return state.challengeActive && !state.challengeFinished && state.challengeEnergy > 0;
}

async function startChallenge() {
  state.gameMode = "challenge";
  state.challengeEnergy = CHALLENGE_MAX_ENERGY;
  state.challengeGoodCount = 0;
  state.challengeLevel = 0;
  state.challengeActive = true;
  state.challengeFinished = false;
  await generateChallengeLevel();
}

async function generateChallengeLevel() {
  if (!isChallengeMode() || state.challengeFinished || state.isBusy) return;
  if (state.challengeActive && state.challengeLevel > 0 && state.endingType !== "good") return;
  randomizeChallengeSettings();
  state.challengeLevel += 1;
  await generateStory({ preserveChallenge: true });
  updateUI();
}

function enterGameMode(mode) {
  state.gameMode = mode === "challenge" ? "challenge" : "experience";
  if (!isChallengeMode()) {
    state.challengeActive = false;
    state.challengeFinished = false;
  }
  modeScreen.hidden = true;
  appShell.hidden = false;
  clearError();
  hideEnding();
  updateUI();
}

function returnToModeScreen() {
  modeScreen.hidden = false;
  appShell.hidden = true;
  closeModal();
  clearError();
  hideEnding();
}

function setupIconPicker(selectEl, options, assetMap, ariaLabel) {
  if (!selectEl || !Array.isArray(options) || !options.length) return;
  selectEl.classList.add("native-icon-select");

  const picker = document.createElement("div");
  picker.className = "icon-picker";
  picker.setAttribute("role", "radiogroup");
  picker.setAttribute("aria-label", ariaLabel);

  const buttons = options.map(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-choice";
    button.dataset.value = option.id;
    button.setAttribute("role", "radio");
    button.innerHTML = `
      <img src="${assetMap[option.id] || ""}" alt="" aria-hidden="true" />
      <span>${escapeHTML(option.label)}</span>
    `;
    button.addEventListener("click", () => {
      if (button.disabled) return;
      selectEl.value = option.id;
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    });
    picker.appendChild(button);
    return button;
  });

  selectEl.insertAdjacentElement("afterend", picker);

  const refresh = () => {
    buttons.forEach(button => {
      const active = button.dataset.value === selectEl.value;
      button.classList.toggle("active", active);
      button.disabled = selectEl.disabled;
      button.setAttribute("aria-checked", active ? "true" : "false");
    });
  };

  selectEl.addEventListener("change", refresh);
  iconPickers.push(refresh);
  refresh();
}

function refreshIconPickers() {
  iconPickers.forEach(refresh => refresh());
}

async function openReplaceModal(partIndex) {
  if (state.isFinished || state.isBusy || state.suffixUnknown) return;
  if (!state.editableParts.length) {
    showError("请先生成故事。");
    return;
  }
  if (!canRewriteStory()) return;

  const part = state.editableParts[partIndex];
  if (!part || part.type !== "quote") return;

  state.selectedTarget = partIndex;
  state.selectedValue = "";
  state.selectedOptionSource = "";
  state.selectedOptionIndex = null;
  modalWarning.textContent = "";
  optionList.innerHTML = "";
  applyBtn.disabled = true;

  modalTitle.textContent = "替换关键台词";
  modalDesc.textContent = `当前内容：${part.value}`;
  modalMask.classList.add("show");

  try {
    const options = normalizeOptions(part.replacementOptions, part.value);

    optionList.innerHTML = "";
    options.forEach((option, index) => createOption(option, index));
    createCustomQuoteOption(part.value, options.length);
    applyBtn.disabled = !state.selectedValue;
    if (options.length === 0) {
      modalWarning.textContent = "当前台词没有预生成候选项，你可以手动填写改写台词。";
    }
  } catch (error) {
    modalWarning.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

function createOption(optionText, index) {
  const normalizedOption = normalizeQuoteValue(optionText);
  const label = document.createElement("label");
  label.className = "option";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "replaceOption";
  radio.value = normalizedOption;

  if (index === 0) {
    radio.checked = true;
    state.selectedValue = normalizedOption;
    state.selectedOptionSource = "candidate";
    state.selectedOptionIndex = index;
  }

  radio.addEventListener("change", () => {
    state.selectedValue = normalizedOption;
    state.selectedOptionSource = "candidate";
    state.selectedOptionIndex = index;
    applyBtn.disabled = false;
    if (modalWarning.textContent === "新台词不能和原台词相同。") {
      modalWarning.textContent = "";
    }
  });

  const span = document.createElement("span");
  span.textContent = normalizedOption;
  label.append(radio, span);
  optionList.append(label);
}

function createCustomQuoteOption(originalValue, index) {
  const label = document.createElement("label");
  label.className = "option custom-option";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "replaceOption";
  radio.value = "__custom_quote__";

  const body = document.createElement("span");
  body.className = "custom-option-body";

  const title = document.createElement("strong");
  title.textContent = "自己填写台词";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "输入一句新的关键台词";
  input.autocomplete = "off";

  const syncCustomValue = () => {
    radio.checked = true;
    const value = normalizeQuoteValue(input.value);
    state.selectedValue = value && value !== originalValue ? value : "";
    state.selectedOptionSource = "custom";
    state.selectedOptionIndex = null;
    applyBtn.disabled = !state.selectedValue;
    if (value === originalValue) {
      modalWarning.textContent = "新台词不能和原台词相同。";
    } else if (modalWarning.textContent === "新台词不能和原台词相同。") {
      modalWarning.textContent = "";
    }
  };

  radio.addEventListener("change", () => {
    syncCustomValue();
    input.focus();
  });

  input.addEventListener("focus", () => {
    radio.checked = true;
    syncCustomValue();
  });

  input.addEventListener("input", syncCustomValue);

  if (index === 0) {
    radio.checked = true;
  }

  body.append(title, input);
  label.append(radio, body);
  optionList.append(label);
}

async function applyReplacement() {
  if (state.selectedTarget === null || !state.selectedValue || state.isBusy) return;
  if (!canRewriteStory()) return;

  const clickedIndex = state.selectedTarget;
  const beforeChangeEditableParts = deepCopy(state.editableParts);
  const beforeChangeSuffixText = state.suffixText;
  const part = state.editableParts[clickedIndex];
  if (!part || part.type !== "quote") return;
  const oldValue = normalizeQuoteValue(part.value);
  const newValue = normalizeQuoteValue(state.selectedValue);
  if (!newValue || newValue === oldValue) return;
  const affectedCount = applyLinkedReplacementBeforeOrAtIndex(part.type, oldValue, newValue, clickedIndex);
  const startIndex = clickedIndex + 1;

  const changeRecord = {
    type: part.type,
    oldValue,
    newValue,
    optionSource: state.selectedOptionSource || "custom",
    optionIndex: state.selectedOptionIndex,
    affectedCount,
    startIndex
  };

  state.changeCount += 1;
  state.changes.push(changeRecord);
  state.pendingRegeneration = {
    startIndex,
    oldRemainderParts: beforeChangeEditableParts.slice(startIndex),
    oldSuffixText: beforeChangeSuffixText,
    changeRecord
  };

  state.suffixUnknown = true;
  closeModal();
  hideEnding();
  renderStory();
  updateUI();

  await regenerateContinuation(false);
}

function applyLinkedReplacementBeforeOrAtIndex(type, oldValue, newValue, maxIndex) {
  const aliases = buildReplacementAliases(type, oldValue, newValue);
  let affectedCount = 0;

  state.editableParts.forEach((part, index) => {
    if (index > maxIndex) return;

    if (part.type === type && part.value === oldValue) {
      part.value = newValue;
      affectedCount += 1;
      return;
    }

    if (type === "item" && part.type === "item") {
      const alias = aliases.find(pair => part.value === pair.oldText);
      if (alias) {
        part.value = alias.newText;
        affectedCount += 1;
        return;
      }
    }

    if (part.type === "text") {
      const nextValue = replaceAliasesInText(part.value, aliases);
      if (nextValue !== part.value) {
        part.value = nextValue;
        affectedCount += 1;
      }
    }
  });

  if (type === "role") {
    state.allRoleNames = uniqueList(state.allRoleNames.concat(newValue));
  }

  return Math.max(affectedCount, 1);
}

function replaceAliasesInText(text, aliases) {
  let nextValue = text;
  aliases.forEach(pair => {
    if (pair.oldText && pair.oldText !== pair.newText && nextValue.includes(pair.oldText)) {
      nextValue = nextValue.split(pair.oldText).join(pair.newText);
    }
  });
  return nextValue;
}

function buildReplacementAliases(type, oldValue, newValue) {
  const aliases = [{ oldText: oldValue, newText: newValue }];
  if (type === "item") {
    const oldCore = getItemCoreName(oldValue);
    const newCore = getItemCoreName(newValue);
    if (oldCore && newCore && oldCore !== oldValue) {
      aliases.push({ oldText: oldCore, newText: newCore });
    }
  }
  return aliases;
}

function getItemCoreName(value) {
  const coreNames = [
    "钥匙", "罗盘", "地图", "信", "剑", "刀", "灯", "镜", "书", "笔", "铃", "令牌",
    "戒指", "项链", "面具", "钟", "纸条", "卷轴", "手环", "羽毛", "火柴", "扇子",
    "药瓶", "徽章", "匕首", "笔记", "月亮", "怀表"
  ];
  return coreNames.filter(name => String(value).endsWith(name)).sort((a, b) => b.length - a.length)[0] || value;
}

async function regenerateContinuation(finalizeAfterGenerate) {
  if (!state.pendingRegeneration) return;

  try {
    setBusy(true, "正在从改动点之后续写...");
    startProgress(finalizeAfterGenerate ? "续写并结束故事" : "AI 重写后续故事", [
      { id: "prepare", label: "锁定改动点", detail: "保留改动点之前的故事" },
      { id: "request", label: "等待 AI 续写", detail: "请求重写后续特殊情节和后文" },
      { id: "parse", label: "解析续写结果", detail: "读取 rewrittenEditableParts 和 rewrittenSuffix" },
      { id: "validate", label: "校验续写", detail: "检查后文是否可展示" },
      { id: "render", label: "更新故事", detail: "替换改动点之后的内容" }
    ]);
    clearError();

    const pending = deepCopy(state.pendingRegeneration);
    let result = null;
    const secretGoodEnding = isSecretGoodEndingPhrase(pending.changeRecord.newValue);
    if (false && secretGoodEnding) {
      setProgressStep("prepare", "发现隐藏改写台词");
      setProgressStep("request", "彩蛋触发，直接改写为好结局");
      result = createSecretGoodEndingDemoContinuation(pending);
      setProgressStep("parse", "整理彩蛋结局");
      completeProgressStep("parse", "彩蛋结局已生成");
    } else if (state.demoMode && !apiKeyInput.value.trim()) {
      setProgressStep("prepare", `改动从特殊情节第 ${pending.startIndex + 1} 段之后生效`);
      setProgressStep("request", "示例模式正在本地生成后续");
      result = secretGoodEnding
        ? createSecretGoodEndingDemoContinuation(pending)
        : await createDemoContinuation(pending);
      setProgressStep("parse", "整理示例续写结果");
      completeProgressStep("parse", "示例续写已生成");
    } else {
      const continuationPrompt = await buildContinuationPrompt(pending);
      result = await callLLM({
        schemaName: "continuation_story",
        schema: continuationSchema,
        prompt: continuationPrompt,
        temperature: 0.62,
        maxTokens: 1500,
        progress: { prepare: "prepare", request: "request", parse: "parse" }
      });
    }

    setProgressStep("validate", "检查 AI 返回的后文和结局判定");
    const rewrittenEditableParts = cleanParts(Array.isArray(result.rewrittenEditableParts) ? result.rewrittenEditableParts : []);
    const rewrittenSuffix = String(result.rewrittenSuffix || "").trim();
    const foldedSuffix = normalizeStoryLineBreaks(dedupeRepeatedText(`${partsToText(rewrittenEditableParts)}${rewrittenSuffix}`.trim()));
    if (!foldedSuffix) throw new Error("AI 没有返回新的后文，请重试。");
    const nextEndingType = secretGoodEnding ? "good" : normalizeEndingType(result.endingType, "bad");
    const nextEndingJudgement = String(
      secretGoodEnding
        ? result.endingJudgement || "好结局：咕咕嘎嘎被合理化为关键台词，主角解决了核心危机。"
        : result.endingJudgement || getOutcomeMeta(nextEndingType).defaultText
    ).trim();
    completeProgressStep("validate", `${getOutcomeMeta(nextEndingType).label}，${getOutcomeMeta(nextEndingType).result}`);

    setProgressStep("render", "写入新的特殊情节和后文");
    state.editableParts = state.editableParts.slice(0, pending.startIndex);
    state.suffixText = foldedSuffix;
    state.endingType = nextEndingType;
    state.endingJudgement = nextEndingJudgement;
    applyChallengeOutcome(nextEndingType);
    state.suffixUnknown = false;
    state.pendingRegeneration = null;

    if (finalizeAfterGenerate) state.isFinished = true;

    renderStory();
    updateUI();
    completeProgressStep("render", "故事已更新");

    if (finalizeAfterGenerate) {
      showFinalStory(result.changeSummary || "这次改写改变了后续故事。");
    }
    finishProgress(finalizeAfterGenerate ? "最终故事已生成" : "后续故事已重写");
  } catch (error) {
    failProgress(error.message);
    showError(error.message);
  } finally {
    setBusy(false);
  }
}

function applyChallengeOutcome(endingType) {
  if (!isChallengeMode() || !state.challengeActive || state.challengeFinished) return;

  if (endingType === "bad") {
    state.challengeEnergy = Math.max(0, state.challengeEnergy - 1);
    if (state.challengeEnergy <= 0) {
      state.challengeFinished = true;
      state.isFinished = true;
      showFinalStory(`能量耗尽，本次闯关结束。你一共达成 ${state.challengeGoodCount} 个好结局。`);
    }
    return;
  }

  if (endingType === "good") {
    state.challengeGoodCount += 1;
    state.isFinished = true;
  }
}

async function createDemoContinuation(pending) {
  await wait(520);
  const { oldValue, newValue, type } = pending.changeRecord;
  const typeText = getTypeName(type);
  const rewrittenEditableParts = pending.oldRemainderParts.map(part => {
    if (part.type === "text") {
      return { ...part, value: replaceAliasesInText(part.value, buildReplacementAliases(type, oldValue, newValue)) };
    }
    return { ...part };
  });

  const goodTriggers = ["银色火柴", "钥匙其实在海底", "让我替你留下", "云笙"];
  const neutralTriggers = ["裂纹罗盘", "镇长偷走了明天", "阿澄"];
  const endingType = goodTriggers.some(trigger => newValue.includes(trigger))
    ? "good"
    : neutralTriggers.some(trigger => newValue.includes(trigger))
      ? "neutral"
      : "bad";

  const endings = {
    bad: {
      suffix: `${newValue}并没有改变钟楼的核心机关，反而让梁镇长更快发现阿澄的意图。他把所有齿轮拨回逆行，镇民忘记守夜人的名字，也忘记云笙曾经存在。阿澄被留在钟面背后，望潮镇继续感谢梁镇长救了他们。`,
      judgement: "仍然是坏结局：改写没有解决封印记忆的核心危机，主角失败。"
    },
    neutral: {
      suffix: `${newValue}让钟声短暂停住，阿澄救下了几段被偷走的记忆，却没能打开封住全镇的门。梁镇长失去部分权力，云笙也只在月光出现时能被看见。望潮镇不再完全沉睡，但真正的海仍被困在钟楼之后。`,
      judgement: "中立结局：危机被缓和，但云笙和望潮镇都没有真正获救。"
    },
    good: {
      suffix: `${newValue}点亮齿轮深处的旧誓言，所有被偷走的昨日一同回到镇民心里。梁镇长的影子被晨光钉在钟面背后，云笙把纸月亮折成小船，带阿澄走出钟声的缝隙。天亮时，望潮镇第一次听见真正的海。`,
      judgement: "好结局：核心危机被解除，云笙和望潮镇都被救回。"
    }
  };
  const outcome = endings[endingType];

  return {
    rewrittenEditableParts,
    rewrittenSuffix: outcome.suffix,
    endingType,
    endingJudgement: outcome.judgement,
    changeSummary: `把${typeText}“${oldValue}”换成“${newValue}”，AI 判定为${getOutcomeMeta(endingType).label}。`
  };
}

function createSecretGoodEndingDemoContinuation(pending) {
  const { oldValue, newValue, type } = pending.changeRecord;
  const typeText = getTypeName(type);
  const protagonist = state.protagonistNames[0] || "主角";
  const suffix = `“${newValue}”像一枚荒唐却准确的钥匙，正好撞上危机里最隐蔽的缝隙。${protagonist}顺势抓住机会，让原本失控的力量停了下来；误会被拆开，追逼者也失去继续伤害他的理由。坏结局被彻底绕开，故事抵达了一个意外明亮的出口。`;

  return {
    rewrittenEditableParts: [],
    rewrittenSuffix: suffix,
    endingType: "good",
    endingJudgement: "好结局：隐藏台词触发彩蛋，主角直接避开坏结局。",
    changeSummary: `把${typeText}“${oldValue}”换成“${newValue}”，彩蛋触发为好结局。`
  };
}

function isSecretGoodEndingPhrase(value) {
  const normalized = normalizeQuoteValue(value)
    .replace(/[\s"'`~!?.,:;()[\]{}<>_\-+=|\\/]/g, "")
    .replace(/[\u3000-\u303f\uff00-\uffef]/g, "");
  return normalized === SECRET_GOOD_ENDING_PHRASE;
}

async function finishStory() {
  if (state.changeCount === 0 || state.isBusy) return;
  if (state.suffixUnknown && state.pendingRegeneration) {
    await regenerateContinuation(true);
    return;
  }

  state.isFinished = true;
  renderStory();
  updateUI();
  showFinalStory("改写结束，当前故事成为最终版本。");
}

function renderStory() {
  storyTitleEl.textContent = state.currentTitle || "尚未生成";
  const visibleLength = countChars(getVisibleStoryText());
  charCountEl.textContent = `${visibleLength} 字`;
  if (editableInfoEl) {
    editableInfoEl.textContent = state.editableParts.length
      ? `关键情节约 ${countChars(partsToText(state.editableParts))} 字`
      : "关键情节：未生成";
  }
  storyEl.innerHTML = "";
  updateOutcomeDisplay(Boolean(state.editableParts.length));

  if (!state.editableParts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-story";
    empty.textContent = "选择世界观和故事主题，填写或留空核心要素，然后生成新故事。";
    storyEl.append(empty);
    return;
  }

  appendPlainTextParagraphs(storyEl, partsToText(state.prefixParts), "story-paragraph");

  const zoneParagraph = document.createElement("p");
  zoneParagraph.className = "story-paragraph key-paragraph";
  const zone = document.createElement("span");
  zone.className = "editable-zone";
  const label = document.createElement("span");
  label.className = "zone-label";
  label.textContent = "关键情节";
  zone.append(label);

  const visibleLimit = state.suffixUnknown && state.pendingRegeneration
    ? state.pendingRegeneration.startIndex
    : state.editableParts.length;

  state.editableParts.forEach((part, index) => {
    if (index >= visibleLimit) return;

    if (part.type === "text") {
      zone.append(document.createTextNode(part.value));
      return;
    }

    if (part.type !== "quote") {
      zone.append(document.createTextNode(part.value));
      return;
    }

    const button = document.createElement("span");
    button.className = "editable quote";
    button.textContent = `“${part.value}”`;
    button.dataset.index = String(index);
    button.dataset.type = part.type;
    button.title = "点击替换这句台词";
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.addEventListener("click", () => openReplaceModal(index));
    button.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openReplaceModal(index);
    });

    if (!canRewriteStory()) {
      button.classList.add("locked");
      button.setAttribute("aria-disabled", "true");
      button.removeAttribute("tabindex");
    }

    zone.append(button);
  });

  if (state.suffixUnknown) {
    const inlineUnknown = document.createElement("span");
    inlineUnknown.className = "inline-unknown";
    inlineUnknown.textContent = "后续生成中";
    zone.append(inlineUnknown);
  }

  zoneParagraph.append(zone);
  storyEl.append(zoneParagraph);

  if (state.suffixUnknown) {
    const unknown = document.createElement("div");
    unknown.className = "unknown-tail";
    unknown.innerHTML = `
      <strong>改动点之后的故事正在重新生成</strong>
      <div class="unknown-line"></div>
      <div class="unknown-line"></div>
      <div class="unknown-line"></div>
    `;
    storyEl.append(unknown);
  } else {
    appendEndingText(storyEl, state.suffixText, state.endingType);
  }
}

function appendPlainTextParagraphs(container, text, className) {
  splitNaturalParagraphs(text).forEach(paragraphText => {
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = paragraphText;
    container.append(paragraph);
  });
}

function appendPlainParts(container, parts) {
  parts.forEach(part => container.append(document.createTextNode(part.value)));
}

function appendEndingText(container, text, endingType) {
  const meta = getOutcomeMeta(endingType);
  splitNaturalParagraphs(text).forEach((paragraphText, index) => {
    const paragraph = document.createElement("p");
    paragraph.className = index === 0
      ? "story-paragraph ending-paragraph ending-label-paragraph"
      : "story-paragraph ending-paragraph";
    const ending = document.createElement("span");
    ending.className = `story-ending ${meta.className}`;

    if (index === 0) {
      const label = document.createElement("span");
      label.className = "story-ending-label";
      label.textContent = meta.label;
      ending.append(label);
    }

    ending.append(document.createTextNode(paragraphText));
    paragraph.append(ending);
    container.append(paragraph);
  });
}

function updateOutcomeDisplay(hasStory) {
  if (!hasStory) {
    if (outcomeBadge) {
      outcomeBadge.className = "outcome-badge neutral";
      outcomeBadge.textContent = "未生成";
    }
    outcomeNotice.hidden = true;
    return;
  }

  if (state.suffixUnknown) {
    if (outcomeBadge) {
      outcomeBadge.className = "outcome-badge neutral";
      outcomeBadge.textContent = "判定中";
    }
    outcomeNotice.hidden = true;
    return;
  }

  const meta = getOutcomeMeta(state.endingType);
  if (outcomeBadge) {
    outcomeBadge.className = `outcome-badge ${meta.className}`;
    outcomeBadge.textContent = meta.label;
  }
  outcomeNotice.className = `outcome-notice ${meta.className}`;
  outcomeNotice.hidden = false;
  outcomeNoticeTitle.textContent = `${meta.label} - ${meta.result}`;
  outcomeNoticeText.textContent = state.endingJudgement || meta.defaultText;
}

function updateUI() {
  if (changeCountEl) changeCountEl.textContent = String(state.changeCount);
  const challenge = isChallengeMode();
  if (storySettingsSection) storySettingsSection.hidden = challenge;
  challengeStatus.hidden = !challenge;
  appShell.classList.toggle("challenge-layout", challenge);
  energyCountEl.textContent = String(state.challengeEnergy);
  goodEndingCountEl.textContent = String(state.challengeGoodCount);
  challengeHint.textContent = state.challengeFinished
    ? `闯关结束，最终得分：${state.challengeGoodCount}。切换模式或重新开始闯关可再来一局。`
    : state.challengeActive
      ? `第 ${Math.max(state.challengeLevel, 1)} 关：坏结局扣 1 点能量，中立和好结局不扣能量。`
      : "点击“开始闯关”后，将随机生成世界观、故事主题和核心要素。";

  const metric = changeCountEl?.closest("#rewriteMetric");
  if (metric) {
    metric.innerHTML = challenge
      ? `闯关 <strong id="changeCount">${Math.max(state.challengeLevel, 0)}</strong>`
      : `已改写 <strong id="changeCount">${state.changeCount}</strong> 次`;
    changeCountEl = $("#changeCount");
  }

  generateBtn.hidden = challenge;
  demoBtn.hidden = challenge;
  resetBtn.hidden = challenge;
  finishBtn.hidden = challenge;
  challengeStartBtn.hidden = !challenge;
  nextLevelBtn.hidden = !challenge;
  challengeStartBtn.textContent = state.challengeFinished ? "重新开始闯关" : "开始闯关";
  challengeStartBtn.disabled = state.isBusy || (state.challengeActive && !state.challengeFinished);
  nextLevelBtn.disabled = state.isBusy || !state.challengeActive || state.challengeFinished || state.endingType !== "good";
  finishBtn.disabled = state.changeCount === 0 || state.isFinished || state.isBusy;
  resetBtn.disabled = !state.originalEditableParts.length || state.isBusy;
  generateBtn.disabled = state.isBusy;
  demoBtn.disabled = state.isBusy;
  worldviewSelect.disabled = state.isBusy || challenge;
  storyThemeSelect.disabled = state.isBusy || challenge;
  motifInput.disabled = state.isBusy || challenge;
  refreshIconPickers();

  if (state.changeCount === 0) {
    logListEl.innerHTML = state.editableParts.length
      ? "<li>还没有改写。</li>"
      : "<li>还没有故事。</li>";
    return;
  }

  logListEl.innerHTML = state.changes.map(change => {
    const affectedText = change.affectedCount > 1 ? `（同步影响 ${change.affectedCount} 处）` : "";
    return `<li>${getTypeName(change.type)}：${escapeHTML(change.oldValue)} -> ${escapeHTML(change.newValue)}${affectedText}</li>`;
  }).join("");
}

function setBusy(value, text = "AI 正在写作...") {
  state.isBusy = value;
  loadingText.textContent = text;
  if (!value) actionProgressFill.style.width = "0%";
  loading.classList.toggle("show", value);
  renderStory();
  updateUI();
}

function showFinalStory(summary) {
  const meta = getOutcomeMeta(state.endingType);
  finalTitleEl.textContent = `最终判定：${meta.label} - ${meta.result}`;
  finalStoryEl.textContent = getReadableFullStoryText();
  endingTextEl.textContent = `${state.endingJudgement || meta.defaultText}${summary ? ` ${summary}` : ""}`;
  endingPanel.className = `ending ${meta.className}`;
  endingPanel.classList.add("show");
  endingPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("show");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.remove("show");
}

function hideEnding() {
  endingPanel.classList.remove("show");
  endingPanel.className = "ending";
  finalTitleEl.textContent = "最终故事";
  finalStoryEl.textContent = "";
  endingTextEl.textContent = "";
}

function normalizeStoryPayload(payload) {
  if (!payload || !Array.isArray(payload.prefixParts) || !Array.isArray(payload.editableParts)) {
    throw new Error("AI 返回的故事结构不完整，请重试。缺少 prefixParts 或 editableParts。");
  }

  const prefix = cleanParts(payload.prefixParts);
  let editable = cleanParts(payload.editableParts);
  const suffix = String(payload.suffixText || "").trim();
  const endingType = "bad";
  const endingJudgement = String(payload.endingJudgement || "坏结局：初始故事需要玩家通过改写来拯救。").trim();
  const rolesFromPayload = Array.isArray(payload.allRoleNames) ? payload.allRoleNames : [];
  let allRoles = uniqueList(rolesFromPayload.concat(getRolesFromParts(prefix)).concat(getRolesFromParts(editable)));

  const fullText = partsToText(prefix) + partsToText(editable) + suffix;
  let protagonistNames = uniqueList(Array.isArray(payload.protagonistNames) ? payload.protagonistNames : []);
  protagonistNames = protagonistNames.filter(name => allRoles.includes(name) || fullText.includes(name));
  if (!protagonistNames.length && allRoles.length) {
    protagonistNames = [allRoles[0]];
  }
  allRoles = uniqueList(allRoles.concat(protagonistNames));
  editable = sanitizeEditableQuotesForRoles(editable, allRoles);
  assertReplacementOptions(editable);
  assertEditableQuoteQuality(editable);
  const fullLength = countChars(fullText);
  const prefixLength = countChars(partsToText(prefix));
  const editableLength = countChars(partsToText(editable));
  const editableStartRatio = prefixLength / Math.max(fullLength, 1);
  const quoteParts = getQuoteParts(editable);
  const hasQuote = quoteParts.length > 0;

  if (fullLength < STORY_MIN_CHARS || fullLength > STORY_MAX_CHARS) {
    console.warn(`故事长度是 ${fullLength} 字，偏离 ${STORY_MIN_CHARS} 到 ${STORY_MAX_CHARS} 字目标。`);
  }
  if (editableLength < 38 || editableLength > 75) {
    console.warn(`特殊情节长度是 ${editableLength} 字，偏离约 50 字目标。`);
  }
  if (editableStartRatio < 0.55 || editableStartRatio > 0.75) {
    console.warn(`特殊情节起始位置约为全文 ${Math.round(editableStartRatio * 100)}%。`);
  }

  if (!hasQuote) {
    throw new Error("关键情节缺少可改写台词，请重新生成。");
  }
  if (quoteParts.length > 1) {
    throw new Error("关键情节只能有一句可改写台词，请重新生成。");
  }
  if (!hasAttributedQuote(editable, allRoles)) {
    console.warn("关键台词附近没有明确出现说话角色名。");
  }
  if (!protagonistNames.length) {
    console.warn("故事缺少明确主角，已继续展示但建议重新生成。");
  } else if (!protagonistNames.some(name => fullText.includes(name))) {
    console.warn(`主角 ${protagonistNames.join("、")} 没有清晰出现在故事正文中。`);
  }
  let quoteSpeakerNames = getQuoteSpeakerNames(editable, allRoles);
  if (!quoteSpeakerNames.some(name => protagonistNames.includes(name))) {
    editable = repairEditableToProtagonistQuote(editable, protagonistNames);
    quoteSpeakerNames = getQuoteSpeakerNames(editable, allRoles);
    if (!quoteSpeakerNames.some(name => protagonistNames.includes(name))) {
      throw new Error("关键台词无法改造成主角说出的台词，请重新生成。");
    }
  }

  return {
    title: Array.from(String(payload.title || "未命名")).slice(0, 12).join(""),
    prefixParts: prefix,
    editableParts: editable,
    suffixText: suffix,
    endingType,
    endingJudgement,
    protagonistNames,
    allRoleNames: allRoles
  };
}

function cleanParts(parts) {
  const allowedTypes = ["text", "role", "quote", "item"];
  const cleanedParts = parts
    .filter(part => part && allowedTypes.includes(part.type) && typeof part.value === "string" && part.value.trim())
    .map(part => {
      const value = part.type === "quote" ? normalizeQuoteValue(part.value) : part.value.trim();
      const cleanPart = { type: part.type, value };
      if (part.type === "quote") {
        cleanPart.replacementOptions = ensureReplacementOptions(part.replacementOptions, part.type, cleanPart.value);
      }
      return cleanPart;
    });
  return splitQuotedSpeechParts(cleanedParts);
}

function splitQuotedSpeechParts(parts) {
  return parts.flatMap(part => {
    if (part.type !== "quote") return [part];
    const split = splitQuotedSpeech(part.value);
    if (!split) return [part];

    const quotePart = { ...part, value: normalizeQuoteValue(split.quote) };
    return [
      split.before ? { type: "text", value: split.before } : null,
      quotePart,
      split.after ? { type: "text", value: split.after } : null
    ].filter(Boolean);
  });
}

function sanitizeEditableQuotesForRoles(parts, roleNames) {
  return parts.map(part => {
    if (part.type !== "quote") return part;
    const value = normalizeQuoteForRoles(part.value, roleNames);
    return {
      ...part,
      value,
      replacementOptions: normalizeOptionsForRoles(part.replacementOptions, value, roleNames)
    };
  });
}

function normalizeOptionsForRoles(options, originalValue, roleNames) {
  const normalizedOriginal = normalizeQuoteForRoles(originalValue, roleNames);
  if (!Array.isArray(options)) return [];
  return uniqueList(
    options
      .filter(item => typeof item === "string")
      .map(item => normalizeQuoteForRoles(item, roleNames))
      .filter(item => item && item !== normalizedOriginal)
  ).slice(0, 3);
}

function normalizeQuoteForRoles(value, roleNames) {
  let text = normalizeQuoteValue(value);
  const roles = uniqueList(roleNames).filter(name => countChars(name) >= 2);
  roles.forEach(name => {
    const escapedName = escapeRegExp(name);
    const speechVerbs = "(?:说|道|问|喊|答|低声说|轻声说|高声说|默默说|喝道|叫道|提醒|命令|承认|开口说)";
    text = text
      .replace(new RegExp(`^${escapedName}\\s*(?:${speechVerbs})?\\s*[：:，,、]\\s*`), "")
      .replace(new RegExp(`^${escapedName}\\s*(?:${speechVerbs})\\s*`), "")
      .replace(new RegExp(`^[“”"'‘’「」『』\\s]*${escapedName}\\s*(?:${speechVerbs})?\\s*[：:，,、]\\s*`), "")
      .trim();
    text = text
      .replace(new RegExp(`[，,。；;、\\s]*${escapedName}\\s*(?:${speechVerbs}).*$`), "")
      .trim();
  });
  return normalizeQuoteValue(text);
}

function repairEditableToProtagonistQuote(parts, protagonistNames) {
  const protagonist = uniqueList(protagonistNames)[0];
  const quotePart = getQuoteParts(parts)[0];
  if (!protagonist || !quotePart) return parts;
  const openings = [
    `${protagonist}\u8bf4\uff1a`
  ];
  const endings = [
    "\u3002"
  ];
  const opening = openings[Math.floor(Math.random() * openings.length)];
  const ending = endings[Math.floor(Math.random() * endings.length)];

  return [
    { type: "text", value: opening },
    {
      type: "quote",
      value: normalizeQuoteForRoles(quotePart.value, protagonistNames),
      replacementOptions: normalizeOptionsForRoles(quotePart.replacementOptions, quotePart.value, protagonistNames)
    },
    { type: "text", value: ending }
  ];
}

function splitQuotedSpeech(value) {
  const text = String(value).trim();
  const pairs = [
    ["“", "”"],
    ["\"", "\""],
    ["「", "」"],
    ["『", "』"]
  ];

  for (const [left, right] of pairs) {
    const start = text.indexOf(left);
    const end = text.lastIndexOf(right);
    if (start >= 0 && end > start) {
      const quote = text.slice(start + left.length, end).trim();
      if (quote) {
        return {
          before: text.slice(0, start).trim(),
          quote,
          after: text.slice(end + right.length).trim()
        };
      }
    }
  }

  const speechVerbs = "(?:低声说|默默地说|提醒|回答|命令|嘱咐|低语|耳语|喝道|笑道|说|问|喊|叫|道)";
  const colonMatch = text.match(new RegExp(`^(.{1,16}?${speechVerbs}[：:])(.+)$`));
  if (colonMatch) {
    return {
      before: colonMatch[1].trim(),
      quote: colonMatch[2].trim(),
      after: ""
    };
  }

  const tailMatch = text.match(new RegExp(`^(.+?)([，,。；;、]\\s*[^，,。；;、]{1,18}${speechVerbs}.*)$`));
  if (tailMatch && countChars(tailMatch[1]) >= 2) {
    return {
      before: "",
      quote: tailMatch[1].trim().replace(/[，,。；;、]+$/, ""),
      after: tailMatch[2].trim()
    };
  }

  return null;
}

function normalizeOptions(options, originalValue) {
  const normalizedOriginal = normalizeQuoteValue(originalValue);
  if (!Array.isArray(options)) return [];
  return uniqueList(
    options
      .filter(item => typeof item === "string")
      .map(item => normalizeQuoteValue(item))
      .filter(item => item && item !== normalizedOriginal)
  ).slice(0, 3);
}

function normalizeQuoteValue(value) {
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

function ensureReplacementOptions(options, type, originalValue) {
  const normalized = normalizeOptions(options, originalValue);
  if (normalized.length < 3) {
    console.warn(`${getTypeName(type)}“${originalValue}”的 AI 候选不足 3 个。`);
  }
  return normalized.slice(0, 3);
}

function assertReplacementOptions(parts) {
  const invalidPart = parts.find(part =>
    part.type === "quote" &&
    normalizeOptions(part.replacementOptions, part.value).length < 3
  );
  if (invalidPart) {
    throw new Error(`AI 没有为${getTypeName(invalidPart.type)}“${invalidPart.value}”生成 3 个候选项，请重试。`);
  }
}

function getQuoteParts(parts) {
  return parts.filter(part => part.type === "quote");
}

function assertEditableQuoteQuality(parts) {
  const quoteParts = getQuoteParts(parts);
  if (quoteParts.length !== 1) return;

  const quote = quoteParts[0].value;
  const tooShortExamples = ["我爱你", "别走", "救我", "相信我", "等等", "快跑", "不要"];
  if (countChars(quote) < MIN_ORIGINAL_QUOTE_CHARS || tooShortExamples.includes(quote.replace(/[。！？!?，,；;：:\s]/g, ""))) {
    throw new Error(`关键台词“${quote}”信息量太少，请重新生成。`);
  }
}

function hasAttributedQuote(parts, roleNames) {
  const roles = uniqueList(roleNames).filter(name => countChars(name) >= 2);
  if (!roles.length) return true;
  return parts.some((part, index) => {
    if (part.type !== "quote") return false;
    const nearby = partsToText(parts.slice(Math.max(0, index - 2), Math.min(parts.length, index + 3)));
    return roles.some(name => nearby.includes(name));
  });
}

function getQuoteSpeakerNames(parts, roleNames) {
  const roles = uniqueList(roleNames).filter(name => countChars(name) >= 2);
  if (!roles.length) return [];

  const quoteIndex = parts.findIndex(part => part.type === "quote");
  if (quoteIndex < 0) return [];

  const beforeText = partsToText(parts.slice(Math.max(0, quoteIndex - 4), quoteIndex));
  const afterText = partsToText(parts.slice(quoteIndex + 1, Math.min(parts.length, quoteIndex + 5)));
  const candidates = [];

  roles.forEach(name => {
    const escapedName = escapeRegExp(name);
    const beforePattern = new RegExp(`${escapedName}[^。！？!?“”"]{0,12}(说|道|喊|问|答|低声说|高声说|轻声说|默默说|喝道|叫道|吼道|提醒|命令|断言|承认|开口)\\s*[：:]?\\s*$`);
    const afterPattern = new RegExp(`^[，,、。！？!?\\s]*(?:${escapedName}[^。！？!?“”"]{0,12}(说|道|喊|问|答|低声说|高声说|轻声说|默默说|喝道|叫道|吼道|提醒|命令|断言|承认))`);
    const nameIndex = beforeText.lastIndexOf(name);
    const tailAfterName = nameIndex >= 0 ? beforeText.slice(nameIndex + name.length) : "";
    const charBeforeName = nameIndex > 0 ? beforeText.slice(nameIndex - 1, nameIndex) : "";
    const looksLikeAddressee = ["对", "向", "冲", "朝", "问"].includes(charBeforeName);
    const nearbySpeechCue = tailAfterName.length <= 40 && /(说|道|喊|问|答|低声说|高声说|轻声说|默默说|喝道|叫道|吼道|提醒|命令|断言|承认|开口)\s*[：:]?\s*$/.test(tailAfterName);
    const textBeforeRole = parts[quoteIndex - 2]?.type === "role" && parts[quoteIndex - 2]?.value === name && /[说道喊问答：:]\s*$/.test(parts[quoteIndex - 1]?.value || "");

    if (!looksLikeAddressee && (beforePattern.test(beforeText) || nearbySpeechCue || textBeforeRole)) {
      candidates.push({ name, score: Math.max(nameIndex, 0) });
    }
    if (afterPattern.test(afterText)) {
      candidates.push({ name, score: 1000 });
    }
  });

  if (!candidates.length) return [];
  const maxScore = Math.max(...candidates.map(candidate => candidate.score));
  return uniqueList(candidates.filter(candidate => candidate.score === maxScore).map(candidate => candidate.name));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRolesFromParts(parts) {
  return parts.filter(part => part.type === "role").map(part => part.value);
}

function uniqueList(list) {
  return Array.from(new Set(
    list
      .filter(item => typeof item === "string" && item.trim())
      .map(item => item.trim())
  ));
}

function dedupeRepeatedText(text) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) return "";

  const sentences = normalizedText
    .split(/(?<=[。！？!?；;])/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
  if (sentences.length <= 1) return collapseAdjacentRepeatedChunks(normalizedText);

  const seen = new Set();
  const deduped = [];
  sentences.forEach(sentence => {
    const key = sentence.replace(/\s/g, "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(sentence);
  });

  return collapseAdjacentRepeatedChunks(deduped.join(""));
}

function collapseAdjacentRepeatedChunks(text) {
  let value = String(text || "");
  for (let size = Math.floor(value.length / 2); size >= 6; size -= 1) {
    let index = 0;
    while (index + size * 2 <= value.length) {
      const chunk = value.slice(index, index + size);
      if (chunk && chunk === value.slice(index + size, index + size * 2)) {
        value = value.slice(0, index + size) + value.slice(index + size * 2);
        index = Math.max(0, index - size);
      } else {
        index += 1;
      }
    }
  }
  return value.trim();
}

function getVisibleStoryText() {
  if (!state.editableParts.length) return "";
  const visibleLimit = state.suffixUnknown && state.pendingRegeneration
    ? state.pendingRegeneration.startIndex
    : state.editableParts.length;
  return partsToText(state.prefixParts) + partsToText(state.editableParts.slice(0, visibleLimit)) + (state.suffixUnknown ? "" : state.suffixText);
}

function getFullStoryText() {
  return partsToText(state.prefixParts) + partsToText(state.editableParts) + state.suffixText;
}

function getReadableFullStoryText() {
  return [
    ...splitNaturalParagraphs(partsToText(state.prefixParts)),
    ...splitNaturalParagraphs(partsToText(state.editableParts)),
    ...splitNaturalParagraphs(state.suffixText)
  ].filter(Boolean).map(text => `\u3000\u3000${text}`).join("\n\n");
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
    .join("\n");
}

function normalizePartLineBreaks(parts) {
  return parts.map(part => ({
    ...part,
    value: part.type === "text" ? normalizeStoryLineBreaks(part.value) : part.value
  }));
}

function normalizeStoryParagraphPayload(story) {
  return {
    ...story,
    prefixParts: normalizePartLineBreaks(story.prefixParts),
    editableParts: normalizePartLineBreaks(story.editableParts),
    suffixText: normalizeStoryLineBreaks(story.suffixText)
  };
}

function countPartsByType(parts, type) {
  return parts.filter(part => part.type === type).length;
}

function partsToText(parts) {
  return parts.map(part => part.value).join("");
}

function countChars(text) {
  return Array.from(String(text).replace(/\s/g, "")).length;
}

function getTypeName(type) {
  const map = { role: "角色", quote: "台词", item: "道具" };
  return map[type] || "元素";
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHTML(text) {
  return String(text)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");
}

function closeModal() {
  modalMask.classList.remove("show");
  state.selectedTarget = null;
  state.selectedValue = "";
}

function resetCurrentStory() {
  if (!state.originalEditableParts.length) return;
  state.prefixParts = deepCopy(state.originalPrefixParts);
  state.editableParts = deepCopy(state.originalEditableParts);
  state.suffixText = state.originalSuffixText;
  state.endingType = state.originalEndingType;
  state.endingJudgement = state.originalEndingJudgement;
  state.protagonistNames = deepCopy(state.originalProtagonistNames);
  state.allRoleNames = deepCopy(state.originalAllRoleNames);
  state.changeCount = 0;
  state.changes = [];
  state.isFinished = false;
  state.suffixUnknown = false;
  state.pendingRegeneration = null;
  clearError();
  hideEnding();
  closeModal();
  renderStory();
  updateUI();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

chooseExperienceBtn.addEventListener("click", () => enterGameMode("experience"));
chooseChallengeBtn.addEventListener("click", () => enterGameMode("challenge"));
backToModeBtn.addEventListener("click", returnToModeScreen);

generateBtn.addEventListener("click", () => {
  state.gameMode = "experience";
  generateStory({ preserveChallenge: false });
});
challengeStartBtn.addEventListener("click", startChallenge);
nextLevelBtn.addEventListener("click", generateChallengeLevel);
demoBtn.addEventListener("click", loadDemoStory);
finishBtn.addEventListener("click", finishStory);
resetBtn.addEventListener("click", resetCurrentStory);
applyBtn.addEventListener("click", applyReplacement);
cancelBtn.addEventListener("click", closeModal);

providerSelect.addEventListener("change", () => {
  saveProviderInputs(currentProviderId);
  applyProviderSelection(providerSelect.value);
  clearError();
});

apiKeyInput.addEventListener("input", () => saveProviderInputs());
modelInput.addEventListener("input", () => saveProviderInputs());
worldviewSelect.addEventListener("change", clearError);
storyThemeSelect.addEventListener("change", clearError);
motifInput.addEventListener("input", clearError);

toggleKeyBtn.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleKeyBtn.textContent = isPassword ? "隐藏 Key" : "显示 Key";
});

modalMask.addEventListener("click", event => {
  if (event.target === modalMask) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

const initialProviderId = applyAppSettings(await loadAppSettings());
applyProviderSelection(initialProviderId);
setupIconPicker(worldviewSelect, SETTING_WORLDVIEW_OPTIONS, UI_ASSETS.worldviews, "选择世界观");
setupIconPicker(storyThemeSelect, STORY_THEME_OPTIONS, UI_ASSETS.themes, "选择故事主题");
renderStory();
updateUI();
