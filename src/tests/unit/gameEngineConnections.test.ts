import { describe, expect, it } from "vitest";
import type { ConnectionsQuestion, GameConfig, Player, Question, RoundDefinition } from "../../core/types";
import {
  applyJoker,
  awardJoker,
  createGame,
  loadQuestion,
  revealAnswer,
  revealNextConnectionItem,
  showConnectionAnswerOptions,
  startGame,
  startRound,
  submitAnswer,
} from "../../core/engine/gameEngine";
import { buildConnectionsQuestionSet } from "../../rounds/connections";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const round: RoundDefinition = {
  id: "connections",
  kind: "connections",
  label: "Connexions",
  description: "Lien commun.",
  questionTypes: ["connection"],
  questionCount: 5,
  maxScore: 2_500,
};

const config: GameConfig = {
  id: "connections-engine-config",
  mode: "standard",
  seed: "connections-engine-seed",
  players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

const questions: readonly ConnectionsQuestion[] = buildConnectionsQuestionSet(config.seed);

function activeConnectionsGame(questionId = questions[0]?.id ?? "missing") {
  const created = createGame({ config, now: 0 });
  const started = startGame(created, 1);
  const roundStarted = startRound(started, 0, 2);
  return loadQuestion(roundStarted, { questions, questionId, now: 3 });
}

function correctAnswer(questionId = questions[0]?.id ?? "missing"): string {
  const question = questions.find((candidate) => candidate.id === questionId);
  if (!question?.correctOptionId) {
    throw new Error("Question Connexions invalide.");
  }
  return question.correctOptionId;
}

describe("gameEngine connections", () => {
  it("charge une connexion avec un seul element et les reponses masquees", () => {
    const game = activeConnectionsGame();

    expect(game.status).toBe("question_active");
    expect(game.currentRoundState?.connectionItemIndex).toBe(0);
    expect(game.currentRoundState?.answersVisible).toBe(false);
    expect(() => submitAnswer(game, { answer: correctAnswer(), now: 4 })).toThrow("propositions");
  });

  it("score une bonne reponse apres deux elements affiches", () => {
    const game = activeConnectionsGame();
    const secondItem = revealNextConnectionItem(game, 4);
    const answering = showConnectionAnswerOptions(secondItem, 5);
    const locked = submitAnswer(answering, { answer: correctAnswer(), now: 6 });
    const revealed = revealAnswer(locked, { questions, now: 7 });

    expect(answering.currentRoundState?.connectionItemIndex).toBe(1);
    expect(revealed.lastAnswerResult?.score.total).toBe(400);
    expect(revealed.currentRoundState?.answeredQuestionIds).toContain(questions[0]?.id);
  });

  it("autorise le 50/50 seulement apres affichage des propositions", () => {
    const game = activeConnectionsGame();

    expect(() => applyJoker(game, { joker: "fifty_fifty", questions, now: 4 })).toThrow("affichage des reponses");

    const answering = showConnectionAnswerOptions(game, 5);
    const withJoker = applyJoker(answering, { joker: "fifty_fifty", questions, now: 6 });

    expect(withJoker.jokerEffects.eliminatedOptionIds).toHaveLength(2);
    expect(withJoker.jokerEffects.eliminatedOptionIds).not.toContain(correctAnswer());
  });

  it("autorise indice contextuel et deuxieme chance", () => {
    const base = showConnectionAnswerOptions(activeConnectionsGame(), 4);
    const withHint = applyJoker(awardJoker(base, "contextual_hint", 5), { joker: "contextual_hint", questions, now: 6 });
    const withSecondChance = applyJoker(showConnectionAnswerOptions(activeConnectionsGame(), 4), { joker: "second_chance", questions, now: 5 });

    expect(withHint.jokerEffects.contextualHint).toBeDefined();
    expect(withSecondChance.jokerEffects.secondChanceActive).toBe(true);
  });

  it("interdit les jokers non compatibles", () => {
    const game = showConnectionAnswerOptions(activeConnectionsGame(), 4);
    const withChange = awardJoker(game, "change_question", 5);
    const withVote = awardJoker(game, "team_vote", 5);

    expect(() => applyJoker(game, "extra_time", 5)).toThrow("interdit");
    expect(() => applyJoker(withChange, { joker: "change_question", questions: questions as readonly Question[], now: 6 })).toThrow("interdit");
    expect(() => applyJoker(withVote, { joker: "team_vote", questions: questions as readonly Question[], now: 6 })).toThrow("interdit");
  });

  it("permet une seconde chance a demi-score apres une erreur", () => {
    const answering = applyJoker(showConnectionAnswerOptions(activeConnectionsGame(), 4), { joker: "second_chance", questions, now: 5 });
    const retry = revealAnswer(submitAnswer(answering, { answer: "b", now: 6 }), { questions, now: 7 });
    const revealed = revealAnswer(submitAnswer(retry, { answer: correctAnswer(), now: 8 }), { questions, now: 9 });

    expect(retry.status).toBe("question_active");
    expect(revealed.lastAnswerResult?.isCorrect).toBe(true);
    expect(revealed.lastAnswerResult?.score.total).toBe(250);
  });
});
