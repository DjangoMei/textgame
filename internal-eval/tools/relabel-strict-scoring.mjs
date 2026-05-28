import fs from "node:fs";
import path from "node:path";

const generatedDir = path.join(process.cwd(), "internal-eval", "generated");
const strictRevision = "codex-batch-label-v2-strict-scoring";
const scoreKeys = ["logic", "emotion", "prose", "tension"];

const targetFiles = [
  path.join(generatedDir, "latest.json"),
  ...fs.readdirSync(generatedDir)
    .filter(name => /^volcengine-.*\.json$/.test(name))
    .map(name => path.join(generatedDir, name))
].filter((file, index, files) => fs.existsSync(file) && files.indexOf(file) === index);

const before = [];
const after = [];

for (const file of targetFiles) {
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(payload.cases)) continue;

  before.push(summarize(file, payload.cases));
  payload.cases.forEach(item => {
    if (item.label?.manualEdited || item.label?.humanEdited) return;
    item.label = annotateCase(item);
  });
  payload.labelRevision = strictRevision;
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  after.push(summarize(file, payload.cases));
}

process.stdout.write(`${JSON.stringify({ strictRevision, before, after }, null, 2)}\n`);

function annotateCase(item) {
  const features = getCaseFeatures(item);
  const flags = {
    formatError: !item.title || !item.storyText || !features.quoteFormatted || features.length < 120,
    corruptText: features.repeatedPhrase || /undefined|null|\[object Object\]/i.test(item.storyText),
    promptMismatch: features.nonStoryOutput || !item.worldview || !item.theme,
    lengthIssue: features.length < 300 || features.length > 600,
    unsafe: false
  };

  const scores = Object.fromEntries(scoreKeys.map(key => [
    key,
    clampScore(Math.round(rawScoreForDimension(key, item, features, flags)))
  ]));

  return {
    reviewed: true,
    flags,
    scores,
    annotator: "Codex",
    notes: buildAnnotationNotes(features, flags, scores),
    updatedAt: new Date().toISOString(),
    autoCompletedBy: "codex",
    autoCompletedRevision: strictRevision
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
    nonStoryOutput
  };
}

function rawScoreForDimension(key, item, features, flags) {
  if (flags.formatError || flags.corruptText) return 1.8;
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

function buildAnnotationNotes(features, flags, scores) {
  const notes = [];
  if (flags.lengthIssue) notes.push(`篇幅约 ${features.length} 字，超出 300-600 字评测范围`);
  if (flags.formatError) notes.push("格式或关键台词呈现需要复核");
  if (flags.corruptText) notes.push("存在疑似重复/异常文本");
  if (flags.promptMismatch) notes.push("坏结局信号或题材贴合度不足");
  if (features.roleJoinIssue) notes.push("局部角色名与叙述粘连，影响阅读流畅度");
  if (scores.logic >= 4) notes.push("主角行动与坏结局因果达到较好水平");
  if (scores.logic <= 2) notes.push("关键因果有跳步");
  if (scores.emotion >= 4) notes.push("人物动机、代价和内心反应较完整");
  if (scores.emotion <= 2) notes.push("情绪更多停留在事件说明");
  if (scores.prose >= 4) notes.push("意象、动作和感官细节较稳定");
  if (scores.prose <= 2) notes.push("表达偏生硬");
  if (scores.tension >= 4) notes.push("冲突递进和临场压力较足");
  if (scores.tension <= 2) notes.push("故事张力偏弱");

  return `Codex批量评测（严格版）：${notes.length ? notes.join("；") : "基础可读，但未达到高分标准"}。`;
}

function summarize(file, cases) {
  const reviewed = cases.filter(item => item.label?.reviewed);
  const average = key => {
    if (!reviewed.length) return null;
    return round2(reviewed.reduce((sum, item) => sum + (item.label?.scores?.[key] || 0), 0) / reviewed.length);
  };
  const overall = reviewed.length
    ? round2(reviewed.reduce((sum, item) => sum + scoreKeys.reduce((inner, key) => inner + (item.label?.scores?.[key] || 0), 0) / scoreKeys.length, 0) / reviewed.length)
    : null;

  return {
    file: path.relative(process.cwd(), file),
    count: cases.length,
    reviewed: reviewed.length,
    overall,
    logic: average("logic"),
    emotion: average("emotion"),
    prose: average("prose"),
    tension: average("tension"),
    lengthIssue: reviewed.filter(item => item.label?.flags?.lengthIssue).length
  };
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

function countChars(value) {
  return Array.from(String(value || "").replace(/\s/g, "")).length;
}

function clampScore(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 3;
  return Math.min(5, Math.max(1, number));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
