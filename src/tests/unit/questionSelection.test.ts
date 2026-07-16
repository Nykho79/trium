import { describe, expect, it } from "vitest";
import validBank from "../fixtures/questionBank.valid.json";
import { questionBankSchema } from "../../core/schemas/questionSchemas";
import { selectNextQuestion } from "../../core/engine/questionSelection";

const bank = questionBankSchema.parse(validBank);

describe("selectNextQuestion", () => {
  it("empeche la repetition dans une partie", () => {
    expect(() => selectNextQuestion({
      questions: bank.questions,
      roundKind: "knowledge-grid",
      usedQuestionIds: ["kg-fr-001"],
      recentlyPlayedQuestionIds: [],
      seed: "demo",
    })).toThrow("Aucune question disponible");
  });

  it("evite les questions recentes si une alternative existe", () => {
    const question = selectNextQuestion({
      questions: bank.questions,
      roundKind: "pressure-choice",
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: ["pc-fr-001"],
      seed: "demo",
    });
    expect(question.kind).toBe("pressure-choice");
    expect(question.id).not.toBe("pc-fr-001");
  });
});
