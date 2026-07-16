import { z } from "zod";
import type { Difficulty, MultipleChoiceQuestion, Question, QuestionId, RoundKind } from "../core/types";
import { shuffleWithSeed } from "../core/engine/random";

const verificationStatusSchema = z.enum(["to_verify", "verified", "rejected"]);
const sourceQuestionStatusSchema = z.enum(["generated", "draft", "review", "approved", "rejected"]);
const sourceAnswerSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const sourceQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("multiple_choice"),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  question: z.string().min(1),
  answers: z.tuple([sourceAnswerSchema, sourceAnswerSchema, sourceAnswerSchema, sourceAnswerSchema]),
  correctAnswerId: z.string().min(1),
  explanation: z.string().min(1),
  sourceLabel: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  verificationStatus: verificationStatusSchema,
  tags: z.array(z.string().min(1)),
  estimatedTimeSeconds: z.number().int().min(5).max(180),
  status: sourceQuestionStatusSchema,
  version: z.number().int().positive(),
}).superRefine((question, ctx) => {
  const answerIds = new Set(question.answers.map((answer) => answer.id));
  if (answerIds.size !== question.answers.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["answers"], message: "Les identifiants de reponses doivent etre uniques." });
  }
  if (!answerIds.has(question.correctAnswerId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctAnswerId"], message: "La bonne reponse doit referencer une option existante." });
  }
});

export const sourceQuestionFileSchema = z.object({
  schemaVersion: z.string().min(1),
  fileId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  questionType: z.literal("multiple_choice"),
  generatedAt: z.string().nullable(),
  questions: z.array(sourceQuestionSchema),
});

export type SourceQuestion = z.infer<typeof sourceQuestionSchema>;
export type SourceQuestionFile = z.infer<typeof sourceQuestionFileSchema>;

export interface DuplicateEntry {
  key: string;
  questionIds: QuestionId[];
}

export interface ProbableDuplicateEntry {
  leftId: QuestionId;
  rightId: QuestionId;
  score: number;
}

export interface QuestionLoadReport {
  fileCount: number;
  totalCount: number;
  playableCount: number;
  byCategory: Record<string, number>;
  bySubCategory: Record<string, number>;
  byDifficulty: Record<Difficulty, number>;
  correctAnswerDistribution: Record<string, number>;
  verifiedCount: number;
  rejectedCount: number;
  exactDuplicates: DuplicateEntry[];
  probableDuplicates: ProbableDuplicateEntry[];
  validationErrors: string[];
}

export interface LoadedQuestionBank {
  sourceFiles: SourceQuestionFile[];
  sourceQuestions: SourceQuestion[];
  playableQuestions: Question[];
  report: QuestionLoadReport;
}

export interface WeightedQuestionSelectionInput {
  questions: readonly Question[];
  roundKind?: RoundKind | undefined;
  usedQuestionIds: readonly QuestionId[];
  recentlyPlayedQuestionIds: readonly QuestionId[];
  seed: string;
}

export class QuestionAvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionAvailabilityError";
  }
}

const questionModules = import.meta.glob("./questions/*.json", { eager: true }) as Record<string, { default: unknown }>;

function increment<TKey extends string | number>(record: Record<TKey, number>, key: TKey): void {
  record[key] = (record[key] ?? 0) + 1;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("fr-FR");
}

function labelFromSlug(slug: string): string {
  return slug.split("-").map((part) => part.charAt(0).toLocaleUpperCase("fr-FR") + part.slice(1)).join(" ");
}

function sourceQuestionToGameQuestion(question: SourceQuestion): MultipleChoiceQuestion {
  const value = (Math.min(5, Math.max(1, question.difficulty)) * 100) as 100 | 200 | 300 | 400 | 500;
  const correctAnswer = question.answers.find((answer) => answer.id === question.correctAnswerId);
  return {
    id: question.id,
    kind: "pressure-choice",
    type: "multiple_choice",
    categoryId: question.category,
    categoryLabel: labelFromSlug(question.category),
    subCategoryId: question.subcategory,
    subCategoryLabel: labelFromSlug(question.subcategory),
    difficulty: question.difficulty,
    prompt: question.question,
    explanation: question.explanation,
    tags: question.tags,
    editorialStatus: "approved",
    version: question.version,
    source: question.sourceLabel,
    options: question.answers.map((answer) => ({ id: answer.id, label: answer.text })) as MultipleChoiceQuestion["options"],
    correctOptionId: question.correctAnswerId,
    answer: {
      accepted: correctAnswer ? [normalizeText(correctAnswer.text)] : [question.correctAnswerId],
      display: correctAnswer?.text ?? question.correctAnswerId,
    },
    timeLimitSeconds: question.estimatedTimeSeconds,
    value,
  };
}

function detectExactDuplicates(questions: readonly SourceQuestion[]): DuplicateEntry[] {
  const byPrompt = new Map<string, QuestionId[]>();
  for (const question of questions) {
    const key = normalizeText(question.question);
    byPrompt.set(key, [...(byPrompt.get(key) ?? []), question.id]);
  }
  return [...byPrompt.entries()]
    .filter(([, questionIds]) => questionIds.length > 1)
    .map(([key, questionIds]) => ({ key, questionIds }));
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeText(value).split(" ").filter((token) => token.length > 2));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function detectProbableDuplicates(questions: readonly SourceQuestion[]): ProbableDuplicateEntry[] {
  const duplicates: ProbableDuplicateEntry[] = [];
  for (let leftIndex = 0; leftIndex < questions.length; leftIndex += 1) {
    const left = questions[leftIndex];
    if (!left) {
      continue;
    }
    const leftTokens = tokenSet(left.question);
    for (let rightIndex = leftIndex + 1; rightIndex < questions.length; rightIndex += 1) {
      const right = questions[rightIndex];
      if (!right || left.category !== right.category) {
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

function createEmptyReport(fileCount: number): QuestionLoadReport {
  return {
    fileCount,
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
}

export function compileQuestionBankFromSources(sources: readonly unknown[]): LoadedQuestionBank {
  const report = createEmptyReport(sources.length);
  const sourceFiles: SourceQuestionFile[] = [];
  const sourceQuestions: SourceQuestion[] = [];

  for (const [sourceIndex, source] of sources.entries()) {
    const parsed = sourceQuestionFileSchema.safeParse(source);
    if (!parsed.success) {
      report.validationErrors.push(`Fichier ${sourceIndex + 1}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
      continue;
    }
    sourceFiles.push(parsed.data);
    sourceQuestions.push(...parsed.data.questions);
  }

  for (const question of sourceQuestions) {
    report.totalCount += 1;
    increment(report.byCategory, question.category);
    increment(report.bySubCategory, `${question.category}/${question.subcategory}`);
    increment(report.byDifficulty, question.difficulty);
    increment(report.correctAnswerDistribution, question.correctAnswerId);
    if (question.verificationStatus === "verified") {
      report.verifiedCount += 1;
    }
  }

  const playableQuestions = sourceQuestions
    .filter((question) => question.verificationStatus === "verified" && question.status === "approved")
    .map(sourceQuestionToGameQuestion);

  report.playableCount = playableQuestions.length;
  report.rejectedCount = report.totalCount - report.playableCount;
  report.exactDuplicates = detectExactDuplicates(sourceQuestions);
  report.probableDuplicates = detectProbableDuplicates(sourceQuestions);

  return { sourceFiles, sourceQuestions, playableQuestions, report };
}

export function loadLocalQuestionBank(): LoadedQuestionBank {
  const sources = Object.keys(questionModules).sort().map((path) => questionModules[path]?.default);
  return compileQuestionBankFromSources(sources);
}

export function selectWeightedQuestion(input: WeightedQuestionSelectionInput): Question {
  const used = new Set(input.usedQuestionIds);
  const recent = new Set(input.recentlyPlayedQuestionIds);
  const byId = new Map(input.questions.map((question) => [question.id, question]));
  const categoryUsage = new Map<string, number>();
  const difficultyUsage = new Map<Difficulty, number>();

  for (const questionId of input.usedQuestionIds) {
    const question = byId.get(questionId);
    if (question) {
      categoryUsage.set(question.categoryId, (categoryUsage.get(question.categoryId) ?? 0) + 1);
      difficultyUsage.set(question.difficulty, (difficultyUsage.get(question.difficulty) ?? 0) + 1);
    }
  }

  const eligible = input.questions.filter((question) => {
    const roundMatches = input.roundKind === undefined || question.kind === input.roundKind;
    return roundMatches && !used.has(question.id);
  });
  if (eligible.length === 0) {
    throw new QuestionAvailabilityError("Aucune question disponible pour cette selection.");
  }

  const withoutRecent = eligible.filter((question) => !recent.has(question.id));
  const pool = withoutRecent.length > 0 ? withoutRecent : eligible;
  const shuffled = shuffleWithSeed(pool, `${input.seed}:${input.roundKind ?? "all"}:${input.usedQuestionIds.length}`);
  const ranked = [...shuffled].sort((left, right) => {
    const leftScore = (categoryUsage.get(left.categoryId) ?? 0) * 10 + (difficultyUsage.get(left.difficulty) ?? 0) * 6;
    const rightScore = (categoryUsage.get(right.categoryId) ?? 0) * 10 + (difficultyUsage.get(right.difficulty) ?? 0) * 6;
    return leftScore - rightScore;
  });
  const selected = ranked[0];

  if (!selected) {
    throw new QuestionAvailabilityError("Aucune question selectionnable apres ponderation.");
  }
  return selected;
}