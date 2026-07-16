import type { GameConfig, QuestionId, RoundKind } from "./game";
import type { Question } from "./question";
import type { AnswerResult, ScoreBreakdown } from "./scoring";

export type RoundStatus = "not_started" | "active" | "complete" | "restored";

export interface RoundDefinition {
  id: string;
  kind: RoundKind;
  label: string;
  description: string;
  questionTypes: Question["type"][];
  questionCount: number;
  maxScore: number;
}

export interface RoundAnswerHistoryEntry {
  questionId: QuestionId;
  isCorrect: boolean;
}

export interface RoundState {
  id: string;
  definitionId: string;
  status: RoundStatus;
  currentQuestionIndex: number;
  selectedQuestionIds: QuestionId[];
  answeredQuestionIds: QuestionId[];
  answerResults: RoundAnswerHistoryEntry[];
  score: ScoreBreakdown;
  clueIndex?: number | undefined;
  connectionItemIndex?: number | undefined;
  answersVisible?: boolean | undefined;
  securedPoints?: number | undefined;
  riskPoints?: number | undefined;
  wagerCategoryId?: string | undefined;
  wagerDifficulty?: 1 | 2 | 3 | 4 | 5 | undefined;
  wagerAmount?: number | undefined;
  wagerCoefficient?: number | undefined;
  wagerIsFreeStake?: boolean | undefined;
  finalPurchasedAdvantageIds?: string[] | undefined;
  finalUsedAdvantageIds?: string[] | undefined;
}

export interface RoundQuestionSelectionInput<TQuestion extends Question = Question> {
  questions: readonly TQuestion[];
  alreadyUsedQuestionIds: readonly QuestionId[];
  recentlyPlayedQuestionIds: readonly QuestionId[];
  seed: string;
  config: GameConfig;
}

export interface RoundAnswerContext {
  now: number;
  remainingTimeMs?: number | undefined;
}

export interface RoundScoreContext {
  definition: RoundDefinition;
  state: RoundState;
}

export interface RoundSummary {
  roundId: string;
  label: string;
  answeredQuestions: number;
  score: ScoreBreakdown;
  isComplete: boolean;
}

export interface GameRound<
  TRoundState extends RoundState = RoundState,
  TQuestion extends Question = Question,
  TAnswer = unknown,
> {
  definition: RoundDefinition;
  initializeState(config: GameConfig): TRoundState;
  selectQuestions(input: RoundQuestionSelectionInput<TQuestion>): readonly TQuestion[];
  handleAnswer(state: TRoundState, question: TQuestion, answer: TAnswer, context: RoundAnswerContext): AnswerResult;
  calculateScore(result: AnswerResult, context: RoundScoreContext): ScoreBreakdown;
  isComplete(state: TRoundState, config: GameConfig): boolean;
  summarize(state: TRoundState): RoundSummary;
  restoreState(savedState: unknown): TRoundState;
}
