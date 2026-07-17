import { describe, expect, it } from "vitest";
import {
  compileQuestionBankFromSources,
  loadLocalQuestionBank,
  QuestionAvailabilityError,
  selectWeightedQuestion,
} from "../../data/localQuestionBank";
import { finalStepForQuestion } from "../../rounds/final-convergence";

const approvedQuestion = {
  id: "TEST-001",
  type: "multiple_choice",
  category: "geography",
  subcategory: "capitals",
  difficulty: 1,
  question: "Quelle est la capitale du Japon ?",
  answers: [
          { id: "a", text: "!!!" },
          { id: "b", text: "???" },
          { id: "c", text: "///" },
          { id: "d", text: "***" },
        ],
  correctAnswerId: "a",
  explanation: "Tokyo est la capitale du Japon.",
  sourceLabel: "Source test",
  sourceUrl: null,
  verificationStatus: "verified",
  tags: ["japon"],
  estimatedTimeSeconds: 30,
  status: "approved",
  version: 1,
} as const;

function sourceWithQuestions(questions: readonly unknown[]) {
  return {
    schemaVersion: "1.0",
    fileId: "test-file",
    title: "Test",
    category: "test",
    questionType: "multiple_choice",
    generatedAt: null,
    questions,
  };
}

describe("localQuestionBank", () => {
  it("charge et rapporte les fichiers JSON presents dans src/data/questions", () => {
    const bank = loadLocalQuestionBank();

    expect(bank.report.fileCount).toBeGreaterThan(0);
    expect(bank.report.totalCount).toBeGreaterThanOrEqual(850);
    expect(bank.report.verifiedCount).toBe(bank.report.totalCount);
    expect(bank.report.playableCount).toBe(bank.report.totalCount);
    expect(bank.report.rejectedCount).toBe(0);
    expect(bank.report.byCategory.geography).toBeGreaterThan(0);
  });

  it("normalise uniquement les questions approuvees et verifiees", () => {
    const bank = compileQuestionBankFromSources([sourceWithQuestions([
      approvedQuestion,
      { ...approvedQuestion, id: "TEST-002", verificationStatus: "rejected", status: "rejected" },
      { ...approvedQuestion, id: "TEST-003", verificationStatus: "to_verify", status: "approved" },
      { ...approvedQuestion, id: "TEST-004", verificationStatus: "verified", status: "review" },
    ])]);

    expect(bank.report.totalCount).toBe(4);
    expect(bank.report.playableCount).toBe(1);
    expect(bank.playableQuestions[0]?.id).toBe("TEST-001");
    expect(bank.playableQuestions[0]?.kind).toBe("knowledge-grid");
  });

  it("ne genere jamais d'alias de reponse vide apres normalisation", () => {
    const bank = compileQuestionBankFromSources([sourceWithQuestions([
      {
        ...approvedQuestion,
        id: "TEST-SYMBOL",
        answers: [
          { id: "a", text: "!!!" },
          { id: "b", text: "???" },
          { id: "c", text: "///" },
          { id: "d", text: "***" },
        ],
        correctAnswerId: "a",
      },
    ])]);

    const firstQuestion = bank.playableQuestions[0];
    expect(bank.report.validationErrors).toEqual([]);
    expect(firstQuestion?.type).toBe("multiple_choice");
    if (firstQuestion?.type !== "multiple_choice") {
      throw new Error("Question de test inattendue.");
    }
    expect(firstQuestion.answer?.accepted).toEqual(["a"]);
  });

  it("detecte les doublons exacts et probables", () => {
    const bank = compileQuestionBankFromSources([sourceWithQuestions([
      approvedQuestion,
      { ...approvedQuestion, id: "TEST-002" },
      { ...approvedQuestion, id: "TEST-003", question: "Quelle est la capitale japonaise ?" },
    ])]);

    expect(bank.report.exactDuplicates).toHaveLength(1);
    expect(bank.report.probableDuplicates.length).toBeGreaterThanOrEqual(1);
  });


  it("couvre les manches critiques pour plusieurs parties completes", () => {
    const bank = loadLocalQuestionBank();
    const questions = bank.playableQuestions;
    const count = (predicate: (question: (typeof questions)[number]) => boolean) => questions.filter(predicate).length;
    const countByFinalStep = new Map<string, number>();

    for (const question of questions) {
      const step = finalStepForQuestion(question);
      if (step) {
        countByFinalStep.set(step, (countByFinalStep.get(step) ?? 0) + 1);
      }
    }

    expect(bank.report.totalCount).toBeGreaterThanOrEqual(940);
    expect(bank.report.validationErrors).toEqual([]);
    expect(bank.report.exactDuplicates).toEqual([]);
    expect(count((question) => question.kind === "clue-race")).toBeGreaterThanOrEqual(30);
    expect(count((question) => question.kind === "connections")).toBeGreaterThanOrEqual(25);
    expect(count((question) => question.kind === "pressure-choice" && question.difficulty === 3)).toBeGreaterThanOrEqual(8);
    expect(count((question) => question.kind === "wager" && question.difficulty === 1)).toBeGreaterThanOrEqual(8);
    expect(count((question) => question.kind === "wager" && question.difficulty === 5)).toBeGreaterThanOrEqual(5);
    expect(count((question) => question.kind === "synapse" && question.type === "analogy")).toBeGreaterThanOrEqual(10);
    expect(count((question) => question.kind === "synapse" && question.type === "memory")).toBeGreaterThanOrEqual(8);
    expect(new Set(questions.filter((question) => question.kind === "synapse").map((question) => question.type)).size).toBeGreaterThanOrEqual(7);
    expect(countByFinalStep.get("culture") ?? 0).toBeGreaterThanOrEqual(10);
    expect(countByFinalStep.get("clues") ?? 0).toBeGreaterThanOrEqual(10);
    expect(countByFinalStep.get("connection") ?? 0).toBeGreaterThanOrEqual(10);
    expect(countByFinalStep.get("memory") ?? 0).toBeGreaterThanOrEqual(10);
    expect(countByFinalStep.get("logic") ?? 0).toBeGreaterThanOrEqual(10);
  });
  it("selectionne de maniere deterministe et rejette une banque vide", () => {
    const bank = compileQuestionBankFromSources([sourceWithQuestions([
      approvedQuestion,
      { ...approvedQuestion, id: "TEST-002", category: "history", difficulty: 3, question: "Qui a dirige le Consulat ?", correctAnswerId: "b" },
    ])]);

    const first = selectWeightedQuestion({ questions: bank.playableQuestions, usedQuestionIds: [], recentlyPlayedQuestionIds: [], seed: "seed" });
    const second = selectWeightedQuestion({ questions: bank.playableQuestions, usedQuestionIds: [], recentlyPlayedQuestionIds: [], seed: "seed" });

    expect(first.id).toBe(second.id);
    expect(() => selectWeightedQuestion({ questions: [], usedQuestionIds: [], recentlyPlayedQuestionIds: [], seed: "seed" })).toThrow(QuestionAvailabilityError);
  });
});
