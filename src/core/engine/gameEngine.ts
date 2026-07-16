import type { GameConfig, GameState, GameStatus, GameTimerState, QuestionId } from "../types/game";
import type { Question } from "../types/question";
import type { RoundDefinition, RoundState } from "../types/round";
import type { AnswerResult, JokerInventory, JokerType, ScoreBreakdown } from "../types/scoring";
import type { GameEvent, GameEventType } from "../types/event";
import { INITIAL_JOKERS } from "../constants/scoring";
import { gameStateSchema } from "../schemas/gameSchemas";
import { shuffleWithSeed } from "./random";

export class GameEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameEngineError";
  }
}

export interface CreateGameInput {
  config: GameConfig;
  recentlyPlayedQuestionIds?: QuestionId[] | undefined;
  now?: number | undefined;
}

export interface LoadQuestionInput {
  questions: readonly Question[];
  questionId?: QuestionId | undefined;
  now: number;
}

export interface SubmitAnswerInput {
  answer: string | string[];
  now: number;
}

export interface RevealAnswerInput {
  questions: readonly Question[];
  now: number;
}

const emptyScore: ScoreBreakdown = {
  basePoints: 0,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total: 0,
};

function zeroJokers(): JokerInventory {
  return {
    "fifty-fifty": 0,
    "second-chance": 0,
    "question-swap": 0,
    "contextual-clue": 0,
    "extra-time": 0,
    "three-player-vote": 0,
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    currentRoundState: state.currentRoundState ? { ...state.currentRoundState, selectedQuestionIds: [...state.currentRoundState.selectedQuestionIds], answeredQuestionIds: [...state.currentRoundState.answeredQuestionIds], score: { ...state.currentRoundState.score } } : undefined,
    timer: state.timer ? { ...state.timer } : undefined,
    lastAnswerResult: state.lastAnswerResult ? { ...state.lastAnswerResult, score: { ...state.lastAnswerResult.score }, usedJokers: [...state.lastAnswerResult.usedJokers] } : undefined,
    usedQuestionIds: [...state.usedQuestionIds],
    recentlyPlayedQuestionIds: [...state.recentlyPlayedQuestionIds],
    jokers: {
      available: { ...state.jokers.available },
      used: { ...state.jokers.used },
      disabled: [...state.jokers.disabled],
    },
    score: { ...state.score },
    eventLog: [...state.eventLog],
  };
}

function createEvent(state: GameState | undefined, type: GameEventType, now: number, details: Partial<GameEvent> = {}): GameEvent {
  return {
    id: `event-${state ? state.eventLog.length + 1 : 1}-${type}`,
    type,
    at: new Date(now).toISOString(),
    ...details,
  };
}

function withEvent(state: GameState, type: GameEventType, now: number, details: Partial<GameEvent> = {}): GameState {
  return { ...state, eventLog: [...state.eventLog, createEvent(state, type, now, details)] };
}

function transition(state: GameState, toStatus: GameStatus, now: number, eventType = "status_changed" as GameEventType): GameState {
  const fromStatus = state.status;
  return withEvent({ ...state, status: toStatus }, eventType, now, { fromStatus, toStatus });
}

function requireStatus(state: GameState, allowed: readonly GameStatus[], action: string): void {
  if (!allowed.includes(state.status)) {
    throw new GameEngineError(`${action} impossible depuis l'etat ${state.status}.`);
  }
}

function requireRound(state: GameState): RoundState {
  if (!state.currentRoundState) {
    throw new GameEngineError("Aucune manche active.");
  }
  return state.currentRoundState;
}

function currentRoundDefinition(state: GameState): RoundDefinition {
  const definition = state.config.rounds[state.currentRoundIndex];
  if (!definition) {
    throw new GameEngineError(`Manche introuvable a l'index ${state.currentRoundIndex}.`);
  }
  return definition;
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function isTimerExpired(timer: GameTimerState | undefined, now: number): boolean {
  return timer !== undefined && timer.pausedAt === undefined && now > timer.expiresAt;
}

function questionDurationMs(question: Question, config: GameConfig): number {
  if (question.type === "multiple_choice" && question.timeLimitSeconds !== undefined) {
    return question.timeLimitSeconds * 1000;
  }
  return config.defaultQuestionTimeMs;
}

function isAnswerCorrect(question: Question, answer: string | string[]): boolean {
  if (question.type === "multiple_choice") {
    return typeof answer === "string" && answer === question.correctOptionId;
  }
  if (question.type === "chronology") {
    return Array.isArray(answer) && answer.join("|") === question.correctOrderIds.join("|");
  }
  if (Array.isArray(answer)) {
    return false;
  }
  return question.answer.accepted.map(normalizeText).includes(normalizeText(answer));
}

function displayCorrectAnswer(question: Question): string | string[] {
  if (question.type === "multiple_choice") {
    return question.correctOptionId;
  }
  if (question.type === "chronology") {
    return question.correctOrderIds;
  }
  return question.answer.display;
}

function basePointsFor(question: Question): number {
  if (question.type === "multiple_choice" && question.value !== undefined) {
    return question.value;
  }
  return question.difficulty * 100;
}

function calculateAnswerScore(question: Question, isCorrect: boolean, timer: GameTimerState | undefined, now: number): ScoreBreakdown {
  if (!isCorrect) {
    return { ...emptyScore };
  }
  const basePoints = basePointsFor(question);
  const remainingMs = timer ? Math.max(0, timer.expiresAt - now) : 0;
  const timeBonus = Math.floor(remainingMs / 1000) * 2;
  const streakBonus = 0;
  const jokerPenalty = 0;
  const wagerDelta = 0;
  return {
    basePoints,
    timeBonus,
    streakBonus,
    jokerPenalty,
    wagerDelta,
    total: basePoints + timeBonus + streakBonus + wagerDelta - jokerPenalty,
  };
}

function addScore(left: ScoreBreakdown, right: ScoreBreakdown): ScoreBreakdown {
  return {
    basePoints: left.basePoints + right.basePoints,
    timeBonus: left.timeBonus + right.timeBonus,
    streakBonus: left.streakBonus + right.streakBonus,
    jokerPenalty: left.jokerPenalty + right.jokerPenalty,
    wagerDelta: left.wagerDelta + right.wagerDelta,
    total: left.total + right.total,
  };
}

function findActiveQuestion(state: GameState, questions: readonly Question[]): Question {
  if (!state.activeQuestionId) {
    throw new GameEngineError("Aucune question active.");
  }
  const question = questions.find((candidate) => candidate.id === state.activeQuestionId);
  if (!question) {
    throw new GameEngineError(`Question active introuvable: ${state.activeQuestionId}.`);
  }
  return question;
}

function selectQuestion(state: GameState, questions: readonly Question[], questionId: QuestionId | undefined): Question {
  const definition = currentRoundDefinition(state);
  const roundState = requireRound(state);
  const candidates = questions.filter((question) => question.kind === definition.kind && definition.questionTypes.includes(question.type));
  const explicitQuestion = questionId ? candidates.find((question) => question.id === questionId) : undefined;
  const selected = explicitQuestion ?? shuffleWithSeed(
    candidates.filter((question) => !state.usedQuestionIds.includes(question.id)),
    `${state.config.seed}:${definition.id}:${roundState.currentQuestionIndex}`,
  )[0];

  if (!selected) {
    throw new GameEngineError(`Aucune question disponible pour la manche ${definition.id}.`);
  }
  if (state.usedQuestionIds.includes(selected.id)) {
    throw new GameEngineError(`Question deja jouee dans cette partie: ${selected.id}.`);
  }
  return selected;
}

export function rotateCaptain(state: GameState): GameState {
  const currentIndex = state.config.players.findIndex((player) => player.id === state.captainPlayerId);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % state.config.players.length;
  const captain = state.config.players[nextIndex];
  if (!captain) {
    throw new GameEngineError("Impossible de determiner le prochain capitaine.");
  }
  return { ...state, captainPlayerId: captain.id };
}

export function createGame(input: CreateGameInput): GameState {
  if (input.config.players.length !== 3) {
    throw new GameEngineError("Une partie TRIUM exige exactement trois joueurs.");
  }
  const now = input.now ?? 0;
  const initial: GameState = {
    status: "idle",
    config: input.config,
    currentRoundIndex: 0,
    captainPlayerId: input.config.players[0].id,
    usedQuestionIds: [],
    recentlyPlayedQuestionIds: input.recentlyPlayedQuestionIds ?? [],
    jokers: { available: { ...INITIAL_JOKERS }, used: zeroJokers(), disabled: [] },
    score: { ...emptyScore },
    eventLog: [],
  };
  return withEvent(initial, "game_created", now, { toStatus: "idle" });
}

export function startGame(state: GameState, now = 0): GameState {
  requireStatus(state, ["idle", "setup"], "startGame");
  return transition(cloneState(state), "game_intro", now);
}

export function startRound(state: GameState, roundIndex = state.currentRoundIndex, now = 0): GameState {
  requireStatus(state, ["game_intro", "next_round", "final_round"], "startRound");
  const definition = state.config.rounds[roundIndex];
  if (!definition) {
    throw new GameEngineError(`Manche introuvable: ${roundIndex}.`);
  }
  const roundState: RoundState = {
    id: `round-state-${roundIndex + 1}`,
    definitionId: definition.id,
    status: "active",
    currentQuestionIndex: 0,
    selectedQuestionIds: [],
    answeredQuestionIds: [],
    score: { ...emptyScore },
  };
  const next = transition({
    ...cloneState(state),
    currentRoundIndex: roundIndex,
    currentRoundState: roundState,
    activeQuestionId: undefined,
    lockedAnswer: undefined,
    lastAnswerResult: undefined,
    timer: undefined,
  }, "round_intro", now, "round_started");
  return next;
}

export function loadQuestion(state: GameState, input: LoadQuestionInput): GameState {
  requireStatus(state, ["round_intro", "answer_reveal", "next_round"], "loadQuestion");
  const selected = selectQuestion(state, input.questions, input.questionId);
  const roundState = requireRound(state);
  const captainIndex = state.usedQuestionIds.length % state.config.players.length;
  const captain = state.config.players[captainIndex];
  if (!captain) {
    throw new GameEngineError("Capitaine introuvable.");
  }
  const durationMs = questionDurationMs(selected, state.config);
  const nextRoundState: RoundState = {
    ...roundState,
    selectedQuestionIds: [...roundState.selectedQuestionIds, selected.id],
  };
  let next = transition({
    ...cloneState(state),
    status: "question_loading",
    currentRoundState: nextRoundState,
    activeQuestionId: selected.id,
    captainPlayerId: captain.id,
    timer: { startedAt: input.now, expiresAt: input.now + durationMs },
    lockedAnswer: undefined,
    lastAnswerResult: undefined,
    usedQuestionIds: [...state.usedQuestionIds, selected.id],
  }, "question_active", input.now, "question_loaded");
  next = withEvent(next, "captain_rotated", input.now, { questionId: selected.id, message: `Capitaine: ${captain.id}` });
  return next;
}

export function submitAnswer(state: GameState, input: SubmitAnswerInput): GameState {
  requireStatus(state, ["question_active"], "submitAnswer");
  if (isTimerExpired(state.timer, input.now)) {
    throw new GameEngineError("La reponse ne peut pas etre soumise apres expiration du temps.");
  }
  return transition({ ...cloneState(state), lockedAnswer: input.answer }, "answer_locked", input.now, "answer_locked");
}

export function revealAnswer(state: GameState, input: RevealAnswerInput): GameState {
  requireStatus(state, ["answer_locked"], "revealAnswer");
  if (state.lockedAnswer === undefined) {
    throw new GameEngineError("Aucune reponse verrouillee.");
  }
  if (state.lastAnswerResult !== undefined) {
    throw new GameEngineError("Cette reponse a deja ete comptee.");
  }
  const question = findActiveQuestion(state, input.questions);
  const isCorrect = isAnswerCorrect(question, state.lockedAnswer);
  const score = calculateAnswerScore(question, isCorrect, state.timer, input.now);
  const result: AnswerResult = {
    questionId: question.id,
    isCorrect,
    lockedAnswer: state.lockedAnswer,
    correctAnswer: displayCorrectAnswer(question),
    explanation: question.explanation,
    score,
    usedJokers: [],
  };
  const roundState = requireRound(state);
  const nextRoundState: RoundState = {
    ...roundState,
    currentQuestionIndex: roundState.currentQuestionIndex + 1,
    answeredQuestionIds: [...roundState.answeredQuestionIds, question.id],
    score: addScore(roundState.score, score),
  };
  return transition({
    ...cloneState(state),
    currentRoundState: nextRoundState,
    lastAnswerResult: result,
    score: addScore(state.score, score),
  }, "answer_reveal", input.now, "answer_revealed");
}

export function completeRound(state: GameState, now = 0): GameState {
  requireStatus(state, ["answer_reveal"], "completeRound");
  const roundState = requireRound(state);
  const definition = currentRoundDefinition(state);
  if (roundState.answeredQuestionIds.length < definition.questionCount) {
    throw new GameEngineError("La manche ne peut pas etre terminee avant son quota de questions.");
  }
  return transition({
    ...cloneState(state),
    currentRoundState: { ...roundState, status: "complete" },
    activeQuestionId: undefined,
    lockedAnswer: undefined,
    timer: undefined,
  }, "round_result", now, "round_completed");
}

export function advanceRound(state: GameState, now = 0): GameState {
  requireStatus(state, ["round_result"], "advanceRound");
  const nextRoundIndex = state.currentRoundIndex + 1;
  if (nextRoundIndex >= state.config.rounds.length) {
    return transition(cloneState(state), "game_result", now, "game_completed");
  }
  const nextStatus: GameStatus = state.config.rounds[nextRoundIndex]?.kind === "final-convergence" ? "final_round" : "next_round";
  return transition({ ...cloneState(state), currentRoundIndex: nextRoundIndex }, nextStatus, now, "round_advanced");
}

export function completeGame(state: GameState, now = 0): GameState {
  requireStatus(state, ["round_result", "final_round", "next_round"], "completeGame");
  return transition(cloneState(state), "game_result", now, "game_completed");
}

export function pauseGame(state: GameState, now = 0): GameState {
  requireStatus(state, ["game_intro", "round_intro", "question_active", "answer_locked", "answer_reveal", "round_result", "next_round", "final_round"], "pauseGame");
  const timer = state.timer && state.timer.pausedAt === undefined
    ? { ...state.timer, pausedAt: now, remainingMs: Math.max(0, state.timer.expiresAt - now) }
    : state.timer;
  return transition({ ...cloneState(state), timer }, "paused", now, "game_paused");
}

export function resumeGame(state: GameState, now = 0): GameState {
  requireStatus(state, ["paused"], "resumeGame");
  const previousStatus = state.eventLog.slice().reverse().find((event) => event.type === "game_paused")?.fromStatus ?? "game_intro";
  const timer = state.timer?.remainingMs !== undefined
    ? { startedAt: now, expiresAt: now + state.timer.remainingMs }
    : state.timer;
  return transition({ ...cloneState(state), timer }, previousStatus, now, "game_resumed");
}

export function applyJoker(state: GameState, joker: JokerType, now = 0): GameState {
  requireStatus(state, ["question_active", "answer_locked"], "applyJoker");
  if (state.jokers.disabled.includes(joker)) {
    throw new GameEngineError(`Joker desactive: ${joker}.`);
  }
  if (state.jokers.available[joker] <= 0) {
    throw new GameEngineError(`Joker indisponible: ${joker}.`);
  }
  const available = { ...state.jokers.available, [joker]: state.jokers.available[joker] - 1 };
  const used = { ...state.jokers.used, [joker]: state.jokers.used[joker] + 1 };
  const timer = joker === "extra-time" && state.timer
    ? { ...state.timer, expiresAt: state.timer.expiresAt + 10_000 }
    : state.timer;
  return withEvent({ ...cloneState(state), jokers: { ...state.jokers, available, used }, timer }, "joker_used", now, { joker });
}

export function restoreGame(savedState: unknown, now = 0): GameState {
  const restored = gameStateSchema.parse(savedState);
  return withEvent(restored, "game_restored", now, { toStatus: restored.status });
}


