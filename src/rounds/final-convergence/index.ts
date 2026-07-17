import type { AnalogyQuestion, ConnectionQuestion, GameRound, MemoryQuestion, MultipleChoiceOption, MultipleChoiceQuestion, ProgressiveCluesQuestion, Question, RoundState, ScoreBreakdown, SequenceQuestion } from "../../core/types";
import { shuffleWithSeed } from "../../core/engine/random";
import { roundStateSchema } from "../../core/schemas/roundSchemas";

export type FinalConvergenceAdvantageId = "extra_time" | "remove_wrong_answer" | "extra_hint" | "second_chance" | "error_protection";
export type FinalConvergenceStep = "culture" | "clues" | "connection" | "memory" | "logic";
export type FinalConvergenceQuestion = (MultipleChoiceQuestion | ProgressiveCluesQuestion | ConnectionQuestion | MemoryQuestion | AnalogyQuestion | SequenceQuestion) & { kind: "final-convergence" };

export interface FinalConvergenceAdvantage {
  id: FinalConvergenceAdvantageId;
  label: string;
  cost: number;
  description: string;
  applicableSteps: readonly FinalConvergenceStep[];
}

export const FINAL_CONVERGENCE_STEPS: readonly FinalConvergenceStep[] = ["culture", "clues", "connection", "memory", "logic"];
export const FINAL_CONVERGENCE_SUCCESS_TARGET = 4;
export const FINAL_CONVERGENCE_STEP_SCORE = 1_000;

export const FINAL_CONVERGENCE_ADVANTAGES: readonly FinalConvergenceAdvantage[] = [
  { id: "extra_time", label: "+15 secondes", cost: 300, description: "Ajoute 15 secondes a la premiere etape compatible.", applicableSteps: ["culture", "clues", "connection", "memory", "logic"] },
  { id: "remove_wrong_answer", label: "Retirer une mauvaise reponse", cost: 500, description: "Retire une mauvaise proposition sur la premiere etape a choix compatible.", applicableSteps: ["culture", "clues", "connection", "memory", "logic"] },
  { id: "extra_hint", label: "Indice supplementaire", cost: 400, description: "Affiche un indice prepare sur une etape compatible.", applicableSteps: ["clues", "connection", "logic"] },
  { id: "second_chance", label: "Deuxieme chance", cost: 700, description: "Autorise une nouvelle reponse apres une erreur sur une etape.", applicableSteps: ["culture", "clues", "connection", "memory", "logic"] },
  { id: "error_protection", label: "Protection d'une erreur", cost: 1_000, description: "Annule une erreur, mais pas une expiration de temps.", applicableSteps: ["culture", "clues", "connection", "memory", "logic"] },
];

const emptyScore: ScoreBreakdown = {
  basePoints: 0,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total: 0,
};

function option(id: string, label: string): MultipleChoiceOption {
  return { id, label };
}

function shuffleOptions(options: readonly MultipleChoiceOption[], seed: string): [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption] {
  const shuffled = shuffleWithSeed(options, seed);
  const first = shuffled[0];
  const second = shuffled[1];
  const third = shuffled[2];
  const fourth = shuffled[3];
  if (!first || !second || !third || !fourth) {
    throw new Error("Convergence exige quatre propositions.");
  }
  return [first, second, third, fourth];
}

export function finalStepForIndex(index: number): FinalConvergenceStep {
  return FINAL_CONVERGENCE_STEPS[Math.min(Math.max(0, index), FINAL_CONVERGENCE_STEPS.length - 1)] ?? "culture";
}

export function advantageById(id: FinalConvergenceAdvantageId): FinalConvergenceAdvantage {
  const advantage = FINAL_CONVERGENCE_ADVANTAGES.find((candidate) => candidate.id === id);
  if (!advantage) {
    throw new Error(`Avantage de finale inconnu: ${id}.`);
  }
  return advantage;
}

export function finalStepForQuestion(question: Question): FinalConvergenceStep | undefined {
  if (question.kind !== "final-convergence") return undefined;
  if (question.categoryId === "logic-puzzles") return "logic";
  if (question.type === "multiple_choice") return "culture";
  if (question.type === "progressive_clues") return "clues";
  if (question.type === "connection") return "connection";
  if (question.type === "memory") return "memory";
  return "logic";
}

export function isFinalConvergenceQuestion(question: Question): question is FinalConvergenceQuestion {
  return question.kind === "final-convergence" && question.editorialStatus === "approved";
}

export function canApplyFinalAdvantageToStep(advantageId: FinalConvergenceAdvantageId, step: FinalConvergenceStep): boolean {
  return advantageById(advantageId).applicableSteps.includes(step);
}

export function calculateFinalConvergenceScore(isCorrect: boolean): ScoreBreakdown {
  return isCorrect ? { ...emptyScore, basePoints: FINAL_CONVERGENCE_STEP_SCORE, total: FINAL_CONVERGENCE_STEP_SCORE } : { ...emptyScore };
}

export function finalSuccessCount(state: Pick<RoundState, "answerResults">): number {
  return state.answerResults.filter((result) => result.isCorrect).length;
}

export function isFinalConvergenceWon(state: Pick<RoundState, "answerResults">): boolean {
  return finalSuccessCount(state) >= FINAL_CONVERGENCE_SUCCESS_TARGET;
}

export function finalAdvantageCost(ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + advantageById(id as FinalConvergenceAdvantageId).cost, 0);
}

export function buildFinalConvergenceQuestionSet(seed: string): readonly FinalConvergenceQuestion[] {
  const culture: FinalConvergenceQuestion = {
    id: "final-culture-louvre",
    kind: "final-convergence",
    type: "multiple_choice",
    categoryId: "culture-generale",
    categoryLabel: "Culture generale",
    subCategoryId: "patrimoine",
    subCategoryLabel: "Patrimoine",
    difficulty: 3,
    prompt: "Dans quelle ville se trouve le musee du Louvre ?",
    explanation: "Le musee du Louvre se situe a Paris, dans l'ancien palais royal du Louvre.",
    contextualHint: "La ville est traversee par la Seine.",
    tags: ["finale", "culture"],
    editorialStatus: "approved",
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
    options: shuffleOptions([option("a", "Paris"), option("b", "Lyon"), option("c", "Marseille"), option("d", "Lille")], `${seed}:final:culture`),
    correctOptionId: "a",
    answer: { accepted: ["a", "Paris"], display: "Paris" },
    timeLimitSeconds: 35,
  };

  const clues: FinalConvergenceQuestion = {
    id: "final-clues-volcan",
    kind: "final-convergence",
    type: "progressive_clues",
    categoryId: "sciences-nature",
    categoryLabel: "Sciences et nature",
    subCategoryId: "geologie",
    subCategoryLabel: "Geologie",
    difficulty: 4,
    prompt: "Identifiez ce phenomene naturel.",
    explanation: "Un volcan peut emettre lave, gaz et cendres lors d'une eruption.",
    contextualHint: "On le trouve souvent aux limites de plaques tectoniques.",
    tags: ["finale", "indices"],
    editorialStatus: "approved",
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
    clues: ["Je peux dormir pendant des siecles.", "Je suis surveille par des geologues.", "Je produis parfois des cendres.", "Ma lave vient des profondeurs.", "On parle de mon eruption."],
    answer: { accepted: ["a", "Volcan"], display: "Volcan" },
    pointsByClueIndex: [1_000, 800, 600, 400, 200],
    options: shuffleOptions([option("a", "Volcan"), option("b", "Glacier"), option("c", "Tornade"), option("d", "Geyser")], `${seed}:final:clues`),
    correctOptionId: "a",
  };

  const connection: FinalConvergenceQuestion = {
    id: "final-connection-renaissance",
    kind: "final-convergence",
    type: "connection",
    categoryId: "arts-histoire",
    categoryLabel: "Arts et histoire",
    subCategoryId: "renaissance",
    subCategoryLabel: "Renaissance",
    difficulty: 4,
    prompt: "Quel lien commun unit ces quatre elements ?",
    explanation: "Florence, Leonard de Vinci, perspective et humanisme evoquent la Renaissance europeenne.",
    contextualHint: "Ce mouvement transforme les arts et les sciences en Europe.",
    tags: ["finale", "connexion"],
    editorialStatus: "approved",
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
    items: ["Florence", "Leonard de Vinci", "Perspective", "Humanisme"],
    itemDetails: ["Ville majeure du mouvement.", "Figure artistique et scientifique.", "Technique picturale developpee.", "Courant intellectuel central."],
    randomizeItems: true,
    answer: { accepted: ["a", "Renaissance"], display: "Renaissance" },
    options: shuffleOptions([option("a", "Renaissance"), option("b", "Baroque"), option("c", "Romantisme"), option("d", "Realisme")], `${seed}:final:connection`),
    correctOptionId: "a",
  };

  const memory: FinalConvergenceQuestion = {
    id: "final-memory-code",
    kind: "final-convergence",
    type: "memory",
    categoryId: "memoire",
    categoryLabel: "Memoire",
    subCategoryId: "sequence",
    subCategoryLabel: "Sequence",
    difficulty: 4,
    prompt: "Memorisez la sequence affichee.",
    explanation: "La sequence exacte etait 7 - 2 - 9 - 4 - 6.",
    contextualHint: "La sequence commence par 7 et finit par 6.",
    tags: ["finale", "memoire"],
    editorialStatus: "approved",
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
    items: ["7", "2", "9", "4", "6"],
    recallPrompt: "Quelle sequence etait affichee ?",
    displaySeconds: 4,
    answer: { accepted: ["a", "7-2-9-4-6", "7 2 9 4 6"], display: "7 - 2 - 9 - 4 - 6" },
    options: shuffleOptions([option("a", "7 - 2 - 9 - 4 - 6"), option("b", "7 - 9 - 2 - 4 - 6"), option("c", "2 - 7 - 9 - 6 - 4"), option("d", "7 - 2 - 4 - 9 - 6")], `${seed}:final:memory`),
    correctOptionId: "a",
  };

  const logic: FinalConvergenceQuestion = {
    id: "final-logic-analogy",
    kind: "final-convergence",
    type: "analogy",
    categoryId: "logique",
    categoryLabel: "Logique",
    subCategoryId: "analogie",
    subCategoryLabel: "Analogie",
    difficulty: 5,
    prompt: "Completez l'analogie finale.",
    explanation: "Une boussole sert a s'orienter ; un thermometre sert a mesurer la temperature.",
    contextualHint: "Cherchez l'instrument associe a la fonction.",
    tags: ["finale", "logique", "analogie"],
    editorialStatus: "approved",
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
    left: "Boussole",
    right: "Orientation",
    relation: "instrument vers fonction",
    missing: "Temperature",
    answer: { accepted: ["a", "Thermometre"], display: "Thermometre" },
    options: shuffleOptions([option("a", "Thermometre"), option("b", "Barometre"), option("c", "Chronometre"), option("d", "Altimetre")], `${seed}:final:logic`),
    correctOptionId: "a",
  };

  return [culture, clues, connection, memory, logic];
}

export const finalConvergenceRound: GameRound<RoundState, FinalConvergenceQuestion, string> = {
  definition: { id: "final-convergence", kind: "final-convergence", label: "Convergence finale", description: "Cinq etapes qui combinent les mecaniques precedentes.", questionTypes: ["multiple_choice", "progressive_clues", "connection", "memory", "analogy", "chronology", "sequence"], questionCount: 5, maxScore: 5_000 },
  initializeState: () => ({ id: "final-convergence-state", definitionId: "final-convergence", status: "active", currentQuestionIndex: 0, selectedQuestionIds: [], answeredQuestionIds: [], answerResults: [], score: { ...emptyScore }, finalPurchasedAdvantageIds: [], finalUsedAdvantageIds: [] }),
  selectQuestions: (input) => buildFinalConvergenceQuestionSet(input.seed).filter((question) => !input.alreadyUsedQuestionIds.includes(question.id)),
  handleAnswer: (state, question, answerValue) => {
    const accepted = question.answer?.accepted ?? ("correctOptionId" in question && question.correctOptionId ? [question.correctOptionId] : []);
    const isCorrect = Array.isArray(answerValue) ? false : accepted.includes(answerValue);
    const correctAnswer = question.answer?.display ?? ("correctOptionId" in question ? question.correctOptionId ?? "Reponse indisponible" : "Reponse indisponible");
    return { questionId: question.id, isCorrect, lockedAnswer: answerValue, correctAnswer, explanation: question.explanation, score: calculateFinalConvergenceScore(isCorrect), usedJokers: [] };
  },
  calculateScore: (result) => result.score,
  isComplete: (state) => state.answeredQuestionIds.length >= 5,
  summarize: (state) => ({ roundId: state.id, label: "Convergence finale", answeredQuestions: state.answeredQuestionIds.length, score: state.score, isComplete: state.status === "complete" }),
  restoreState: (savedState) => roundStateSchema.parse(savedState),
};