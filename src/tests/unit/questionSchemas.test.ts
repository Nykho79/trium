import { describe, expect, it } from "vitest";
import validBank from "../fixtures/questionBank.valid.json";
import invalidBank from "../fixtures/questionBank.invalid.json";
import { questionBankSchema } from "../../core/schemas/questionSchemas";

const duplicatedBank = {
  version: 1,
  questions: [validBank.questions[0], validBank.questions[0]],
};

describe("questionBankSchema", () => {
  it("valide une banque correcte", () => {
    const result = questionBankSchema.safeParse(validBank);
    expect(result.success).toBe(true);
  });

  it("rejette un QCM dont correctOptionId n'existe pas", () => {
    const result = questionBankSchema.safeParse(invalidBank);
    expect(result.success).toBe(false);
  });

  it("rejette les identifiants de questions dupliques", () => {
    const result = questionBankSchema.safeParse(duplicatedBank);
    expect(result.success).toBe(false);
  });
});
