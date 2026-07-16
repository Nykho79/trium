import { describe, expect, it } from "vitest";
import {
  advantageById,
  buildFinalConvergenceQuestionSet,
  calculateFinalConvergenceScore,
  canApplyFinalAdvantageToStep,
  finalStepForIndex,
  finalStepForQuestion,
  finalSuccessCount,
  isFinalConvergenceWon,
} from "../../rounds/final-convergence";

describe("final convergence round", () => {
  it("genere les cinq etapes dans l'ordre attendu", () => {
    const questions = buildFinalConvergenceQuestionSet("final-seed");

    expect(questions).toHaveLength(5);
    expect(questions.map((question) => finalStepForQuestion(question))).toEqual(["culture", "clues", "connection", "memory", "logic"]);
  });

  it("decrit les avantages et leurs etapes compatibles", () => {
    expect(advantageById("extra_time").cost).toBe(300);
    expect(advantageById("error_protection").cost).toBe(1_000);
    expect(canApplyFinalAdvantageToStep("extra_hint", "clues")).toBe(true);
    expect(canApplyFinalAdvantageToStep("extra_hint", "memory")).toBe(false);
  });

  it("calcule le score et la victoire", () => {
    expect(calculateFinalConvergenceScore(true).total).toBe(1_000);
    expect(calculateFinalConvergenceScore(false).total).toBe(0);
    const state = { answerResults: [true, true, false, true, true].map((isCorrect, index) => ({ questionId: `q-${index}`, isCorrect })) };

    expect(finalSuccessCount(state)).toBe(4);
    expect(isFinalConvergenceWon(state)).toBe(true);
  });

  it("borne les index d'etape", () => {
    expect(finalStepForIndex(-1)).toBe("culture");
    expect(finalStepForIndex(99)).toBe("logic");
  });
});