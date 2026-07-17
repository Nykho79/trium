import { describe, expect, it } from "vitest";
import type { GameConfig, KnowledgeGridQuestion, Player, RoundDefinition } from "../../core/types";
import { createGame, loadQuestion, revealAnswer, startGame, startRound, submitAnswer } from "../../core/engine/gameEngine";
import {
  buildKnowledgeGrid,
  calculateKnowledgeGridScore,
  isKnowledgeGridComplete,
  selectKnowledgeGridQuestion,
} from "../../rounds/knowledge-grid";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const round: RoundDefinition = {
  id: "knowledge-grid",
  kind: "knowledge-grid",
  label: "Grille des savoirs",
  description: "Choix libre de categories et de valeurs.",
  questionTypes: ["multiple_choice"],
  questionCount: 8,
  maxScore: 4_100,
};

const config: GameConfig = {
  id: "grid-test",
  mode: "standard",
  seed: "grid-seed",
  playerMode: "trio", players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

function makeQuestion(categoryIndex: number, difficulty: 1 | 2 | 3 | 4 | 5): KnowledgeGridQuestion {
  return {
    id: `kg-${categoryIndex}-${difficulty}`,
    kind: "knowledge-grid",
    type: "multiple_choice",
    categoryId: `category-${categoryIndex}`,
    categoryLabel: `Categorie ${categoryIndex}`,
    subCategoryId: `subcategory-${categoryIndex}`,
    subCategoryLabel: `Sous-categorie ${categoryIndex}`,
    difficulty,
    prompt: `Question ${categoryIndex}-${difficulty}`,
    explanation: "Explication test.",
    tags: ["test"],
    editorialStatus: "approved",
    version: 1,
    value: (difficulty * 100) as KnowledgeGridQuestion["value"],
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    correctOptionId: "a",
    answer: { accepted: ["a"], display: "A" },
    timeLimitSeconds: 30,
  };
}

const questions = Array.from({ length: 5 }, (_, categoryIndex) => [1, 2, 3, 4].map((difficulty) => makeQuestion(categoryIndex + 1, difficulty as 1 | 2 | 3 | 4))).flat();

function startGridGame(questionId = "kg-1-1") {
  const created = createGame({ config, now: 0 });
  const started = startGame(created, 1);
  const roundStarted = startRound(started, 0, 2);
  return loadQuestion(roundStarted, { questions, questionId, now: 3 });
}

describe("knowledge-grid", () => {
  it("selectionne la question d'une case disponible", () => {
    const board = buildKnowledgeGrid({ questions, usedQuestionIds: [], seed: "grid" });

    expect(selectKnowledgeGridQuestion(board, "category-1:1")).toBe("kg-1-1");
    expect(board.columns).toHaveLength(5);
    expect(board.columns[0]?.cells).toHaveLength(4);
  });


  it("evite une question recente quand une alternative existe pour la meme case", () => {
    const recent = makeQuestion(1, 1);
    const fresh = { ...recent, id: "kg-1-1-fresh", prompt: "Question alternative" };
    const board = buildKnowledgeGrid({
      questions: [recent, fresh, ...questions.filter((question) => question.id !== recent.id)],
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: [recent.id],
      seed: "grid",
    });

    expect(selectKnowledgeGridQuestion(board, "category-1:1")).toBe(fresh.id);
  });
  it("rejette une case deja jouee", () => {
    const board = buildKnowledgeGrid({ questions, usedQuestionIds: ["kg-1-1"], seed: "grid" });

    expect(() => selectKnowledgeGridQuestion(board, "category-1:1")).toThrow("Aucune question disponible");
  });

  it("calcule la valeur, le bonus de rapidite et la serie de trois bonnes reponses", () => {
    const score = calculateKnowledgeGridScore({
      question: makeQuestion(1, 3),
      isCorrect: true,
      answeredInMs: 10_000,
      timeLimitMs: 30_000,
      currentCorrectStreak: 2,
    });

    expect(score.basePoints).toBe(300);
    expect(score.timeBonus).toBe(60);
    expect(score.streakBonus).toBe(100);
    expect(score.total).toBe(460);
    expect(calculateKnowledgeGridScore({ question: makeQuestion(1, 3), isCorrect: false, answeredInMs: 1_000, timeLimitMs: 30_000, currentCorrectStreak: 2 }).total).toBe(0);
  });

  it("termine la manche apres huit questions", () => {
    expect(isKnowledgeGridComplete({ answeredQuestionIds: questions.slice(0, 7).map((question) => question.id) }, config)).toBe(false);
    expect(isKnowledgeGridComplete({ answeredQuestionIds: questions.slice(0, 8).map((question) => question.id) }, config)).toBe(true);
  });

  it("change le capitaine apres chaque question chargee", () => {
    const first = startGridGame("kg-1-1");
    const firstReveal = revealAnswer(submitAnswer(first, { answer: "a", now: 4 }), { questions, now: 5 });
    const second = loadQuestion(firstReveal, { questions, questionId: "kg-1-2", now: 6 });

    expect(first.captainPlayerId).toBe("player-1");
    expect(second.captainPlayerId).toBe("player-2");
  });

  it("signale l'absence de question dans une categorie", () => {
    const board = buildKnowledgeGrid({ questions: questions.filter((question) => question.categoryId !== "category-5"), usedQuestionIds: [], seed: "grid" });

    expect(() => selectKnowledgeGridQuestion(board, "empty-5:1")).toThrow("Aucune question disponible");
  });
});
