import type { Player } from "./player";
import type { RoundDefinition, RoundState } from "./round";
import type { AnswerResult, JokerState, ScoreBreakdown } from "./scoring";

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
export type GameMode = "short" | "standard" | "complete" | "custom";
export type GameStatus =
  | "idle"
  | "setup"
  | "game_intro"
  | "round_intro"
  | "question_loading"
  | "question_active"
  | "answer_locked"
  | "answer_reveal"
  | "round_result"
  | "next_round"
  | "final_round"
  | "game_result"
  | "paused"
  | "error";

export interface GameFormat {
  id: string;
  label: string;
  description: string;
  roundOrder: RoundKind[];
  questionCountByRound: Partial<Record<RoundKind, number>>;
}

export interface GameConfig {
  id: string;
  mode: GameMode;
  seed: GameSeed;
  players: [Player, Player, Player];
  rounds: RoundDefinition[];
  questionBankVersion: number;
  allowRecentlyPlayedFallback: boolean;
  defaultQuestionTimeMs: number;
}

export interface GameState {
  status: GameStatus;
  config: GameConfig;
  currentRoundIndex: number;
  currentRoundState?: RoundState | undefined;
  activeQuestionId?: QuestionId | undefined;
  lockedAnswer?: string | string[] | undefined;
  lastAnswerResult?: AnswerResult | undefined;
  usedQuestionIds: QuestionId[];
  recentlyPlayedQuestionIds: QuestionId[];
  jokers: JokerState;
  score: ScoreBreakdown;
  error?: string | undefined;
}
