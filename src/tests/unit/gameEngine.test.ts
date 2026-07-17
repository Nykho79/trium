import { describe, expect, it } from "vitest";
import type { GameConfig, MultipleChoiceQuestion, Player, Question, RoundDefinition } from "../../core/types";
import {
  advanceRound,
  applyJoker,
  awardJoker,
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
    playerMode: "trio", players,
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

    expect(() => submitAnswer(game, { answer: "a", now: 35_004 })).toThrow("expiration");
  });


  it("evite les questions recentes dans la selection automatique", () => {
    const knowledgeRound: RoundDefinition = {
      id: "grid",
      kind: "knowledge-grid",
      label: "Grille",
      description: "Questions recentes.",
      questionTypes: ["multiple_choice"],
      questionCount: 1,
      maxScore: 100,
    };
    const recentQuestion = makeQuestion("q-recent", "a", "knowledge-grid");
    const freshQuestion = makeQuestion("q-fresh", "a", "knowledge-grid");
    const created = createGame({ config: createConfig([knowledgeRound]), recentlyPlayedQuestionIds: [recentQuestion.id], now: 0 });
    const roundStarted = startRound(startGame(created, 1), 0, 2);
    const loaded = loadQuestion(roundStarted, { questions: [recentQuestion, freshQuestion], now: 3 });

    expect(loaded.activeQuestionId).toBe(freshQuestion.id);
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
    expect(revealed.lastAnswerResult?.score.total).toBeGreaterThan(0);
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
    const withJoker = applyJoker(game, "extra_time", 4);
    const paused = pauseGame(withJoker, 5);
    const resumed = resumeGame(paused, 10);

    expect(withJoker.jokers.available["extra_time"]).toBe(0);
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




  it("attribue trois jokers au debut de partie", () => {
    const game = createGame({ config: createConfig(), now: 0 });

    expect(game.jokers.available.fifty_fifty).toBe(1);
    expect(game.jokers.available.second_chance).toBe(1);
    expect(game.jokers.available.extra_time).toBe(1);
    expect(game.jokers.available.change_question).toBe(0);
    expect(game.jokers.available.contextual_hint).toBe(0);
    expect(game.jokers.available.team_vote).toBe(0);
  });

  it("applique le 50/50 sans retirer la bonne reponse", () => {
    const game = activeGame();
    const withJoker = applyJoker(game, { joker: "fifty_fifty", questions, now: 4 });

    expect(withJoker.jokerEffects.eliminatedOptionIds).toHaveLength(2);
    expect(withJoker.jokerEffects.eliminatedOptionIds).not.toContain("a");
    expect(withJoker.jokers.available.fifty_fifty).toBe(0);
    expect(withJoker.eventLog.at(-1)?.joker).toBe("fifty_fifty");
  });

  it("interdit d'utiliser deux fois le meme joker", () => {
    const game = activeGame();
    const withJoker = applyJoker(game, { joker: "fifty_fifty", questions, now: 4 });

    expect(() => applyJoker(withJoker, { joker: "fifty_fifty", questions, now: 5 })).toThrow("indisponible");
  });

  it("autorise une seconde chance a demi-score apres une erreur", () => {
    const game = applyJoker(activeGame(), { joker: "second_chance", questions, now: 4 });
    const wrongLocked = submitAnswer(game, { answer: "b", now: 5 });
    const retry = revealAnswer(wrongLocked, { questions, now: 6 });
    const correctLocked = submitAnswer(retry, { answer: "a", now: 7 });
    const revealed = revealAnswer(correctLocked, { questions, now: 8 });
    const fullScore = revealAnswer(submitAnswer(activeGame(), { answer: "a", now: 7 }), { questions, now: 8 });

    expect(retry.status).toBe("question_active");
    expect(retry.jokerEffects.secondChanceConsumed).toBe(true);
    expect(revealed.lastAnswerResult?.isCorrect).toBe(true);
    expect(revealed.lastAnswerResult?.score.total).toBe(Math.floor((fullScore.lastAnswerResult?.score.total ?? 0) / 2));
  });

  it("remplace une question par une question equivalente et bloque l'ancienne", () => {
    const game = awardJoker(activeGame(), "change_question", 4);
    const changed = applyJoker(game, { joker: "change_question", questions, now: 5 });

    expect(changed.activeQuestionId).toBe("q-2");
    expect(changed.usedQuestionIds).toContain("q-1");
    expect(changed.usedQuestionIds).toContain("q-2");
    expect(changed.jokerEffects.changedQuestionIds).toEqual(expect.arrayContaining(["q-1", "q-2"]));
  });

  it("fournit un indice contextuel prepare", () => {
    const hintedQuestions: Question[] = [{ ...makeQuestion("q-1"), contextualHint: "Regarde la couleur de la planete." }, makeQuestion("q-2", "b")];
    const game = awardJoker(activeGame(createConfig(), hintedQuestions), "contextual_hint", 4);
    const hinted = applyJoker(game, { joker: "contextual_hint", questions: hintedQuestions, now: 5 });

    expect(hinted.jokerEffects.contextualHint).toBe("Regarde la couleur de la planete.");
  });

  it("ajoute vingt secondes et refuse le temps supplementaire apres expiration", () => {
    const game = activeGame();
    const extended = applyJoker(game, "extra_time", 4);

    expect((extended.timer?.expiresAt ?? 0) - (game.timer?.expiresAt ?? 0)).toBe(20_000);
    expect(() => applyJoker(activeGame(), "extra_time", 40_000)).toThrow("expiration");
  });

  it("demarre un vote d'equipe masque", () => {
    const game = awardJoker(activeGame(), "team_vote", 4);
    const voted = applyJoker(game, { joker: "team_vote", questions, now: 5 });

    expect(voted.jokerEffects.teamVote?.active).toBe(true);
    expect(voted.jokerEffects.teamVote?.votes).toEqual({});
    expect(voted.jokers.available.team_vote).toBe(0);
  });

  it("rejette les jokers interdits dans certaines manches", () => {
    const clueRound: RoundDefinition = {
      id: "clues",
      kind: "clue-race",
      label: "Course aux indices",
      description: "Indices.",
      questionTypes: ["progressive_clues"],
      questionCount: 1,
      maxScore: 500,
    };
    const clueQuestion: Question = {
      id: "clue-1",
      kind: "clue-race",
      type: "progressive_clues",
      categoryId: "science",
      categoryLabel: "Science",
      subCategoryId: "space",
      subCategoryLabel: "Espace",
      difficulty: 2,
      prompt: "Quel astre ?",
      explanation: "Mars.",
      tags: ["test"],
      editorialStatus: "approved",
      version: 1,
      clues: ["Rouge", "Planete"],
      answer: { accepted: ["mars"], display: "Mars" },
      pointsByClueIndex: [400, 200],
    };
    const created = createGame({ config: createConfig([clueRound]), now: 0 });
    const loaded = loadQuestion(startRound(startGame(created, 1), 0, 2), { questions: [clueQuestion], questionId: "clue-1", now: 3 });

    expect(() => applyJoker(loaded, { joker: "team_vote", questions: [clueQuestion], now: 4 })).toThrow("interdit");
  });

it("gere une partie solo sans rotation de capitaine ni vote equipe", () => {
  const soloConfig: GameConfig = { ...createConfig([twoQuestionRound]), playerMode: "solo", players: [players[0]] };
  const firstQuestion = activeGame(soloConfig);
  const firstRevealed = revealAnswer(submitAnswer(firstQuestion, { answer: "a", now: 4 }), { questions, now: 5 });
  const secondQuestion = loadQuestion(firstRevealed, { questions, questionId: "q-2", now: 6 });
  const withVote = awardJoker(secondQuestion, "team_vote", 7);

  expect(firstQuestion.captainPlayerId).toBe("player-1");
  expect(secondQuestion.captainPlayerId).toBe("player-1");
  expect(rotateCaptain(secondQuestion).captainPlayerId).toBe("player-1");
  expect(() => applyJoker(withVote, { joker: "team_vote", questions, now: 8 })).toThrow("solo");
});