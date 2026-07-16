export type JokerKind =
  | "fifty-fifty"
  | "second-chance"
  | "question-swap"
  | "contextual-clue"
  | "extra-time"
  | "three-player-vote";

export type JokerType = JokerKind;
export type JokerInventory = Record<JokerKind, number>;

export interface Joker {
  type: JokerType;
  label: string;
  description: string;
  maxUses: number;
}

export interface JokerState {
  available: JokerInventory;
  used: JokerInventory;
  disabled: JokerType[];
}

export interface ScoreBreakdown {
  basePoints: number;
  timeBonus: number;
  streakBonus: number;
  jokerPenalty: number;
  wagerDelta: number;
  total: number;
}

export interface AnswerResult {
  questionId: string;
  isCorrect: boolean;
  lockedAnswer: string | string[];
  correctAnswer: string | string[];
  explanation?: string | undefined;
  score: ScoreBreakdown;
  usedJokers: JokerType[];
}

export interface ScoreState {
  teamScore: number;
  streak: number;
  jokers: JokerInventory;
  breakdown?: ScoreBreakdown | undefined;
}
