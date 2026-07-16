import { questionBankSchema } from "../core/schemas/questionSchemas";
import type { QuestionBank } from "../core/types";
import { loadLocalQuestionBank } from "./localQuestionBank";

export async function loadQuestionBank(): Promise<QuestionBank> {
  const bank = loadLocalQuestionBank();
  return questionBankSchema.parse({ version: 1, questions: bank.playableQuestions });
}