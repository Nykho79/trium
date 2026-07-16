import { z } from "zod";
import type {
  ChronologyQuestion,
  ConnectionQuestion,
  Difficulty,
  FourOptions,
  IntruderQuestion,
  MultipleChoiceOption,
  MultipleChoiceQuestion,
  ProgressiveCluesQuestion,
  Question,
  QuestionId,
  RoundKind,
  SequenceQuestion,
  SymbolRuleQuestion,
  VisualMatrixQuestion,
} from "../core/types";
import { shuffleWithSeed } from "../core/engine/random";
import { questionSchema } from "../core/schemas/questionSchemas";
const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const verificationStatusSchema = z.enum(["to_verify", "verified", "rejected"]).default("to_verify");
const sourceQuestionStatusSchema = z.enum(["generated", "draft", "review", "approved", "rejected"]).default("generated");
const answerSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).optional(),
  itemOrder: z.array(z.string().min(1)).optional(),
  output: z.array(z.string().min(1)).optional(),
  elements: z.unknown().optional(),
}).passthrough();
const itemSchema = z.object({ id: z.string().min(1), text: z.string().min(1).optional(), label: z.string().min(1).optional() }).passthrough();
const clueSchema = z.union([z.string().min(1), z.object({ text: z.string().min(1) }).passthrough()]);

export const sourceQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  difficulty: difficultySchema,
  question: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  statement: z.string().min(1).optional(),
  answers: z.array(answerSchema).optional(),
  items: z.array(itemSchema).optional(),
  clues: z.array(clueSchema).optional(),
  sequence: z.array(z.string().min(1)).optional(),
  correctAnswerId: z.string().min(1).optional(),
  correctAnswerIds: z.array(z.string().min(1)).optional(),
  correctItemId: z.string().min(1).optional(),
  correctAnswer: z.boolean().optional(),
  explanation: z.string().min(1).optional(),
  contextualHint: z.string().min(1).optional(),
  sourceLabel: z.string().min(1).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  verificationStatus: verificationStatusSchema,
  tags: z.array(z.string().min(1)).default([]),
  estimatedTimeSeconds: z.number().int().min(5).max(180).optional(),
  status: sourceQuestionStatusSchema,
  version: z.number().int().positive().default(1),
  rule: z.string().min(1).optional(),
  orderingRule: z.string().min(1).optional(),
  examples: z.array(z.unknown()).optional(),
  gridSize: z.unknown().optional(),
  missingCell: z.unknown().optional(),
  cells: z.array(z.unknown()).optional(),
  left: z.string().min(1).optional(),
  right: z.string().min(1).optional(),
  relation: z.string().min(1).optional(),
  missing: z.string().min(1).optional(),
}).passthrough();

const sourceStepSchema = z.object({ content: sourceQuestionSchema }).passthrough();
const sourcePathSchema = z.object({ steps: z.array(sourceStepSchema) }).passthrough();
const sourceSeriesSchema = z.object({ questions: z.array(sourceQuestionSchema) }).passthrough();

export const sourceQuestionFileSchema = z.object({
  schemaVersion: z.string().min(1),
  fileId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1).optional(),
  questionType: z.string().min(1),
  generatedAt: z.string().nullable().optional(),
  questions: z.array(sourceQuestionSchema).optional(),
  series: z.array(sourceSeriesSchema).optional(),
  paths: z.array(sourcePathSchema).optional(),
}).passthrough();

export type SourceQuestion = z.infer<typeof sourceQuestionSchema> & { sourceFileId?: string | undefined };
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

type ConversionContext = { fileId: string; questionType: string; pathIndex: number; stepIndex?: number | undefined };

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

function answerAcceptedValues(label: string, optionId: string): string[] {
  const normalized = normalizeText(label);
  return [...new Set([normalized, optionId].filter((value) => value.length > 0))];
}

function labelFromSlug(slug: string): string {
  return slug.split("-").map((part) => part.charAt(0).toLocaleUpperCase("fr-FR") + part.slice(1)).join(" ");
}

function promptOf(question: SourceQuestion): string {
  return question.question ?? question.prompt ?? question.statement ?? "Question sans enonce";
}

function sourceOf(question: SourceQuestion): string | undefined {
  return question.sourceLabel ?? undefined;
}

function answerText(answer: z.infer<typeof answerSchema>, lookup: Map<string, string>): string {
  if (answer.text) return answer.text;
  if (answer.itemOrder) return answer.itemOrder.map((id) => lookup.get(id) ?? id).join(" > ");
  if (answer.output) return answer.output.join(" ");
  if (answer.elements !== undefined) return JSON.stringify(answer.elements);
  return answer.id;
}

function itemText(item: z.infer<typeof itemSchema>): string {
  return item.text ?? item.label ?? item.id;
}

function option(id: string, label: string): MultipleChoiceOption {
  return { id, label };
}

function asFourOptions(options: readonly MultipleChoiceOption[], label: string): FourOptions {
  const [first, second, third, fourth] = options;
  if (!first || !second || !third || !fourth) {
    throw new Error(`${label} exige quatre propositions.`);
  }
  return [first, second, third, fourth];
}

function answersAsOptions(question: SourceQuestion): { options: FourOptions; correctOptionId: string; correctLabel: string } {
  const answers = question.answers ?? [];
  const itemLookup = new Map((question.items ?? []).map((item) => [item.id, itemText(item)]));
  const correctOptionId = question.correctAnswerId ?? question.correctItemId ?? question.correctAnswerIds?.join("+") ?? (question.correctAnswer === true ? "true" : "false");
  if (question.type === "true_false") {
    const correctId = question.correctAnswer === true ? "true" : "false";
    return {
      options: [option("true", "Vrai"), option("false", "Faux"), option("unknown", "Impossible a determiner"), option("both", "Les deux")],
      correctOptionId: correctId,
      correctLabel: correctId === "true" ? "Vrai" : "Faux",
    };
  }
  if (question.type === "multiple_select" && question.correctAnswerIds) {
    const byId = new Map(answers.map((answer) => [answer.id, answerText(answer, itemLookup)]));
    const correctLabel = question.correctAnswerIds.map((id) => byId.get(id) ?? id).join(" + ");
    const wrongIds = answers.map((answer) => answer.id).filter((id) => !question.correctAnswerIds?.includes(id));
    const firstCorrect = question.correctAnswerIds[0] ?? answers[0]?.id ?? "a";
    const firstWrong = wrongIds[0] ?? answers[1]?.id ?? "b";
    const secondWrong = wrongIds[1] ?? answers[2]?.id ?? "c";
    return {
      options: [
        option("correct", correctLabel),
        option("mix-1", [firstCorrect, firstWrong].map((id) => byId.get(id) ?? id).join(" + ")),
        option("mix-2", [firstWrong, secondWrong].map((id) => byId.get(id) ?? id).join(" + ")),
        option("mix-3", [secondWrong, firstCorrect].map((id) => byId.get(id) ?? id).join(" + ")),
      ],
      correctOptionId: "correct",
      correctLabel,
    };
  }
  const options = asFourOptions(answers.map((answer) => option(answer.id, answerText(answer, itemLookup))), question.id);
  const correct = options.find((candidate) => candidate.id === correctOptionId);
  if (!correct) {
    throw new Error(`Bonne reponse absente des propositions: ${question.id}.`);
  }
  return { options, correctOptionId, correctLabel: correct.label };
}

function baseFields(question: SourceQuestion, kind: RoundKind) {
  return {
    id: question.id,
    kind,
    categoryId: question.category,
    categoryLabel: labelFromSlug(question.category),
    subCategoryId: question.subcategory,
    subCategoryLabel: labelFromSlug(question.subcategory),
    difficulty: question.difficulty,
    prompt: promptOf(question),
    explanation: question.explanation ?? "Explication a completer.",
    contextualHint: question.contextualHint,
    tags: question.tags,
    editorialStatus: "approved" as const,
    version: question.version,
    source: sourceOf(question),
  };
}

function convertMultipleChoice(question: SourceQuestion, kind: RoundKind): MultipleChoiceQuestion {
  const converted = answersAsOptions(question);
  const value = (Math.min(5, Math.max(1, question.difficulty)) * 100) as 100 | 200 | 300 | 400 | 500;
  return {
    ...baseFields(question, kind),
    type: "multiple_choice",
    options: converted.options,
    correctOptionId: converted.correctOptionId,
    answer: { accepted: answerAcceptedValues(converted.correctLabel, converted.correctOptionId), display: converted.correctLabel },
    timeLimitSeconds: question.estimatedTimeSeconds ?? 30,
    value,
  };
}

function clueText(clue: z.infer<typeof clueSchema>): string {
  return typeof clue === "string" ? clue : clue.text;
}

function convertProgressive(question: SourceQuestion, kind: RoundKind): ProgressiveCluesQuestion {
  const converted = answersAsOptions(question);
  const rawClues = question.clues?.map(clueText) ?? [];
  const clues = [...rawClues, promptOf(question), question.contextualHint ?? "Indice contextuel indisponible", question.explanation ?? "Dernier indice."].slice(0, 5);
  while (clues.length < 5) clues.push(`Indice ${clues.length + 1}: ${converted.correctLabel}`);
  return {
    ...baseFields(question, kind),
    type: "progressive_clues",
    clues,
    answer: { accepted: answerAcceptedValues(converted.correctLabel, converted.correctOptionId), display: converted.correctLabel },
    pointsByClueIndex: kind === "final-convergence" ? [1_000, 800, 600, 400, 200] : [500, 400, 300, 200, 100],
    options: converted.options,
    correctOptionId: converted.correctOptionId,
  };
}

function convertConnection(question: SourceQuestion, kind: RoundKind): ConnectionQuestion {
  const converted = answersAsOptions(question);
  const items = asFourOptions((question.items ?? []).map((item) => option(item.id, itemText(item))), question.id).map((item) => item.label) as [string, string, string, string];
  return {
    ...baseFields(question, kind),
    type: "connection",
    items,
    itemDetails: items,
    randomizeItems: true,
    answer: { accepted: answerAcceptedValues(converted.correctLabel, converted.correctOptionId), display: converted.correctLabel },
    options: converted.options,
    correctOptionId: converted.correctOptionId,
  };
}

function convertIntruder(question: SourceQuestion): IntruderQuestion {
  const items = asFourOptions((question.items ?? []).map((item) => option(item.id, itemText(item))), question.id);
  const correctOptionId = question.correctItemId ?? question.correctAnswerId;
  if (!correctOptionId || !items.some((item) => item.id === correctOptionId)) {
    throw new Error(`Intrus sans bonne reponse valide: ${question.id}.`);
  }
  const correct = items.find((item) => item.id === correctOptionId)?.label ?? correctOptionId;
  return {
    ...baseFields(question, "synapse"),
    type: "intruder",
    items,
    correctOptionId,
    answer: { accepted: answerAcceptedValues(correct, correctOptionId), display: correct },
  };
}

function convertChronology(question: SourceQuestion): ChronologyQuestion {
  const sourceItems = question.items ?? [];
  const lookup = new Map(sourceItems.map((item) => [item.id, itemText(item)]));
  const converted = answersAsOptions(question);
  const correctOrderIds = question.answers?.find((answer) => answer.id === converted.correctOptionId)?.itemOrder ?? sourceItems.map((item) => item.id);
  return {
    ...baseFields(question, "synapse"),
    type: "chronology",
    items: sourceItems.map((item) => ({ id: item.id, label: lookup.get(item.id) ?? item.id })),
    correctOrderIds,
    options: converted.options,
    correctOptionId: converted.correctOptionId,
  };
}

function convertSequence(question: SourceQuestion, kind: RoundKind): SequenceQuestion {
  const converted = answersAsOptions(question);
  const items = question.sequence ?? question.clues?.map(clueText) ?? [promptOf(question)];
  return {
    ...baseFields(question, kind),
    type: "sequence",
    items,
    nextItem: converted.correctLabel,
    options: converted.options,
    correctOptionId: converted.correctOptionId,
    answer: { accepted: answerAcceptedValues(converted.correctLabel, converted.correctOptionId), display: converted.correctLabel },
  };
}

function compactUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function convertVisualMatrix(question: SourceQuestion): VisualMatrixQuestion {
  const converted = answersAsOptions(question);
  const rawCells = question.cells ?? [];
  const cells = rawCells.map(compactUnknown);
  while (cells.length < 9) cells.push(cells.length === 8 ? "?" : " ");
  return {
    ...baseFields(question, "synapse"),
    type: "visual_matrix",
    grid: cells.slice(0, 9) as [string, string, string, string, string, string, string, string, string],
    missingIndex: 8,
    options: converted.options,
    correctOptionId: converted.correctOptionId,
    ruleLabel: question.rule ?? "Regle visuelle",
    answer: { accepted: answerAcceptedValues(converted.correctLabel, converted.correctOptionId), display: converted.correctLabel },
  };
}

function exampleLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function convertSymbolRule(question: SourceQuestion): SymbolRuleQuestion {
  const converted = answersAsOptions(question);
  const examples = (question.examples ?? []).map(exampleLabel);
  while (examples.length < 3) examples.push(promptOf(question));
  return {
    ...baseFields(question, "synapse"),
    type: "symbol_rule",
    rule: question.rule ?? "Regle a deduire",
    examples: examples.slice(0, 3) as [string, string, string],
    options: converted.options,
    correctOptionId: converted.correctOptionId,
    answer: { accepted: answerAcceptedValues(converted.correctLabel, converted.correctOptionId), display: converted.correctLabel },
  };
}

function playableStatus(question: SourceQuestion): boolean {
  return question.status !== "rejected" && question.verificationStatus !== "rejected";
}

function kindForMultipleChoice(context: ConversionContext): RoundKind {
  if (context.fileId.includes("pressure")) return "pressure-choice";
  if (context.fileId.includes("wager")) return "wager";
  if (context.fileId.includes("final")) return "final-convergence";
  return "knowledge-grid";
}

function convertQuestion(question: SourceQuestion, context: ConversionContext): Question | undefined {
  if (!playableStatus(question)) return undefined;
  if (question.type === "multiple_choice" || question.type === "true_false" || question.type === "multiple_select") {
    return convertMultipleChoice(question, kindForMultipleChoice(context));
  }
  if (question.type === "progressive_clues") return convertProgressive(question, context.fileId.includes("final") ? "final-convergence" : "clue-race");
  if (question.type === "connection") return convertConnection(question, context.fileId.includes("final") ? "final-convergence" : "connections");
  if (question.type === "conceptual_intruder") return convertIntruder(question);
  if (question.type === "logical_ranking") return convertChronology(question);
  if (question.type === "logical_sequence") return convertSequence(question, context.fileId.includes("final") ? "final-convergence" : "synapse");
  if (question.type === "logic_puzzle") return convertProgressive(question, context.fileId.includes("final") ? "final-convergence" : "clue-race");
  if (question.type === "visual_matrix") return convertVisualMatrix(question);
  if (question.type === "symbol_rule") return convertSymbolRule(question);
  return undefined;
}

function questionFingerprint(question: SourceQuestion): string {
  return normalizeText(JSON.stringify({
    type: question.type,
    prompt: promptOf(question),
    answers: question.answers ?? question.items ?? question.sequence ?? question.clues,
    correct: question.correctAnswerId ?? question.correctAnswerIds ?? question.correctItemId ?? question.correctAnswer,
  }));
}

function detectExactDuplicates(questions: readonly SourceQuestion[]): DuplicateEntry[] {
  const byPrompt = new Map<string, QuestionId[]>();
  for (const question of questions) {
    const key = questionFingerprint(question);
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
    if (!left) continue;
    const leftTokens = tokenSet(questionFingerprint(left));
    for (let rightIndex = leftIndex + 1; rightIndex < questions.length; rightIndex += 1) {
      const right = questions[rightIndex];
      if (!right || left.category !== right.category) continue;
      const score = jaccard(leftTokens, tokenSet(questionFingerprint(right)));
      if (score >= 0.82) duplicates.push({ leftId: left.id, rightId: right.id, score: Number(score.toFixed(2)) });
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

function sourceQuestionsFromFile(file: SourceQuestionFile): SourceQuestion[] {
  const direct = file.questions ?? [];
  const series = (file.series ?? []).flatMap((entry) => entry.questions);
  const paths = (file.paths ?? []).flatMap((pathValue, pathIndex) => pathValue.steps.map((step, stepIndex) => ({ ...step.content, id: step.content.id, sourceFileId: `${file.fileId}:${pathIndex + 1}:${stepIndex + 1}` })));
  return [...direct, ...series, ...paths].map((question) => ({ ...question, sourceFileId: file.fileId }));
}

function isDevelopmentCopy(source: unknown): boolean {
  const parsed = z.object({ fileId: z.string().optional(), title: z.string().optional() }).passthrough().safeParse(source);
  return parsed.success && ((parsed.data.fileId?.includes("copie") ?? false) || (parsed.data.title?.includes("Copie") ?? false));
}

export function compileQuestionBankFromSources(sources: readonly unknown[]): LoadedQuestionBank {
  const filteredSources = sources.filter((source) => !isDevelopmentCopy(source));
  const report = createEmptyReport(filteredSources.length);
  const sourceFiles: SourceQuestionFile[] = [];
  const sourceQuestions: SourceQuestion[] = [];
  const playableQuestions: Question[] = [];
  const seenGameIds = new Set<string>();

  for (const [sourceIndex, source] of filteredSources.entries()) {
    const parsed = sourceQuestionFileSchema.safeParse(source);
    if (!parsed.success) {
      report.validationErrors.push(`Fichier ${sourceIndex + 1}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
      continue;
    }
    sourceFiles.push(parsed.data);
    const questions = sourceQuestionsFromFile(parsed.data);
    sourceQuestions.push(...questions);
    for (const [questionIndex, question] of questions.entries()) {
      const context: ConversionContext = { fileId: parsed.data.fileId, questionType: parsed.data.questionType, pathIndex: questionIndex };
      try {
        const converted = convertQuestion(question, context);
        if (converted && !seenGameIds.has(converted.id)) {
          const validated = questionSchema.safeParse(converted);
          if (!validated.success) {
            report.validationErrors.push(`${parsed.data.fileId}/${question.id}: ${validated.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
            continue;
          }
          seenGameIds.add(validated.data.id);
          playableQuestions.push(validated.data);
        }
      } catch (error) {
        report.validationErrors.push(`${parsed.data.fileId}/${question.id}: ${error instanceof Error ? error.message : "Question invalide."}`);
      }
    }
  }

  for (const question of sourceQuestions) {
    report.totalCount += 1;
    increment(report.byCategory, question.category);
    increment(report.bySubCategory, `${question.category}/${question.subcategory}`);
    increment(report.byDifficulty, question.difficulty);
    increment(report.correctAnswerDistribution, question.correctAnswerId ?? question.correctItemId ?? question.correctAnswerIds?.join("+") ?? String(question.correctAnswer ?? "n/a"));
    if (playableStatus(question)) report.verifiedCount += 1;
  }

  report.playableCount = playableQuestions.length;
  report.rejectedCount = report.totalCount - report.playableCount;
  report.exactDuplicates = detectExactDuplicates(sourceQuestions);
  report.probableDuplicates = detectProbableDuplicates(sourceQuestions);

  return { sourceFiles, sourceQuestions, playableQuestions, report };
}

export function loadLocalQuestionBank(): LoadedQuestionBank {
  const sources = Object.keys(questionModules)
    .filter((path) => !path.includes(" - Copie"))
    .sort()
    .map((path) => questionModules[path]?.default);
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