import { describe, expect, it } from "vitest";
import {
  appendRecentQuestionGame,
  classifyQuestionFreshness,
  estimateQuestionAvailability,
  flattenRecentQuestionHistory,
  selectReplayableQuestion,
  trimRecentQuestionHistory,
  type RecentQuestionGame,
} from "../../core/engine/replayability";
import type { Question } from "../../core/types";

function makeQuestion(id: string): Question {
  return {
    id,
    kind: "knowledge-grid",
    type: "multiple_choice",
    categoryId: "culture",
    categoryLabel: "Culture",
    subCategoryId: "general",
    subCategoryLabel: "General",
    difficulty: 1,
    prompt: `Question ${id}`,
    explanation: "Explication",
    tags: [],
    editorialStatus: "approved",
    version: 1,
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    correctOptionId: "a",
    answer: { accepted: ["a"], display: "A" },
    value: 100,
  };
}

function game(seed: string, questionIds: string[]): RecentQuestionGame {
  return { seed, questionIds, completedAt: `2026-07-${seed.padStart(2, "0")}T00:00:00.000Z` };
}

const history = [
  game("1", ["q-old"]),
  game("2", ["q-five"]),
  game("3", ["q-three"]),
  game("4", ["q-four"]),
  game("5", ["q-two"]),
  game("6", ["q-recent"]),
];
const recentIds = flattenRecentQuestionHistory(history);

describe("replayability question selection", () => {
  it("classe les questions selon la fraicheur demandee", () => {
    expect(classifyQuestionFreshness("q-new", history, recentIds).tier).toBe("never_played");
    expect(classifyQuestionFreshness("q-old", history, recentIds).tier).toBe("not_in_last_five");
    expect(classifyQuestionFreshness("q-five", history, recentIds).tier).toBe("not_in_last_two");
    expect(classifyQuestionFreshness("q-recent", history, recentIds).tier).toBe("recent_last_resort");
  });

  it("priorise une question jamais jouee", () => {
    const selected = selectReplayableQuestion({
      questions: [makeQuestion("q-recent"), makeQuestion("q-new")],
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: recentIds,
      recentQuestionHistory: history,
      seed: "seed-a",
      roundKind: "knowledge-grid",
    });

    expect(selected.id).toBe("q-new");
  });

  it("relache vers une question absente des cinq dernieres parties", () => {
    const selected = selectReplayableQuestion({
      questions: [makeQuestion("q-five"), makeQuestion("q-old")],
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: recentIds,
      recentQuestionHistory: history,
      seed: "seed-b",
      roundKind: "knowledge-grid",
    });

    expect(selected.id).toBe("q-old");
  });

  it("relache vers une question absente des deux dernieres parties", () => {
    const selected = selectReplayableQuestion({
      questions: [makeQuestion("q-recent"), makeQuestion("q-five")],
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: recentIds,
      recentQuestionHistory: history,
      seed: "seed-c",
      roundKind: "knowledge-grid",
    });

    expect(selected.id).toBe("q-five");
  });

  it("utilise une question recente uniquement en dernier recours", () => {
    const selected = selectReplayableQuestion({
      questions: [makeQuestion("q-recent")],
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: recentIds,
      recentQuestionHistory: history,
      seed: "seed-d",
      roundKind: "knowledge-grid",
    });

    expect(selected.id).toBe("q-recent");
  });

  it("detecte une banque insuffisante sans relachement", () => {
    expect(() => selectReplayableQuestion({
      questions: [makeQuestion("q-recent")],
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: recentIds,
      recentQuestionHistory: history,
      seed: "seed-e",
      roundKind: "knowledge-grid",
      allowRecentFallback: false,
    })).toThrow("Banque insuffisante");
  });

  it("estime les questions disponibles par niveau de contrainte", () => {
    const estimate = estimateQuestionAvailability({
      questions: [makeQuestion("q-new"), makeQuestion("q-old"), makeQuestion("q-five"), makeQuestion("q-recent")],
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: recentIds,
      recentQuestionHistory: history,
      roundKind: "knowledge-grid",
      requiredCount: 5,
    });

    expect(estimate).toMatchObject({
      totalEligible: 4,
      neverPlayed: 1,
      availableOutsideLastFive: 2,
      availableOutsideLastTwo: 3,
      recentOnly: 1,
      isInsufficient: true,
    });
  });

  it("conserve uniquement les dernieres parties et dedoublonne chaque entree", () => {
    const longHistory = Array.from({ length: 14 }, (_, index) => game(String(index + 1), [`q-${index}`, `q-${index}`]));
    const trimmed = trimRecentQuestionHistory(longHistory);

    expect(trimmed).toHaveLength(12);
    expect(trimmed[0]?.seed).toBe("3");
    expect(trimmed[0]?.questionIds).toEqual(["q-2"]);
  });

  it("ajoute une partie terminee a l'historique recent", () => {
    const nextHistory = appendRecentQuestionGame({ history: [], seed: "revanche", questionIds: ["q-1", "q-1", "q-2"], completedAt: "2026-07-17T00:00:00.000Z" });

    expect(nextHistory).toEqual([{ seed: "revanche", questionIds: ["q-1", "q-2"], completedAt: "2026-07-17T00:00:00.000Z" }]);
  });
});