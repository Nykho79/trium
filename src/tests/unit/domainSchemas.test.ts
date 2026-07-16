import { describe, expect, it } from "vitest";
import type {
  GameAction,
  GameConfig,
  GameEvent,
  GameRound,
  GameState,
  GameStatus,
  MultipleChoiceQuestion,
  Player,
  RoundDefinition,
  RoundState,
  ScoreBreakdown,
} from "../../core/types";
import {
  answerResultSchema,
  gameActionSchema,
  gameConfigSchema,
  gameEventSchema,
  gameStateSchema,
  gameStatusSchema,
  jokerSchema,
  jokerStateSchema,
  playerSchema,
  roundDefinitionSchema,
  roundStateSchema,
  roundSummarySchema,
  scoreBreakdownSchema,
} from "../../core/schemas";

const players: [Player, Player, Player] = [
  { id: "player-1", name: "Alice", color: "cyan", ready: true },
  { id: "player-2", name: "Benoit", color: "amber", ready: true },
  { id: "player-3", name: "Camille", color: "magenta", ready: true },
];

const score: ScoreBreakdown = {
  basePoints: 100,
  timeBonus: 20,
  streakBonus: 10,
  jokerPenalty: 5,
  wagerDelta: 50,
  total: 175,
};

const roundDefinition: RoundDefinition = {
  id: "round-pressure",
  kind: "pressure-choice",
  label: "Choix sous pression",
  description: "QCM chronomÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©trÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©.",
  questionTypes: ["multiple_choice"],
  questionCount: 1,
  maxScore: 500,
};

const roundState: RoundState = {
  id: "state-pressure",
  definitionId: roundDefinition.id,
  status: "active",
  currentQuestionIndex: 0,
  selectedQuestionIds: ["q-1"],
  answeredQuestionIds: [],
  answerResults: [],
  score,
};

const config: GameConfig = {
  id: "game-config-test",
  mode: "standard",
  seed: "seed-test",
  players,
  rounds: [roundDefinition],
  questionBankVersion: 1,
  allowRecentlyPlayedFallback: true,
  defaultQuestionTimeMs: 30_000,
};

const jokerInventory = {
  "fifty-fifty": 1,
  "second-chance": 1,
  "question-swap": 1,
  "contextual-clue": 1,
  "extra-time": 1,
  "three-player-vote": 1,
};

const question: MultipleChoiceQuestion = {
  id: "q-1",
  kind: "pressure-choice",
  type: "multiple_choice",
  categoryId: "science",
  categoryLabel: "Science",
  subCategoryId: "space",
  subCategoryLabel: "Espace",
  difficulty: 1,
  prompt: "Quelle planÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨te est surnommÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©e la planÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨te rouge ?",
  explanation: "Mars est rouge ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  cause des oxydes de fer prÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©sents ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â  sa surface.",
  tags: ["astronomie"],
  editorialStatus: "approved",
  version: 1,
  options: [
    { id: "a", label: "Mars" },
    { id: "b", label: "VÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©nus" },
    { id: "c", label: "Jupiter" },
    { id: "d", label: "Mercure" },
  ],
  correctOptionId: "a",
  timeLimitSeconds: 30,
};

describe("schemas metier centraux", () => {
  it("valide Player et impose exactement trois joueurs dans GameConfig", () => {
    expect(playerSchema.parse(players[0])).toEqual(players[0]);
    expect(gameConfigSchema.parse(config).players).toHaveLength(3);
    expect(gameConfigSchema.safeParse({ ...config, players: [players[0], players[1]] }).success).toBe(false);
  });

  it("valide tous les GameStatus publics", () => {
    const statuses: GameStatus[] = [
      "idle",
      "setup",
      "game_intro",
      "round_intro",
      "question_loading",
      "question_active",
      "answer_locked",
      "answer_reveal",
      "round_result",
      "next_round",
      "final_round",
      "game_result",
      "paused",
      "error",
    ];
    expect(statuses.every((status) => gameStatusSchema.safeParse(status).success)).toBe(true);
  });

  it("valide RoundDefinition et RoundState", () => {
    expect(roundDefinitionSchema.parse(roundDefinition).kind).toBe("pressure-choice");
    expect(roundStateSchema.parse(roundState).selectedQuestionIds).toEqual(["q-1"]);
  });

  it("valide Joker, JokerState, ScoreBreakdown et AnswerResult", () => {
    expect(jokerSchema.parse({
      type: "fifty-fifty",
      label: "50/50",
      description: "Retire deux mauvaises rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ponses.",
      maxUses: 1,
    }).type).toBe("fifty-fifty");
    expect(jokerStateSchema.parse({ available: jokerInventory, used: jokerInventory, disabled: [] }).available["extra-time"]).toBe(1);
    expect(scoreBreakdownSchema.parse(score).total).toBe(175);
    expect(answerResultSchema.parse({
      questionId: "q-1",
      isCorrect: true,
      lockedAnswer: "a",
      correctAnswer: "a",
      explanation: "Mars.",
      score,
      usedJokers: [],
    }).isCorrect).toBe(true);
  });

  it("valide GameState, GameAction et GameEvent", () => {
    const state: GameState = {
      status: "question_active",
      config,
      currentRoundIndex: 0,
      currentRoundState: roundState,
      activeQuestionId: "q-1",
      captainPlayerId: "player-1",
      usedQuestionIds: [],
      recentlyPlayedQuestionIds: [],
      jokers: { available: jokerInventory, used: jokerInventory, disabled: [] },
      score,
      eventLog: [],
    };
    const action: GameAction = { type: "LOCK_ANSWER", answer: "a" };
    const event: GameEvent = {
      id: "event-1",
      type: "answer_locked",
      at: "2026-07-16T12:00:00.000Z",
      fromStatus: "question_active",
      toStatus: "answer_locked",
      questionId: "q-1",
    };

    expect(gameStateSchema.parse(state).status).toBe("question_active");
    expect(gameActionSchema.parse(action).type).toBe("LOCK_ANSWER");
    expect(gameEventSchema.parse(event).type).toBe("answer_locked");
    expect(gameStateSchema.safeParse({ ...state, status: "error" }).success).toBe(false);
  });

  it("formalise l'interface pure GameRound", () => {
    const round: GameRound<RoundState, MultipleChoiceQuestion, string> = {
      definition: roundDefinition,
      initializeState: () => roundState,
      selectQuestions: (input) => input.questions.slice(0, 1),
      handleAnswer: (_state, handledQuestion, answer) => ({
        questionId: handledQuestion.id,
        isCorrect: answer === handledQuestion.correctOptionId,
        lockedAnswer: answer,
        correctAnswer: handledQuestion.correctOptionId,
        explanation: handledQuestion.explanation,
        score,
        usedJokers: [],
      }),
      calculateScore: (result) => result.score,
      isComplete: (state) => state.answeredQuestionIds.length >= 1,
      summarize: (state) => ({
        roundId: state.id,
        label: roundDefinition.label,
        answeredQuestions: state.answeredQuestionIds.length,
        score: state.score,
        isComplete: state.status === "complete",
      }),
      restoreState: (savedState) => roundStateSchema.parse(savedState),
    };

    const selected = round.selectQuestions({
      questions: [question],
      alreadyUsedQuestionIds: [],
      recentlyPlayedQuestionIds: [],
      seed: "seed-test",
      config,
    });
    const selectedQuestion = selected[0];
    if (selectedQuestion === undefined) {
      throw new Error("La manche de test doit selectionner une question.");
    }
    const result = round.handleAnswer(roundState, selectedQuestion, "a", { now: 0 });
    const summary = round.summarize({ ...roundState, status: "complete", answeredQuestionIds: ["q-1"] });

    expect(result.isCorrect).toBe(true);
    expect(round.calculateScore(result, { definition: roundDefinition, state: roundState }).total).toBe(175);
    expect(roundSummarySchema.parse(summary).isComplete).toBe(true);
    expect(round.restoreState(roundState)).toEqual(roundState);
  });
});
