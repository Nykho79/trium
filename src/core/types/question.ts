import type { CategoryId, Difficulty, QuestionId, RoundKind } from "./game";

export type QuestionEditorialStatus = "draft" | "review" | "approved" | "rejected";
export type QuestionType =
  | "multiple_choice"
  | "progressive_clues"
  | "connection"
  | "chronology"
  | "analogy"
  | "memory"
  | "sequence"
  | "intruder"
  | "visual_matrix"
  | "symbol_rule";

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

export type FourOptions = [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption];

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple_choice";
  options: FourOptions;
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
  options?: FourOptions | undefined;
  correctOptionId?: string | undefined;
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
  options?: FourOptions | undefined;
  correctOptionId?: string | undefined;
}

export interface AnalogyQuestion extends BaseQuestion {
  type: "analogy";
  left: string;
  right: string;
  relation: string;
  missing: string;
  options?: FourOptions | undefined;
  correctOptionId?: string | undefined;
  answer: AnswerPayload;
}

export interface MemoryQuestion extends BaseQuestion {
  type: "memory";
  items: string[];
  recallPrompt: string;
  mode?: "forward" | "reverse" | undefined;
  displaySeconds?: number | undefined;
  options?: FourOptions | undefined;
  correctOptionId?: string | undefined;
  answer: AnswerPayload;
}

export interface SequenceQuestion extends BaseQuestion {
  type: "sequence";
  items: string[];
  correctOrder?: string[] | undefined;
  nextItem?: string | undefined;
  options?: FourOptions | undefined;
  correctOptionId?: string | undefined;
  answer: AnswerPayload;
}

export interface IntruderQuestion extends BaseQuestion {
  type: "intruder";
  items: FourOptions;
  correctOptionId: string;
  answer: AnswerPayload;
}

export interface VisualMatrixQuestion extends BaseQuestion {
  type: "visual_matrix";
  grid: [string, string, string, string, string, string, string, string, string];
  missingIndex: number;
  options: FourOptions;
  correctOptionId: string;
  ruleLabel: string;
  answer: AnswerPayload;
}

export interface SymbolRuleQuestion extends BaseQuestion {
  type: "symbol_rule";
  rule: string;
  examples: [string, string, string];
  options: FourOptions;
  correctOptionId: string;
  answer: AnswerPayload;
}

export type Question =
  | MultipleChoiceQuestion
  | ProgressiveCluesQuestion
  | ConnectionQuestion
  | ChronologyQuestion
  | AnalogyQuestion
  | MemoryQuestion
  | SequenceQuestion
  | IntruderQuestion
  | VisualMatrixQuestion
  | SymbolRuleQuestion;

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

export type SynapseQuestion = (
  | ChronologyQuestion
  | AnalogyQuestion
  | MemoryQuestion
  | SequenceQuestion
  | IntruderQuestion
  | VisualMatrixQuestion
  | SymbolRuleQuestion
) & {
  kind: "synapse";
};

export interface QuestionBank {
  version: 1;
  questions: Question[];
}
