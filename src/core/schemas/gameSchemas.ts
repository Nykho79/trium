import { z } from "zod";
import { gameModeSchema, gameStatusSchema } from "./baseSchemas";
import { playerSchema, playersSchema } from "./playerSchemas";
import { roundDefinitionSchema, roundStateSchema } from "./roundSchemas";
import { answerResultSchema, jokerStateSchema, scoreBreakdownSchema } from "./scoringSchemas";

export const gameFormatSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  roundOrder: z.array(z.string().min(1)).min(1),
  questionCountByRound: z.record(z.string(), z.number().int().positive()),
});

export const gameConfigSchema = z.object({
  id: z.string().min(1),
  mode: gameModeSchema,
  seed: z.string().min(1),
  players: playersSchema,
  rounds: z.array(roundDefinitionSchema).min(1),
  questionBankVersion: z.number().int().positive(),
  allowRecentlyPlayedFallback: z.boolean(),
  defaultQuestionTimeMs: z.number().int().min(5_000),
});

export const gameStateSchema = z.object({
  status: gameStatusSchema,
  config: gameConfigSchema,
  currentRoundIndex: z.number().int().min(0),
  currentRoundState: roundStateSchema.optional(),
  activeQuestionId: z.string().min(1).optional(),
  lockedAnswer: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  lastAnswerResult: answerResultSchema.optional(),
  usedQuestionIds: z.array(z.string().min(1)),
  recentlyPlayedQuestionIds: z.array(z.string().min(1)),
  jokers: jokerStateSchema,
  score: scoreBreakdownSchema,
  error: z.string().min(1).optional(),
}).superRefine((state, ctx) => {
  if (state.status === "error" && state.error === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["error"], message: "Un etat error doit porter un message." });
  }
});

export { gameModeSchema, gameStatusSchema, playerSchema };
