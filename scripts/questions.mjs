import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const questionDirectory = join(process.cwd(), "src", "data", "questions");

const answerSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });
const questionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("multiple_choice"),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  question: z.string().min(1),
  answers: z.tuple([answerSchema, answerSchema, answerSchema, answerSchema]),
  correctAnswerId: z.string().min(1),
  explanation: z.string().min(1),
  sourceLabel: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  verificationStatus: z.enum(["to_verify", "verified", "rejected"]),
  tags: z.array(z.string().min(1)),
  estimatedTimeSeconds: z.number().int().min(5).max(180),
  status: z.enum(["generated", "draft", "review", "approved", "rejected"]),
  version: z.number().int().positive(),
}).superRefine((question, ctx) => {
  const answerIds = new Set(question.answers.map((answer) => answer.id));
  if (!answerIds.has(question.correctAnswerId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctAnswerId"], message: "La bonne reponse doit pointer vers une option existante." });
  }
});
const fileSchema = z.object({
  schemaVersion: z.string().min(1),
  fileId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  questionType: z.literal("multiple_choice"),
  generatedAt: z.string().nullable(),
  questions: z.array(questionSchema),
});

function normalizeText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLocaleLowerCase("fr-FR");
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function detectExactDuplicates(questions) {
  const prompts = new Map();
  for (const question of questions) {
    const key = normalizeText(question.question);
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
    const leftTokens = tokenSet(left.question);
    for (let rightIndex = leftIndex + 1; rightIndex < questions.length; rightIndex += 1) {
      const right = questions[rightIndex];
      if (left.category !== right.category) {
        continue;
      }
      const score = jaccard(leftTokens, tokenSet(right.question));
      if (score >= 0.82) {
        duplicates.push({ leftId: left.id, rightId: right.id, score: Number(score.toFixed(2)) });
      }
    }
  }
  return duplicates;
}

const files = readdirSync(questionDirectory).filter((file) => file.endsWith(".json")).sort();
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
  questions.push(...parsed.data.questions);
}

for (const question of questions) {
  report.totalCount += 1;
  increment(report.byCategory, question.category);
  increment(report.bySubCategory, `${question.category}/${question.subcategory}`);
  increment(report.byDifficulty, question.difficulty);
  increment(report.correctAnswerDistribution, question.correctAnswerId);
  if (question.verificationStatus === "verified") {
    report.verifiedCount += 1;
  }
  if (question.verificationStatus === "verified" && question.status === "approved") {
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
  console.log(`Playable verified+approved: ${report.playableCount}`);
  console.log(`Verified: ${report.verifiedCount}`);
  console.log(`Rejected/non playable: ${report.rejectedCount}`);
  console.log(`Exact duplicates: ${report.exactDuplicates.length}`);
  console.log(`Probable duplicates: ${report.probableDuplicates.length}`);
  console.log("By category:", report.byCategory);
  console.log("By subcategory:", report.bySubCategory);
  console.log("By difficulty:", report.byDifficulty);
  console.log("Correct answer distribution:", report.correctAnswerDistribution);
  if (report.validationErrors.length > 0) {
    console.log("Validation errors:", report.validationErrors);
  }
}

if (report.validationErrors.length > 0 || report.exactDuplicates.length > 0) {
  process.exitCode = 1;
}