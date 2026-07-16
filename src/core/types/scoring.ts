export type JokerKind =
  | "fifty_fifty"
  | "second_chance"
  | "change_question"
  | "contextual_hint"
  | "extra_time"
  | "team_vote";

export type JokerType = JokerKind;
export type JokerInventory = Record<JokerKind, number>;

export interface Joker {
  type: JokerType;
  label: string;
  description: string;
  maxUses: number;
}

export interface TeamVoteState {
  active: boolean;
  votes: Partial<Record<"player-1" | "player-2" | "player-3", string>>;
  revealedMajority?: string | undefined;
}

export interface JokerEffectState {
  eliminatedOptionIds: string[];
  secondChanceActive: boolean;
  secondChanceConsumed: boolean;
  changedQuestionIds: string[];
  contextualHint?: string | undefined;
  teamVote?: TeamVoteState | undefined;
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
