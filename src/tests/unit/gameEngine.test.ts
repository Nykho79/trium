import { describe, expect, it } from "vitest";
import type { GameConfig, MultipleChoiceQuestion, Player, Question, RoundDefinition } from "../../core/types";
import {
  advanceRound,
  applyJoker,
  completeGame,
  completeRound,
  createGame,
  GameEngineError,
  loadQuestion,
  pauseGame,
  restoreGame,
  resumeGame,
  revealAnswer,
  rotateCaptain,
  startGame,
  startRound,
  submitAnswer,
} from "../../core/engine/gameEngine";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const pressureRound: RoundDefinition = {
  id: "pressure",
  kind: "pressure-choice",
  label: "Choix sous pression",
  description: "QCM test.",
  questionTypes: ["multiple_choice"],
  questionCount: 1,
  maxScore: 500,
};

const twoQuestionRound: RoundDefinition = {
  ...pressureRound,
  questionCount: 2,
};


function createConfig(rounds: RoundDefinition[] = [pressureRound]): GameConfig {
  return {
    id: "config-test",
    mode: "standard",
    seed: "seed-test",
    players,
    rounds,
    questionBankVersion: 1,
    allowRecentlyPlayedFallback: true,
    defaultQuestionTimeMs: 30_000,
  };
}

function makeQuestion(id: string, correctOptionId = "a", kind: MultipleChoiceQuestion["kind"] = "pressure-choice"): MultipleChoiceQuestion {
  return {
    id,
    kind,
    type: "multiple_choice",
    categoryId: "science",
    categoryLabel: "Science",
    subCategoryId: "space",
    subCategoryLabel: "Espace",
    difficulty: 2,
    prompt: `Question ${id}`,
    explanation: "Explication.",
    tags: ["test"],
    editorialStatus: "approved",
    version: 1,
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    correctOptionId,
    timeLimitSeconds: 30,
  };
}

const questions: Question[] = [makeQuestion("q-1"), makeQuestion("q-2", "b")];

function activeGame(config = createConfig(), questionBank = questions) {
  const created = createGame({ config, now: 0 });
  const started = startGame(created, 1);
  const roundStarted = startRound(started, 0, 2);
  return loadQuestion(roundStarted, { questions: questionBank, questionId: "q-1", now: 3 });
}

describe("gameEngine", () => {
  it("gere une partie standard jusqu'a la fin", () => {
    const game = activeGame();
    const locked = submitAnswer(game, { answer: "a", now: 4 });
    const revealed = revealAnswer(locked, { questions, now: 5 });
    const roundCompleted = completeRound(revealed, 6);
    const completed = advanceRound(roundCompleted, 7);

    expect(completed.status).toBe("game_result");
    expect(completed.score.total).toBeGreaterThan(0);
    expect(completed.eventLog.map((event) => event.type)).toContain("game_completed");
  });

  it("rejette le double clic de soumission", () => {
    const game = activeGame();
    const locked = submitAnswer(game, { answer: "a", now: 4 });

    expect(() => submitAnswer(locked, { answer: "a", now: 5 })).toThrow(GameEngineError);
    expect(locked.lockedAnswer).toBe("a");
  });

  it("rejette une reponse apres expiration", () => {
    const game = activeGame();

    expect(() => submitAnswer(game, { answer: "a", now: 30_004 })).toThrow("expiration");
  });

  it("rejette une transition invalide", () => {
    const created = createGame({ config: createConfig(), now: 0 });

    expect(() => startRound(created, 0, 1)).toThrow("startRound impossible");
  });

  it("ne compte pas deux fois le score d'une meme reponse", () => {
    const game = activeGame();
    const locked = submitAnswer(game, { answer: "a", now: 4 });
    const revealed = revealAnswer(locked, { questions, now: 5 });

    expect(() => revealAnswer(revealed, { questions, now: 6 })).toThrow(GameEngineError);
    expect(revealed.score.total).toBeGreaterThan(0);
  });

  it("restaure une partie sauvegardee", () => {
    const game = activeGame();
    const restored = restoreGame(JSON.parse(JSON.stringify(game)), 10);

    expect(restored.status).toBe("question_active");
    expect(restored.activeQuestionId).toBe("q-1");
    expect(restored.eventLog.at(-1)?.type).toBe("game_restored");
  });

  it("interdit qu'une question apparaisse deux fois dans une partie", () => {
    const config = createConfig([twoQuestionRound]);
    const game = activeGame(config);
    const locked = submitAnswer(game, { answer: "a", now: 4 });
    const revealed = revealAnswer(locked, { questions, now: 5 });

    expect(() => loadQuestion(revealed, { questions, questionId: "q-1", now: 6 })).toThrow("deja jouee");
  });

  it("change automatiquement le capitaine a chaque question", () => {
    const config = createConfig([twoQuestionRound]);
    const firstQuestion = activeGame(config);
    const firstRevealed = revealAnswer(submitAnswer(firstQuestion, { answer: "a", now: 4 }), { questions, now: 5 });
    const secondQuestion = loadQuestion(firstRevealed, { questions, questionId: "q-2", now: 6 });

    expect(firstQuestion.captainPlayerId).toBe("player-1");
    expect(secondQuestion.captainPlayerId).toBe("player-2");
    expect(rotateCaptain(secondQuestion).captainPlayerId).toBe("player-3");
  });

  it("gere pause, reprise et joker temps supplementaire", () => {
    const game = activeGame();
    const withJoker = applyJoker(game, "extra-time", 4);
    const paused = pauseGame(withJoker, 5);
    const resumed = resumeGame(paused, 10);

    expect(withJoker.jokers.available["extra-time"]).toBe(0);
    expect(paused.status).toBe("paused");
    expect(resumed.status).toBe("question_active");
    expect(resumed.timer?.expiresAt).toBeGreaterThan(30_000);
  });

  it("permet de terminer explicitement la partie depuis un resultat de manche", () => {
    const game = activeGame();
    const locked = submitAnswer(game, { answer: "a", now: 4 });
    const revealed = revealAnswer(locked, { questions, now: 5 });
    const roundCompleted = completeRound(revealed, 6);
    const completed = completeGame(roundCompleted, 7);

    expect(completed.status).toBe("game_result");
  });
});


