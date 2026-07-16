import { describe, expect, it } from "vitest";
import {
  buildSynapseQuestionSet,
  calculateSynapseScore,
  generateDigitSequence,
  generateLogicalOrder,
  generateNumericSequence,
  generateReverseMemory,
  generateSymbolRule,
  synapseBasePoints,
  synapseExerciseType,
} from "../../rounds/synapse";

describe("synapse round", () => {
  it("genere les memes epreuves pour la meme seed", () => {
    const first = buildSynapseQuestionSet("synapse-seed");
    const second = buildSynapseQuestionSet("synapse-seed");

    expect(second).toEqual(first);
    expect(first).toHaveLength(6);
  });

  it("limite a deux epreuves maximum par type", () => {
    const questions = buildSynapseQuestionSet("synapse-limits");
    const counts = new Map<string, number>();
    for (const question of questions) {
      const type = synapseExerciseType(question);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    expect([...counts.values()].every((count) => count <= 2)).toBe(true);
  });

  it("applique une difficulte progressive", () => {
    const difficulties = buildSynapseQuestionSet("synapse-progression").map((question) => question.difficulty);

    expect(difficulties).toEqual([1, 2, 3, 3, 4, 5]);
  });

  it("genere les sequences deterministes attendues", () => {
    expect(generateDigitSequence("digits", 3)).toEqual(generateDigitSequence("digits", 3));
    expect(generateReverseMemory("digits", 3)).toEqual([...generateDigitSequence("digits:reverse", 3)].reverse());
    expect(generateNumericSequence("numbers", 2)).toEqual(generateNumericSequence("numbers", 2));
    expect(generateLogicalOrder("order", 4)).toHaveLength(4);
    expect(generateSymbolRule("symbols", 2).examples).toHaveLength(3);
  });

  it("calcule les paliers de score et le bonus vitesse plafonne", () => {
    const easy = buildSynapseQuestionSet("score")[0];
    const hard = buildSynapseQuestionSet("score")[5];

    if (!easy || !hard) {
      throw new Error("Questions Synapse manquantes.");
    }

    expect(synapseBasePoints(1)).toBe(150);
    expect(synapseBasePoints(3)).toBe(250);
    expect(synapseBasePoints(5)).toBe(400);

    const score = calculateSynapseScore({ question: hard, isCorrect: true, answeredInMs: 0, timeLimitMs: 30_000 });
    expect(score.timeBonus).toBe(80);
    expect(score.total).toBe(480);

    const missed = calculateSynapseScore({ question: easy, isCorrect: false, answeredInMs: 1_000, timeLimitMs: 30_000 });
    expect(missed.total).toBe(0);
  });
});
