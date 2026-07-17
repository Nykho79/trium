import type { Question, QuestionId, RoundKind } from "../types";
import type { RecentQuestionGame } from "./replayability";
import { selectReplayableQuestion } from "./replayability";

export interface QuestionSelectionInput {
  questions: readonly Question[];
  roundKind: RoundKind;
  usedQuestionIds: readonly QuestionId[];
  recentlyPlayedQuestionIds: readonly QuestionId[];
  recentQuestionHistory?: readonly RecentQuestionGame[] | undefined;
  seed: string;
}

export function selectNextQuestion(input: QuestionSelectionInput): Question {
  try {
    return selectReplayableQuestion({
      questions: input.questions,
      roundKind: input.roundKind,
      usedQuestionIds: input.usedQuestionIds,
      recentlyPlayedQuestionIds: input.recentlyPlayedQuestionIds,
      recentQuestionHistory: input.recentQuestionHistory,
      seed: input.seed,
      allowRecentFallback: true,
    });
  } catch {
    throw new Error(`Aucune question disponible pour la manche ${input.roundKind}.`);
  }
}
