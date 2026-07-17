import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const questionDirectory = join(process.cwd(), "src", "data", "questions");
const sourceFiles = readdirSync(questionDirectory)
  .filter((file) => file.endsWith(".json") && !file.includes(" - Copie"))
  .sort();

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("fr-FR");
}

function promptOf(question) {
  return question.question ?? question.prompt ?? question.statement ?? "";
}

function answerIds(question) {
  if (question.type === "true_false") return ["true", "false"];
  if (Array.isArray(question.answers)) return question.answers.map((answer) => answer.id);
  if (Array.isArray(question.items)) return question.items.map((item) => item.id);
  return [];
}

function correctIds(question) {
  if (Array.isArray(question.correctAnswerIds)) return question.correctAnswerIds;
  if (question.correctAnswerId) return [question.correctAnswerId];
  if (question.correctItemId) return [question.correctItemId];
  if (question.type === "true_false" && typeof question.correctAnswer === "boolean") {
    return [question.correctAnswer ? "true" : "false"];
  }
  return [];
}

function optionLabels(question) {
  if (Array.isArray(question.answers)) {
    return question.answers.map((answer) => normalizeText(answer.text ?? answer.id));
  }
  if (Array.isArray(question.items)) {
    return question.items.map((item) => normalizeText(item.text ?? item.label ?? item.id));
  }
  return [];
}

function fingerprint(question) {
  return normalizeText(JSON.stringify({
    type: question.type,
    prompt: promptOf(question),
    answers: question.answers ?? question.items ?? question.sequence ?? question.clues,
    correct: question.correctAnswerId ?? question.correctAnswerIds ?? question.correctItemId ?? question.correctAnswer,
  }));
}

function contentQualityScore(question, fileName) {
  let score = 0;
  if (fileName === "final-convergence.json") score += 1_000;
  if (question.status === "approved") score += 100;
  if (question.verificationStatus === "verified") score += 100;
  if (question.contextualHint) score += 20;
  if (question.sourceUrl) score += 10;
  if (question.sourceLabel) score += 6;
  score += Math.min(40, String(question.explanation ?? "").length / 5);
  score += Math.min(20, promptOf(question).length / 8);
  return score;
}

function hasMojibake(value) {
  const text = JSON.stringify(value);
  const suspectMatches = text.match(/Ãƒ.|Ã¢.|Ã….|ï¿½/g) ?? [];
  return suspectMatches.length >= 4;
}

function weakQualityReasons(question) {
  const reasons = [];
  const prompt = promptOf(question).trim();
  const explanation = String(question.explanation ?? "").trim();
  const searchable = normalizeText(`${prompt} ${explanation} ${question.contextualHint ?? ""}`);
  const ids = new Set(answerIds(question));
  const labels = optionLabels(question).filter(Boolean);
  const uniqueLabels = new Set(labels);
  const requiredFourAnswerTypes = new Set([
    "multiple_choice",
    "multiple_select",
    "logical_sequence",
    "logical_ranking",
    "logic_puzzle",
    "symbol_rule",
    "visual_matrix",
  ]);

  if (!question.id || !question.type || !question.category || !question.subcategory || !question.difficulty) {
    reasons.push("metadata incomplete");
  }
  if (prompt.length < 18) reasons.push("enonce trop court");
  if (explanation.length < 24) reasons.push("explication trop courte");
  if (/\b(todo|lorem|placeholder|a completer|indisponible)\b/.test(searchable)) {
    reasons.push("contenu placeholder");
  }
  if (requiredFourAnswerTypes.has(question.type) && (!Array.isArray(question.answers) || question.answers.length !== 4)) {
    reasons.push("quatre propositions requises");
  }
  if (question.type === "conceptual_intruder" && (!Array.isArray(question.items) || question.items.length !== 4)) {
    reasons.push("quatre items requis");
  }
  if (question.type === "progressive_clues" && (!Array.isArray(question.clues) || question.clues.length < 3)) {
    reasons.push("indices insuffisants");
  }
  if (question.type === "connection" && (!Array.isArray(question.items) || question.items.length !== 4)) {
    reasons.push("quatre elements requis");
  }
  if (question.type !== "true_false" && correctIds(question).length === 0) {
    reasons.push("bonne reponse manquante");
  }
  for (const correctId of correctIds(question)) {
    if (!ids.has(correctId) && question.type !== "true_false") {
      reasons.push(`bonne reponse absente: ${correctId}`);
    }
  }
  if (labels.length > 1 && labels.length !== uniqueLabels.size) {
    reasons.push("propositions dupliquees");
  }
  if (hasMojibake({ prompt, explanation, answers: question.answers, items: question.items, clues: question.clues })) {
    reasons.push("encodage degrade");
  }

  return [...new Set(reasons)];
}

function collectQuestionRefs(file, fileName) {
  const refs = [];
  for (const [index, question] of (file.questions ?? []).entries()) {
    refs.push({ fileName, question, remove: () => { file.questions.splice(index, 1); } });
  }
  for (const series of file.series ?? []) {
    for (const [index, question] of (series.questions ?? []).entries()) {
      refs.push({ fileName, question, remove: () => { series.questions.splice(index, 1); } });
    }
  }
  for (const pathValue of file.paths ?? []) {
    for (const [index, step] of (pathValue.steps ?? []).entries()) {
      if (step.content) refs.push({ fileName, question: step.content, remove: () => { pathValue.steps.splice(index, 1); } });
    }
  }
  return refs;
}

function markApproved(question) {
  question.verificationStatus = "verified";
  question.status = "approved";
  question.version = Number.isInteger(question.version) && question.version > 0 ? question.version : 1;
  question.tags = Array.isArray(question.tags) ? question.tags.filter((tag) => String(tag).trim().length > 0) : [];
}

function removeRefsInReverse(refs, rejectedIds) {
  const byFile = new Map();
  for (const ref of refs) {
    if (!rejectedIds.has(ref.question.id)) continue;
    byFile.set(ref.fileName, [...(byFile.get(ref.fileName) ?? []), ref]);
  }
  for (const refsForFile of byFile.values()) {
    refsForFile.reverse().forEach((ref) => ref.remove());
  }
}

const parsedFiles = new Map(sourceFiles.map((fileName) => [
  fileName,
  JSON.parse(readFileSync(join(questionDirectory, fileName), "utf8")),
]));
const refs = [...parsedFiles.entries()].flatMap(([fileName, file]) => collectQuestionRefs(file, fileName));
const rejected = new Map();
const exactGroups = new Map();

for (const ref of refs) {
  const reasons = weakQualityReasons(ref.question);
  if (reasons.length > 0) rejected.set(ref.question.id, reasons);
  const key = fingerprint(ref.question);
  exactGroups.set(key, [...(exactGroups.get(key) ?? []), ref]);
}

let duplicateCount = 0;
for (const group of exactGroups.values()) {
  const candidates = group.filter((ref) => !rejected.has(ref.question.id));
  if (candidates.length <= 1) continue;
  const [kept, ...removed] = [...candidates].sort((left, right) => (
    contentQualityScore(right.question, right.fileName) - contentQualityScore(left.question, left.fileName)
  ));
  for (const ref of removed) {
    duplicateCount += 1;
    rejected.set(ref.question.id, [`doublon exact de ${kept.question.id}`]);
  }
}

const rejectedIds = new Set(rejected.keys());
removeRefsInReverse(refs, rejectedIds);

for (const file of parsedFiles.values()) {
  if (Array.isArray(file.paths)) {
    file.paths = file.paths.filter((pathValue) => !Array.isArray(pathValue.steps) || pathValue.steps.length === 5);
  }
}

let approvedCount = 0;
for (const file of parsedFiles.values()) {
  for (const ref of collectQuestionRefs(file, "curated")) {
    markApproved(ref.question);
    approvedCount += 1;
  }
}

for (const [fileName, file] of parsedFiles.entries()) {
  writeFileSync(join(questionDirectory, fileName), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

const rejectionSummary = {};
for (const reasons of rejected.values()) {
  for (const reason of reasons) {
    rejectionSummary[reason] = (rejectionSummary[reason] ?? 0) + 1;
  }
}

console.log("TRIUM question curation");
console.log(`Source files: ${sourceFiles.length}`);
console.log(`Input questions: ${refs.length}`);
console.log(`Rejected questions: ${rejected.size}`);
console.log(`Exact duplicates removed: ${duplicateCount}`);
console.log(`Approved questions: ${approvedCount}`);
console.log("Rejected by reason:", rejectionSummary);

