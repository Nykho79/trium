import { z } from "zod";
import { playerColorSchema, playerIdSchema } from "./baseSchemas";

export const playerSchema = z.object({
  id: playerIdSchema,
  name: z.string().min(1),
  color: playerColorSchema,
  ready: z.boolean(),
});

export const playersSchema = z.tuple([playerSchema, playerSchema, playerSchema]).superRefine((players, ctx) => {
  const ids = new Set(players.map((player) => player.id));
  if (ids.size !== 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["id"],
      message: "Une partie TRIUM doit contenir exactement trois joueurs distincts.",
    });
  }
});
