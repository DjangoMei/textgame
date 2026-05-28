const STORAGE_KEY = "endless-story-internal-annotations-v1";
const FIRST_BATCH_PATH = "./generated/volcengine-2026-05-25T09-30-53-866Z.json";
const FIRST_BATCH_LABEL = "第一批 20";
const AUTO_BATCH_PATH = "./generated/latest.json";
const AUTO_BATCH_LABEL = "当前 100";
const BATCH_MANIFEST_PATH = "./generated/batches.json";
const AUTO_BATCH_REVISION = "quote-format-v3-romance-split";
const AUTO_COMPLETE_REVISION = "complete-rest-v3-romance-split";
const HUMAN_GUIDED_REVIEW_REVISION = "codex-human-guided-forced-setting-v2";

const CASE_FIELDS = [
  ["titleInput", "title"],
  ["worldviewInput", "worldview"],
  ["themeInput", "theme"],
  ["storyTextInput", "storyText"]
];

const SCORE_FIELDS = [
  ["scoreLogic", "logic"],
  ["scoreEmotion", "emotion"],
  ["scoreProse", "prose"],
  ["scoreTension", "tension"]
];

const FLAG_FIELDS = [
  ["flagFormat", "formatError"],
  ["flagCorrupt", "corruptText"],
  ["flagPromptMismatch", "promptMismatch"],
  ["flagLengthIssue", "lengthIssue"],
  ["flagUnsafe", "unsafe"]
];

const state = {
  cases: [],
  currentIndex: 0,
  activeBatchId: "",
  latestBatchId: "",
  batchMeta: {},
  importedBatchIds: [],
  autoCompletedIds: [],
  activeStandardFilter: "all",
  dirty: false
};

const $ = selector => document.querySelector(selector);

const elements = {
  importInput: $("#importInput"),
  exportJsonlBtn: $("#exportJsonlBtn"),
  exportJsonBtn: $("#exportJsonBtn"),
  caseCount: $("#caseCount"),
  labeledCount: $("#labeledCount"),
  currentCaseLabel: $("#currentCaseLabel"),
  saveState: $("#saveState"),
  batchTabs: $("#batchTabs"),
  standardTabs: $("#standardTabs"),
  statsPanel: $("#statsPanel"),
  caseList: $("#caseList"),
  codexReviewPanel: $("#codexReviewPanel"),
  newCaseBtn: $("#newCaseBtn"),
  prevBtn: $("#prevBtn"),
  nextBtn: $("#nextBtn"),
  deleteCaseBtn: $("#deleteCaseBtn"),
  annotatorInput: $("#annotatorInput"),
  notesInput: $("#notesInput"),
  markDoneBtn: $("#markDoneBtn"),
  pasteDialog: $("#pasteDialog"),
  pasteInput: $("#pasteInput"),
  confirmPasteBtn: $("#confirmPasteBtn")
};

const caseInputs = Object.fromEntries(
  CASE_FIELDS.map(([id, key]) => [key, document.getElementById(id)])
);
const scoreInputs = Object.fromEntries(
  SCORE_FIELDS.map(([id, key]) => [key, document.getElementById(id)])
);
const scoreOutputs = Object.fromEntries(
  SCORE_FIELDS.map(([id, key]) => [key, document.getElementById(`${id}Out`)])
);
const flagInputs = Object.fromEntries(
  FLAG_FIELDS.map(([id, key]) => [key, document.getElementById(id)])
);

function createEmptyReview(overrides = {}) {
  const base = {
    reviewed: false,
    humanOutcome: "",
    flags: {
      formatError: false,
      corruptText: false,
      promptMismatch: false,
      lengthIssue: false,
      unsafe: false
    },
    scores: {
      logic: 3,
      emotion: 3,
      prose: 3,
      tension: 3
    },
    annotator: "",
    notes: "",
    evaluationStandard: "",
    updatedAt: "",
    manualEdited: false,
    humanEdited: false,
    autoCompletedBy: "",
    autoCompletedRevision: ""
  };

  return {
    ...base,
    ...overrides,
    flags: {
      ...base.flags,
      ...(overrides.flags || {})
    },
    scores: {
      ...base.scores,
      ...(overrides.scores || {})
    }
  };
}

function normalizeReview(raw = {}, fallback = {}) {
  const review = raw && typeof raw === "object" ? raw : {};
  const scores = review.scores && typeof review.scores === "object" ? review.scores : {};
  const flags = review.flags && typeof review.flags === "object" ? review.flags : {};
  const fallbackScores = fallback.scores && typeof fallback.scores === "object" ? fallback.scores : {};

  return createEmptyReview({
    reviewed: Boolean(review.reviewed || review.humanOutcome || review.outcome || fallback.reviewed),
    humanOutcome: stringValue(review.humanOutcome || review.outcome || fallback.humanOutcome),
    flags: {
      formatError: Boolean(flags.formatError),
      corruptText: Boolean(flags.corruptText || flags.garbled || flags.truncated || flags.repeatedText),
      promptMismatch: Boolean(flags.promptMismatch),
      lengthIssue: Boolean(flags.lengthIssue),
      unsafe: Boolean(flags.unsafe)
    },
    scores: {
      logic: clampScore(scores.logic ?? scores.coherence ?? fallbackScores.logic),
      emotion: clampScore(scores.emotion ?? fallbackScores.emotion),
      prose: clampScore(scores.prose ?? fallbackScores.prose),
      tension: clampScore(scores.tension ?? scores.fun ?? fallbackScores.tension)
    },
    annotator: stringValue(review.annotator || fallback.annotator),
    notes: stringValue(review.notes || fallback.notes),
    evaluationStandard: stringValue(review.evaluationStandard || fallback.evaluationStandard),
    updatedAt: stringValue(review.updatedAt || fallback.updatedAt),
    manualEdited: Boolean(review.manualEdited || review.humanEdited || fallback.manualEdited),
    humanEdited: Boolean(review.humanEdited || review.manualEdited || fallback.humanEdited),
    autoCompletedBy: stringValue(review.autoCompletedBy || fallback.autoCompletedBy),
    autoCompletedRevision: stringValue(review.autoCompletedRevision || fallback.autoCompletedRevision)
  });
}

function createEmptyCase(overrides = {}) {
  const now = new Date().toISOString();
  const item = {
    id: overrides.id || `manual-${Date.now().toString(36)}`,
    title: "",
    worldview: "",
    worldviewId: "",
    theme: "",
    themeId: "",
    motif: "",
    provider: "",
    model: "",
    storyText: "",
    source: "manual",
    createdAt: now,
    label: createEmptyReview(),
    humanLabel: createEmptyReview(),
    ...overrides
  };
  item.storyText = normalizeStoryLineBreaks(item.storyText);
  return item;
}

function normalizeCase(raw, index = 0) {
  if (!raw || typeof raw !== "object") {
    return createEmptyCase({
      id: `text-${Date.now().toString(36)}-${index + 1}`,
      storyText: String(raw || ""),
      source: "text"
    });
  }

  const label = raw.label && typeof raw.label === "object" ? raw.label : {};
  const rawHumanLabel = raw.humanLabel && typeof raw.humanLabel === "object"
    ? raw.humanLabel
    : raw.humanAnnotation && typeof raw.humanAnnotation === "object"
      ? raw.humanAnnotation
      : raw.manualLabel && typeof raw.manualLabel === "object"
        ? raw.manualLabel
        : null;
  const migratedHumanLabel = rawHumanLabel || (label.manualEdited || label.humanEdited ? label : null);
  const rawStory = raw.rawStory && typeof raw.rawStory === "object" ? raw.rawStory : raw;
  const storyFromParts = renderStoryPayloadText(rawStory);

  return createEmptyCase({
    id: stringValue(raw.id || raw.caseId || raw.sample_id || raw.sampleId) || `case-${Date.now().toString(36)}-${index + 1}`,
    title: stringValue(raw.title || raw.storyTitle || raw.currentTitle),
    worldview: stringValue(raw.worldview || raw.worldviewLabel || raw.worldview_label),
    worldviewId: stringValue(raw.worldviewId || raw.worldview_id),
    theme: stringValue(raw.theme || raw.storyTheme || raw.story_theme_label),
    themeId: stringValue(raw.themeId || raw.storyThemeId || raw.story_theme_id),
    motif: stringValue(raw.motif || raw.motifLabel),
    provider: stringValue(raw.provider || raw.providerId),
    model: stringValue(raw.model || raw.modelId),
    originalQuote: stringValue(raw.originalQuote || raw.original_quote || raw.sourceQuote),
    replacement: stringValue(raw.replacement || raw.rewrite || raw.playerRewrite || raw.selectedValue),
    modelOutcome: stringValue(raw.modelOutcome || raw.endingType || raw.ending_type),
    modelJudgement: stringValue(raw.modelJudgement || raw.endingJudgement || raw.ending_judgement),
    storyText: storyFromParts || stringValue(raw.storyText || raw.finalStory || raw.fullStory || raw.story),
    source: stringValue(raw.source) || "import",
    createdAt: stringValue(raw.createdAt || raw.created_at) || new Date().toISOString(),
    label: normalizeReview(label, {
      evaluationStandard: stringValue(raw.evaluationStandard)
    }),
    humanLabel: normalizeReview(migratedHumanLabel || {})
  });
}

function partsToText(parts) {
  if (!Array.isArray(parts)) return "";
  return parts
    .map(part => {
      if (!part || typeof part !== "object") return "";
      return stringValue(part.value);
    })
    .join("");
}

function renderStoryPayloadText(payload) {
  if (!payload || typeof payload !== "object") return "";
  const hasParts = Array.isArray(payload.prefixParts) || Array.isArray(payload.editableParts) || typeof payload.suffixText === "string";
  if (!hasParts) return "";
  return [
    renderPartsForReading(payload.prefixParts),
    renderPartsForReading(payload.editableParts),
    stringValue(payload.suffixText)
  ].filter(Boolean).join("");
}

function renderPartsForReading(parts) {
  if (!Array.isArray(parts)) return "";
  let output = "";

  parts.forEach(part => {
    if (!part || typeof part !== "object") return;
    const value = stringValue(part.value);
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
  let text = stringValue(value);
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

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clampScore(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 3;
  return Math.min(5, Math.max(1, number));
}

function getCaseBatchId(item) {
  return stringValue(item?.source) || "manual";
}

function getBatchCases(batchId = state.activeBatchId) {
  return state.cases.filter(item => getCaseBatchId(item) === batchId);
}

function activeCases() {
  return filterCasesByStandard(getBatchCases());
}

function filterCasesByStandard(cases) {
  if (state.activeStandardFilter === "romance") return cases.filter(isRomanceCase);
  if (state.activeStandardFilter === "general") return cases.filter(item => !isRomanceCase(item));
  return cases;
}

function isRomanceCase(item) {
  return item?.themeId === "romance" || item?.theme === "爱情";
}

function getEvaluationStandard(item) {
  return isRomanceCase(item) ? "romance" : "general";
}

function getEvaluationStandardLabel(item) {
  return isRomanceCase(item) ? "爱情标准" : "通用标准";
}

function currentCase() {
  return activeCases()[state.currentIndex] || null;
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

function countChars(text) {
  return Array.from(String(text).replace(/\s/g, "")).length;
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    cases: state.cases,
    currentIndex: state.currentIndex,
    activeBatchId: state.activeBatchId,
    latestBatchId: state.latestBatchId,
    batchMeta: state.batchMeta,
    importedBatchIds: state.importedBatchIds,
    autoCompletedIds: state.autoCompletedIds,
    activeStandardFilter: state.activeStandardFilter
  }));
  state.dirty = false;
  renderStatus();
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.cases = Array.isArray(parsed.cases)
      ? parsed.cases.map((item, index) => normalizeCase(item, index))
      : [];
    state.importedBatchIds = Array.isArray(parsed.importedBatchIds) ? parsed.importedBatchIds : [];
    state.autoCompletedIds = Array.isArray(parsed.autoCompletedIds) ? parsed.autoCompletedIds : [];
    state.activeBatchId = stringValue(parsed.activeBatchId);
    state.latestBatchId = stringValue(parsed.latestBatchId);
    state.batchMeta = parsed.batchMeta && typeof parsed.batchMeta === "object" ? parsed.batchMeta : {};
    state.activeStandardFilter = ["all", "general", "romance"].includes(parsed.activeStandardFilter)
      ? parsed.activeStandardFilter
      : "all";
    state.currentIndex = Math.min(
      Math.max(Number.parseInt(parsed.currentIndex, 10) || 0, 0),
      Math.max(activeCases().length - 1, 0)
    );
  } catch {
    state.cases = [];
    state.currentIndex = 0;
  }
}

function autoCompleteRemainingReviews() {
  const latestBatch = getLatestBatchId();
  if (!latestBatch) return 0;

  const autoKey = `${latestBatch}:${AUTO_COMPLETE_REVISION}`;
  if (state.autoCompletedIds.includes(autoKey)) return 0;

  const batchCases = state.cases.filter(item => getCaseBatchId(item) === latestBatch);
  const reviewed = batchCases.filter(item => item.label?.reviewed);
  const pending = batchCases.filter(item => !item.label?.reviewed);
  if (reviewed.length < 5 || !pending.length) return 0;

  const reference = buildReviewReference(reviewed);
  pending.forEach(item => {
    const annotation = inferAnnotationFromReference(item, reviewed, reference);
    item.label = {
      ...item.label,
      reviewed: true,
      flags: annotation.flags,
      scores: annotation.scores,
      annotator: reference.annotator,
      notes: annotation.notes,
      updatedAt: new Date().toISOString(),
      autoCompletedBy: "codex",
      autoCompletedRevision: AUTO_COMPLETE_REVISION
    };
  });

  state.autoCompletedIds.push(autoKey);
  return pending.length;
}

function refreshCodexReviewsFromHumanGuidance() {
  const humanSamples = state.cases.filter(hasHumanAnnotation);
  if (!state.cases.length || !humanSamples.length) return 0;

  const guidanceSignature = buildHumanGuidanceSignature(humanSamples);
  const needsRefresh = state.cases.some(item => {
    return item.label?.autoCompletedRevision !== HUMAN_GUIDED_REVIEW_REVISION
      || item.label?.guidanceSignature !== guidanceSignature;
  });
  if (!needsRefresh) return 0;

  const calibration = buildHumanGuidanceCalibration(humanSamples);
  state.cases.forEach(item => {
    item.label = annotateCaseWithHumanGuidance(item, calibration, guidanceSignature);
  });
  state.autoCompletedIds = state.autoCompletedIds
    .filter(id => !String(id).startsWith(`${HUMAN_GUIDED_REVIEW_REVISION}:`));
  state.autoCompletedIds.push(`${HUMAN_GUIDED_REVIEW_REVISION}:${guidanceSignature}`);
  return state.cases.length;
}

function buildHumanGuidanceSignature(humanSamples) {
  const compact = humanSamples
    .map(item => {
      const label = item.humanLabel || {};
      const scores = label.scores || {};
      return [
        item.id,
        label.updatedAt || "",
        scores.logic,
        scores.emotion,
        scores.prose,
        scores.tension,
        (label.notes || "").slice(0, 80)
      ].join(":");
    })
    .join("|");
  return `${humanSamples.length}-${hashString(compact)}`;
}

function buildHumanGuidanceCalibration(humanSamples) {
  const averages = {};
  SCORE_FIELDS.forEach(([, key]) => {
    const values = humanSamples
      .map(item => item.humanLabel?.scores?.[key])
      .filter(value => Number.isFinite(value));
    averages[key] = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 3;
  });

  const notesText = humanSamples
    .map(item => item.humanLabel?.notes || "")
    .join("\n");

  return {
    averages,
    strictOnForcedSetting: /设定|强行|无厘头|逻辑|看不懂|无法带入|不符合常理|空间|位置|混乱|没有解释/.test(notesText),
    notesText
  };
}

function annotateCaseWithHumanGuidance(item, calibration, guidanceSignature) {
  const features = getGuidedReviewFeatures(item);
  const flags = {
    formatError: !item.title || !item.storyText || features.length < 120 || !features.quoteFormatted,
    corruptText: features.repeatedPhrase || /undefined|null|\[object Object\]/i.test(item.storyText),
    promptMismatch: features.nonStoryOutput || false,
    lengthIssue: features.length < 300 || features.length > 600,
    unsafe: false
  };
  const scores = buildGuidedScores(item, features, flags, calibration);

  return {
    reviewed: true,
    evaluationStandard: getEvaluationStandard(item),
    flags,
    scores,
    annotator: "Codex",
    notes: buildGuidedNotes(item, features, flags, scores),
    updatedAt: new Date().toISOString(),
    autoCompletedBy: "codex",
    autoCompletedRevision: HUMAN_GUIDED_REVIEW_REVISION,
    guidanceSignature
  };
}

function getGuidedReviewFeatures(item) {
  const text = String(item.storyText || "");
  const title = String(item.title || "");
  const motif = String(item.motif || "");
  const length = countChars(text);
  const paragraphCount = text.split(/\n+/).map(part => part.trim()).filter(Boolean).length;
  const quoteFormatted = /[说问喊答道]:?["“][^"”]+["”]/.test(text) || /["“][^"”]+["”]/.test(text);
  const repeatedPhrase = hasRepeatedChunk(text);
  const nonStoryOutput = /(故事大纲|经验总结|案例分析|Markdown|JSON|无法生成|英文故事)/i.test(text);
  const badEndingSignals = /(失去|死亡|被困|葬身|陷入|惩罚|封印|灰烬|绝境|无法|毁掉|吞没|监牢|牺牲|破碎|暴露|冻结|困局|陌生人|永远)/.test(text);
  const relationshipSignals = /(爱|恋人|未婚|婚礼|戒指|拥抱|亲吻|告白|分手|重逢|错过|相认|约定|承诺|旧信|照片|不舍|信任|误会|守候|牵手|心跳|眼眶|喉咙|掌心|道歉|原谅|妹妹|父|母|家人)/.test(text);
  const emotionalSignals = /(恐惧|绝望|愧|泪|痛|不舍|悔|沉默|犹豫|颤抖|苦笑|发紧|冰凉|陌生|失望|嫉妒|信任|内疚)/.test(text);
  const innerConflictSignals = /(犹豫|迟疑|不舍|沉默|想起|眼眶|喉咙|心脏|害怕|决绝|苦笑|明白|嫉妒|信任|背叛|愧疚)/.test(text);
  const agencySignals = /(决定|选择|举起|握紧|冲向|潜入|追|喊|说|打开|签下|按下|转动|交出|扯开|藏起|挡住|拉住|推开|咬破)/.test(text);
  const sensorySignals = /(冷|热|痛|雨|风|雾|潮|血|铁锈|药草|烛光|黑暗|刺|汽笛|尘暴|冰凉|温热|发痒|低吼)/.test(text);
  const threatSignals = /(倒计时|逼近|围|刀|追|坠|爆|警报|锁|毒|火|吞没|审判|通缉|失控|裂开|坍塌|地牢|守卫|风暴|辐射)/.test(text);
  const ruleWordCount = countMatches(text, /(必须|只能|若|便|否则|代价|规则|传闻|传说|血誓|誓言|契约|诅咒|机关|系统|算法|净化|交换|价值|生效|显现|开启|关闭|碎裂|熄灭|同步|发送|失败|成功|记忆|秘密|信物|地图|蛊|污染|影子)/g);
  const explanationCount = countMatches(text, /(因为|所以|原来|当年|曾经|三天前|七年前|约定|规矩|原因|为了|被迫|换得|代价|意味着)/g);
  const deviceWordCount = countMatches(`${title}\n${motif}\n${text}`, /(路标|抽屉|碑文|铆钉枪|售票机|扳指|玉蝉|罗盘|钥匙|药瓶|星图|契约|齿轮|渡船|审判|芯片|面具|票|印章|灯塔|电台|黑匣子|门锁|指南针|仪式|信物|影子|秘密|记忆|血誓)/g);
  const locationCount = uniqueMatchCount(text, /(礁石滩|听潮阁|地牢|站台|检票口|图书馆|旧图书馆|避难所|通风口|废墟|晨光站|迷途林|石碑|阁外|窗外|屋内|城墙|飞船|舱门|宫殿|工会|审判庭|战场|港口|车站|医院|学校)/g);
  const abstractConditionCount = countMatches(text, /(失败|成功|记得|忘记|价值不足|心念不纯|秘密|信任|影子|污染|誓言|规则|代价)/g);
  const contradictionIssue = /(嫉妒|怨|恨|背叛).{0,45}(婚礼|救|爱|信任|赶到|保护)|((婚礼|救|爱|信任|保护).{0,45}(嫉妒|怨|恨|背叛))/.test(text);
  const spatialIssue = /(地牢方向|阁外|礁石滩|远处).{0,90}(冲进|现身|站在|拦住|已经在)/.test(text)
    || (locationCount >= 5 && /(冲进|忽然出现在|同时|转眼|下一刻)/.test(text));
  const themeSignalCount = countThemeSignals(item.theme, text);
  const themeFitIssue = getEvaluationStandard(item) !== "romance" && themeSignalCount < 2;
  const worldviewMismatchIssue = hasWorldviewMismatch(item, `${title}\n${motif}\n${text}`);
  const mechanismAmbiguous = (ruleWordCount >= 5 && explanationCount <= 3)
    || (abstractConditionCount >= 5 && explanationCount <= 4);
  const arbitraryDeviceIssue = deviceWordCount >= 3 && ruleWordCount >= 4 && explanationCount <= 5;
  const relationshipThinIssue = getEvaluationStandard(item) === "romance"
    && (!relationshipSignals || (!innerConflictSignals && ruleWordCount >= 4));
  const forcedSettingIssue = arbitraryDeviceIssue
    || mechanismAmbiguous
    || spatialIssue
    || contradictionIssue
    || relationshipThinIssue
    || themeFitIssue
    || worldviewMismatchIssue;
  const severeForcedSetting = spatialIssue
    || contradictionIssue
    || worldviewMismatchIssue
    || (arbitraryDeviceIssue && mechanismAmbiguous)
    || (themeFitIssue && mechanismAmbiguous)
    || (relationshipThinIssue && mechanismAmbiguous);

  return {
    length,
    paragraphCount,
    quoteFormatted,
    repeatedPhrase,
    nonStoryOutput,
    badEndingSignals,
    relationshipSignals,
    emotionalSignals,
    innerConflictSignals,
    agencySignals,
    sensorySignals,
    threatSignals,
    ruleWordCount,
    explanationCount,
    deviceWordCount,
    locationCount,
    themeSignalCount,
    themeFitIssue,
    worldviewMismatchIssue,
    contradictionIssue,
    spatialIssue,
    mechanismAmbiguous,
    arbitraryDeviceIssue,
    relationshipThinIssue,
    forcedSettingIssue,
    severeForcedSetting
  };
}

function buildGuidedScores(item, features, flags, calibration) {
  if (flags.formatError || flags.corruptText) {
    return { logic: 1, emotion: 1, prose: 1, tension: 1 };
  }

  const isRomance = getEvaluationStandard(item) === "romance";
  const strict = calibration.strictOnForcedSetting;
  const base = {
    logic: isRomance ? 3 : 3,
    emotion: isRomance ? 3 : 3,
    prose: features.sensorySignals || features.paragraphCount >= 4 ? 4 : 3,
    tension: features.threatSignals || features.badEndingSignals ? 3 : 2
  };

  if (features.badEndingSignals) base.tension += 0.25;
  if (features.agencySignals) base.logic += 0.25;
  if (features.relationshipSignals) base.emotion += isRomance ? 0.25 : 0.1;
  if (features.innerConflictSignals) base.emotion += 0.25;
  if (flags.lengthIssue) Object.keys(base).forEach(key => { base[key] -= 0.25; });

  if (features.forcedSettingIssue && strict) {
    base.logic -= features.severeForcedSetting ? 1.8 : 1.1;
    base.emotion -= features.severeForcedSetting ? 1.35 : 0.85;
    base.tension -= features.severeForcedSetting ? 0.9 : 0.55;
    base.prose -= features.severeForcedSetting ? 0.2 : 0.05;
  }
  if (features.mechanismAmbiguous) {
    base.logic -= 0.5;
    base.emotion -= isRomance ? 0.35 : 0.15;
  }
  if (features.themeFitIssue) {
    base.logic -= 0.65;
    base.tension -= 0.8;
    base.emotion -= 0.35;
  }
  if (features.worldviewMismatchIssue) {
    base.logic -= 1.1;
    base.emotion -= 0.45;
    base.tension -= 0.4;
    base.prose -= 0.15;
  }
  if (features.relationshipThinIssue) {
    base.emotion -= 0.75;
    base.tension -= 0.35;
  }
  if (features.contradictionIssue) {
    base.logic -= 0.75;
    base.emotion -= 0.75;
  }
  if (features.spatialIssue) {
    base.logic -= 0.9;
  }

  const scores = {};
  SCORE_FIELDS.forEach(([, key]) => {
    let value = Math.round(base[key]);
    if (features.forcedSettingIssue && strict) {
      const cap = key === "prose" ? 4 : (features.severeForcedSetting ? 2 : 3);
      value = Math.min(value, cap);
    }
    if (features.spatialIssue && key === "logic") value = Math.min(value, 1);
    if (features.worldviewMismatchIssue && key === "logic") value = Math.min(value, 2);
    if (features.themeFitIssue && (key === "logic" || key === "tension")) value = Math.min(value, features.severeForcedSetting ? 2 : 3);
    if (features.contradictionIssue && (key === "logic" || key === "emotion")) value = Math.min(value, 2);
    if (features.relationshipThinIssue && key === "emotion") value = Math.min(value, 2);
    scores[key] = clampScore(value);
  });

  return scores;
}

function buildGuidedNotes(item, features, flags, scores) {
  const notes = [];
  if (flags.lengthIssue) notes.push(`篇幅约 ${features.length} 字，不在 300-600 字的理想评测范围内`);
  if (flags.formatError) notes.push("格式或关键台词呈现需要复核");
  if (flags.corruptText) notes.push("存在疑似重复或异常文本");
  if (features.mechanismAmbiguous) notes.push("核心规则/成功失败条件没有建立清楚，像是为了结局临时添加");
  if (features.arbitraryDeviceIssue) notes.push("关键道具或设定进入得比较强行，和人物选择、代价之间缺少可信连接");
  if (features.worldviewMismatchIssue) notes.push("世界观元素混入得不自然，削弱了设定可信度");
  if (features.themeFitIssue) notes.push("题材核心不够突出，故事没有很好回应当前主题应有的冲突类型");
  if (features.spatialIssue) notes.push("人物和地点的空间关系混在一起，形成明显逻辑漏洞");
  if (features.contradictionIssue) notes.push("人物关系动机前后不一致，读者难判断角色到底重视还是排斥这段关系");
  if (features.relationshipThinIssue) notes.push("爱情线被设定规则压过，情绪更多是在配合机制，难以投入");
  if (!notes.length && scores.logic <= 2) notes.push("关键因果承接偏跳，影响整体可信度");
  if (!notes.length && scores.emotion <= 2) notes.push("人物情绪缺少足够铺垫，情感投入偏弱");
  if (!notes.length) notes.push("整体可读，但仍需要更自然地交代设定来源、规则代价和人物情绪承接");

  return `Codex 参考人工标注刷新：${notes.join("；")}。`;
}

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function uniqueMatchCount(text, pattern) {
  return new Set(String(text || "").match(pattern) || []).size;
}

function countThemeSignals(theme, text) {
  const value = String(text || "");
  const patterns = {
    "悬疑": /(线索|真相|误导|调查|证词|秘密|隐瞒|谜|怀疑|监控|录音|档案|推理|发现|追查)/g,
    "权谋": /(盟约|联盟|背叛|身份|朝堂|议会|继承|权力|筹码|交易|把柄|派系|制度|投票|任命|封赏|罢免)/g,
    "亲情": /(父|母|妹妹|姐姐|哥哥|弟弟|孩子|女儿|儿子|家|血缘|亲人|养育|保护|代际|家族|团圆)/g,
    "犯罪": /(证据|警|罪|交易|追捕|勒索|卧底|案|逃|审讯|嫌疑|赃物|枪|毒|监控|口供)/g,
    "盗取潜入": /(潜入|偷|盗|替换|安保|守卫|钥匙|门锁|巡逻|计划|目标|时间窗|保险|机关|撤离|伪装)/g,
    "复仇": /(复仇|仇|旧债|背叛|冤|血债|报应|追索|清算|真凶|代价|仇人|雪恨)/g,
    "冒险": /(探索|遗迹|地图|机关|旅途|未知|洞穴|荒原|追逐|发现|宝物|路径|向导|险地|入口)/g,
    "生存": /(资源|饥饿|水|药|避难|感染|污染|寒冷|风暴|逃生|求生|补给|伤口|氧气|辐射|庇护)/g,
    "战争": /(军令|阵地|士兵|战场|炮火|补给|撤离|平民|阵营|战略|哨所|指挥|牺牲|防线|敌军)/g,
    "爱情": /(爱|恋人|未婚|婚礼|戒指|拥抱|亲吻|告白|分手|重逢|错过|信任|误会|牵手|心跳)/g
  };
  const pattern = patterns[theme];
  if (!pattern) return 2;
  return countMatches(value, pattern);
}

function hasWorldviewMismatch(item, text) {
  const value = String(text || "");
  const worldview = item?.worldview || "";
  if (/古代历史|东方武侠|神话传说/.test(worldview)) {
    return /(列车|车厢|车票|手机|短信|电台|算法|芯片|空间站|飞船|辐射|售票机|监控|终端|发动机)/.test(value);
  }
  if (/现代都市/.test(worldview)) {
    return /(灵契|神谕|血誓|诅咒|星门|魔法|蛊毒|盟主|地牢|宗门)/.test(value);
  }
  if (/废土末世/.test(worldview)) {
    return /(朝堂|宫殿|宗门|盟主|婚期将至|芭蕉|玉簪)/.test(value);
  }
  if (/太空科幻|近未来科幻/.test(worldview)) {
    return /(宗门|盟主|蛊毒|玉簪|朝堂|江湖|神谕)/.test(value);
  }
  return false;
}

function hashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function getLatestBatchId() {
  if (state.latestBatchId) return state.latestBatchId;
  const generated = state.cases
    .map(item => typeof item.source === "string" ? item.source : "")
    .filter(source => source.startsWith("volcengine-"));
  return generated[generated.length - 1] || "";
}

function buildReviewReference(reviewed) {
  const scoreAverages = {};
  SCORE_FIELDS.forEach(([, key]) => {
    const values = reviewed
      .map(item => item.label?.scores?.[key])
      .filter(value => Number.isFinite(value));
    scoreAverages[key] = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 3;
  });

  const lengthFlagged = reviewed
    .filter(item => item.label?.flags?.lengthIssue)
    .map(item => countChars(item.storyText));
  const lengthThreshold = lengthFlagged.length ? Math.min(...lengthFlagged) : 760;
  const annotators = reviewed
    .map(item => item.label?.annotator)
    .filter(Boolean);

  return {
    scoreAverages,
    lengthThreshold,
    annotator: mostCommon(annotators) || "Codex补标"
  };
}

function inferAnnotationFromReference(item, reviewed, reference) {
  const features = getCaseFeatures(item);
  const neighbors = getNearestReviewed(item, reviewed);
  const neighborScores = weightedNeighborScores(neighbors);
  const flags = inferFlags(item, features, neighbors, reference);
  const scores = {};

  SCORE_FIELDS.forEach(([, key]) => {
    const raw = rawScoreForDimension(key, item, features, flags);
    const neighbor = neighborScores[key] || reference.scoreAverages[key] || 3;
    const calibrated = (neighbor * 0.62) + (raw * 0.38);
    scores[key] = clampScore(Math.round(calibrated));
  });

  return {
    flags,
    scores,
    notes: buildAutoNotes(item, features, flags, scores, neighbors)
  };
}

function getCaseFeatures(item) {
  const text = String(item.storyText || "");
  const length = countChars(text);
  const paragraphCount = text.split(/\n+/).map(part => part.trim()).filter(Boolean).length;
  const quoteFormatted = /[说道问喊答]：[“"][^”"]+[”"]/.test(text) || /[：:][“"][^”"]+[”"]/.test(text);
  const badEndingSignals = /(失败|死亡|被困|失去|葬身|陷入|惩罚|封印|灰烬|绝境|无法|毁|崩|吞没|监狱|牺牲|破灭|暴露|冻结|困局)/.test(text);
  const roleJoinIssue = /[一-龥·]{2,}(工会|宴会|却脸色|生死一线|在雷恩|正当她|山庄弟子|商队深入)/.test(text);
  const repeatedPhrase = hasRepeatedChunk(text);
  const emotionalSignals = /(父|母|师父|妹妹|亲|承诺|希望|恐惧|绝望|冤|复仇|守护|失去|救|愧|泪|痛|不舍|悔)/.test(text);
  const concreteSignals = /(钥匙|罗盘|药瓶|星图|航标|温室|契约|齿轮|渡船|审判|孢子|工会|祭品|飞艇|芯片|匣|井|门|刀|枪|盐|血|灯|阀)/.test(text);
  const agencySignals = /(决定|选择|举起|握紧|冲|潜入|追|喊|说|打开|签下|按下|转动|交出|撬开|藏起|挡住)/.test(text);
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

function getNearestReviewed(item, reviewed) {
  const features = getCaseFeatures(item);
  return reviewed
    .map(candidate => ({
      item: candidate,
      score: similarityScore(item, features, candidate, getCaseFeatures(candidate))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, reviewed.length));
}

function similarityScore(item, features, candidate, candidateFeatures) {
  let score = 1;
  if (item.theme === candidate.theme) score += 4;
  if (item.worldview === candidate.worldview) score += 4;
  if (item.motif && item.motif === candidate.motif) score += 2;
  score += Math.max(0, 3 - Math.abs(features.length - candidateFeatures.length) / 140);
  if (features.badEndingSignals === candidateFeatures.badEndingSignals) score += 1;
  if (features.emotionalSignals === candidateFeatures.emotionalSignals) score += 1;
  return score;
}

function weightedNeighborScores(neighbors) {
  const scores = {};
  const weightSum = neighbors.reduce((sum, entry) => sum + Math.max(entry.score, 0.1), 0);
  SCORE_FIELDS.forEach(([, key]) => {
    const weighted = neighbors.reduce((sum, entry) => {
      const value = entry.item.label?.scores?.[key];
      return sum + (Number.isFinite(value) ? value * Math.max(entry.score, 0.1) : 0);
    }, 0);
    scores[key] = weightSum ? weighted / weightSum : 3;
  });
  return scores;
}

function inferFlags(item, features, neighbors, reference) {
  const neighborFlags = {};
  FLAG_FIELDS.forEach(([, key]) => {
    neighborFlags[key] = neighbors.filter(entry => entry.item.label?.flags?.[key]).length;
  });

  return {
    formatError: !item.title || !item.storyText || features.length < 120 || !features.quoteFormatted || neighborFlags.formatError >= 2,
    corruptText: features.repeatedPhrase || /undefined|null|\[object Object\]/i.test(item.storyText) || neighborFlags.corruptText >= 2,
    promptMismatch: features.nonStoryOutput || neighborFlags.promptMismatch >= 2,
    lengthIssue: features.length < 300 || features.length > 600 || neighborFlags.lengthIssue >= 2,
    unsafe: neighborFlags.unsafe >= 2
  };
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

function buildAutoNotes(item, features, flags, scores, neighbors) {
  const refs = neighbors
    .map(entry => entry.item.title)
    .filter(Boolean)
    .slice(0, 2)
    .join("、");
  const notes = [];
  const isRomance = getEvaluationStandard(item) === "romance";

  if (flags.lengthIssue) notes.push(`篇幅约 ${features.length} 字，超出 300-600 字评测范围`);
  if (!features.quoteFormatted) notes.push("关键台词格式仍需人工复核");
  if (features.roleJoinIssue) notes.push("局部有角色名和叙述粘连，影响文笔流畅度");
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
    if (scores.logic >= 4) notes.push("核心因果达到较好水平");
    if (scores.logic <= 2) notes.push("关键因果有明显跳步");
    if (scores.emotion >= 4) notes.push("人物动机、代价和内心反应较完整");
    if (scores.emotion <= 2) notes.push("情绪更多停留在事件说明");
    if (scores.prose >= 4) notes.push("意象、动作和感官细节较稳定");
    if (scores.prose <= 2) notes.push("表达偏生硬或解释感较重");
    if (scores.tension >= 4) notes.push("冲突递进和临场压力较足");
    if (scores.tension <= 2) notes.push("阅读张力偏弱");
  }

  const prefix = refs
    ? `${isRomance ? "Codex爱情标准补标" : "Codex补标"}，参照已评样本《${refs}》的分数区间。`
    : `${isRomance ? "Codex爱情标准补标" : "Codex补标"}。`;
  return `${prefix}${notes.join("；")}。`;
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

function mostCommon(values) {
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

async function importGeneratedBatch(path, label) {
  try {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return "";

    const payload = await response.json();
    const rawCases = Array.isArray(payload.cases) ? payload.cases : payload;
    if (!Array.isArray(rawCases) || !rawCases.length) return "";
    const batchId = stringValue(payload.batchId) || stringValue(payload.id);
    if (!batchId) return "";
    const revision = stringValue(payload.labelRevision || payload.quoteFormatRevision || payload.generatedAt);
    const batchKey = `${batchId}:${AUTO_BATCH_REVISION}:${rawCases.length}:${revision}`;
    const storedById = new Map(state.cases.map(item => [item.id, item]));
    const imported = rawCases
      .map((item, index) => normalizeCase(item, index))
      .map(item => {
        const stored = storedById.get(item.id);
        const nextItem = shouldPreserveStoredLabel(stored, item) ? { ...item, label: stored.label } : item;
        return shouldPreserveHumanLabel(stored)
          ? { ...nextItem, humanLabel: stored.humanLabel }
          : nextItem;
      });
    const importedIds = new Set(imported.map(item => item.id));

    state.cases = state.cases.filter(item => {
      return getCaseBatchId(item) !== batchId && item.source !== "demo" && !importedIds.has(item.id);
    });
    state.cases.push(...imported);

    state.batchMeta[batchId] = {
      id: batchId,
      label: stringValue(payload.batchLabel) || label,
      path,
      count: imported.length,
      generatedAt: stringValue(payload.generatedAt),
      labelRevision: stringValue(payload.labelRevision)
    };
    if (path === AUTO_BATCH_PATH) state.latestBatchId = batchId;
    if (!state.activeBatchId) state.activeBatchId = batchId;
    if (batchKey && !state.importedBatchIds.includes(batchKey)) state.importedBatchIds.push(batchKey);
    saveToStorage();
    return batchId;
  } catch {
    return "";
  }
}

function shouldPreserveStoredLabel(storedItem, incomingItem) {
  const storedLabel = storedItem?.label;
  if (!storedLabel?.reviewed) return false;
  if (!incomingItem?.label?.reviewed) return isCodexAutoLabel(storedLabel);
  return false;
}

function shouldPreserveHumanLabel(storedItem) {
  const humanLabel = storedItem?.humanLabel;
  return Boolean(humanLabel?.reviewed || humanLabel?.manualEdited || humanLabel?.humanEdited);
}

function isCodexAutoLabel(label) {
  if (!label || typeof label !== "object") return false;
  if (label.manualEdited || label.humanEdited) return false;
  const annotator = stringValue(label.annotator);
  return label.autoCompletedBy === "codex"
    || Boolean(label.autoCompletedRevision)
    || annotator === "Codex"
    || annotator === "Codex补标";
}

async function importInitialGeneratedBatch() {
  return importGeneratedBatch(FIRST_BATCH_PATH, FIRST_BATCH_LABEL);
}

async function importLatestGeneratedBatch() {
  return importGeneratedBatch(AUTO_BATCH_PATH, AUTO_BATCH_LABEL);
}

async function importGeneratedManifest() {
  try {
    const response = await fetch(`${BATCH_MANIFEST_PATH}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json();
    const batches = Array.isArray(payload.batches) ? payload.batches : [];
    const imported = [];
    for (const batch of batches) {
      const path = stringValue(batch.path);
      if (!path || path === AUTO_BATCH_PATH) continue;
      const batchId = await importGeneratedBatch(path, stringValue(batch.label) || "生成批次");
      if (batchId) imported.push(batchId);
    }
    return imported;
  } catch {
    return [];
  }
}

function markDirty() {
  state.dirty = true;
  syncCurrentCaseFromForm();
  saveToStorage();
  renderStatsPanel();
  renderCaseList();
}

function markCaseDirty() {
  state.dirty = true;
  syncCaseFieldsFromForm();
  saveToStorage();
  renderStatsPanel();
  renderCaseList();
}

function currentHumanLabel() {
  const item = currentCase();
  if (!item) return createEmptyReview();
  if (!item.humanLabel) item.humanLabel = createEmptyReview();
  return item.humanLabel;
}

function syncCaseFieldsFromForm() {
  const item = currentCase();
  if (!item) return;
  CASE_FIELDS.forEach(([, key]) => {
    item[key] = caseInputs[key].value.trim();
  });
}

function syncCurrentCaseFromForm() {
  const item = currentCase();
  if (!item) return;
  syncCaseFieldsFromForm();
  const humanLabel = currentHumanLabel();
  humanLabel.manualEdited = true;
  humanLabel.humanEdited = true;
  humanLabel.evaluationStandard = getEvaluationStandard(item);
  humanLabel.annotator = elements.annotatorInput.value.trim();
  humanLabel.notes = elements.notesInput.value.trim();
  humanLabel.updatedAt = new Date().toISOString();

  SCORE_FIELDS.forEach(([, key]) => {
    humanLabel.scores[key] = clampScore(scoreInputs[key].value);
  });
  FLAG_FIELDS.forEach(([, key]) => {
    humanLabel.flags[key] = flagInputs[key].checked;
  });
}

function normalizeStoryInput() {
  const item = currentCase();
  if (!item) return;

  const input = caseInputs.storyText;
  const normalized = normalizeStoryLineBreaks(input.value);
  if (input.value === normalized) return;

  input.value = normalized;
  item.storyText = normalized;
  item.updatedAt = new Date().toISOString();
  saveToStorage();
  renderCaseList();
}

function render() {
  clampCurrentIndex();
  renderBatchTabs();
  renderStandardTabs();
  renderStatus();
  renderStatsPanel();
  renderCaseList();
  renderForm();
}

function clampCurrentIndex() {
  state.currentIndex = Math.min(state.currentIndex, Math.max(activeCases().length - 1, 0));
}

function renderStatus() {
  const cases = activeCases();
  const labeledCount = cases.filter(isLabeled).length;
  elements.caseCount.textContent = cases.length;
  elements.labeledCount.textContent = labeledCount;
  elements.currentCaseLabel.textContent = cases.length ? `${state.currentIndex + 1} / ${cases.length}` : "-";
  elements.saveState.textContent = state.dirty ? "正在保存" : "已保存到本地";
}

function renderBatchTabs() {
  elements.batchTabs.innerHTML = "";
  getBatchList().forEach(batch => {
    const cases = getBatchCases(batch.id);
    const reviewed = cases.filter(isLabeled).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["batch-tab", batch.id === state.activeBatchId ? "active" : ""].filter(Boolean).join(" ");
    button.innerHTML = `
      <span>${escapeHTML(batch.label)}</span>
      <small>${reviewed}/${cases.length}</small>
    `;
    button.addEventListener("click", () => {
      state.activeBatchId = batch.id;
      state.currentIndex = 0;
      saveToStorage();
      render();
    });
    elements.batchTabs.append(button);
  });
}

function renderStandardTabs() {
  if (!elements.standardTabs) return;
  const batchCases = getBatchCases();
  const filters = [
    ["all", "全部", batchCases],
    ["general", "通用故事", batchCases.filter(item => !isRomanceCase(item))],
    ["romance", "爱情故事", batchCases.filter(isRomanceCase)]
  ];

  elements.standardTabs.innerHTML = "";
  filters.forEach(([id, label, cases]) => {
    const reviewed = cases.filter(isLabeled).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["standard-tab", state.activeStandardFilter === id ? "active" : ""].filter(Boolean).join(" ");
    button.innerHTML = `
      <span>${escapeHTML(label)}</span>
      <small>${reviewed}/${cases.length}</small>
    `;
    button.disabled = id !== "all" && cases.length === 0;
    button.addEventListener("click", () => {
      state.activeStandardFilter = id;
      state.currentIndex = 0;
      saveToStorage();
      render();
    });
    elements.standardTabs.append(button);
  });
}

function renderStatsPanel() {
  const stats = computeStats(activeCases());
  const activeStandardLabel = {
    all: "混合视图",
    general: "通用标准",
    romance: "爱情标准"
  }[state.activeStandardFilter] || "混合视图";
  const flagLabels = {
    formatError: "格式错误",
    corruptText: "乱码/截断/重复",
    promptMismatch: "内容跑题",
    lengthIssue: "长度异常",
    unsafe: "不适合发布"
  };
  const dimensionLabels = {
    logic: "逻辑",
    emotion: "情感",
    prose: "文笔",
    tension: "张力"
  };
  const dimensionCards = SCORE_FIELDS.map(([, key]) => `
    <div class="stat-card">
      <span>${dimensionLabels[key]}平均分</span>
      <strong>${formatNumber(stats.scoreAverages[key])}</strong>
    </div>
  `).join("");
  const flagRates = FLAG_FIELDS.map(([, key]) => `
    <div class="flag-rate">
      <span>${flagLabels[key]}</span>
      <strong>${formatPercent(stats.flagRates[key])}</strong>
    </div>
  `).join("");

  elements.statsPanel.innerHTML = `
    <div class="stat-card">
      <span>总平均分 · ${escapeHTML(activeStandardLabel)}</span>
      <strong>${formatNumber(stats.averageScore)}</strong>
    </div>
    ${dimensionCards}
    <div class="stat-card wide">
      <span>问题标记异常率</span>
      <div class="flag-rates">${flagRates}</div>
    </div>
  `;
}

function renderCaseList() {
  elements.caseList.innerHTML = "";
  const cases = activeCases();

  if (!cases.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "还没有样本";
    elements.caseList.append(empty);
    return;
  }

  cases.forEach((item, index) => {
    const button = document.createElement("button");
    const humanBadge = hasHumanAnnotation(item) ? `<span class="human-badge">人工</span>` : "";
    button.type = "button";
    button.className = [
      "case-item",
      index === state.currentIndex ? "active" : "",
      isLabeled(item) ? "done" : "",
      hasBlockingIssue(item) ? "invalid" : ""
    ].filter(Boolean).join(" ");
    button.innerHTML = `
      <span class="case-title-row">
        <span class="case-item-title">${escapeHTML(item.title || item.id || `样本 ${index + 1}`)}</span>
        ${humanBadge}
      </span>
      <span class="case-item-meta">${escapeHTML(labelSummary(item))}</span>
    `;
    button.addEventListener("click", () => {
      state.currentIndex = index;
      saveToStorage();
      render();
    });
    elements.caseList.append(button);
  });
}

function renderForm() {
  const item = currentCase();
  const cases = activeCases();
  const disabled = !item;

  CASE_FIELDS.forEach(([, key]) => {
    caseInputs[key].disabled = disabled;
    caseInputs[key].value = item?.[key] || "";
  });
  elements.annotatorInput.disabled = disabled;
  elements.notesInput.disabled = disabled;
  elements.prevBtn.disabled = disabled || state.currentIndex <= 0;
  elements.nextBtn.disabled = disabled || state.currentIndex >= cases.length - 1;
  elements.deleteCaseBtn.disabled = disabled;
  elements.markDoneBtn.disabled = disabled;

  renderCodexReview(item);

  const humanLabel = item?.humanLabel || createEmptyReview();
  elements.annotatorInput.value = humanLabel.annotator || "";
  elements.notesInput.value = humanLabel.notes || "";

  SCORE_FIELDS.forEach(([, key]) => {
    const value = humanLabel.scores?.[key] || 3;
    scoreInputs[key].disabled = disabled;
    scoreInputs[key].value = value;
    scoreOutputs[key].textContent = value;
  });

  FLAG_FIELDS.forEach(([, key]) => {
    flagInputs[key].disabled = disabled;
    flagInputs[key].checked = Boolean(humanLabel.flags?.[key]);
  });
}

function renderCodexReview(item) {
  if (!elements.codexReviewPanel) return;
  const label = item?.label;
  if (!item || !label?.reviewed) {
    elements.codexReviewPanel.innerHTML = `<div class="codex-empty">暂无 Codex 自动评测结果</div>`;
    return;
  }

  const scoreNames = {
    logic: "逻辑完整",
    emotion: "情感有效",
    prose: "文笔质感",
    tension: "故事张力"
  };
  const flagNames = {
    formatError: "格式错误",
    corruptText: "乱码/截断/重复",
    promptMismatch: "内容跑题",
    lengthIssue: "长度异常",
    unsafe: "不适合发布"
  };
  const scoreCards = SCORE_FIELDS
    .map(([, key]) => {
      const value = Number.isFinite(label.scores?.[key]) ? label.scores[key] : "-";
      return `
        <div class="readonly-score">
          <span>${escapeHTML(scoreNames[key])}</span>
          <strong>${escapeHTML(value)}</strong>
        </div>
      `;
    })
    .join("");
  const activeFlags = FLAG_FIELDS
    .filter(([, key]) => label.flags?.[key])
    .map(([, key]) => flagNames[key]);
  const updatedAt = label.updatedAt ? new Date(label.updatedAt).toLocaleString("zh-CN") : "";
  const meta = [
    getEvaluationStandardLabel(item),
    label.annotator || "Codex",
    updatedAt
  ].filter(Boolean).join(" / ");

  elements.codexReviewPanel.innerHTML = `
    <div class="readonly-meta">
      <span>评测来源</span>
      <strong>${escapeHTML(meta)}</strong>
    </div>
    <div class="readonly-score-grid">${scoreCards}</div>
    <div class="readonly-flags">
      <span>问题标记</span>
      <strong>${escapeHTML(activeFlags.length ? activeFlags.join("、") : "无")}</strong>
    </div>
    <div class="readonly-notes">
      <span>备注</span>
      <p>${escapeHTML(label.notes || "无")}</p>
    </div>
  `;
}

function labelSummary(item) {
  const stateText = isLabeled(item) ? "已评测" : "待评测";
  const scoreText = isLabeled(item) ? `均分 ${averageScore(item).toFixed(1)}` : "";
  const meta = [item.worldview, item.theme, getEvaluationStandardLabel(item), scoreText].filter(Boolean).join(" / ");
  return meta ? `${stateText} · ${meta}` : stateText;
}

function isLabeled(item) {
  return Boolean(item?.label?.reviewed);
}

function hasHumanAnnotation(item) {
  return Boolean(item?.humanLabel?.reviewed);
}

function hasBlockingIssue(item) {
  const flags = item?.label?.flags || {};
  return Boolean(flags.formatError || flags.corruptText || flags.promptMismatch || flags.lengthIssue || flags.unsafe);
}

function averageScore(item) {
  const weights = getScoreWeights(item);
  let weighted = 0;
  let totalWeight = 0;
  SCORE_FIELDS.forEach(([, key]) => {
    const value = item?.label?.scores?.[key];
    if (!Number.isFinite(value)) return;
    const weight = weights[key] || 1;
    weighted += value * weight;
    totalWeight += weight;
  });
  return totalWeight ? weighted / totalWeight : 0;
}

function getScoreWeights(item) {
  if (isRomanceCase(item)) {
    return {
      logic: 0.15,
      emotion: 0.4,
      prose: 0.3,
      tension: 0.15
    };
  }
  return {
    logic: 1,
    emotion: 1,
    prose: 1,
    tension: 1
  };
}

function getBatchList() {
  const ids = new Set(Object.keys(state.batchMeta));
  state.cases.forEach(item => ids.add(getCaseBatchId(item)));

  const batches = Array.from(ids)
    .filter(id => getBatchCases(id).length)
    .map(id => ({
      id,
      label: state.batchMeta[id]?.label || (id === "manual" ? "手动导入" : id)
    }));

  return batches.sort((a, b) => {
    const order = [FIRST_BATCH_LABEL, AUTO_BATCH_LABEL, "手动导入"];
    const aOrder = order.indexOf(a.label);
    const bOrder = order.indexOf(b.label);
    if (aOrder !== bOrder) return (aOrder < 0 ? 99 : aOrder) - (bOrder < 0 ? 99 : bOrder);
    return a.label.localeCompare(b.label, "zh-CN");
  });
}

function computeStats(cases) {
  const reviewed = cases.filter(isLabeled);
  const scoreAverages = {};
  SCORE_FIELDS.forEach(([, key]) => {
    const values = reviewed
      .map(item => item.label?.scores?.[key])
      .filter(value => Number.isFinite(value));
    scoreAverages[key] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  });

  const averageValues = reviewed
    .map(averageScore)
    .filter(value => Number.isFinite(value) && value > 0);
  const flagRates = {};
  FLAG_FIELDS.forEach(([, key]) => {
    const count = reviewed.filter(item => item.label?.flags?.[key]).length;
    flagRates[key] = reviewed.length ? count / reviewed.length : null;
  });

  return {
    reviewed: reviewed.length,
    total: cases.length,
    averageScore: averageValues.length ? averageValues.reduce((sum, value) => sum + value, 0) / averageValues.length : null,
    scoreAverages,
    flagRates
  };
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "-";
}

function parseImportedText(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  return trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

async function importFile(file) {
  const text = await file.text();
  const imported = parseImportedText(text).map(normalizeCase);
  if (!imported.length) return;
  state.cases.push(...imported);
  state.activeBatchId = getCaseBatchId(imported[0]);
  state.currentIndex = 0;
  saveToStorage();
  render();
}

function exportCases(kind) {
  const cases = activeCases();
  const content = kind === "jsonl"
    ? cases.map(item => JSON.stringify(item)).join("\n")
    : JSON.stringify(cases, null, 2);
  const extension = kind === "jsonl" ? "jsonl" : "json";
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `story-annotations-${new Date().toISOString().slice(0, 10)}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createCaseFromPaste() {
  const text = elements.pasteInput.value.trim();
  if (!text) return;

  let nextCase;
  try {
    const parsed = parseImportedText(text);
    nextCase = normalizeCase(parsed[0], state.cases.length);
  } catch {
    nextCase = createEmptyCase({
      id: `text-${Date.now().toString(36)}`,
      storyText: text,
      source: "paste"
    });
  }

  state.cases.push(nextCase);
  state.activeBatchId = getCaseBatchId(nextCase);
  state.currentIndex = Math.max(getBatchCases(state.activeBatchId).length - 1, 0);
  elements.pasteInput.value = "";
  elements.pasteDialog.close();
  saveToStorage();
  render();
}

function deleteCurrentCase() {
  const item = currentCase();
  if (!item) return;
  const ok = window.confirm(`删除样本 ${item.title || item.id}？`);
  if (!ok) return;
  state.cases = state.cases.filter(candidate => candidate.id !== item.id);
  state.currentIndex = Math.min(state.currentIndex, Math.max(activeCases().length - 1, 0));
  saveToStorage();
  render();
}

function goTo(delta) {
  const cases = activeCases();
  if (!cases.length) return;
  state.currentIndex = Math.min(
    Math.max(state.currentIndex + delta, 0),
    cases.length - 1
  );
  saveToStorage();
  render();
}

function markDoneAndNext() {
  syncCurrentCaseFromForm();
  const humanLabel = currentHumanLabel();
  humanLabel.reviewed = true;
  humanLabel.updatedAt = new Date().toISOString();
  refreshCodexReviewsFromHumanGuidance();
  const cases = activeCases();
  if (state.currentIndex < cases.length - 1) {
    state.currentIndex += 1;
  }
  saveToStorage();
  render();
}

function escapeHTML(value) {
  return String(value)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");
}

CASE_FIELDS.forEach(([, key]) => {
  caseInputs[key].addEventListener("input", markCaseDirty);
});
caseInputs.storyText.addEventListener("blur", normalizeStoryInput);
SCORE_FIELDS.forEach(([, key]) => {
  scoreInputs[key].addEventListener("input", () => {
    scoreOutputs[key].textContent = scoreInputs[key].value;
    markDirty();
  });
});
FLAG_FIELDS.forEach(([, key]) => {
  flagInputs[key].addEventListener("change", markDirty);
});

elements.annotatorInput.addEventListener("input", markDirty);
elements.notesInput.addEventListener("input", markDirty);
elements.importInput.addEventListener("change", event => {
  const [file] = event.target.files || [];
  if (file) importFile(file);
  event.target.value = "";
});
elements.exportJsonlBtn.addEventListener("click", () => exportCases("jsonl"));
elements.exportJsonBtn.addEventListener("click", () => exportCases("json"));
elements.newCaseBtn.addEventListener("click", () => elements.pasteDialog.showModal());
elements.confirmPasteBtn.addEventListener("click", createCaseFromPaste);
elements.prevBtn.addEventListener("click", () => goTo(-1));
elements.nextBtn.addEventListener("click", () => goTo(1));
elements.deleteCaseBtn.addEventListener("click", deleteCurrentCase);
elements.markDoneBtn.addEventListener("click", markDoneAndNext);

async function init() {
  loadFromStorage();
  state.cases = state.cases.filter(item => {
    const batchId = getCaseBatchId(item);
    return item.id !== "demo-001" && batchId !== "manual-first-10-relabel-2026-05-26";
  });
  delete state.batchMeta["manual-first-10-relabel-2026-05-26"];
  state.importedBatchIds = state.importedBatchIds.filter(id => !id.startsWith("manual-first-10-relabel-2026-05-26:"));
  const firstBatchId = await importInitialGeneratedBatch();
  await importLatestGeneratedBatch();
  await importGeneratedManifest();
  if (!state.activeBatchId || !activeCases().length) {
    state.activeBatchId = state.latestBatchId || firstBatchId || getBatchList()[0]?.id || "";
    state.currentIndex = 0;
  }
  autoCompleteRemainingReviews();
  refreshCodexReviewsFromHumanGuidance();
  if (state.cases.length) {
    saveToStorage();
  }
  render();
}

init();
