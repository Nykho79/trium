import { describe, expect, it } from "vitest";
import {
  compileQuestionBankFromSources,
  loadLocalQuestionBank,
  QuestionAvailabilityError,
  selectWeightedQuestion,
} from "../../data/localQuestionBank";

const approvedQuestion = {
  id: "TEST-001",
  type: "multiple_choice",
  category: "geography",
  subcategory: "capitals",
  difficulty: 1,
  question: "Quelle est la capitale du Japon ?",
  answers: [
    { id: "a", text: "Tokyo" },
    { id: "b", text: "Kyoto" },
    { id: "c", text: "Osaka" },
    { id: "d", text: "Nagoya" },
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
    expect(bank.report.totalCount).toBeGreaterThanOrEqual(1_000);
    expect(bank.report.verifiedCount).toBe(bank.report.totalCount);
    expect(bank.report.playableCount).toBe(bank.report.totalCount);
    expect(bank.report.rejectedCount).toBe(0);
    expect(bank.report.byCategory.geography).toBeGreaterThan(0);
  });

  it("normalise les questions structurellement valides et exclut les rejets explicites", () => {
    const bank = compileQuestionBankFromSources([sourceWithQuestions([
      approvedQuestion,
      { ...approvedQuestion, id: "TEST-002", verificationStatus: "rejected", status: "rejected" },
    ])]);

    expect(bank.report.totalCount).toBe(2);
    expect(bank.report.playableCount).toBe(1);
    expect(bank.playableQuestions[0]?.id).toBe("TEST-001");
    expect(bank.playableQuestions[0]?.kind).toBe("knowledge-grid");
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
