import { describe, expect, it } from "vitest";
import type { ClueRaceQuestion, GameConfig, Player, RoundDefinition, RoundState } from "../../core/types";
import {
  CLUE_RACE_POINTS,
  calculateClueRaceScore,
  clueRaceRound,
  isClueRaceComplete,
  pointsForClueIndex,
  revealNextClueInState,
  selectClueRaceQuestions,
  showAnswersInState,
  visibleClues,
} from "../../rounds/clue-race";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const round: RoundDefinition = {
  id: "clue-race",
  kind: "clue-race",
  label: "Course aux indices",
  description: "Indices progressifs.",
  questionTypes: ["progressive_clues"],
  questionCount: 5,
  maxScore: 2_500,
};

const config: GameConfig = {
  id: "clue-config",
  mode: "standard",
  seed: "clue-seed",
  playerMode: "trio", players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

function makeQuestion(id: string, correctOptionId = "a"): ClueRaceQuestion {
  return {
    id,
    kind: "clue-race",
    type: "progressive_clues",
    categoryId: "history",
    categoryLabel: "Histoire",
    subCategoryId: "france",
    subCategoryLabel: "France",
    difficulty: 3,
    prompt: `Enigme ${id}`,
    explanation: "Explication.",
    tags: ["test"],
    editorialStatus: "approved",
    version: 1,
    clues: ["Indice 1", "Indice 2", "Indice 3", "Indice 4", "Indice 5"],
    pointsByClueIndex: [500, 400, 300, 200, 100],
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    correctOptionId,
    answer: { accepted: ["a"], display: "A" },
  };
}

const questions = Array.from({ length: 6 }, (_, index) => makeQuestion(`clue-${index + 1}`));
const state: RoundState = {
  id: "clue-state",
  definitionId: "clue-race",
  status: "active",
  currentQuestionIndex: 0,
  selectedQuestionIds: [],
  answeredQuestionIds: [],
  answerResults: [],
  score: { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 },
  clueIndex: 0,
  answersVisible: false,
};

describe("clue-race", () => {
  it("associe cinq indices aux scores decroissants", () => {
    expect(CLUE_RACE_POINTS).toEqual([500, 400, 300, 200, 100]);
    expect(pointsForClueIndex(0)).toBe(500);
    expect(pointsForClueIndex(4)).toBe(100);
    expect(() => pointsForClueIndex(5)).toThrow("Indice invalide");
  });

  it("revele progressivement les indices", () => {
    const question = makeQuestion("clue-1");
    const second = revealNextClueInState(state);
    const third = revealNextClueInState(second);

    expect(visibleClues(question, state.clueIndex ?? 0)).toEqual(["Indice 1"]);
    expect(visibleClues(question, third.clueIndex ?? 0)).toEqual(["Indice 1", "Indice 2", "Indice 3"]);
    expect(third.answersVisible).toBe(false);
  });

  it("affiche les propositions uniquement sur demande", () => {
    expect(state.answersVisible).toBe(false);
    expect(showAnswersInState(state).answersVisible).toBe(true);
  });

  it("calcule le score selon l'indice courant sans penalite d'indice", () => {
    expect(calculateClueRaceScore({ question: makeQuestion("clue-1"), isCorrect: true, clueIndex: 2 }).total).toBe(300);
    expect(calculateClueRaceScore({ question: makeQuestion("clue-1"), isCorrect: false, clueIndex: 0 }).total).toBe(0);
  });

  it("selectionne cinq enigmes sans reprendre les questions deja utilisees", () => {
    const selected = selectClueRaceQuestions({ questions, alreadyUsedQuestionIds: ["clue-1"], seed: "seed", count: 5 });

    expect(selected).toHaveLength(5);
    expect(selected.map((question) => question.id)).not.toContain("clue-1");
  });

  it("termine la manche apres cinq enigmes", () => {
    expect(isClueRaceComplete({ answeredQuestionIds: ["a", "b", "c", "d"] }, config)).toBe(false);
    expect(isClueRaceComplete({ answeredQuestionIds: ["a", "b", "c", "d", "e"] }, config)).toBe(true);
  });

  it("respecte l'interface GameRound", () => {
    const initialized = clueRaceRound.initializeState(config);
    const result = clueRaceRound.handleAnswer({ ...initialized, answersVisible: true }, makeQuestion("clue-1"), "a", { now: 0 });

    expect(clueRaceRound.selectQuestions({ questions, alreadyUsedQuestionIds: [], recentlyPlayedQuestionIds: [], seed: "seed", config })).toHaveLength(5);
    expect(result.isCorrect).toBe(true);
    expect(clueRaceRound.calculateScore(result, { definition: round, state: initialized }).total).toBe(500);
    expect(clueRaceRound.summarize({ ...initialized, status: "complete", answeredQuestionIds: ["a", "b", "c", "d", "e"] }).isComplete).toBe(true);
    expect(clueRaceRound.restoreState(initialized)).toEqual(initialized);
  });
});