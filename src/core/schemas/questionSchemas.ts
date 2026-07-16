import { z } from "zod";
import { difficultySchema, questionTypeSchema, roundKindSchema } from "./baseSchemas";

const baseQuestionSchema = z.object({
  id: z.string().min(1),
  kind: roundKindSchema,
  type: questionTypeSchema,
  categoryId: z.string().min(1),
  categoryLabel: z.string().min(1),
  subCategoryId: z.string().min(1),
  subCategoryLabel: z.string().min(1),
  difficulty: difficultySchema,
  prompt: z.string().min(1),
  explanation: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([]),
  editorialStatus: z.union([
    z.literal("draft"),
    z.literal("review"),
    z.literal("approved"),
    z.literal("rejected"),
  ]),
  version: z.number().int().positive(),
  source: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  contextualHint: z.string().min(1).optional(),
});

const answerSchema = z.object({
  accepted: z.array(z.string().min(1)).min(1),
  display: z.string().min(1),
});

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const fourOptionsSchema = z.tuple([optionSchema, optionSchema, optionSchema, optionSchema]);

const chronologyItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

function optionIdSet(options: readonly { id: string }[]): Set<string> {
  return new Set(options.map((option) => option.id));
}

export const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: fourOptionsSchema,
  correctOptionId: z.string().min(1),
  answer: answerSchema.optional(),
  timeLimitSeconds: z.number().int().min(5).max(120).optional(),
  value: z.union([z.literal(100), z.literal(200), z.literal(300), z.literal(400), z.literal(500)]).optional(),
}).superRefine((question, ctx) => {
  if (!optionIdSet(question.options).has(question.correctOptionId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOptionId"], message: "correctOptionId doit correspondre a une option existante." });
  }
});

export const progressiveCluesQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("progressive_clues"),
  clues: z.array(z.string().min(1)).length(5),
  answer: answerSchema,
  pointsByClueIndex: z.array(z.number().int().positive()).length(5),
  options: fourOptionsSchema.optional(),
  correctOptionId: z.string().min(1).optional(),
}).superRefine((question, ctx) => {
  if (question.options !== undefined || question.correctOptionId !== undefined) {
    if (question.options === undefined || question.correctOptionId === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Les propositions et correctOptionId doivent etre fournis ensemble." });
      return;
    }
    if (!optionIdSet(question.options).has(question.correctOptionId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOptionId"], message: "correctOptionId doit correspondre a une proposition existante." });
    }
  }
});

export const connectionQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("connection"),
  items: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  answer: answerSchema,
});

export const chronologyQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("chronology"),
  items: z.array(chronologyItemSchema).min(3),
  correctOrderIds: z.array(z.string().min(1)).min(3),
  options: fourOptionsSchema.optional(),
  correctOptionId: z.string().min(1).optional(),
}).superRefine((question, ctx) => {
  const itemIds = optionIdSet(question.items);
  const orderIds = new Set(question.correctOrderIds);
  if (itemIds.size !== question.items.length || orderIds.size !== question.correctOrderIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Les identifiants doivent etre uniques." });
  }
  if (question.correctOrderIds.some((id) => !itemIds.has(id))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOrderIds"], message: "L'ordre attendu doit referencer uniquement des items existants." });
  }
  if (question.options !== undefined && question.correctOptionId !== undefined && !optionIdSet(question.options).has(question.correctOptionId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOptionId"], message: "correctOptionId doit correspondre a une option existante." });
  }
});

export const analogyQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("analogy"),
  left: z.string().min(1),
  right: z.string().min(1),
  relation: z.string().min(1),
  missing: z.string().min(1),
  options: fourOptionsSchema.optional(),
  correctOptionId: z.string().min(1).optional(),
  answer: answerSchema,
});

export const memoryQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("memory"),
  items: z.array(z.string().min(1)).min(2),
  recallPrompt: z.string().min(1),
  mode: z.union([z.literal("forward"), z.literal("reverse")]).optional(),
  displaySeconds: z.number().int().min(1).max(20).optional(),
  options: fourOptionsSchema.optional(),
  correctOptionId: z.string().min(1).optional(),
  answer: answerSchema,
});

export const sequenceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("sequence"),
  items: z.array(z.string().min(1)).min(2),
  correctOrder: z.array(z.string().min(1)).min(2).optional(),
  nextItem: z.string().min(1).optional(),
  options: fourOptionsSchema.optional(),
  correctOptionId: z.string().min(1).optional(),
  answer: answerSchema,
}).refine((question) => question.correctOrder !== undefined || question.nextItem !== undefined, {
  path: ["correctOrder"],
  message: "Une question de sequence doit definir correctOrder ou nextItem.",
});

export const intruderQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("intruder"),
  items: fourOptionsSchema,
  correctOptionId: z.string().min(1),
  answer: answerSchema,
}).superRefine((question, ctx) => {
  if (!optionIdSet(question.items).has(question.correctOptionId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOptionId"], message: "correctOptionId doit correspondre a un item existant." });
  }
});

export const visualMatrixQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("visual_matrix"),
  grid: z.tuple([z.string(), z.string(), z.string(), z.string(), z.string(), z.string(), z.string(), z.string(), z.string()]),
  missingIndex: z.number().int().min(0).max(8),
  options: fourOptionsSchema,
  correctOptionId: z.string().min(1),
  ruleLabel: z.string().min(1),
  answer: answerSchema,
}).superRefine((question, ctx) => {
  if (!optionIdSet(question.options).has(question.correctOptionId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOptionId"], message: "correctOptionId doit correspondre a une option existante." });
  }
});

export const symbolRuleQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("symbol_rule"),
  rule: z.string().min(1),
  examples: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  options: fourOptionsSchema,
  correctOptionId: z.string().min(1),
  answer: answerSchema,
}).superRefine((question, ctx) => {
  if (!optionIdSet(question.options).has(question.correctOptionId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["correctOptionId"], message: "correctOptionId doit correspondre a une option existante." });
  }
});

export const questionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  progressiveCluesQuestionSchema,
  connectionQuestionSchema,
  chronologyQuestionSchema,
  analogyQuestionSchema,
  memoryQuestionSchema,
  sequenceQuestionSchema,
  intruderQuestionSchema,
  visualMatrixQuestionSchema,
  symbolRuleQuestionSchema,
]);

export const questionBankSchema = z.object({
  version: z.literal(1),
  questions: z.array(questionSchema).min(1),
}).superRefine((bank, ctx) => {
  const seen = new Set<string>();
  for (const [index, question] of bank.questions.entries()) {
    if (seen.has(question.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["questions", index, "id"], message: `ID de question duplique: ${question.id}` });
    }
    seen.add(question.id);
  }
});

export type QuestionBankInput = z.input<typeof questionBankSchema>;
