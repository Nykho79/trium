export type RoundKind =
  | "knowledge-grid"
  | "clue-race"
  | "pressure-choice"
  | "synapse"
  | "connections"
  | "wager"
  | "final-convergence";

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type QuestionId = string;
export type CategoryId = string;
export type GameSeed = string;

export interface GameFormat {
  id: string;
  label: string;
  description: string;
  roundOrder: RoundKind[];
  questionCountByRound: Partial<Record<RoundKind, number>>;
}
