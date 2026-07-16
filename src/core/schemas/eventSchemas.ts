import { z } from "zod";
import { gameStatusSchema } from "./baseSchemas";
import { jokerTypeSchema } from "./scoringSchemas";

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CONFIGURE_GAME"), config: z.unknown() }),
  z.object({ type: z.literal("START_GAME") }),
  z.object({ type: z.literal("START_ROUND"), roundIndex: z.number().int().min(0) }),
  z.object({ type: z.literal("LOAD_QUESTION"), questionId: z.string().min(1) }),
  z.object({ type: z.literal("LOCK_ANSWER"), answer: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]) }),
  z.object({ type: z.literal("REVEAL_ANSWER") }),
  z.object({ type: z.literal("USE_JOKER"), joker: jokerTypeSchema }),
  z.object({ type: z.literal("COMPLETE_ROUND") }),
  z.object({ type: z.literal("START_FINAL_ROUND") }),
  z.object({ type: z.literal("PAUSE_GAME") }),
  z.object({ type: z.literal("RESUME_GAME") }),
  z.object({ type: z.literal("FAIL_GAME"), message: z.string().min(1) }),
  z.object({ type: z.literal("RESET_GAME") }),
]);

export const gameEventSchema = z.object({
  id: z.string().min(1),
  type: z.union([
    z.literal("game_created"),
    z.literal("game_configured"),
    z.literal("status_changed"),
    z.literal("round_started"),
    z.literal("question_loaded"),
    z.literal("captain_rotated"),
    z.literal("answer_locked"),
    z.literal("answer_revealed"),
    z.literal("joker_used"),
    z.literal("round_completed"),
    z.literal("round_advanced"),
    z.literal("game_completed"),
    z.literal("game_paused"),
    z.literal("game_resumed"),
    z.literal("game_restored"),
    z.literal("game_failed"),
  ]),
  at: z.string().datetime(),
  fromStatus: gameStatusSchema.optional(),
  toStatus: gameStatusSchema.optional(),
  questionId: z.string().min(1).optional(),
  joker: jokerTypeSchema.optional(),
  message: z.string().min(1).optional(),
});


