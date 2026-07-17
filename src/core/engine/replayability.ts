import type { Question } from "../types/question";
import type { QuestionId, RoundKind } from "../types/game";
import { shuffleWithSeed } from "./random";

export interface RecentQuestionGame {
  seed: string;
  questionIds: QuestionId[];
  completedAt: string;
}

export type QuestionFreshnessTier =
  | "never_played"
  | "not_in_last_five"
  | "not_in_last_two"
  | "older_question"
  | "recent_last_resort";

export interface RankedQuestion<TQuestion extends Question = Question> {
  question: TQuestion;
  tier: QuestionFreshnessTier;
  tierIndex: number;
}

export interface ReplayabilitySelectionInput<TQuestion extends Question = Question> {
  questions: readonly TQuestion[];
  usedQuestionIds: readonly QuestionId[];
  recentQuestionHistory?: readonly RecentQuestionGame[] | undefined;
  recentlyPlayedQuestionIds?: readonly QuestionId[] | undefined;
  seed: string;
  roundKind?: RoundKind | undefined;
  allowRecentFallback?: boolean | undefined;
}

export interface QuestionAvailabilityEstimate {
  totalEligible: number;
  neverPlayed: number;
  availableOutsideLastFive: number;
  availableOutsideLastTwo: number;
  recentOnly: number;
  isInsufficient: boolean;
}

const HISTORY_WINDOW_SIZE = 12;
const LAST_FIVE_GAMES = 5;
const LAST_TWO_GAMES = 2;

export function trimRecentQuestionHistory(history: readonly RecentQuestionGame[]): RecentQuestionGame[] {
  return history.slice(-HISTORY_WINDOW_SIZE).map((entry) => ({
    seed: entry.seed,
    completedAt: entry.completedAt,
    questionIds: [...new Set(entry.questionIds)],
  }));
}

export function flattenRecentQuestionHistory(history: readonly RecentQuestionGame[], limit = 250): QuestionId[] {
  return [...new Set(history.flatMap((entry) => entry.questionIds))].slice(-limit);
}

export function appendRecentQuestionGame(input: {
  history: readonly RecentQuestionGame[];
  seed: string;
  questionIds: readonly QuestionId[];
  completedAt?: string | undefined;
}): RecentQuestionGame[] {
  if (input.questionIds.length === 0) {
    return trimRecentQuestionHistory(input.history);
  }
  const nextEntry: RecentQuestionGame = {
    seed: input.seed,
    questionIds: [...new Set(input.questionIds)],
    completedAt: input.completedAt ?? new Date().toISOString(),
  };
  return trimRecentQuestionHistory([...input.history, nextEntry]);
}

function questionSetFromRecentGames(history: readonly RecentQuestionGame[], count: number): Set<QuestionId> {
  return new Set(history.slice(-count).flatMap((entry) => entry.questionIds));
}

function questionSetFromHistory(history: readonly RecentQuestionGame[] | undefined, recentIds: readonly QuestionId[] | undefined): Set<QuestionId> {
  return new Set([...(history ?? []).flatMap((entry) => entry.questionIds), ...(recentIds ?? [])]);
}

export function classifyQuestionFreshness(
  questionId: QuestionId,
  history: readonly RecentQuestionGame[] | undefined,
  legacyRecentIds: readonly QuestionId[] = [],
): { tier: QuestionFreshnessTier; tierIndex: number } {
  const fullHistory = questionSetFromHistory(history, legacyRecentIds);
  if (!fullHistory.has(questionId)) {
    return { tier: "never_played", tierIndex: 0 };
  }

  const lastFive = questionSetFromRecentGames(history ?? [], LAST_FIVE_GAMES);
  if (!lastFive.has(questionId)) {
    return { tier: "not_in_last_five", tierIndex: 1 };
  }

  const lastTwo = questionSetFromRecentGames(history ?? [], LAST_TWO_GAMES);
  if (!lastTwo.has(questionId)) {
    return { tier: "not_in_last_two", tierIndex: 2 };
  }

  if (!legacyRecentIds.includes(questionId)) {
    return { tier: "older_question", tierIndex: 3 };
  }
  return { tier: "recent_last_resort", tierIndex: 4 };
}

export function rankedReplayabilityCandidates<TQuestion extends Question>(
  input: ReplayabilitySelectionInput<TQuestion>,
): RankedQuestion<TQuestion>[] {
  const used = new Set(input.usedQuestionIds);
  return input.questions
    .filter((question) => (input.roundKind === undefined || question.kind === input.roundKind) && !used.has(question.id))
    .map((question) => {
      const freshness = classifyQuestionFreshness(question.id, input.recentQuestionHistory, input.recentlyPlayedQuestionIds ?? []);
      return { question, ...freshness };
    });
}

export function selectReplayableQuestion<TQuestion extends Question>(input: ReplayabilitySelectionInput<TQuestion>): TQuestion {
  const candidates = rankedReplayabilityCandidates(input);
  if (candidates.length === 0) {
    throw new Error("Aucune question disponible pour cette selection.");
  }
  const allowedMaxTier = input.allowRecentFallback === false ? 2 : 4;
  const bestTier = Math.min(...candidates.map((candidate) => candidate.tierIndex).filter((tier) => tier <= allowedMaxTier));
  if (!Number.isFinite(bestTier)) {
    throw new Error("Banque insuffisante sans relachement de l'historique recent.");
  }
  const pool = candidates.filter((candidate) => candidate.tierIndex === bestTier).map((candidate) => candidate.question);
  const [selected] = shuffleWithSeed(pool, `${input.seed}:${input.roundKind ?? "all"}:${input.usedQuestionIds.length}:${bestTier}`);
  if (!selected) {
    throw new Error("Aucune question selectionnable apres classement de rejouabilite.");
  }
  return selected;
}

export function estimateQuestionAvailability(input: Omit<ReplayabilitySelectionInput, "seed"> & { requiredCount?: number | undefined }): QuestionAvailabilityEstimate {
  const ranked = rankedReplayabilityCandidates({ ...input, seed: "availability" });
  const neverPlayed = ranked.filter((candidate) => candidate.tierIndex === 0).length;
  const availableOutsideLastFive = ranked.filter((candidate) => candidate.tierIndex <= 1).length;
  const availableOutsideLastTwo = ranked.filter((candidate) => candidate.tierIndex <= 2).length;
  const recentOnly = ranked.filter((candidate) => candidate.tierIndex > 2).length;
  return {
    totalEligible: ranked.length,
    neverPlayed,
    availableOutsideLastFive,
    availableOutsideLastTwo,
    recentOnly,
    isInsufficient: ranked.length < (input.requiredCount ?? 1),
  };
}
