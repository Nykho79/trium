import { describe, expect, it } from "vitest";
import type { GameConfig, Player, PressureChoiceQuestion, Question, RoundDefinition } from "../../core/types";
import {
  applyJoker,
  awardJoker,
  completeRound,
  createGame,
  expirePressureChoiceQuestion,
  loadQuestion,
  revealAnswer,
  securePressureChoicePoints,
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
  id: "pressure-choice",
  kind: "pressure-choice",
  label: "Choix sous pression",
  description: "QCM sous pression.",
  questionTypes: ["multiple_choice"],
  questionCount: 5,
  maxScore: 4_700,
};

const config: GameConfig = {
  id: "pressure-engine-config",
  mode: "standard",
  seed: "pressure-engine-seed",
  playerMode: "trio", players,
  rounds: [round],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

function makeQuestion(difficulty: 1 | 2 | 3 | 4 | 5, id = `pc-${difficulty}`, correctOptionId = "a"): PressureChoiceQuestion {
  return {
    id,
    kind: "pressure-choice",
    type: "multiple_choice",
    categoryId: "science",
    categoryLabel: "Science",
    subCategoryId: "space",
    subCategoryLabel: "Espace",
    difficulty,
    prompt: `Question ${id}`,
    explanation: "Explication.",
    tags: ["test"],
    editorialStatus: "approved",
    version: 1,
    value: (difficulty * 100) as 100 | 200 | 300 | 400 | 500,
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    correctOptionId,
    timeLimitSeconds: 30,
    answer: { accepted: [correctOptionId], display: correctOptionId.toUpperCase() },
  };
}

const questions: Question[] = [makeQuestion(1), makeQuestion(2), makeQuestion(3), makeQuestion(4), makeQuestion(5), makeQuestion(1, "pc-1-alt")];

function roundIntroGame() {
  const created = createGame({ config, now: 0 });
  return startRound(startGame(created, 1), 0, 2);
}

function activePressureGame(questionId = "pc-1") {
  return loadQuestion(roundIntroGame(), { questions, questionId, now: 3 });
}

function reveal(questionId: string, answer: string, state = activePressureGame(questionId), now = 5) {
  return revealAnswer(submitAnswer(state, { answer, now: now - 1 }), { questions, now });
}

describe("gameEngine pressure-choice", () => {
  it("ajoute une bonne reponse aux points a risque sans securiser le score global", () => {
    const revealed = reveal("pc-1", "a");

    expect(revealed.lastAnswerResult?.score.total).toBe(100);
    expect(revealed.currentRoundState?.riskPoints).toBe(100);
    expect(revealed.score.total).toBe(0);
  });

  it("securise les points et termine volontairement la manche", () => {
    const revealed = reveal("pc-1", "a");
    const secured = securePressureChoicePoints(revealed, 6);

    expect(secured.status).toBe("round_result");
    expect(secured.score.total).toBe(100);
    expect(secured.currentRoundState?.securedPoints).toBe(100);
    expect(secured.currentRoundState?.riskPoints).toBe(0);
  });

  it("perd les points non securises apres une erreur", () => {
    const firstCorrect = reveal("pc-1", "a");
    const second = loadQuestion(firstCorrect, { questions, questionId: "pc-2", now: 6 });
    const failed = revealAnswer(submitAnswer(second, { answer: "b", now: 7 }), { questions, now: 8 });
    const completed = completeRound(failed, 9);

    expect(failed.lastAnswerResult?.isCorrect).toBe(false);
    expect(failed.currentRoundState?.riskPoints).toBe(0);
    expect(completed.status).toBe("round_result");
    expect(completed.score.total).toBe(0);
  });

  it("perd les points a risque quand le chrono expire", () => {
    const firstCorrect = reveal("pc-1", "a");
    const second = loadQuestion(firstCorrect, { questions, questionId: "pc-2", now: 6 });
    const expired = expirePressureChoiceQuestion(second, { questions, now: 37_001 });

    expect(expired.lastAnswerResult?.isCorrect).toBe(false);
    expect(expired.currentRoundState?.riskPoints).toBe(0);
  });

  it("applique le multiplicateur du troisieme palier", () => {
    const first = reveal("pc-1", "a");
    const secondLoaded = loadQuestion(first, { questions, questionId: "pc-2", now: 6 });
    const second = reveal("pc-2", "a", secondLoaded, 8);
    const thirdLoaded = loadQuestion(second, { questions, questionId: "pc-3", now: 9 });
    const third = reveal("pc-3", "a", thirdLoaded, 11);

    expect(third.lastAnswerResult?.score.total).toBe(600);
    expect(third.currentRoundState?.riskPoints).toBe(1_000);
  });

  it("autorise les jokers disponibles avant la derniere question", () => {
    const base = activePressureGame();
    const withChange = awardJoker(base, "change_question", 4);
    const changed = applyJoker(withChange, { joker: "change_question", questions, now: 5 });
    const withHint = applyJoker(awardJoker(activePressureGame(), "contextual_hint", 4), { joker: "contextual_hint", questions, now: 5 });
    const withVote = applyJoker(awardJoker(activePressureGame(), "team_vote", 4), { joker: "team_vote", questions, now: 5 });

    expect(changed.activeQuestionId).toBe("pc-1-alt");
    expect(withHint.jokerEffects.contextualHint).toBeDefined();
    expect(withVote.jokerEffects.teamVote?.active).toBe(true);
  });

  it("interdit le changement de question sur la derniere question", () => {
    const intro = roundIntroGame();
    const state = {
      ...intro,
      currentRoundState: {
        ...intro.currentRoundState!,
        currentQuestionIndex: 4,
      },
    };
    const fifth = loadQuestion(state, { questions, questionId: "pc-5", now: 10 });
    const withJoker = awardJoker(fifth, "change_question", 11);

    expect(() => applyJoker(withJoker, { joker: "change_question", questions, now: 12 })).toThrow("derniere question");
  });
});