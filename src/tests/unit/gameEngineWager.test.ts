import { describe, expect, it } from "vitest";
import type { GameConfig, Player, RoundDefinition, ScoreBreakdown } from "../../core/types";
import {
  applyJoker,
  awardJoker,
  configureWager,
  createGame,
  loadQuestion,
  revealAnswer,
  startGame,
  startRound,
  submitAnswer,
} from "../../core/engine/gameEngine";
import { buildWagerQuestionSet, type WagerQuestion } from "../../rounds/wager";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const round: RoundDefinition = {
  id: "wager",
  kind: "wager",
  label: "Le Pari",
  description: "Categorie, difficulte et mise.",
  questionTypes: ["multiple_choice"],
  questionCount: 5,
  maxScore: 12_500,
};

const score = (total: number): ScoreBreakdown => ({
  basePoints: total,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total,
});

const config: GameConfig = {
  id: "wager-engine-config",
  mode: "standard",
  seed: "wager-engine-seed",
  players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

const questions: readonly WagerQuestion[] = buildWagerQuestionSet(config.seed);

function roundIntroGame(totalScore = 1_000) {
  const created = createGame({ config, now: 0 });
  const started = startGame(created, 1);
  return { ...startRound(started, 0, 2), score: score(totalScore) };
}

function firstQuestionForDifficulty(difficulty: 1 | 2 | 3 | 4 | 5): WagerQuestion {
  const question = questions.find((candidate) => candidate.difficulty === difficulty);
  if (!question) throw new Error("Question Pari manquante.");
  return question;
}

function activeWagerGame(totalScore = 1_000, amount = 250, difficulty: 1 | 2 | 3 | 4 | 5 = 2) {
  const question = firstQuestionForDifficulty(difficulty);
  const configured = configureWager(roundIntroGame(totalScore), { categoryId: question.categoryId, difficulty, amount, now: 3 });
  return loadQuestion(configured, { questions, now: 4 });
}

describe("gameEngine wager", () => {
  it("refuse de charger une question avant configuration du pari", () => {
    expect(() => loadQuestion(roundIntroGame(), { questions, now: 3 })).toThrow("configure");
  });

  it("refuse une mise superieure au score disponible", () => {
    const question = firstQuestionForDifficulty(2);

    expect(() => configureWager(roundIntroGame(200), { categoryId: question.categoryId, difficulty: 2, amount: 500, now: 3 })).toThrow("Mise invalide");
  });

  it("gagne la mise multipliee par le coefficient", () => {
    const game = activeWagerGame(1_000, 250, 2);
    const revealed = revealAnswer(submitAnswer(game, { answer: "a", now: 5 }), { questions, now: 6 });

    expect(revealed.lastAnswerResult?.score.wagerDelta).toBe(500);
    expect(revealed.score.total).toBe(1_500);
  });

  it("perd uniquement la mise et ne passe jamais sous zero", () => {
    const game = activeWagerGame(120, 100, 1);
    const revealed = revealAnswer(submitAnswer(game, { answer: "wrong-1", now: 5 }), { questions, now: 6 });
    const lowScoreGame = activeWagerGame(50, 100, 1);
    const clamped = revealAnswer(submitAnswer(lowScoreGame, { answer: "wrong-1", now: 5 }), { questions, now: 6 });

    expect(revealed.lastAnswerResult?.score.total).toBe(-100);
    expect(revealed.score.total).toBe(20);
    expect(clamped.score.total).toBe(0);
  });

  it("autorise la mise minimale gratuite quand le score est trop bas", () => {
    const game = activeWagerGame(0, 100, 1);

    expect(game.currentRoundState?.wagerIsFreeStake).toBe(true);
  });

  it("autorise les jokers du Pari et interdit les autres", () => {
    const game = activeWagerGame();
    const withFifty = applyJoker(game, { joker: "fifty_fifty", questions, now: 5 });
    const withHint = applyJoker(awardJoker(activeWagerGame(), "contextual_hint", 5), { joker: "contextual_hint", questions, now: 6 });
    const withSecondChance = applyJoker(activeWagerGame(), { joker: "second_chance", questions, now: 5 });
    const withExtraTime = applyJoker(activeWagerGame(), "extra_time", 5);

    expect(withFifty.jokerEffects.eliminatedOptionIds).toHaveLength(2);
    expect(withHint.jokerEffects.contextualHint).toBeDefined();
    expect(withSecondChance.jokerEffects.secondChanceActive).toBe(true);
    expect((withExtraTime.timer?.expiresAt ?? 0) - (activeWagerGame().timer?.expiresAt ?? 0)).toBe(20_000);
    expect(() => applyJoker(awardJoker(activeWagerGame(), "change_question", 5), { joker: "change_question", questions, now: 6 })).toThrow("interdit");
    expect(() => applyJoker(awardJoker(activeWagerGame(), "team_vote", 5), { joker: "team_vote", questions, now: 6 })).toThrow("interdit");
  });
});
