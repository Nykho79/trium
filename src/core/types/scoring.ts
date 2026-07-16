export type JokerKind =
  | "fifty-fifty"
  | "second-chance"
  | "question-swap"
  | "contextual-clue"
  | "extra-time"
  | "three-player-vote";

export type JokerInventory = Record<JokerKind, number>;

export interface ScoreState {
  teamScore: number;
  streak: number;
  jokers: JokerInventory;
}
