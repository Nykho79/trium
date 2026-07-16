import type { GameConfig, KnowledgeGridQuestion, QuestionId, RoundState, ScoreBreakdown } from "../../core/types";
import { shuffleWithSeed } from "../../core/engine/random";

export const KNOWLEDGE_GRID_CATEGORY_COUNT = 5;
export const KNOWLEDGE_GRID_DEFAULT_QUESTION_COUNT = 8;
export const KNOWLEDGE_GRID_DEFAULT_DIFFICULTIES = [1, 2, 3, 4] as const;
export const KNOWLEDGE_GRID_EXTENDED_DIFFICULTIES = [1, 2, 3, 4, 5] as const;

export type KnowledgeGridDifficulty = 1 | 2 | 3 | 4 | 5;
export type KnowledgeGridValue = 100 | 200 | 300 | 400 | 500;

export interface KnowledgeGridCell {
  id: string;
  categoryId: string;
  categoryLabel: string;
  difficulty: KnowledgeGridDifficulty;
  value: KnowledgeGridValue;
  questionId?: QuestionId | undefined;
  isAvailable: boolean;
  isPlayed: boolean;
}

export interface KnowledgeGridColumn {
  categoryId: string;
  categoryLabel: string;
  cells: KnowledgeGridCell[];
}

export interface KnowledgeGridBoard {
  columns: KnowledgeGridColumn[];
  questionCount: number;
  playedCount: number;
}

export interface KnowledgeGridState extends RoundState {
  board: KnowledgeGridBoard;
  unavailableSelections: string[];
}

export interface KnowledgeGridScoreInput {
  question: KnowledgeGridQuestion;
  isCorrect: boolean;
  answeredInMs: number;
  timeLimitMs: number;
  currentCorrectStreak: number;
}

export interface BuildKnowledgeGridInput {
  questions: readonly KnowledgeGridQuestion[];
  usedQuestionIds: readonly QuestionId[];
  seed: string;
  includeDifficultyFive?: boolean | undefined;
}

export class KnowledgeGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeGridError";
  }
}

const emptyScore: ScoreBreakdown = {
  basePoints: 0,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total: 0,
};

export function valueForDifficulty(difficulty: KnowledgeGridDifficulty): KnowledgeGridValue {
  return (difficulty * 100) as KnowledgeGridValue;
}

function difficultySet(includeDifficultyFive: boolean): readonly KnowledgeGridDifficulty[] {
  return includeDifficultyFive ? KNOWLEDGE_GRID_EXTENDED_DIFFICULTIES : KNOWLEDGE_GRID_DEFAULT_DIFFICULTIES;
}

function uniqueCategories(questions: readonly KnowledgeGridQuestion[]): Array<{ id: string; label: string; coverage: number }> {
  const categories = new Map<string, { id: string; label: string; coverage: number }>();
  for (const question of questions) {
    const existing = categories.get(question.categoryId);
    categories.set(question.categoryId, {
      id: question.categoryId,
      label: question.categoryLabel,
      coverage: (existing?.coverage ?? 0) + 1,
    });
  }
  return [...categories.values()].sort((left, right) => right.coverage - left.coverage || left.label.localeCompare(right.label, "fr-FR"));
}

function questionForCell(input: {
  questions: readonly KnowledgeGridQuestion[];
  categoryId: string;
  difficulty: KnowledgeGridDifficulty;
  usedQuestionIds: readonly QuestionId[];
  seed: string;
}): KnowledgeGridQuestion | undefined {
  const used = new Set(input.usedQuestionIds);
  const candidates = input.questions.filter((question) => (
    question.categoryId === input.categoryId
    && question.difficulty === input.difficulty
    && !used.has(question.id)
  ));
  return shuffleWithSeed(candidates, `${input.seed}:${input.categoryId}:${input.difficulty}`)[0];
}

export function buildKnowledgeGrid(input: BuildKnowledgeGridInput): KnowledgeGridBoard {
  const categories = uniqueCategories(input.questions).slice(0, KNOWLEDGE_GRID_CATEGORY_COUNT);
  while (categories.length < KNOWLEDGE_GRID_CATEGORY_COUNT) {
    const index = categories.length + 1;
    categories.push({ id: `empty-${index}`, label: `Catégorie ${index}`, coverage: 0 });
  }
  const difficulties = difficultySet(input.includeDifficultyFive === true);
  const columns = categories.map((category) => ({
    categoryId: category.id,
    categoryLabel: category.label,
    cells: difficulties.map((difficulty) => {
      const question = questionForCell({
        questions: input.questions,
        categoryId: category.id,
        difficulty,
        usedQuestionIds: input.usedQuestionIds,
        seed: input.seed,
      });
      const isPlayed = question ? input.usedQuestionIds.includes(question.id) : false;
      return {
        id: `${category.id}:${difficulty}`,
        categoryId: category.id,
        categoryLabel: category.label,
        difficulty,
        value: valueForDifficulty(difficulty),
        questionId: question?.id,
        isAvailable: question !== undefined && !isPlayed,
        isPlayed,
      } satisfies KnowledgeGridCell;
    }),
  }));

  return {
    columns,
    questionCount: columns.reduce((total, column) => total + column.cells.filter((cell) => cell.questionId !== undefined).length, 0),
    playedCount: columns.reduce((total, column) => total + column.cells.filter((cell) => cell.isPlayed).length, 0),
  };
}

export function findKnowledgeGridCell(board: KnowledgeGridBoard, cellId: string): KnowledgeGridCell {
  const cell = board.columns.flatMap((column) => column.cells).find((candidate) => candidate.id === cellId);
  if (!cell) {
    throw new KnowledgeGridError(`Case introuvable: ${cellId}.`);
  }
  return cell;
}

export function selectKnowledgeGridQuestion(board: KnowledgeGridBoard, cellId: string): QuestionId {
  const cell = findKnowledgeGridCell(board, cellId);
  if (cell.isPlayed) {
    throw new KnowledgeGridError("Cette case a deja ete jouee.");
  }
  if (!cell.isAvailable || cell.questionId === undefined) {
    throw new KnowledgeGridError("Aucune question disponible pour cette categorie et cette difficulte.");
  }
  return cell.questionId;
}

export function markKnowledgeGridCellPlayed(board: KnowledgeGridBoard, questionId: QuestionId): KnowledgeGridBoard {
  return {
    ...board,
    playedCount: board.playedCount + 1,
    columns: board.columns.map((column) => ({
      ...column,
      cells: column.cells.map((cell) => cell.questionId === questionId ? { ...cell, isAvailable: false, isPlayed: true } : cell),
    })),
  };
}

export function calculateKnowledgeGridScore(input: KnowledgeGridScoreInput): ScoreBreakdown {
  if (!input.isCorrect) {
    return { ...emptyScore };
  }
  const basePoints = input.question.value ?? valueForDifficulty(input.question.difficulty);
  const timeBonus = input.answeredInMs <= input.timeLimitMs / 2 ? Math.round(basePoints * 0.2) : 0;
  const nextStreak = input.currentCorrectStreak + 1;
  const streakBonus = nextStreak > 0 && nextStreak % 3 === 0 ? 100 : 0;
  return {
    basePoints,
    timeBonus,
    streakBonus,
    jokerPenalty: 0,
    wagerDelta: 0,
    total: basePoints + timeBonus + streakBonus,
  };
}

export function isKnowledgeGridComplete(state: Pick<RoundState, "answeredQuestionIds">, config: GameConfig): boolean {
  const definition = config.rounds.find((round) => round.kind === "knowledge-grid");
  const target = definition?.questionCount ?? KNOWLEDGE_GRID_DEFAULT_QUESTION_COUNT;
  return state.answeredQuestionIds.length >= target;
}

export function createKnowledgeGridRoundState(input: {
  config: GameConfig;
  questions: readonly KnowledgeGridQuestion[];
  usedQuestionIds: readonly QuestionId[];
  seed: string;
  includeDifficultyFive?: boolean | undefined;
}): KnowledgeGridState {
  const definition = input.config.rounds.find((round) => round.kind === "knowledge-grid");
  return {
    id: "knowledge-grid-state",
    definitionId: definition?.id ?? "knowledge-grid",
    status: "active",
    currentQuestionIndex: 0,
    selectedQuestionIds: [],
    answeredQuestionIds: [],
    answerResults: [],
    score: { ...emptyScore },
    board: buildKnowledgeGrid({
      questions: input.questions,
      usedQuestionIds: input.usedQuestionIds,
      seed: input.seed,
      includeDifficultyFive: input.includeDifficultyFive,
    }),
    unavailableSelections: [],
  };
}

