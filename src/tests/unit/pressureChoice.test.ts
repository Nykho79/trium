import { describe, expect, it } from "vitest";
import type { PressureChoiceQuestion, RoundState } from "../../core/types";
import {
  calculatePressureChoiceScore,
  isPressureChoiceComplete,
  multiplierForPressureStep,
  pressureChoiceRound,
  secureRiskPoints,
  timeLimitForPressureStep,
} from "../../rounds/pressure-choice";

function makeQuestion(difficulty: 1 | 2 | 3 | 4 | 5): PressureChoiceQuestion {
  return {
    id: `pc-${difficulty}`,
    kind: "pressure-choice",
    type: "multiple_choice",
    categoryId: "science",
    categoryLabel: "Science",
    subCategoryId: "test",
    subCategoryLabel: "Test",
    difficulty,
    prompt: `Question ${difficulty}`,
    explanation: "Explication.",
    tags: ["test"],
    editorialStatus: "approved",
    version: 1,
    value: (difficulty * 100) as 100 | 200 | 300 | 400 | 500,
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    correctOptionId: "a",
    timeLimitSeconds: 30,
    answer: { accepted: ["a"], display: "A" },
  };
}

const baseState: RoundState = {
  id: "pressure-state",
  definitionId: "pressure-choice",
  status: "active",
  currentQuestionIndex: 0,
  selectedQuestionIds: [],
  answeredQuestionIds: [],
  answerResults: [],
  score: { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 },
  securedPoints: 0,
  riskPoints: 300,
};

describe("pressure-choice round", () => {
  it("expose les multiplicateurs et chronometres attendus", () => {
    expect([0, 1, 2, 3, 4].map(multiplierForPressureStep)).toEqual([1, 1.5, 2, 3, 5]);
    expect([0, 1, 2, 3, 4].map(timeLimitForPressureStep)).toEqual([35, 30, 25, 20, 15]);
  });

  it("calcule un score multiplie sans bonus de temps", () => {
    const score = calculatePressureChoiceScore({ question: makeQuestion(3), isCorrect: true, stepIndex: 2 });

    expect(score.basePoints).toBe(300);
    expect(score.wagerDelta).toBe(300);
    expect(score.total).toBe(600);
  });

  it("securise les points a risque dans l'etat de manche", () => {
    const secured = secureRiskPoints(baseState);

    expect(secured.securedPoints).toBe(300);
    expect(secured.riskPoints).toBe(0);
    expect(secured.status).toBe("complete");
  });

  it("detecte une fin de manche apres erreur", () => {
    const failedState: RoundState = {
      ...baseState,
      answerResults: [{ questionId: "pc-1", isCorrect: false }],
      answeredQuestionIds: ["pc-1"],
      riskPoints: 0,
    };

    expect(isPressureChoiceComplete(failedState, { id: "cfg", mode: "standard", seed: "s", playerMode: "trio", players: [
      { id: "player-1", name: "A", color: "cyan", ready: true },
      { id: "player-2", name: "B", color: "amber", ready: true },
      { id: "player-3", name: "C", color: "magenta", ready: true },
    ], rounds: [pressureChoiceRound.definition], questionBankVersion: 1, allowRecentlyPlayedFallback: true, defaultQuestionTimeMs: 30000 })).toBe(true);
  });
});