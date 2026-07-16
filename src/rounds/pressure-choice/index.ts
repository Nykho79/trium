import type { AnswerResult, GameConfig, GameRound, PressureChoiceQuestion, QuestionId, RoundState, ScoreBreakdown } from "../../core/types";
import { shuffleWithSeed } from "../../core/engine/random";
import { roundStateSchema } from "../../core/schemas/roundSchemas";

export const PRESSURE_CHOICE_QUESTION_COUNT = 5;
export const PRESSURE_CHOICE_MULTIPLIERS = [1, 1.5, 2, 3, 5] as const;
export const PRESSURE_CHOICE_TIME_LIMITS_SECONDS = [35, 30, 25, 20, 15] as const;

export class PressureChoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PressureChoiceError";
  }
}

const emptyScore: ScoreBreakdown = {
  basePoints: 0,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total: 0,
};

export function isPressureChoiceQuestion(question: { kind: string; type: string; editorialStatus?: string }): question is PressureChoiceQuestion {
  return question.kind === "pressure-choice" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}

export function pressureStepIndex(state: Pick<RoundState, "currentQuestionIndex">): number {
  return Math.min(PRESSURE_CHOICE_QUESTION_COUNT - 1, Math.max(0, state.currentQuestionIndex));
}

export function multiplierForPressureStep(stepIndex: number): number {
  const multiplier = PRESSURE_CHOICE_MULTIPLIERS[stepIndex];
  if (multiplier === undefined) {
    throw new PressureChoiceError(`Palier invalide: ${stepIndex + 1}.`);
  }
  return multiplier;
}

export function timeLimitForPressureStep(stepIndex: number): number {
  const seconds = PRESSURE_CHOICE_TIME_LIMITS_SECONDS[stepIndex];
  if (seconds === undefined) {
    throw new PressureChoiceError(`Chronometre invalide pour le palier ${stepIndex + 1}.`);
  }
  return seconds;
}

export function pressureBasePoints(question: PressureChoiceQuestion): number {
  return question.value ?? question.difficulty * 100;
}

export function calculatePressureChoiceScore(input: {
  question: PressureChoiceQuestion;
  isCorrect: boolean;
  stepIndex: number;
}): ScoreBreakdown {
  if (!input.isCorrect) {
    return { ...emptyScore };
  }
  const basePoints = pressureBasePoints(input.question);
  const total = Math.round(basePoints * multiplierForPressureStep(input.stepIndex));
  return {
    basePoints,
    timeBonus: 0,
    streakBonus: 0,
    jokerPenalty: 0,
    wagerDelta: total - basePoints,
    total,
  };
}

export function addRiskPoints(state: RoundState, points: number): RoundState {
  return { ...state, riskPoints: (state.riskPoints ?? 0) + points };
}

export function loseRiskPoints(state: RoundState): RoundState {
  return { ...state, riskPoints: 0 };
}

export function secureRiskPoints(state: RoundState): RoundState {
  const securedPoints = (state.securedPoints ?? 0) + (state.riskPoints ?? 0);
  return { ...state, securedPoints, riskPoints: 0, status: "complete" };
}

export function isPressureChoiceComplete(state: RoundState, config: GameConfig): boolean {
  const definition = config.rounds.find((round) => round.kind === "pressure-choice");
  const target = definition?.questionCount ?? PRESSURE_CHOICE_QUESTION_COUNT;
  const lastResult = state.answerResults.at(-1);
  return state.status === "complete" || state.answeredQuestionIds.length >= target || lastResult?.isCorrect === false;
}

export function selectPressureChoiceQuestions(input: {
  questions: readonly PressureChoiceQuestion[];
  alreadyUsedQuestionIds: readonly QuestionId[];
  seed: string;
  stepIndex: number;
}): readonly PressureChoiceQuestion[] {
  const used = new Set(input.alreadyUsedQuestionIds);
  const expectedDifficulty = (input.stepIndex + 1) as PressureChoiceQuestion["difficulty"];
  const eligible = input.questions.filter((question) => question.difficulty === expectedDifficulty && !used.has(question.id));
  const selected = shuffleWithSeed(eligible, `${input.seed}:pressure-choice:${input.stepIndex}`);
  if (selected.length === 0) {
    throw new PressureChoiceError(`Aucune question disponible pour la difficulte ${expectedDifficulty}.`);
  }
  return selected;
}

export const pressureChoiceRound: GameRound<RoundState, PressureChoiceQuestion, string> = {
  definition: {
    id: "pressure-choice",
    kind: "pressure-choice",
    label: "Choix sous pression",
    description: "Cinq QCM de difficulte croissante avec points a securiser.",
    questionTypes: ["multiple_choice"],
    questionCount: PRESSURE_CHOICE_QUESTION_COUNT,
    maxScore: 4_700,
  },
  initializeState: () => ({
    id: "pressure-choice-state",
    definitionId: "pressure-choice",
    status: "active",
    currentQuestionIndex: 0,
    selectedQuestionIds: [],
    answeredQuestionIds: [],
    answerResults: [],
    score: { ...emptyScore },
    securedPoints: 0,
    riskPoints: 0,
  }),
  selectQuestions: (input) => selectPressureChoiceQuestions({
    questions: input.questions,
    alreadyUsedQuestionIds: input.alreadyUsedQuestionIds,
    seed: input.seed,
    stepIndex: 0,
  }),
  handleAnswer: (state, question, answer) => {
    const isCorrect = answer === question.correctOptionId;
    const score = calculatePressureChoiceScore({ question, isCorrect, stepIndex: pressureStepIndex(state) });
    return {
      questionId: question.id,
      isCorrect,
      lockedAnswer: answer,
      correctAnswer: question.correctOptionId,
      explanation: question.explanation,
      score,
      usedJokers: [],
    } satisfies AnswerResult;
  },
  calculateScore: (result) => result.score,
  isComplete: (state, config) => isPressureChoiceComplete(state, config),
  summarize: (state) => ({
    roundId: state.id,
    label: "Choix sous pression",
    answeredQuestions: state.answeredQuestionIds.length,
    score: state.score,
    isComplete: state.status === "complete",
  }),
  restoreState: (savedState) => roundStateSchema.parse(savedState),
};