import { z } from "zod";
import { playerColorSchema, playerIdSchema } from "./baseSchemas";

export const playerSchema = z.object({
  id: playerIdSchema,
  name: z.string().min(1),
  color: playerColorSchema,
  ready: z.boolean(),
});

export const playersSchema = z.union([
  z.tuple([playerSchema]),
  z.tuple([playerSchema, playerSchema, playerSchema]),
]).superRefine((players, ctx) => {
  const ids = new Set(players.map((player) => player.id));
  if (ids.size !== players.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["id"],
      message: "Les joueurs d'une partie TRIUM doivent etre distincts.",
    });
  }
});