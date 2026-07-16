import { describe, expect, it } from "vitest";
import type { ClueRaceQuestion, GameConfig, Player, RoundDefinition } from "../../core/types";
import {
  applyJoker,
  createGame,
  loadQuestion,
  revealAnswer,
  revealNextClue,
  showClueRaceAnswers,
  startGame,
  startRound,
  submitAnswer,
} from "../../core/engine/gameEngine";

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
  id: "clue-engine-config",
  mode: "standard",
  seed: "clue-engine-seed",
  players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

function makeQuestion(id: string): ClueRaceQuestion {
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
    correctOptionId: "a",
    answer: { accepted: ["a"], display: "A" },
  };
}

const questions = Array.from({ length: 6 }, (_, index) => makeQuestion(`clue-${index + 1}`));

function activeClueGame(questionId = "clue-1") {
  const created = createGame({ config, now: 0 });
  const started = startGame(created, 1);
  const roundStarted = startRound(started, 0, 2);
  return loadQuestion(roundStarted, { questions, questionId, now: 3 });
}

describe("gameEngine clue-race", () => {
  it("charge une enigme avec le premier indice masque des reponses", () => {
    const game = activeClueGame();

    expect(game.status).toBe("question_active");
    expect(game.currentRoundState?.clueIndex).toBe(0);
    expect(game.currentRoundState?.answersVisible).toBe(false);
    expect(() => submitAnswer(game, { answer: "a", now: 4 })).toThrow("propositions");
  });

  it("revele des indices puis score selon l'indice courant", () => {
    const game = activeClueGame();
    const secondClue = revealNextClue(game, 4);
    const thirdClue = revealNextClue(secondClue, 5);
    const answering = showClueRaceAnswers(thirdClue, 6);
    const locked = submitAnswer(answering, { answer: "a", now: 7 });
    const revealed = revealAnswer(locked, { questions, now: 8 });

    expect(answering.currentRoundState?.clueIndex).toBe(2);
    expect(revealed.lastAnswerResult?.score.total).toBe(300);
    expect(revealed.currentRoundState?.answeredQuestionIds).toContain("clue-1");
  });

  it("termine l'enigme sur une erreur sans penalite", () => {
    const answering = showClueRaceAnswers(activeClueGame(), 4);
    const revealed = revealAnswer(submitAnswer(answering, { answer: "b", now: 5 }), { questions, now: 6 });

    expect(revealed.status).toBe("answer_reveal");
    expect(revealed.lastAnswerResult?.isCorrect).toBe(false);
    expect(revealed.lastAnswerResult?.score.total).toBe(0);
  });

  it("change le capitaine a chaque enigme", () => {
    const first = activeClueGame("clue-1");
    const firstReveal = revealAnswer(submitAnswer(showClueRaceAnswers(first, 4), { answer: "a", now: 5 }), { questions, now: 6 });
    const second = loadQuestion(firstReveal, { questions, questionId: "clue-2", now: 7 });

    expect(first.captainPlayerId).toBe("player-1");
    expect(second.captainPlayerId).toBe("player-2");
  });

  it("autorise extra_time pendant la manche", () => {
    const game = activeClueGame();
    const extended = applyJoker(game, "extra_time", 4);

    expect((extended.timer?.expiresAt ?? 0) - (game.timer?.expiresAt ?? 0)).toBe(20_000);
  });

  it("autorise 50/50 seulement apres affichage des propositions", () => {
    const game = activeClueGame();
    expect(() => applyJoker(game, { joker: "fifty_fifty", questions, now: 4 })).toThrow("affichage des reponses");

    const answering = showClueRaceAnswers(game, 5);
    const withJoker = applyJoker(answering, { joker: "fifty_fifty", questions, now: 6 });

    expect(withJoker.jokerEffects.eliminatedOptionIds).toHaveLength(2);
    expect(withJoker.jokerEffects.eliminatedOptionIds).not.toContain("a");
  });
});