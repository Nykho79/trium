import { z } from "zod";

export const jokerTypeSchema = z.union([
  z.literal("fifty_fifty"),
  z.literal("second_chance"),
  z.literal("change_question"),
  z.literal("contextual_hint"),
  z.literal("extra_time"),
  z.literal("team_vote"),
]);

export const jokerInventorySchema = z.record(jokerTypeSchema, z.number().int().min(0));

export const jokerSchema = z.object({
  type: jokerTypeSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  maxUses: z.number().int().min(0),
});

export const teamVoteStateSchema = z.object({
  active: z.boolean(),
  votes: z.partialRecord(z.union([z.literal("player-1"), z.literal("player-2"), z.literal("player-3")]), z.string().min(1)),
  revealedMajority: z.string().min(1).optional(),
});

export const jokerEffectStateSchema = z.object({
  eliminatedOptionIds: z.array(z.string().min(1)),
  secondChanceActive: z.boolean(),
  secondChanceConsumed: z.boolean(),
  changedQuestionIds: z.array(z.string().min(1)),
  contextualHint: z.string().min(1).optional(),
  teamVote: teamVoteStateSchema.optional(),
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
