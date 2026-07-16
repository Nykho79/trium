import { z } from "zod";

export const playerIdSchema = z.union([z.literal("player-1"), z.literal("player-2"), z.literal("player-3")]);
export const playerColorSchema = z.union([z.literal("cyan"), z.literal("amber"), z.literal("magenta")]);

export const roundKindSchema = z.union([
  z.literal("knowledge-grid"),
  z.literal("clue-race"),
  z.literal("pressure-choice"),
  z.literal("synapse"),
  z.literal("connections"),
  z.literal("wager"),
  z.literal("final-convergence"),
]);

export const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const questionTypeSchema = z.union([
  z.literal("multiple_choice"),
  z.literal("progressive_clues"),
  z.literal("connection"),
  z.literal("chronology"),
  z.literal("analogy"),
  z.literal("memory"),
  z.literal("sequence"),
  z.literal("intruder"),
  z.literal("visual_matrix"),
  z.literal("symbol_rule"),
]);

export const playerModeSchema = z.union([
  z.literal("solo"),
  z.literal("trio"),
]);

export const gameModeSchema = z.union([
  z.literal("short"),
  z.literal("standard"),
  z.literal("complete"),
  z.literal("custom"),
]);

export const gameStatusSchema = z.union([
  z.literal("idle"),
  z.literal("setup"),
  z.literal("game_intro"),
  z.literal("round_intro"),
  z.literal("question_loading"),
  z.literal("question_active"),
  z.literal("answer_locked"),
  z.literal("answer_reveal"),
  z.literal("round_result"),
  z.literal("next_round"),
  z.literal("final_round"),
  z.literal("game_result"),
  z.literal("paused"),
  z.literal("error"),
]);
