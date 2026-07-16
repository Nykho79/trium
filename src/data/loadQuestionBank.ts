import { questionBankSchema } from "../core/schemas/questionSchemas";
import type { QuestionBank } from "../core/types";

export async function loadQuestionBank(path = "/questions/v1.sample.json"): Promise<QuestionBank> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Impossible de charger la banque de questions: ${response.status}`);
  }
  const payload: unknown = await response.json();
  return questionBankSchema.parse(payload);
}
