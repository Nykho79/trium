import { describe, expect, it } from "vitest";
import type { GameConfig, Player, RoundDefinition, SynapseQuestion } from "../../core/types";
import {
  applyJoker,
  awardJoker,
  createGame,
  loadQuestion,
  revealAnswer,
  startGame,
  startRound,
  submitAnswer,
} from "../../core/engine/gameEngine";
import { buildSynapseQuestionSet, correctSynapseOptionId } from "../../rounds/synapse";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const round: RoundDefinition = {
  id: "synapse",
  kind: "synapse",
  label: "Synapse",
  description: "Mini-epreuves.",
  questionTypes: ["chronology", "analogy", "memory", "sequence", "intruder", "visual_matrix", "symbol_rule"],
  questionCount: 6,
  maxScore: 1_680,
};

const config: GameConfig = {
  id: "synapse-engine-config",
  mode: "standard",
  seed: "synapse-engine-seed",
  playerMode: "trio", players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

const questions = buildSynapseQuestionSet(config.seed) as readonly SynapseQuestion[];

function activeSynapseGame(question = questions[0]) {
  if (!question) {
    throw new Error("Question Synapse manquante.");
  }
  const created = createGame({ config, now: 0 });
  const intro = startRound(startGame(created, 1), 0, 2);
  return loadQuestion(intro, { questions, questionId: question.id, now: 3 });
}

describe("gameEngine Synapse", () => {
  it("compte une reponse correcte une seule fois", () => {
    const question = questions[0];
    if (!question) throw new Error("Question Synapse manquante.");
    const correctAnswer = correctSynapseOptionId(question);
    if (!correctAnswer) throw new Error("Option correcte manquante.");

    const locked = submitAnswer(activeSynapseGame(question), { answer: correctAnswer, now: 4 });
    const revealed = revealAnswer(locked, { questions, now: 5 });

    expect(revealed.lastAnswerResult?.isCorrect).toBe(true);
    expect(revealed.lastAnswerResult?.score.total).toBeGreaterThan(0);
    expect(() => revealAnswer(revealed, { questions, now: 6 })).toThrow("answer_reveal");
  });

  it("interdit les jokers non autorises dans Synapse", () => {
    const game = activeSynapseGame();

    expect(() => applyJoker(game, { joker: "fifty_fifty", questions, now: 4 })).toThrow("interdit");
    expect(() => applyJoker(awardJoker(game, "team_vote", 4), { joker: "team_vote", questions, now: 5 })).toThrow("interdit");
  });

  it("autorise le temps supplementaire et la seconde chance", () => {
    const game = activeSynapseGame();
    const withTime = applyJoker(game, { joker: "extra_time", questions, now: 4 });
    const withSecondChance = applyJoker(activeSynapseGame(), { joker: "second_chance", questions, now: 4 });

    expect((withTime.timer?.expiresAt ?? 0) - (game.timer?.expiresAt ?? 0)).toBe(20_000);
    expect(withSecondChance.jokerEffects.secondChanceActive).toBe(true);
  });

  it("reserve l'indice contextuel aux analogies et suites", () => {
    const eligible = questions.find((question) => question.type === "analogy" || question.type === "sequence");
    const forbidden = questions.find((question) => question.type !== "analogy" && question.type !== "sequence");
    if (!eligible || !forbidden) throw new Error("Jeu Synapse insuffisant pour tester les indices.");

    const hinted = applyJoker(awardJoker(activeSynapseGame(eligible), "contextual_hint", 4), { joker: "contextual_hint", questions, now: 5 });
    expect(hinted.jokerEffects.contextualHint).toBeDefined();

    expect(() => applyJoker(awardJoker(activeSynapseGame(forbidden), "contextual_hint", 4), { joker: "contextual_hint", questions, now: 5 })).toThrow("reserve");
  });
});
