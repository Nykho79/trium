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
});

export const roundSummarySchema = z.object({
  roundId: z.string().min(1),
  label: z.string().min(1),
  answeredQuestions: z.number().int().min(0),
  score: scoreBreakdownSchema,
  isComplete: z.boolean(),
});
