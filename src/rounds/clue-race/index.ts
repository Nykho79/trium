import type { AnswerResult, ClueRaceQuestion, GameConfig, GameRound, QuestionId, RoundState, ScoreBreakdown } from "../../core/types";
import { shuffleWithSeed } from "../../core/engine/random";
import { roundStateSchema } from "../../core/schemas/roundSchemas";

export const CLUE_RACE_QUESTION_COUNT = 5;
export const CLUE_RACE_CLUE_COUNT = 5;
export const CLUE_RACE_POINTS = [500, 400, 300, 200, 100] as const;

export class ClueRaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClueRaceError";
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

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export function isClueRaceQuestion(question: { kind: string; type: string; editorialStatus?: string }): question is ClueRaceQuestion {
  return question.kind === "clue-race" && question.type === "progressive_clues" && question.editorialStatus === "approved";
}

export function pointsForClueIndex(clueIndex: number): number {
  const points = CLUE_RACE_POINTS[clueIndex];
  if (points === undefined) {
    throw new ClueRaceError(`Indice invalide: ${clueIndex + 1}.`);
  }
  return points;
}

export function visibleClues(question: ClueRaceQuestion, clueIndex: number): string[] {
  return question.clues.slice(0, clueIndex + 1);
}

export function revealNextClueInState(state: RoundState): RoundState {
  const currentIndex = state.clueIndex ?? 0;
  if (currentIndex >= CLUE_RACE_CLUE_COUNT - 1) {
    throw new ClueRaceError("Tous les indices sont deja affiches.");
  }
  return { ...state, clueIndex: currentIndex + 1, answersVisible: false };
}

export function showAnswersInState(state: RoundState): RoundState {
  return { ...state, answersVisible: true };
}

export function calculateClueRaceScore(input: {
  question: ClueRaceQuestion;
  isCorrect: boolean;
  clueIndex: number;
}): ScoreBreakdown {
  if (!input.isCorrect) {
    return { ...emptyScore };
  }
  const basePoints = input.question.pointsByClueIndex[input.clueIndex] ?? pointsForClueIndex(input.clueIndex);
  return {
    basePoints,
    timeBonus: 0,
    streakBonus: 0,
    jokerPenalty: 0,
    wagerDelta: 0,
    total: basePoints,
  };
}

export function isClueRaceComplete(state: Pick<RoundState, "answeredQuestionIds">, config: GameConfig): boolean {
  const definition = config.rounds.find((round) => round.kind === "clue-race");
  const target = definition?.questionCount ?? CLUE_RACE_QUESTION_COUNT;
  return state.answeredQuestionIds.length >= target;
}

export function selectClueRaceQuestions(input: {
  questions: readonly ClueRaceQuestion[];
  alreadyUsedQuestionIds: readonly QuestionId[];
  seed: string;
  count?: number | undefined;
}): readonly ClueRaceQuestion[] {
  const used = new Set(input.alreadyUsedQuestionIds);
  const eligible = input.questions.filter((question) => !used.has(question.id));
  const selected = shuffleWithSeed(eligible, `${input.seed}:clue-race`).slice(0, input.count ?? CLUE_RACE_QUESTION_COUNT);
  if (selected.length === 0) {
    throw new ClueRaceError("Aucune enigme disponible pour Course aux indices.");
  }
  return selected;
}

export const clueRaceRound: GameRound<RoundState, ClueRaceQuestion, string> = {
  definition: {
    id: "clue-race",
    kind: "clue-race",
    label: "Course aux indices",
    description: "Identifier une reponse a partir de cinq indices progressifs.",
    questionTypes: ["progressive_clues"],
    questionCount: CLUE_RACE_QUESTION_COUNT,
    maxScore: CLUE_RACE_QUESTION_COUNT * CLUE_RACE_POINTS[0],
  },
  initializeState: () => ({
    id: "clue-race-state",
    definitionId: "clue-race",
    status: "active",
    currentQuestionIndex: 0,
    selectedQuestionIds: [],
    answeredQuestionIds: [],
    answerResults: [],
    score: { ...emptyScore },
    clueIndex: 0,
    answersVisible: false,
  }),
  selectQuestions: (input) => selectClueRaceQuestions({
    questions: input.questions,
    alreadyUsedQuestionIds: input.alreadyUsedQuestionIds,
    seed: input.seed,
    count: input.config.rounds.find((round) => round.kind === "clue-race")?.questionCount,
  }),
  handleAnswer: (state, question, answer) => {
    const isCorrect = question.correctOptionId !== undefined
      ? answer === question.correctOptionId
      : question.answer.accepted.map(normalizeText).includes(normalizeText(answer));
    const score = calculateClueRaceScore({ question, isCorrect, clueIndex: state.clueIndex ?? 0 });
    return {
      questionId: question.id,
      isCorrect,
      lockedAnswer: answer,
      correctAnswer: question.correctOptionId ?? question.answer.display,
      explanation: question.explanation,
      score,
      usedJokers: [],
    } satisfies AnswerResult;
  },
  calculateScore: (result) => result.score,
  isComplete: (state, config) => isClueRaceComplete(state, config),
  summarize: (state) => ({
    roundId: state.id,
    label: "Course aux indices",
    answeredQuestions: state.answeredQuestionIds.length,
    score: state.score,
    isComplete: state.status === "complete",
  }),
  restoreState: (savedState) => roundStateSchema.parse(savedState),
};