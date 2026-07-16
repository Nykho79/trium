import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const questionDirectory = join(process.cwd(), "src", "data", "questions");

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  verificationStatus: z.enum(["to_verify", "verified", "rejected"]).default("to_verify"),
  status: z.enum(["generated", "draft", "review", "approved", "rejected"]).default("generated"),
  version: z.number().int().positive().default(1),
}).passthrough();
const fileSchema = z.object({
  schemaVersion: z.string().min(1),
  fileId: z.string().min(1),
  title: z.string().min(1),
  questionType: z.string().min(1),
  questions: z.array(questionSchema).optional(),
  series: z.array(z.object({ questions: z.array(questionSchema) }).passthrough()).optional(),
  paths: z.array(z.object({ steps: z.array(z.object({ content: questionSchema }).passthrough()) }).passthrough()).optional(),
}).passthrough();

function normalizeText(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLocaleLowerCase("fr-FR");
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function promptOf(question) {
  return question.question ?? question.prompt ?? question.statement ?? question.title ?? "";
}

function fingerprint(question) {
  return normalizeText(JSON.stringify({
    type: question.type,
    prompt: promptOf(question),
    answers: question.answers ?? question.items ?? question.sequence ?? question.clues,
    correct: question.correctAnswerId ?? question.correctAnswerIds ?? question.correctItemId ?? question.correctAnswer,
  }));
}

function detectExactDuplicates(questions) {
  const prompts = new Map();
  for (const question of questions) {
    const key = fingerprint(question);
    prompts.set(key, [...(prompts.get(key) ?? []), question.id]);
  }
  return [...prompts.entries()].filter(([, ids]) => ids.length > 1).map(([key, questionIds]) => ({ key, questionIds }));
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter((token) => token.length > 2));
}

function jaccard(left, right) {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function detectProbableDuplicates(questions) {
  const duplicates = [];
  for (let leftIndex = 0; leftIndex < questions.length; leftIndex += 1) {
    const left = questions[leftIndex];
    const leftTokens = tokenSet(fingerprint(left));
    for (let rightIndex = leftIndex + 1; rightIndex < questions.length; rightIndex += 1) {
      const right = questions[rightIndex];
      if (left.category !== right.category) continue;
      const score = jaccard(leftTokens, tokenSet(fingerprint(right)));
      if (score >= 0.82) duplicates.push({ leftId: left.id, rightId: right.id, score: Number(score.toFixed(2)) });
    }
  }
  return duplicates;
}

function flattenQuestions(file) {
  return [
    ...(file.questions ?? []),
    ...(file.series ?? []).flatMap((series) => series.questions),
    ...(file.paths ?? []).flatMap((pathValue) => pathValue.steps.map((step) => step.content)),
  ];
}

function answerIds(question) {
  if (question.type === "true_false") return ["true", "false"];
  if (Array.isArray(question.answers)) return question.answers.map((answer) => answer.id);
  if (Array.isArray(question.items)) return question.items.map((item) => item.id);
  return [];
}

function structuralError(question) {
  if (!promptOf(question)) return "enonce manquant";
  if (["multiple_choice", "multiple_select", "logical_sequence", "logical_ranking", "logic_puzzle", "symbol_rule", "visual_matrix"].includes(question.type) && !Array.isArray(question.answers)) return "propositions manquantes";
  if (question.type === "conceptual_intruder" && !Array.isArray(question.items)) return "items manquants";
  if (question.type === "progressive_clues" && !Array.isArray(question.clues)) return "indices manquants";
  if (question.type === "connection" && !Array.isArray(question.items)) return "elements de connexion manquants";
  const ids = new Set(answerIds(question));
  const correctIds = question.correctAnswerIds ?? [question.correctAnswerId ?? question.correctItemId].filter(Boolean);
  for (const id of correctIds) {
    if (!ids.has(id)) return `bonne reponse absente: ${id}`;
  }
  if (question.type !== "true_false" && correctIds.length === 0) return "bonne reponse manquante";
  return undefined;
}

const files = readdirSync(questionDirectory).filter((file) => file.endsWith(".json") && !file.includes(" - Copie")).sort();
const report = {
  fileCount: files.length,
  totalCount: 0,
  playableCount: 0,
  byCategory: {},
  bySubCategory: {},
  byDifficulty: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  correctAnswerDistribution: {},
  verifiedCount: 0,
  rejectedCount: 0,
  exactDuplicates: [],
  probableDuplicates: [],
  validationErrors: [],
};
const questions = [];

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(questionDirectory, file), "utf8"));
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    report.validationErrors.push(`${file}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    continue;
  }
  const fileQuestions = flattenQuestions(parsed.data);
  for (const question of fileQuestions) {
    const error = structuralError(question);
    if (error) report.validationErrors.push(`${file}/${question.id}: ${error}`);
  }
  questions.push(...fileQuestions);
}

for (const question of questions) {
  report.totalCount += 1;
  increment(report.byCategory, question.category);
  increment(report.bySubCategory, `${question.category}/${question.subcategory}`);
  increment(report.byDifficulty, question.difficulty);
  increment(report.correctAnswerDistribution, question.correctAnswerId ?? question.correctItemId ?? question.correctAnswerIds?.join("+") ?? String(question.correctAnswer ?? "n/a"));
  if (question.verificationStatus !== "rejected" && question.status !== "rejected") {
    report.verifiedCount += 1;
    report.playableCount += 1;
  }
}
report.rejectedCount = report.totalCount - report.playableCount;
report.exactDuplicates = detectExactDuplicates(questions);
report.probableDuplicates = detectProbableDuplicates(questions);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("TRIUM questions report");
  console.log(`Files: ${report.fileCount}`);
  console.log(`Total: ${report.totalCount}`);
  console.log(`Playable structurally valid: ${report.playableCount}`);
  console.log(`Verified by application validation: ${report.verifiedCount}`);
  console.log(`Rejected/non playable: ${report.rejectedCount}`);
  console.log(`Exact duplicates: ${report.exactDuplicates.length}`);
  console.log(`Probable duplicates: ${report.probableDuplicates.length}`);
  console.log("By category:", report.byCategory);
  console.log("By subcategory:", report.bySubCategory);
  console.log("By difficulty:", report.byDifficulty);
  console.log("Correct answer distribution:", report.correctAnswerDistribution);
  if (report.validationErrors.length > 0) console.log("Validation errors:", report.validationErrors);
}

if (report.validationErrors.length > 0) {
  process.exitCode = 1;
}