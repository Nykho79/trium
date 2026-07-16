import { z } from "zod";

export const jokerTypeSchema = z.union([
  z.literal("fifty-fifty"),
  z.literal("second-chance"),
  z.literal("question-swap"),
  z.literal("contextual-clue"),
  z.literal("extra-time"),
  z.literal("three-player-vote"),
]);

export const jokerInventorySchema = z.record(jokerTypeSchema, z.number().int().min(0));

export const jokerSchema = z.object({
  type: jokerTypeSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  maxUses: z.number().int().min(0),
});

export const jokerStateSchema = z.object({
  available: jokerInventorySchema,
  used: jokerInventorySchema,
  disabled: z.array(jokerTypeSchema),
});

export const scoreBreakdownSchema = z.object({
  basePoints: z.number().int(),
  timeBonus: z.number().int(),
  streakBonus: z.number().int(),
  jokerPenalty: z.number().int(),
  wagerDelta: z.number().int(),
  total: z.number().int(),
}).superRefine((score, ctx) => {
  const expectedTotal = score.basePoints + score.timeBonus + score.streakBonus + score.wagerDelta - score.jokerPenalty;
  if (score.total !== expectedTotal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["total"],
      message: "Le total du score doit correspondre au detail fourni.",
    });
  }
});

export const answerResultSchema = z.object({
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
  lockedAnswer: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  correctAnswer: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  explanation: z.string().min(1).optional(),
  score: scoreBreakdownSchema,
  usedJokers: z.array(jokerTypeSchema),
});
