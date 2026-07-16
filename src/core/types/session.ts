import type { Player } from "./player";
import type { GameFormat, QuestionId, RoundKind } from "./game";
import type { ScoreState } from "./scoring";

export type AppScreen =
  | "home"
  | "rules"
  | "player-setup"
  | "format-selection"
  | "game-intro"
  | "round-intro"
  | "game"
  | "question-transition"
  | "round-result"
  | "finale"
  | "summary"
  | "settings"
  | "dev-question-bank"
  | "design-system";

export interface GameSessionPreview {
  players: [Player, Player, Player];
  format: GameFormat;
  currentRoundKind: RoundKind;
  currentQuestionId?: QuestionId;
  usedQuestionIds: QuestionId[];
  score: ScoreState;
}