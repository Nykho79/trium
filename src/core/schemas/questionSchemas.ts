import { z } from "zod";

const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const baseQuestionSchema = z.object({
  id: z.string().min(1),
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
});

const answerSchema = z.object({
  accepted: z.array(z.string().min(1)).min(1),
  display: z.string().min(1),
});

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const questionSchema = z.discriminatedUnion("kind", [
  baseQuestionSchema.extend({
    kind: z.literal("knowledge-grid"),
    value: z.union([z.literal(100), z.literal(200), z.literal(300), z.literal(400), z.literal(500)]),
    answer: answerSchema,
  }),
  baseQuestionSchema.extend({
    kind: z.literal("clue-race"),
    clues: z.array(z.string().min(1)).min(3).max(4),
    answer: answerSchema,
    pointsByClueIndex: z.array(z.number().int().positive()).min(3).max(4),
  }).superRefine((question, ctx) => {
    if (question.clues.length !== question.pointsByClueIndex.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pointsByClueIndex"],
        message: "Le nombre de scores doit correspondre au nombre d'indices.",
      });
    }
  }),
  baseQuestionSchema.extend({
    kind: z.literal("pressure-choice"),
    options: z.tuple([optionSchema, optionSchema, optionSchema, optionSchema]),
    correctOptionId: z.string().min(1),
    timeLimitSeconds: z.number().int().min(5).max(120),
  }).superRefine((question, ctx) => {
    const optionIds = new Set(question.options.map((option) => option.id));
    if (!optionIds.has(question.correctOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctOptionId"],
        message: "correctOptionId doit correspondre a une option existante.",
      });
    }
  }),
  baseQuestionSchema.extend({
    kind: z.literal("synapse"),
    taskKind: z.union([
      z.literal("sequence"),
      z.literal("analogy"),
      z.literal("ranking"),
      z.literal("memory"),
      z.literal("categorization"),
    ]),
    items: z.array(z.string().min(1)).min(2),
    expectedOrder: z.array(z.string().min(1)).optional(),
    expectedPairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional(),
    expectedCategories: z.array(z.object({
      label: z.string().min(1),
      itemIds: z.array(z.string().min(1)).min(1),
    })).optional(),
  }),
  baseQuestionSchema.extend({
    kind: z.literal("connections"),
    items: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
    connection: answerSchema,
  }),
  baseQuestionSchema.extend({
    kind: z.literal("wager"),
    answer: answerSchema,
    minWager: z.number().int().min(0),
    maxWager: z.number().int().positive(),
  }).refine((question) => question.maxWager >= question.minWager, {
    path: ["maxWager"],
    message: "maxWager doit etre superieur ou egal a minWager.",
  }),
  baseQuestionSchema.extend({
    kind: z.literal("final-convergence"),
    step: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    answer: answerSchema,
    basePoints: z.number().int().positive(),
  }),
]);

export const questionBankSchema = z.object({
  version: z.literal(1),
  questions: z.array(questionSchema).min(1),
}).superRefine((bank, ctx) => {
  const seen = new Set<string>();
  for (const [index, question] of bank.questions.entries()) {
    if (seen.has(question.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions", index, "id"],
        message: `ID de question duplique: ${question.id}`,
      });
    }
    seen.add(question.id);
  }
});

export type QuestionBankInput = z.input<typeof questionBankSchema>;
