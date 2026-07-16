import { describe, expect, it } from "vitest";
import type { GameConfig, Player, RoundDefinition } from "../../core/types";
import {
  buildConnectionsQuestionSet,
  calculateConnectionsScore,
  connectionsRound,
  isConnectionsComplete,
  pointsForConnectionItemIndex,
  revealNextConnectionItemInState,
  selectConnectionsQuestions,
  showConnectionAnswersInState,
  visibleConnectionItems,
} from "../../rounds/connections";

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
  id: "connections-config",
  mode: "standard",
  seed: "connections-seed",
  playerMode: "trio", players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

describe("connections round", () => {
  it("genere cinq connexions deterministes", () => {
    const first = buildConnectionsQuestionSet("conn-seed");
    const second = buildConnectionsQuestionSet("conn-seed");

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first[0]?.options).toHaveLength(4);
    expect(first[0]?.correctOptionId).toBe("a");
  });

  it("revele les elements progressivement", () => {
    const question = buildConnectionsQuestionSet("conn-visible")[0];
    if (!question) throw new Error("Question Connexions manquante.");

    expect(visibleConnectionItems(question, 0)).toHaveLength(1);
    expect(visibleConnectionItems(question, 2)).toHaveLength(3);
    expect(visibleConnectionItems(question, 3)).toHaveLength(4);
  });

  it("applique le barÃ¨me selon le nombre d'elements affiches", () => {
    expect(pointsForConnectionItemIndex(0)).toBe(500);
    expect(pointsForConnectionItemIndex(1)).toBe(400);
    expect(pointsForConnectionItemIndex(2)).toBe(250);
    expect(pointsForConnectionItemIndex(3)).toBe(150);
    expect(() => pointsForConnectionItemIndex(4)).toThrow("invalide");
  });

  it("calcule un score sans penalite sur erreur", () => {
    expect(calculateConnectionsScore({ isCorrect: true, itemIndex: 1 }).total).toBe(400);
    expect(calculateConnectionsScore({ isCorrect: false, itemIndex: 1 }).total).toBe(0);
  });

  it("met a jour l'etat de revelation et d'affichage des propositions", () => {
    const state = connectionsRound.initializeState(config);
    const secondItem = revealNextConnectionItemInState(state);
    const answering = showConnectionAnswersInState(secondItem);

    expect(secondItem.connectionItemIndex).toBe(1);
    expect(secondItem.answersVisible).toBe(false);
    expect(answering.answersVisible).toBe(true);
  });

  it("selectionne sans reprendre les questions deja utilisees", () => {
    const questions = buildConnectionsQuestionSet("conn-select");
    const first = questions[0];
    if (!first) throw new Error("Question Connexions manquante.");

    const selected = selectConnectionsQuestions({ questions, alreadyUsedQuestionIds: [first.id], seed: "conn-select", count: 5 });

    expect(selected).toHaveLength(4);
    expect(selected.map((question) => question.id)).not.toContain(first.id);
  });

  it("respecte l'interface commune GameRound", () => {
    const state = connectionsRound.initializeState(config);
    const question = buildConnectionsQuestionSet("conn-round")[0];
    if (!question) throw new Error("Question Connexions manquante.");

    const result = connectionsRound.handleAnswer(state, question, question.correctOptionId ?? question.answer.display, { now: 0 });

    expect(result.isCorrect).toBe(true);
    expect(result.score.total).toBe(500);
    expect(isConnectionsComplete({ answeredQuestionIds: ["a", "b", "c", "d", "e"] }, config)).toBe(true);
  });
});
