import type { GameConfig, GameState, GameStatus, GameTimerState, QuestionId } from "../types/game";
import type { ClueRaceQuestion, KnowledgeGridQuestion, MultipleChoiceOption, PressureChoiceQuestion, Question, SynapseQuestion } from "../types/question";
import type { RoundDefinition, RoundState } from "../types/round";
import type { AnswerResult, JokerEffectState, JokerInventory, JokerType, ScoreBreakdown } from "../types/scoring";
import type { GameEvent, GameEventType } from "../types/event";
import { INITIAL_JOKERS } from "../constants/scoring";
import { gameStateSchema } from "../schemas/gameSchemas";
import { calculateKnowledgeGridScore } from "../../rounds/knowledge-grid";
import { calculateClueRaceScore, revealNextClueInState, showAnswersInState } from "../../rounds/clue-race";
import { calculatePressureChoiceScore, isPressureChoiceComplete, loseRiskPoints, pressureStepIndex, secureRiskPoints, timeLimitForPressureStep } from "../../rounds/pressure-choice";
import { calculateConnectionsScore, revealNextConnectionItemInState, showConnectionAnswersInState } from "../../rounds/connections";
import { assertAllowedWagerAmount, calculateWagerScore, coefficientForWagerDifficulty } from "../../rounds/wager";
import { calculateSynapseScore, correctSynapseOptionId } from "../../rounds/synapse";
import { advantageById, calculateFinalConvergenceScore, canApplyFinalAdvantageToStep, finalStepForIndex, finalStepForQuestion, type FinalConvergenceAdvantageId } from "../../rounds/final-convergence";
import { shuffleWithSeed } from "./random";
import type { RecentQuestionGame } from "./replayability";
import { rankedReplayabilityCandidates } from "./replayability";

export class GameEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameEngineError";
  }
}

export interface CreateGameInput {
  config: GameConfig;
  recentlyPlayedQuestionIds?: QuestionId[] | undefined;
  recentQuestionHistory?: RecentQuestionGame[] | undefined;
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

export interface ApplyJokerInput {
  joker: JokerType;
  questions?: readonly Question[] | undefined;
  now?: number | undefined;
}
export interface PurchaseFinalAdvantageInput {
  advantageId: FinalConvergenceAdvantageId;
  now?: number | undefined;
}
export interface ConfigureWagerInput {
  categoryId: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  amount: number;
  now?: number | undefined;
}
interface AnswerOptionQuestion {
  id: QuestionId;
  options: readonly MultipleChoiceOption[];
  correctOptionId: string;
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
    fifty_fifty: 0,
    second_chance: 0,
    change_question: 0,
    contextual_hint: 0,
    extra_time: 0,
    team_vote: 0,
  };
}

function emptyJokerEffects(): JokerEffectState {
  return {
    eliminatedOptionIds: [],
    secondChanceActive: false,
    secondChanceConsumed: false,
    changedQuestionIds: [],
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    currentRoundState: state.currentRoundState ? { ...state.currentRoundState, selectedQuestionIds: [...state.currentRoundState.selectedQuestionIds], answeredQuestionIds: [...state.currentRoundState.answeredQuestionIds], answerResults: [...state.currentRoundState.answerResults], score: { ...state.currentRoundState.score } } : undefined,
    timer: state.timer ? { ...state.timer } : undefined,
    lastAnswerResult: state.lastAnswerResult ? { ...state.lastAnswerResult, score: { ...state.lastAnswerResult.score }, usedJokers: [...state.lastAnswerResult.usedJokers] } : undefined,
    usedQuestionIds: [...state.usedQuestionIds],
    recentlyPlayedQuestionIds: [...state.recentlyPlayedQuestionIds],
    recentQuestionHistory: state.recentQuestionHistory.map((entry) => ({ ...entry, questionIds: [...entry.questionIds] })),
    jokers: {
      available: { ...state.jokers.available },
      used: { ...state.jokers.used },
      disabled: [...state.jokers.disabled],
    },
    jokerEffects: {
      ...state.jokerEffects,
      eliminatedOptionIds: [...state.jokerEffects.eliminatedOptionIds],
      changedQuestionIds: [...state.jokerEffects.changedQuestionIds],
      teamVote: state.jokerEffects.teamVote ? {
        ...state.jokerEffects.teamVote,
        votes: { ...state.jokerEffects.teamVote.votes },
      } : undefined,
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

function questionDurationMs(question: Question, config: GameConfig, stepIndex = 0): number {
  if (question.kind === "pressure-choice") {
    return timeLimitForPressureStep(stepIndex) * 1000;
  }
  if (question.type === "multiple_choice" && question.timeLimitSeconds !== undefined) {
    return question.timeLimitSeconds * 1000;
  }
  return config.defaultQuestionTimeMs;
}

function answerWindowTimer(state: GameState, now: number): GameTimerState {
  const defaultDurationMs = state.config.defaultQuestionTimeMs;
  const remainingMs = state.timer ? Math.max(0, state.timer.expiresAt - now) : 0;
  const durationMs = Math.max(defaultDurationMs, remainingMs);
  return { startedAt: now, expiresAt: now + durationMs };
}

function isAnswerCorrect(question: Question, answer: string | string[]): boolean {
  if (question.type === "multiple_choice") {
    return typeof answer === "string" && answer === question.correctOptionId;
  }
  if (question.type === "progressive_clues" && question.correctOptionId !== undefined) {
    return typeof answer === "string" && answer === question.correctOptionId;
  }
  if (question.type === "connection" && question.correctOptionId !== undefined) {
    return typeof answer === "string" && answer === question.correctOptionId;
  }
  if (question.type === "chronology") {
    if (question.correctOptionId !== undefined) {
      return typeof answer === "string" && answer === question.correctOptionId;
    }
    return Array.isArray(answer) && answer.join("|") === question.correctOrderIds.join("|");
  }
  if (Array.isArray(answer)) {
    return false;
  }
  if (question.kind === "synapse") {
    const correctOptionId = correctSynapseOptionId(question as SynapseQuestion);
    if (correctOptionId !== undefined) {
      return answer === correctOptionId;
    }
  }
  return question.answer.accepted.map(normalizeText).includes(normalizeText(answer));
}

function displayCorrectAnswer(question: Question): string | string[] {
  if (question.type === "multiple_choice") {
    return question.options.find((option) => option.id === question.correctOptionId)?.label ?? question.answer?.display ?? question.correctOptionId;
  }
  if (question.type === "progressive_clues") {
    return question.correctOptionId ?? question.answer.display;
  }
  if (question.type === "connection") {
    return question.correctOptionId ?? question.answer.display;
  }
  if (question.type === "chronology") {
    return question.correctOptionId ?? question.correctOrderIds;
  }
  if (question.kind === "synapse") {
    return correctSynapseOptionId(question as SynapseQuestion) ?? question.answer.display;
  }
  return question.answer.display;
}

function basePointsFor(question: Question): number {
  if (question.type === "multiple_choice" && question.value !== undefined) {
    return question.value;
  }
  return question.difficulty * 100;
}

function currentCorrectStreak(roundState: RoundState): number {
  let streak = 0;
  for (const result of roundState.answerResults.slice().reverse()) {
    if (!result.isCorrect) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function calculateAnswerScore(question: Question, isCorrect: boolean, timer: GameTimerState | undefined, now: number, roundState: RoundState): ScoreBreakdown {
  if (question.kind === "final-convergence") {
    return calculateFinalConvergenceScore(isCorrect);
  }
  if (question.kind === "wager" && question.type === "multiple_choice") {
    return calculateWagerScore({
      isCorrect,
      amount: roundState.wagerAmount ?? 100,
      coefficient: roundState.wagerCoefficient ?? coefficientForWagerDifficulty(question.difficulty),
    });
  }
  if (!isCorrect) {
    return { ...emptyScore };
  }
  if (question.kind === "knowledge-grid" && question.type === "multiple_choice") {
    const timeLimitMs = timer ? timer.expiresAt - timer.startedAt : 30_000;
    const answeredInMs = timer ? now - timer.startedAt : timeLimitMs;
    return calculateKnowledgeGridScore({
      question: question as KnowledgeGridQuestion,
      isCorrect,
      answeredInMs,
      timeLimitMs,
      currentCorrectStreak: currentCorrectStreak(roundState),
    });
  }

  if (question.kind === "clue-race" && question.type === "progressive_clues") {
    return calculateClueRaceScore({
      question: question as ClueRaceQuestion,
      isCorrect,
      clueIndex: roundState.clueIndex ?? 0,
    });
  }


  if (question.kind === "pressure-choice" && question.type === "multiple_choice") {
    return calculatePressureChoiceScore({
      question: question as PressureChoiceQuestion,
      isCorrect,
      stepIndex: pressureStepIndex(roundState),
    });
  }

  if (question.kind === "connections" && question.type === "connection") {
    return calculateConnectionsScore({
      isCorrect,
      itemIndex: roundState.connectionItemIndex ?? 0,
    });
  }

  if (question.kind === "synapse") {
    const timeLimitMs = timer ? timer.expiresAt - timer.startedAt : 30_000;
    const answeredInMs = timer ? now - timer.startedAt : timeLimitMs;
    return calculateSynapseScore({
      question: question as SynapseQuestion,
      isCorrect,
      answeredInMs,
      timeLimitMs,
    });
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

function clampScoreTotal(score: ScoreBreakdown): ScoreBreakdown {
  if (score.total >= 0) {
    return score;
  }
  return { ...score, wagerDelta: score.wagerDelta - score.total, total: 0 };
}

function scoreFromPoints(points: number): ScoreBreakdown {
  return {
    basePoints: points,
    timeBonus: 0,
    streakBonus: 0,
    jokerPenalty: 0,
    wagerDelta: 0,
    total: points,
  };
}

function finalPurchasedAdvantages(roundState: RoundState): readonly FinalConvergenceAdvantageId[] {
  return (roundState.finalPurchasedAdvantageIds ?? []) as readonly FinalConvergenceAdvantageId[];
}

function finalUsedAdvantages(roundState: RoundState): readonly FinalConvergenceAdvantageId[] {
  return (roundState.finalUsedAdvantageIds ?? []) as readonly FinalConvergenceAdvantageId[];
}

function hasFinalAdvantage(roundState: RoundState, advantageId: FinalConvergenceAdvantageId): boolean {
  return finalPurchasedAdvantages(roundState).includes(advantageId);
}

function hasUsedFinalAdvantage(roundState: RoundState, advantageId: FinalConvergenceAdvantageId): boolean {
  return finalUsedAdvantages(roundState).includes(advantageId);
}

function markFinalAdvantageUsed(roundState: RoundState, advantageId: FinalConvergenceAdvantageId): RoundState {
  if (hasUsedFinalAdvantage(roundState, advantageId)) {
    return roundState;
  }
  return { ...roundState, finalUsedAdvantageIds: [...(roundState.finalUsedAdvantageIds ?? []), advantageId] };
}

function finalAdvantageCanTrigger(roundState: RoundState, advantageId: FinalConvergenceAdvantageId, question: Question): boolean {
  const step = finalStepForQuestion(question);
  return step !== undefined && hasFinalAdvantage(roundState, advantageId) && !hasUsedFinalAdvantage(roundState, advantageId) && canApplyFinalAdvantageToStep(advantageId, step);
}

function questionOptions(question: Question): readonly MultipleChoiceOption[] | undefined {
  if (question.type === "multiple_choice" || question.type === "progressive_clues" || question.type === "connection" || question.type === "chronology" || question.type === "analogy" || question.type === "memory" || question.type === "sequence") {
    return question.options;
  }
  if (question.type === "intruder") {
    return question.items;
  }
  if (question.type === "visual_matrix" || question.type === "symbol_rule") {
    return question.options;
  }
  return undefined;
}

function questionCorrectOptionId(question: Question): string | undefined {
  if ("correctOptionId" in question) {
    return question.correctOptionId;
  }
  return undefined;
}

function deterministicSingleWrongOption(question: Question, seed: string): string | undefined {
  const options = questionOptions(question);
  const correctOptionId = questionCorrectOptionId(question);
  if (!options || !correctOptionId) {
    return undefined;
  }
  return shuffleWithSeed(options.filter((option) => option.id !== correctOptionId).map((option) => option.id), `${seed}:final:remove-wrong:${question.id}`)[0];
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
  let candidates = questions.filter((question) => question.kind === definition.kind && definition.questionTypes.includes(question.type));
  const explicitQuestion = questionId ? candidates.find((question) => question.id === questionId) : undefined;
  if (!explicitQuestion && definition.kind === "pressure-choice") {
    const expectedDifficulty = Math.min(5, roundState.currentQuestionIndex + 1);
    candidates = candidates.filter((question) => question.difficulty === expectedDifficulty);
  }
  if (!explicitQuestion && definition.kind === "final-convergence") {
    const expectedStep = finalStepForIndex(roundState.currentQuestionIndex);
    candidates = candidates.filter((question) => finalStepForQuestion(question) === expectedStep);
  }
  if (!explicitQuestion && definition.kind === "wager") {
    if (!roundState.wagerCategoryId || roundState.wagerDifficulty === undefined || roundState.wagerAmount === undefined) {
      throw new GameEngineError("Le pari doit etre configure avant de charger une question.");
    }
    candidates = candidates.filter((question) => question.categoryId === roundState.wagerCategoryId && question.difficulty === roundState.wagerDifficulty);
  }
  const rankedCandidates = rankedReplayabilityCandidates({
    questions: candidates,
    roundKind: definition.kind,
    usedQuestionIds: state.usedQuestionIds,
    recentlyPlayedQuestionIds: state.recentlyPlayedQuestionIds,
    recentQuestionHistory: state.recentQuestionHistory,
    seed: state.config.seed,
  });
  const maxTier = state.config.allowRecentlyPlayedFallback ? 4 : 2;
  const eligibleRanked = rankedCandidates.filter((candidate) => candidate.tierIndex <= maxTier);
  const bestTier = eligibleRanked.length > 0 ? Math.min(...eligibleRanked.map((candidate) => candidate.tierIndex)) : Number.POSITIVE_INFINITY;
  const selectionPool = eligibleRanked.filter((candidate) => candidate.tierIndex === bestTier).map((candidate) => candidate.question);
  const selected = explicitQuestion ?? shuffleWithSeed(
    selectionPool,
    `${state.config.seed}:${definition.id}:${roundState.currentQuestionIndex}:${state.recentlyPlayedQuestionIds.length}:${bestTier}`,
  )[0];

  if (!selected) {
    throw new GameEngineError(`Aucune question disponible pour la manche ${definition.id}.`);
  }
  if (state.usedQuestionIds.includes(selected.id)) {
    throw new GameEngineError(`Question deja jouee dans cette partie: ${selected.id}.`);
  }
  return selected;
}


const FORBIDDEN_JOKERS_BY_ROUND: Partial<Record<GameConfig["rounds"][number]["kind"], readonly JokerType[]>> = {
  "clue-race": ["second_chance", "change_question", "contextual_hint", "team_vote"],
  "synapse": ["fifty_fifty", "change_question", "team_vote"],
  "connections": ["change_question", "extra_time", "team_vote"],
  "wager": ["change_question", "team_vote"],
  "final-convergence": ["fifty_fifty", "second_chance", "change_question", "contextual_hint", "extra_time", "team_vote"],
};

function resetQuestionJokerEffects(effects: JokerEffectState): JokerEffectState {
  return {
    ...effects,
    eliminatedOptionIds: [],
    secondChanceActive: false,
    secondChanceConsumed: false,
    contextualHint: undefined,
    teamVote: undefined,
  };
}

function halveScore(score: ScoreBreakdown): ScoreBreakdown {
  const basePoints = Math.floor(score.basePoints / 2);
  const timeBonus = Math.floor(score.timeBonus / 2);
  const streakBonus = Math.floor(score.streakBonus / 2);
  const wagerDelta = Math.floor(score.wagerDelta / 2);
  return {
    basePoints,
    timeBonus,
    streakBonus,
    jokerPenalty: score.jokerPenalty,
    wagerDelta,
    total: basePoints + timeBonus + streakBonus + wagerDelta - score.jokerPenalty,
  };
}

function activeAnswerOptionQuestion(state: GameState, questions: readonly Question[] | undefined): AnswerOptionQuestion {
  if (!questions) {
    throw new GameEngineError("Ce joker exige la banque de questions active.");
  }
  const question = findActiveQuestion(state, questions);
  if (question.type === "multiple_choice") {
    return question;
  }
  if (question.type === "progressive_clues" && question.options !== undefined && question.correctOptionId !== undefined) {
    if (currentRoundDefinition(state).kind === "clue-race" && state.currentRoundState?.answersVisible !== true) {
      throw new GameEngineError("Le 50/50 est disponible seulement apres affichage des reponses.");
    }
    return { id: question.id, options: question.options, correctOptionId: question.correctOptionId };
  }
  if (question.type === "connection" && question.options !== undefined && question.correctOptionId !== undefined) {
    if (currentRoundDefinition(state).kind === "connections" && state.currentRoundState?.answersVisible !== true) {
      throw new GameEngineError("Le 50/50 est disponible seulement apres affichage des reponses.");
    }
    return { id: question.id, options: question.options, correctOptionId: question.correctOptionId };
  }
  throw new GameEngineError("Ce joker exige une question avec quatre propositions.");
}

function deterministicWrongOptions(question: AnswerOptionQuestion, seed: string): string[] {
  const wrongOptionIds = question.options.filter((option) => option.id !== question.correctOptionId).map((option) => option.id);
  return shuffleWithSeed(wrongOptionIds, `${seed}:${question.id}:fifty_fifty`).slice(0, 2);
}

function hintFor(question: Question): string {
  if (question.contextualHint) {
    return question.contextualHint;
  }
  const explanation = question.explanation ?? "Indice indisponible pour cette question.";
  const firstSentence = explanation.split(/[.!?]/).find((part) => part.trim().length > 0)?.trim();
  return firstSentence ? `${firstSentence}.` : explanation.slice(0, 140);
}

function replacementQuestion(state: GameState, questions: readonly Question[] | undefined): Question {
  if (!questions) {
    throw new GameEngineError("Le changement de question exige la banque de questions active.");
  }
  const active = findActiveQuestion(state, questions);
  const candidates = questions.filter((question) => (
    question.id !== active.id
    && question.kind === active.kind
    && question.type === active.type
    && question.categoryId === active.categoryId
    && question.difficulty === active.difficulty
    && !state.usedQuestionIds.includes(question.id)
  ));
  const selected = shuffleWithSeed(candidates, `${state.config.seed}:${active.id}:change_question`)[0];
  if (!selected) {
    throw new GameEngineError("Aucune question de remplacement disponible pour cette categorie et cette difficulte.");
  }
  return selected;
}

function assertJokerAllowed(state: GameState, joker: JokerType, now: number): void {
  const round = currentRoundDefinition(state);
  if (FORBIDDEN_JOKERS_BY_ROUND[round.kind]?.includes(joker)) {
    throw new GameEngineError(`Joker interdit dans cette manche: ${joker}.`);
  }
  if (state.jokers.disabled.includes(joker)) {
    throw new GameEngineError(`Joker desactive: ${joker}.`);
  }
  if (state.jokers.used[joker] > 0 || state.jokers.available[joker] <= 0) {
    throw new GameEngineError(`Joker indisponible: ${joker}.`);
  }
  if (joker === "team_vote" && state.config.playerMode === "solo") {
    throw new GameEngineError("Le vote des trois joueurs est indisponible en mode solo.");
  }
  if (joker === "fifty_fifty" && round.kind === "clue-race" && state.currentRoundState?.answersVisible !== true) {
    throw new GameEngineError("Le 50/50 est disponible seulement apres affichage des reponses.");
  }
  if (joker === "change_question" && round.kind === "pressure-choice" && pressureStepIndex(requireRound(state)) >= 4) {
    throw new GameEngineError("Le changement de question est interdit sur la derniere question.");
  }
  if (joker === "extra_time" && (!state.timer || isTimerExpired(state.timer, now))) {
    throw new GameEngineError("Le temps supplementaire est impossible apres expiration.");
  }
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
  if (input.config.playerMode === "solo" && input.config.players.length !== 1) {
    throw new GameEngineError("Une partie TRIUM en solo exige exactement un joueur.");
  }
  if (input.config.playerMode === "trio" && input.config.players.length !== 3) {
    throw new GameEngineError("Une partie TRIUM en trio exige exactement trois joueurs.");
  }
  const now = input.now ?? 0;
  const initial: GameState = {
    status: "idle",
    config: input.config,
    currentRoundIndex: 0,
    captainPlayerId: input.config.players[0].id,
    usedQuestionIds: [],
    recentlyPlayedQuestionIds: input.recentlyPlayedQuestionIds ?? [],
    recentQuestionHistory: input.recentQuestionHistory ?? [],
    jokers: { available: { ...INITIAL_JOKERS }, used: zeroJokers(), disabled: [] },
    jokerEffects: emptyJokerEffects(),
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
    answerResults: [],
    score: { ...emptyScore },
    clueIndex: definition.kind === "clue-race" ? 0 : undefined,
    answersVisible: definition.kind === "clue-race" || definition.kind === "connections" ? false : undefined,
    connectionItemIndex: definition.kind === "connections" ? 0 : undefined,
    securedPoints: definition.kind === "pressure-choice" ? 0 : undefined,
    riskPoints: definition.kind === "pressure-choice" ? 0 : undefined,
    wagerCategoryId: undefined,
    wagerDifficulty: undefined,
    wagerAmount: undefined,
    wagerCoefficient: undefined,
    wagerIsFreeStake: undefined,
    finalPurchasedAdvantageIds: definition.kind === "final-convergence" ? [] : undefined,
    finalUsedAdvantageIds: definition.kind === "final-convergence" ? [] : undefined,
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

export function purchaseFinalAdvantage(state: GameState, input: PurchaseFinalAdvantageInput): GameState {
  requireStatus(state, ["round_intro"], "purchaseFinalAdvantage");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "final-convergence") {
    throw new GameEngineError("Cette action est reservee a Convergence finale.");
  }
  const roundState = requireRound(state);
  const advantage = advantageById(input.advantageId);
  if (hasFinalAdvantage(roundState, input.advantageId)) {
    throw new GameEngineError("Cet avantage est deja achete.");
  }
  if (state.score.total < advantage.cost) {
    throw new GameEngineError("Score insuffisant pour acheter cet avantage.");
  }
  const costScore: ScoreBreakdown = { ...emptyScore, jokerPenalty: advantage.cost, total: -advantage.cost };
  return withEvent({
    ...cloneState(state),
    currentRoundState: {
      ...roundState,
      finalPurchasedAdvantageIds: [...(roundState.finalPurchasedAdvantageIds ?? []), input.advantageId],
    },
    score: addScore(state.score, costScore),
  }, "status_changed", input.now ?? 0, { message: `Avantage achete: ${advantage.label}` });
}
export function configureWager(state: GameState, input: ConfigureWagerInput): GameState {
  requireStatus(state, ["round_intro", "answer_reveal"], "configureWager");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "wager") {
    throw new GameEngineError("Cette action est reservee au Pari.");
  }
  const roundState = requireRound(state);
  assertAllowedWagerAmount({ amount: input.amount, scoreTotal: state.score.total });
  const coefficient = coefficientForWagerDifficulty(input.difficulty);
  return withEvent({
    ...cloneState(state),
    currentRoundState: {
      ...roundState,
      wagerCategoryId: input.categoryId,
      wagerDifficulty: input.difficulty,
      wagerAmount: input.amount,
      wagerCoefficient: coefficient,
      wagerIsFreeStake: state.score.total < 100 && input.amount === 100,
    },
  }, "status_changed", input.now ?? 0, { message: `Pari configure: ${input.amount} x${coefficient}` });
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
  let durationMs = questionDurationMs(selected, state.config, pressureStepIndex(roundState));
  let nextRoundState: RoundState = {
    ...roundState,
    selectedQuestionIds: [...roundState.selectedQuestionIds, selected.id],
    clueIndex: selected.kind === "clue-race" || selected.kind === "final-convergence" ? 0 : roundState.clueIndex,
    answersVisible: selected.kind === "clue-race" || selected.kind === "connections" || selected.kind === "final-convergence" ? false : roundState.answersVisible,
    connectionItemIndex: selected.kind === "connections" || selected.kind === "final-convergence" ? 0 : roundState.connectionItemIndex,
  };
  let nextJokerEffects = resetQuestionJokerEffects(state.jokerEffects);
  if (selected.kind === "final-convergence") {
    if (finalAdvantageCanTrigger(nextRoundState, "extra_time", selected)) {
      durationMs += 15_000;
      nextRoundState = markFinalAdvantageUsed(nextRoundState, "extra_time");
    }
    if (finalAdvantageCanTrigger(nextRoundState, "remove_wrong_answer", selected)) {
      const eliminatedOptionId = deterministicSingleWrongOption(selected, state.config.seed);
      if (eliminatedOptionId !== undefined) {
        nextJokerEffects = { ...nextJokerEffects, eliminatedOptionIds: [eliminatedOptionId] };
        nextRoundState = markFinalAdvantageUsed(nextRoundState, "remove_wrong_answer");
      }
    }
  }
  let next = transition({
    ...cloneState(state),
    status: "question_loading",
    currentRoundState: nextRoundState,
    activeQuestionId: selected.id,
    captainPlayerId: captain.id,
    timer: { startedAt: input.now, expiresAt: input.now + durationMs },
    lockedAnswer: undefined,
    lastAnswerResult: undefined,
    jokerEffects: nextJokerEffects,
    usedQuestionIds: [...state.usedQuestionIds, selected.id],
  }, "question_active", input.now, "question_loaded");
  next = withEvent(next, "captain_rotated", input.now, { questionId: selected.id, message: `Capitaine: ${captain.id}` });
  return next;
}

export function activateFinalConvergenceHint(state: GameState, questions: readonly Question[], now = 0): GameState {
  requireStatus(state, ["question_active", "answer_locked"], "activateFinalConvergenceHint");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "final-convergence") {
    throw new GameEngineError("Cette action est reservee a Convergence finale.");
  }
  const question = findActiveQuestion(state, questions);
  const roundState = requireRound(state);
  if (!finalAdvantageCanTrigger(roundState, "extra_hint", question)) {
    throw new GameEngineError("Aucun indice supplementaire disponible pour cette etape.");
  }
  return withEvent({
    ...cloneState(state),
    currentRoundState: markFinalAdvantageUsed(roundState, "extra_hint"),
    jokerEffects: { ...state.jokerEffects, contextualHint: hintFor(question) },
  }, "status_changed", now, { questionId: question.id, message: "Indice supplementaire de finale affiche." });
}
export function revealNextClue(state: GameState, now = 0): GameState {
  requireStatus(state, ["question_active"], "revealNextClue");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "clue-race") {
    throw new GameEngineError("Cette action est reservee a Course aux indices.");
  }
  const roundState = requireRound(state);
  return withEvent({
    ...cloneState(state),
    currentRoundState: revealNextClueInState(roundState),
  }, "status_changed", now, { questionId: state.activeQuestionId, message: "Indice suivant revele." });
}

export function showClueRaceAnswers(state: GameState, now = 0): GameState {
  requireStatus(state, ["question_active"], "showClueRaceAnswers");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "clue-race") {
    throw new GameEngineError("Cette action est reservee a Course aux indices.");
  }
  const roundState = requireRound(state);
  return withEvent({
    ...cloneState(state),
    currentRoundState: showAnswersInState(roundState),
    timer: answerWindowTimer(state, now),
  }, "status_changed", now, { questionId: state.activeQuestionId, message: "Propositions affichees." });
}
export function revealNextConnectionItem(state: GameState, now = 0): GameState {
  requireStatus(state, ["question_active"], "revealNextConnectionItem");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "connections") {
    throw new GameEngineError("Cette action est reservee a Connexions.");
  }
  const roundState = requireRound(state);
  return withEvent({
    ...cloneState(state),
    currentRoundState: revealNextConnectionItemInState(roundState),
  }, "status_changed", now, { questionId: state.activeQuestionId, message: "Element suivant revele." });
}

export function showConnectionAnswerOptions(state: GameState, now = 0): GameState {
  requireStatus(state, ["question_active"], "showConnectionAnswerOptions");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "connections") {
    throw new GameEngineError("Cette action est reservee a Connexions.");
  }
  const roundState = requireRound(state);
  return withEvent({
    ...cloneState(state),
    currentRoundState: showConnectionAnswersInState(roundState),
  }, "status_changed", now, { questionId: state.activeQuestionId, message: "Propositions de connexion affichees." });
}
export function submitAnswer(state: GameState, input: SubmitAnswerInput): GameState {
  requireStatus(state, ["question_active"], "submitAnswer");
  if ((currentRoundDefinition(state).kind === "clue-race" || currentRoundDefinition(state).kind === "connections") && state.currentRoundState?.answersVisible !== true) {
    throw new GameEngineError("Les propositions doivent etre affichees avant de repondre.");
  }
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
  const rawIsCorrect = isAnswerCorrect(question, state.lockedAnswer);
  let isCorrect = rawIsCorrect;
  let roundState = requireRound(state);

  if (!isCorrect && state.jokerEffects.secondChanceActive && !state.jokerEffects.secondChanceConsumed) {
    return withEvent({
      ...cloneState(state),
      status: "question_active",
      lockedAnswer: undefined,
      jokerEffects: { ...state.jokerEffects, secondChanceActive: false, secondChanceConsumed: true },
    }, "joker_used", input.now, { joker: "second_chance", questionId: question.id, message: "Seconde chance activee." });
  }

  if (!isCorrect && question.kind === "final-convergence" && finalAdvantageCanTrigger(roundState, "second_chance", question)) {
    return withEvent({
      ...cloneState(state),
      status: "question_active",
      lockedAnswer: undefined,
      currentRoundState: markFinalAdvantageUsed(roundState, "second_chance"),
    }, "status_changed", input.now, { questionId: question.id, message: "Deuxieme chance de finale activee." });
  }

  if (!isCorrect && question.kind === "final-convergence" && state.lockedAnswer !== "temps-ecoule" && finalAdvantageCanTrigger(roundState, "error_protection", question)) {
    isCorrect = true;
    roundState = markFinalAdvantageUsed(roundState, "error_protection");
  }

  const initialScore = calculateAnswerScore(question, isCorrect, state.timer, input.now, roundState);
  const score = state.jokerEffects.secondChanceConsumed && isCorrect ? halveScore(initialScore) : initialScore;
  const result: AnswerResult = {
    questionId: question.id,
    isCorrect,
    lockedAnswer: state.lockedAnswer,
    correctAnswer: displayCorrectAnswer(question),
    explanation: question.explanation,
    score,
    usedJokers: Object.entries(state.jokers.used).filter(([, count]) => count > 0).map(([joker]) => joker as JokerType),
  };
  const baseRoundState: RoundState = {
    ...roundState,
    currentQuestionIndex: roundState.currentQuestionIndex + 1,
    answeredQuestionIds: [...roundState.answeredQuestionIds, question.id],
    answerResults: [...roundState.answerResults, { questionId: question.id, isCorrect }],
  };
  const roundDefinition = currentRoundDefinition(state);
  const isPressureChoice = roundDefinition.kind === "pressure-choice";
  const nextRoundScore = roundDefinition.kind === "wager" ? clampScoreTotal(addScore(roundState.score, score)) : addScore(roundState.score, score);
  const nextRoundState = isPressureChoice
    ? isCorrect
      ? { ...baseRoundState, riskPoints: (roundState.riskPoints ?? 0) + score.total }
      : loseRiskPoints(baseRoundState)
    : { ...baseRoundState, score: nextRoundScore };
  const nextScore = isPressureChoice ? state.score : roundDefinition.kind === "wager" ? clampScoreTotal(addScore(state.score, score)) : addScore(state.score, score);

  return transition({
    ...cloneState(state),
    currentRoundState: nextRoundState,
    lastAnswerResult: result,
    jokerEffects: resetQuestionJokerEffects(state.jokerEffects),
    score: nextScore,
  }, "answer_reveal", input.now, "answer_revealed");
}

export function securePressureChoicePoints(state: GameState, now = 0): GameState {
  requireStatus(state, ["answer_reveal"], "securePressureChoicePoints");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "pressure-choice") {
    throw new GameEngineError("Cette action est reservee a Choix sous pression.");
  }
  const roundState = requireRound(state);
  const riskPoints = roundState.riskPoints ?? 0;
  if (riskPoints <= 0) {
    throw new GameEngineError("Aucun point a risque a securiser.");
  }
  const securedScore = scoreFromPoints(riskPoints);
  const securedRoundState = secureRiskPoints({
    ...roundState,
    score: addScore(roundState.score, securedScore),
  });
  return transition({
    ...cloneState(state),
    currentRoundState: securedRoundState,
    activeQuestionId: undefined,
    lockedAnswer: undefined,
    timer: undefined,
    score: addScore(state.score, securedScore),
  }, "round_result", now, "round_completed");
}

export function expirePressureChoiceQuestion(state: GameState, input: RevealAnswerInput): GameState {
  requireStatus(state, ["question_active"], "expirePressureChoiceQuestion");
  const definition = currentRoundDefinition(state);
  if (definition.kind !== "pressure-choice") {
    throw new GameEngineError("Cette action est reservee a Choix sous pression.");
  }
  if (!isTimerExpired(state.timer, input.now)) {
    throw new GameEngineError("Le chrono n'est pas encore expire.");
  }
  const question = findActiveQuestion(state, input.questions);
  const roundState = requireRound(state);
  const result: AnswerResult = {
    questionId: question.id,
    isCorrect: false,
    lockedAnswer: "temps-ecoule",
    correctAnswer: displayCorrectAnswer(question),
    explanation: question.explanation,
    score: { ...emptyScore },
    usedJokers: Object.entries(state.jokers.used).filter(([, count]) => count > 0).map(([joker]) => joker as JokerType),
  };
  const nextRoundState = loseRiskPoints({
    ...roundState,
    currentQuestionIndex: roundState.currentQuestionIndex + 1,
    answeredQuestionIds: [...roundState.answeredQuestionIds, question.id],
    answerResults: [...roundState.answerResults, { questionId: question.id, isCorrect: false }],
  });
  return transition({
    ...cloneState(state),
    currentRoundState: nextRoundState,
    lockedAnswer: "temps-ecoule",
    lastAnswerResult: result,
    jokerEffects: resetQuestionJokerEffects(state.jokerEffects),
  }, "answer_reveal", input.now, "answer_revealed");
}
export function expireQuestion(state: GameState, input: RevealAnswerInput): GameState {
  requireStatus(state, ["question_active"], "expireQuestion");
  const definition = currentRoundDefinition(state);
  if (definition.kind === "pressure-choice") {
    return expirePressureChoiceQuestion(state, input);
  }
  if (!isTimerExpired(state.timer, input.now)) {
    throw new GameEngineError("Le chrono n'est pas encore expire.");
  }
  const question = findActiveQuestion(state, input.questions);
  const roundState = requireRound(state);
  const score = calculateAnswerScore(question, false, state.timer, input.now, roundState);
  const result: AnswerResult = {
    questionId: question.id,
    isCorrect: false,
    lockedAnswer: "temps-ecoule",
    correctAnswer: displayCorrectAnswer(question),
    explanation: question.explanation,
    score,
    usedJokers: Object.entries(state.jokers.used).filter(([, count]) => count > 0).map(([joker]) => joker as JokerType),
  };
  const baseRoundState: RoundState = {
    ...roundState,
    currentQuestionIndex: roundState.currentQuestionIndex + 1,
    answeredQuestionIds: [...roundState.answeredQuestionIds, question.id],
    answerResults: [...roundState.answerResults, { questionId: question.id, isCorrect: false }],
  };
  const nextRoundScore = definition.kind === "wager" ? clampScoreTotal(addScore(roundState.score, score)) : addScore(roundState.score, score);
  const nextScore = definition.kind === "wager" ? clampScoreTotal(addScore(state.score, score)) : addScore(state.score, score);

  return transition({
    ...cloneState(state),
    currentRoundState: { ...baseRoundState, score: nextRoundScore },
    lockedAnswer: "temps-ecoule",
    lastAnswerResult: result,
    jokerEffects: resetQuestionJokerEffects(state.jokerEffects),
    score: nextScore,
  }, "answer_reveal", input.now, "answer_revealed");
}
export function completeRound(state: GameState, now = 0): GameState {
  requireStatus(state, ["answer_reveal"], "completeRound");
  const roundState = requireRound(state);
  const definition = currentRoundDefinition(state);
  const isPressureChoice = definition.kind === "pressure-choice";
  const canCompletePressureChoice = isPressureChoice && isPressureChoiceComplete(roundState, state.config);
  if (roundState.answeredQuestionIds.length < definition.questionCount && !canCompletePressureChoice) {
    throw new GameEngineError("La manche ne peut pas etre terminee avant son quota de questions.");
  }

  const riskPoints = isPressureChoice ? roundState.riskPoints ?? 0 : 0;
  const securedScore = scoreFromPoints(riskPoints);
  const completedRoundState = isPressureChoice && riskPoints > 0
    ? secureRiskPoints({ ...roundState, score: addScore(roundState.score, securedScore) })
    : { ...roundState, status: "complete" as const };
  const completedScore = riskPoints > 0 ? addScore(state.score, securedScore) : state.score;

  return transition({
    ...cloneState(state),
    currentRoundState: completedRoundState,
    activeQuestionId: undefined,
    lockedAnswer: undefined,
    timer: undefined,
    score: completedScore,
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

export function applyJoker(state: GameState, input: ApplyJokerInput | JokerType, now = 0): GameState {
  const request: ApplyJokerInput = typeof input === "string" ? { joker: input, now } : input;
  const appliedAt = request.now ?? now;
  const joker = request.joker;
  requireStatus(state, ["question_active", "answer_locked"], "applyJoker");
  assertJokerAllowed(state, joker, appliedAt);

  const available = { ...state.jokers.available, [joker]: state.jokers.available[joker] - 1 };
  const used = { ...state.jokers.used, [joker]: state.jokers.used[joker] + 1 };
  const baseState = cloneState(state);
  const nextJokers = { ...state.jokers, available, used };

  if (joker === "fifty_fifty") {
    const question = activeAnswerOptionQuestion(state, request.questions);
    const eliminatedOptionIds = deterministicWrongOptions(question, state.config.seed);
    return withEvent({
      ...baseState,
      jokers: nextJokers,
      jokerEffects: { ...state.jokerEffects, eliminatedOptionIds },
    }, "joker_used", appliedAt, { joker, questionId: question.id });
  }

  if (joker === "second_chance") {
    return withEvent({
      ...baseState,
      jokers: nextJokers,
      jokerEffects: { ...state.jokerEffects, secondChanceActive: true, secondChanceConsumed: false },
    }, "joker_used", appliedAt, { joker, questionId: state.activeQuestionId });
  }

  if (joker === "change_question") {
    const replacement = replacementQuestion(state, request.questions);
    const roundState = requireRound(state);
    return withEvent({
      ...baseState,
      jokers: nextJokers,
      activeQuestionId: replacement.id,
      lockedAnswer: undefined,
      lastAnswerResult: undefined,
      usedQuestionIds: [...state.usedQuestionIds, replacement.id],
      currentRoundState: {
        ...roundState,
        selectedQuestionIds: [...roundState.selectedQuestionIds, replacement.id],
      },
      jokerEffects: {
        ...resetQuestionJokerEffects(state.jokerEffects),
        changedQuestionIds: [...state.jokerEffects.changedQuestionIds, state.activeQuestionId ?? "", replacement.id].filter((id) => id.length > 0),
      },
      timer: { startedAt: appliedAt, expiresAt: appliedAt + questionDurationMs(replacement, state.config, pressureStepIndex(roundState)) },
    }, "joker_used", appliedAt, { joker, questionId: replacement.id });
  }

  if (joker === "contextual_hint") {
    const question = findActiveQuestion(state, request.questions ?? []);
    if (question.kind === "synapse" && question.type !== "analogy" && question.type !== "sequence") {
      throw new GameEngineError("L'indice contextuel est reserve aux analogies et aux suites dans Synapse.");
    }
    return withEvent({
      ...baseState,
      jokers: nextJokers,
      jokerEffects: { ...state.jokerEffects, contextualHint: hintFor(question) },
    }, "joker_used", appliedAt, { joker, questionId: question.id });
  }

  if (joker === "extra_time") {
    const timer = state.timer ? { ...state.timer, expiresAt: state.timer.expiresAt + 20_000 } : state.timer;
    return withEvent({ ...baseState, jokers: nextJokers, timer }, "joker_used", appliedAt, { joker, questionId: state.activeQuestionId });
  }

  return withEvent({
    ...baseState,
    jokers: nextJokers,
    jokerEffects: { ...state.jokerEffects, teamVote: { active: true, votes: {} } },
  }, "joker_used", appliedAt, { joker, questionId: state.activeQuestionId });
}

export function awardJoker(state: GameState, joker: JokerType, now = 0): GameState {
  if (state.jokers.used[joker] > 0 || state.jokers.available[joker] > 0) {
    return state;
  }
  return withEvent({
    ...cloneState(state),
    jokers: { ...state.jokers, available: { ...state.jokers.available, [joker]: 1 } },
  }, "joker_awarded", now, { joker, message: `Joker gagne: ${joker}` });
}
export function restoreGame(savedState: unknown, now = 0): GameState {
  const restored = gameStateSchema.parse(savedState);
  return withEvent(restored, "game_restored", now, { toStatus: restored.status });
}
