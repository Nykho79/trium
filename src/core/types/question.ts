import type { CategoryId, Difficulty, QuestionId, RoundKind } from "./game";

export type QuestionEditorialStatus = "draft" | "review" | "approved" | "rejected";

export interface BaseQuestion {
  id: QuestionId;
  kind: RoundKind;
  categoryId: CategoryId;
  categoryLabel: string;
  subCategoryId: string;
  subCategoryLabel: string;
  difficulty: Difficulty;
  prompt: string;
  explanation?: string | undefined;
  tags: string[];
  editorialStatus: QuestionEditorialStatus;
  version: number;
  source?: string | undefined;
  author?: string | undefined;
}

export interface AnswerPayload {
  accepted: string[];
  display: string;
}

export interface MultipleChoiceOption {
  id: string;
  label: string;
}

export interface KnowledgeGridQuestion extends BaseQuestion {
  kind: "knowledge-grid";
  value: 100 | 200 | 300 | 400 | 500;
  answer: AnswerPayload;
}

export interface ClueRaceQuestion extends BaseQuestion {
  kind: "clue-race";
  clues: string[];
  answer: AnswerPayload;
  pointsByClueIndex: number[];
}

export interface PressureChoiceQuestion extends BaseQuestion {
  kind: "pressure-choice";
  options: [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption];
  correctOptionId: string;
  timeLimitSeconds: number;
}

export type SynapseTaskKind = "sequence" | "analogy" | "ranking" | "memory" | "categorization";

export interface SynapseQuestion extends BaseQuestion {
  kind: "synapse";
  taskKind: SynapseTaskKind;
  items: string[];
  expectedOrder?: string[] | undefined;
  expectedPairs?: Array<{ left: string; right: string }> | undefined;
  expectedCategories?: Array<{ label: string; itemIds: string[] }> | undefined;
}

export interface ConnectionsQuestion extends BaseQuestion {
  kind: "connections";
  items: [string, string, string, string];
  connection: AnswerPayload;
}

export interface WagerQuestion extends BaseQuestion {
  kind: "wager";
  answer: AnswerPayload;
  minWager: number;
  maxWager: number;
}

export interface FinalConvergenceQuestion extends BaseQuestion {
  kind: "final-convergence";
  step: 1 | 2 | 3 | 4 | 5;
  answer: AnswerPayload;
  basePoints: number;
}

export type Question =
  | KnowledgeGridQuestion
  | ClueRaceQuestion
  | PressureChoiceQuestion
  | SynapseQuestion
  | ConnectionsQuestion
  | WagerQuestion
  | FinalConvergenceQuestion;

export interface QuestionBank {
  version: 1;
  questions: Question[];
}


