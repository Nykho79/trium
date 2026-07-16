import type { Question, QuestionId, RoundKind } from "../types";
import { shuffleWithSeed } from "./random";

export interface QuestionSelectionInput {
  questions: readonly Question[];
  roundKind: RoundKind;
  usedQuestionIds: readonly QuestionId[];
  recentlyPlayedQuestionIds: readonly QuestionId[];
  seed: string;
}

export function selectNextQuestion(input: QuestionSelectionInput): Question {
  const used = new Set(input.usedQuestionIds);
  const recent = new Set(input.recentlyPlayedQuestionIds);
  const eligible = input.questions.filter((question) => question.kind === input.roundKind && !used.has(question.id));

  if (eligible.length === 0) {
    throw new Error(`Aucune question disponible pour la manche ${input.roundKind}.`);
  }

  const withoutRecent = eligible.filter((question) => !recent.has(question.id));
  const pool = withoutRecent.length > 0 ? withoutRecent : eligible;
  const [selected] = shuffleWithSeed(pool, `${input.seed}:${input.roundKind}:${input.usedQuestionIds.length}`);

  if (!selected) {
    throw new Error(`Aucune question selectionnable pour la manche ${input.roundKind}.`);
  }

  return selected;
}
