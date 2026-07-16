import { describe, expect, it } from "vitest";
import {
  availableWagerCategories,
  availableWagerDifficulties,
  buildWagerQuestionSet,
  calculateWagerScore,
  coefficientForWagerDifficulty,
  isAllowedWagerAmount,
  isFreeMinimumStake,
  maximumCustomWager,
  selectWagerQuestions,
  wagerDifficultyLabel,
} from "../../rounds/wager";

describe("wager round", () => {
  it("genere une banque deterministe avec les quatre niveaux de pari", () => {
    const first = buildWagerQuestionSet("wager-seed");
    const second = buildWagerQuestionSet("wager-seed");

    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(new Set(first.map((question) => question.difficulty))).toEqual(new Set([1, 2, 3, 4]));
  });

  it("mappe les difficultes vers les coefficients", () => {
    expect(wagerDifficultyLabel(1)).toBe("facile");
    expect(wagerDifficultyLabel(2)).toBe("moyen");
    expect(wagerDifficultyLabel(3)).toBe("difficile");
    expect(wagerDifficultyLabel(4)).toBe("expert");
    expect(coefficientForWagerDifficulty(1)).toBe(1);
    expect(coefficientForWagerDifficulty(2)).toBe(2);
    expect(coefficientForWagerDifficulty(3)).toBe(3);
    expect(coefficientForWagerDifficulty(4)).toBe(5);
  });

  it("borne les mises standard et la mise libre", () => {
    expect(maximumCustomWager(1_000)).toBe(250);
    expect(isAllowedWagerAmount({ amount: 500, scoreTotal: 1_000 })).toBe(true);
    expect(isAllowedWagerAmount({ amount: 750, scoreTotal: 1_000 })).toBe(false);
    expect(isAllowedWagerAmount({ amount: 250, scoreTotal: 1_000 })).toBe(true);
    expect(isAllowedWagerAmount({ amount: 251, scoreTotal: 1_000 })).toBe(false);
  });

  it("autorise une mise minimale gratuite quand le score est trop bas", () => {
    expect(isFreeMinimumStake(0, 100)).toBe(true);
    expect(isAllowedWagerAmount({ amount: 100, scoreTotal: 0 })).toBe(true);
    expect(isAllowedWagerAmount({ amount: 250, scoreTotal: 0 })).toBe(false);
  });

  it("filtre les categories, difficultes et questions deja jouees", () => {
    const questions = buildWagerQuestionSet("wager-select");
    const category = availableWagerCategories(questions)[0];
    if (!category) throw new Error("Categorie manquante.");
    const difficulty = availableWagerDifficulties(questions, category.id)[0];
    if (!difficulty) throw new Error("Difficulte manquante.");
    const selected = selectWagerQuestions({ questions, alreadyUsedQuestionIds: [], categoryId: category.id, difficulty, seed: "wager-select" });
    const first = selected[0];
    if (!first) throw new Error("Question manquante.");
    const withoutFirst = selectWagerQuestions({ questions, alreadyUsedQuestionIds: [first.id], categoryId: category.id, difficulty, seed: "wager-select" });

    expect(selected.every((question) => question.categoryId === category.id && question.difficulty === difficulty)).toBe(true);
    expect(withoutFirst.map((question) => question.id)).not.toContain(first.id);
  });

  it("calcule le gain et la perte de mise", () => {
    expect(calculateWagerScore({ isCorrect: true, amount: 250, coefficient: 3 }).total).toBe(750);
    expect(calculateWagerScore({ isCorrect: false, amount: 250, coefficient: 3 }).total).toBe(-250);
  });
});
