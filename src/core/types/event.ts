import type { GameConfig, GameStatus, QuestionId } from "./game";
import type { JokerType } from "./scoring";

export type GameAction =
  | { type: "CONFIGURE_GAME"; config: GameConfig }
  | { type: "START_GAME" }
  | { type: "START_ROUND"; roundIndex: number }
  | { type: "LOAD_QUESTION"; questionId: QuestionId }
  | { type: "LOCK_ANSWER"; answer: string | string[] }
  | { type: "REVEAL_ANSWER" }
  | { type: "USE_JOKER"; joker: JokerType }
  | { type: "COMPLETE_ROUND" }
  | { type: "START_FINAL_ROUND" }
  | { type: "PAUSE_GAME" }
  | { type: "RESUME_GAME" }
  | { type: "FAIL_GAME"; message: string }
  | { type: "RESET_GAME" };

export type GameEventType =
  | "game_created"
  | "game_configured"
  | "status_changed"
  | "round_started"
  | "question_loaded"
  | "captain_rotated"
  | "answer_locked"
  | "answer_revealed"
  | "joker_used"
  | "joker_awarded"
  | "round_completed"
  | "round_advanced"
  | "game_completed"
  | "game_paused"
  | "game_resumed"
  | "game_restored"
  | "game_failed";

export interface GameEvent {
  id: string;
  type: GameEventType;
  at: string;
  fromStatus?: GameStatus | undefined;
  toStatus?: GameStatus | undefined;
  questionId?: QuestionId | undefined;
  joker?: JokerType | undefined;
  message?: string | undefined;
}
