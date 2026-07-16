import { describe, expect, it } from "vitest";
import type { GameConfig, Player, RoundDefinition, ScoreBreakdown } from "../../core/types";
import {
  createGame,
  loadQuestion,
  purchaseFinalAdvantage,
  revealAnswer,
  startGame,
  startRound,
  submitAnswer,
  activateFinalConvergenceHint,
} from "../../core/engine/gameEngine";
import { buildFinalConvergenceQuestionSet, type FinalConvergenceQuestion } from "../../rounds/final-convergence";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const round: RoundDefinition = {
  id: "final-convergence",
  kind: "final-convergence",
  label: "Convergence finale",
  description: "Finale en cinq etapes.",
  questionTypes: ["multiple_choice", "progressive_clues", "connection", "memory", "analogy", "chronology", "sequence"],
  questionCount: 5,
  maxScore: 5_000,
};

const score = (total: number): ScoreBreakdown => ({ basePoints: total, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total });

const config: GameConfig = {
  id: "final-engine-config",
  mode: "standard",
  seed: "final-engine-seed",
  playerMode: "trio", players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

const questions: readonly FinalConvergenceQuestion[] = buildFinalConvergenceQuestionSet(config.seed);

function roundIntroGame(totalScore = 2_000) {
  const created = createGame({ config, now: 0 });
  const started = startGame(created, 1);
  return { ...startRound(started, 0, 2), score: score(totalScore) };
}

describe("gameEngine final convergence", () => {
  it("achete un avantage une seule fois et retire son cout", () => {
    const game = purchaseFinalAdvantage(roundIntroGame(1_000), { advantageId: "extra_time", now: 3 });

    expect(game.score.total).toBe(700);
    expect(game.currentRoundState?.finalPurchasedAdvantageIds).toContain("extra_time");
    expect(() => purchaseFinalAdvantage(game, { advantageId: "extra_time", now: 4 })).toThrow("deja achete");
  });

  it("refuse un avantage trop cher", () => {
    expect(() => purchaseFinalAdvantage(roundIntroGame(200), { advantageId: "error_protection", now: 3 })).toThrow("Score insuffisant");
  });

  it("charge les etapes dans l'ordre et applique les avantages automatiques", () => {
    const withTime = purchaseFinalAdvantage(roundIntroGame(2_000), { advantageId: "extra_time", now: 3 });
    const withRemove = purchaseFinalAdvantage(withTime, { advantageId: "remove_wrong_answer", now: 4 });
    const loaded = loadQuestion(withRemove, { questions, now: 10 });

    expect(loaded.activeQuestionId).toBe("final-culture-louvre");
    expect((loaded.timer?.expiresAt ?? 0) - (loaded.timer?.startedAt ?? 0)).toBe(50_000);
    expect(loaded.jokerEffects.eliminatedOptionIds).toHaveLength(1);
    expect(loaded.currentRoundState?.finalUsedAdvantageIds).toEqual(["extra_time", "remove_wrong_answer"]);
  });

  it("utilise l'indice supplementaire sur une etape compatible", () => {
    const bought = purchaseFinalAdvantage(roundIntroGame(2_000), { advantageId: "extra_hint", now: 3 });
    const first = loadQuestion(bought, { questions, questionId: "final-clues-volcan", now: 4 });
    const hinted = activateFinalConvergenceHint(first, questions, 5);

    expect(hinted.jokerEffects.contextualHint).toContain("plaques");
    expect(hinted.currentRoundState?.finalUsedAdvantageIds).toContain("extra_hint");
  });

  it("declenche une deuxieme chance de finale avant le comptage", () => {
    const bought = purchaseFinalAdvantage(roundIntroGame(2_000), { advantageId: "second_chance", now: 3 });
    const loaded = loadQuestion(bought, { questions, now: 4 });
    const retried = revealAnswer(submitAnswer(loaded, { answer: "b", now: 5 }), { questions, now: 6 });

    expect(retried.status).toBe("question_active");
    expect(retried.currentRoundState?.answeredQuestionIds).toHaveLength(0);
    expect(retried.currentRoundState?.finalUsedAdvantageIds).toContain("second_chance");
  });

  it("transforme une erreur protegee en reussite", () => {
    const bought = purchaseFinalAdvantage(roundIntroGame(2_000), { advantageId: "error_protection", now: 3 });
    const loaded = loadQuestion(bought, { questions, now: 4 });
    const revealed = revealAnswer(submitAnswer(loaded, { answer: "b", now: 5 }), { questions, now: 6 });

    expect(revealed.lastAnswerResult?.isCorrect).toBe(true);
    expect(revealed.currentRoundState?.answerResults[0]?.isCorrect).toBe(true);
    expect(revealed.currentRoundState?.finalUsedAdvantageIds).toContain("error_protection");
  });
});