import type { CategoryId, Difficulty, QuestionId, RoundKind } from "./game";

export type QuestionEditorialStatus = "draft" | "review" | "approved" | "rejected";
export type QuestionType =
  | "multiple_choice"
  | "progressive_clues"
  | "connection"
  | "chronology"
  | "analogy"
  | "memory"
  | "sequence";

export interface BaseQuestion {
  id: QuestionId;
  kind: RoundKind;
  type: QuestionType;
  categoryId: CategoryId;
  categoryLabel: string;
  subCategoryId: string;
  subCategoryLabel: string;
  difficulty: Difficulty;
  prompt: string;
  explanation?: string | undefined;
  contextualHint?: string | undefined;
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

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple_choice";
  options: [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption];
  correctOptionId: string;
  answer?: AnswerPayload | undefined;
  timeLimitSeconds?: number | undefined;
  value?: 100 | 200 | 300 | 400 | 500 | undefined;
}

export interface ProgressiveCluesQuestion extends BaseQuestion {
  type: "progressive_clues";
  clues: string[];
  answer: AnswerPayload;
  pointsByClueIndex: number[];
}

export interface ConnectionQuestion extends BaseQuestion {
  type: "connection";
  items: [string, string, string, string];
  answer: AnswerPayload;
}

export interface ChronologyItem {
  id: string;
  label: string;
}

export interface ChronologyQuestion extends BaseQuestion {
  type: "chronology";
  items: ChronologyItem[];
  correctOrderIds: string[];
}

export interface AnalogyQuestion extends BaseQuestion {
  type: "analogy";
  left: string;
  right: string;
  relation: string;
  missing: string;
  options?: [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption] | undefined;
  answer: AnswerPayload;
}

export interface MemoryQuestion extends BaseQuestion {
  type: "memory";
  items: string[];
  recallPrompt: string;
  answer: AnswerPayload;
}

export interface SequenceQuestion extends BaseQuestion {
  type: "sequence";
  items: string[];
  correctOrder?: string[] | undefined;
  nextItem?: string | undefined;
  answer: AnswerPayload;
}

export type Question =
  | MultipleChoiceQuestion
  | ProgressiveCluesQuestion
  | ConnectionQuestion
  | ChronologyQuestion
  | AnalogyQuestion
  | MemoryQuestion
  | SequenceQuestion;

export type KnowledgeGridQuestion = MultipleChoiceQuestion & {
  kind: "knowledge-grid";
  value: 100 | 200 | 300 | 400 | 500;
};

export type PressureChoiceQuestion = MultipleChoiceQuestion & {
  kind: "pressure-choice";
  timeLimitSeconds: number;
};

export type ClueRaceQuestion = ProgressiveCluesQuestion & {
  kind: "clue-race";
};

export type ConnectionsQuestion = ConnectionQuestion & {
  kind: "connections";
};

export interface QuestionBank {
  version: 1;
  questions: Question[];
}
