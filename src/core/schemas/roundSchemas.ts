import { z } from "zod";
import { questionTypeSchema, roundKindSchema } from "./baseSchemas";
import { scoreBreakdownSchema } from "./scoringSchemas";

export const roundDefinitionSchema = z.object({
  id: z.string().min(1),
  kind: roundKindSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  questionTypes: z.array(questionTypeSchema).min(1),
  questionCount: z.number().int().positive(),
  maxScore: z.number().int().min(0),
});

const roundAnswerHistoryEntrySchema = z.object({
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
});

export const roundStateSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  status: z.union([z.literal("not_started"), z.literal("active"), z.literal("complete"), z.literal("restored")]),
  currentQuestionIndex: z.number().int().min(0),
  selectedQuestionIds: z.array(z.string().min(1)),
  answeredQuestionIds: z.array(z.string().min(1)),
  answerResults: z.array(roundAnswerHistoryEntrySchema).default([]),
  score: scoreBreakdownSchema,
  clueIndex: z.number().int().min(0).max(4).optional(),
  connectionItemIndex: z.number().int().min(0).max(3).optional(),
  answersVisible: z.boolean().optional(),
  securedPoints: z.number().int().min(0).optional(),
  riskPoints: z.number().int().min(0).optional(),
  wagerCategoryId: z.string().min(1).optional(),
  wagerDifficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  wagerAmount: z.number().int().positive().optional(),
  wagerCoefficient: z.number().int().positive().optional(),
  wagerIsFreeStake: z.boolean().optional(),
  finalPurchasedAdvantageIds: z.array(z.string().min(1)).optional(),
  finalUsedAdvantageIds: z.array(z.string().min(1)).optional(),
});

export const roundSummarySchema = z.object({
  roundId: z.string().min(1),
  label: z.string().min(1),
  answeredQuestions: z.number().int().min(0),
  score: scoreBreakdownSchema,
  isComplete: z.boolean(),
});
