import type {
  AnalogyQuestion,
  AnswerResult,
  ChronologyQuestion,
  Difficulty,
  GameRound,
  IntruderQuestion,
  MemoryQuestion,
  MultipleChoiceOption,
  QuestionId,
  RoundState,
  ScoreBreakdown,
  SequenceQuestion,
  SymbolRuleQuestion,
  SynapseQuestion,
  VisualMatrixQuestion,
} from "../../core/types";
import { createSeededRandom, shuffleWithSeed } from "../../core/engine/random";
import { roundStateSchema } from "../../core/schemas/roundSchemas";

export const SYNAPSE_QUESTION_COUNT = 6;
export const SYNAPSE_SPEED_BONUS_RATIO = 0.2;

export type SynapseExerciseType =
  | "analogy"
  | "sequence"
  | "digit_memory"
  | "reverse_memory"
  | "intruder"
  | "ordering"
  | "visual_matrix"
  | "symbol_rule";

export interface SynapseScoreInput {
  question: SynapseQuestion;
  isCorrect: boolean;
  answeredInMs: number;
  timeLimitMs: number;
}

interface GeneratedExerciseContext {
  seed: string;
  index: number;
  difficulty: Difficulty;
  exerciseType: SynapseExerciseType;
}

const emptyScore: ScoreBreakdown = {
  basePoints: 0,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total: 0,
};

const EXERCISE_TYPES: readonly SynapseExerciseType[] = [
  "analogy",
  "sequence",
  "digit_memory",
  "reverse_memory",
  "intruder",
  "ordering",
  "visual_matrix",
  "symbol_rule",
];

const DIFFICULTY_PATH: readonly Difficulty[] = [1, 2, 3, 3, 4, 5];

function baseQuestionFields(context: GeneratedExerciseContext, typeLabel: string) {
  return {
    id: `syn-${context.seed.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "seed"}-${context.index + 1}-${context.exerciseType}`,
    kind: "synapse" as const,
    categoryId: "synapse",
    categoryLabel: "Synapse",
    subCategoryId: context.exerciseType,
    subCategoryLabel: typeLabel,
    difficulty: context.difficulty,
    tags: ["synapse", `synapse:${context.exerciseType}`, `difficulty:${context.difficulty}`],
    editorialStatus: "approved" as const,
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
  };
}

function option(id: string, label: string): MultipleChoiceOption {
  return { id, label };
}

function asFourOptions(options: readonly MultipleChoiceOption[]): [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption] {
  const first = options[0];
  const second = options[1];
  const third = options[2];
  const fourth = options[3];
  if (!first || !second || !third || !fourth) {
    throw new Error("Une epreuve Synapse exige quatre propositions.");
  }
  return [first, second, third, fourth];
}

function shuffledOptions(options: readonly MultipleChoiceOption[], seed: string) {
  return asFourOptions(shuffleWithSeed(options, seed));
}

function randomInt(seed: string, min: number, max: number): number {
  const random = createSeededRandom(seed);
  return min + Math.floor(random() * (max - min + 1));
}

export function generateDigitSequence(seed: string, difficulty: Difficulty): readonly string[] {
  const length = difficulty + 3;
  const random = createSeededRandom(`${seed}:digits:${difficulty}`);
  return Array.from({ length }, () => String(Math.floor(random() * 10)));
}

export function generateReverseMemory(seed: string, difficulty: Difficulty): readonly string[] {
  return [...generateDigitSequence(`${seed}:reverse`, difficulty)].reverse();
}

export function generateNumericSequence(seed: string, difficulty: Difficulty): { items: readonly string[]; nextItem: string } {
  const start = randomInt(`${seed}:start`, 2, 9 + difficulty);
  const step = randomInt(`${seed}:step`, 2, 4 + difficulty);
  const length = 4 + Math.min(2, difficulty - 1);
  const values = Array.from({ length }, (_, index) => start + index * step);
  return { items: values.map(String), nextItem: String(start + length * step) };
}

export function generateLogicalOrder(seed: string, difficulty: Difficulty): readonly string[] {
  const sets = [
    ["idee", "plan", "prototype", "test"],
    ["graine", "pousse", "tige", "fleur"],
    ["brouillon", "revision", "validation", "publication"],
    ["collecte", "tri", "analyse", "decision"],
    ["observation", "hypothese", "experience", "conclusion"],
  ] as const;
  return sets[(randomInt(`${seed}:order:${difficulty}`, 0, sets.length - 1))] ?? sets[0];
}

export function generateSymbolRule(seed: string, difficulty: Difficulty): { rule: string; examples: [string, string, string]; correct: string } {
  const variants = [
    { rule: "Remplacer chaque carre par deux cercles", examples: ["■ -> ●●", "■■ -> ●●●●", "■■■ -> ●●●●●●"], correct: "●●●●" },
    { rule: "Inverser l'ordre des symboles", examples: ["▲● -> ●▲", "◆■▲ -> ▲■◆", "●◆▲ -> ▲◆●"], correct: "■◆●" },
    { rule: "Ajouter une etoile apres chaque symbole sombre", examples: ["■ -> ■★", "◆● -> ◆★●", "■◆ -> ■★◆★"], correct: "◆★▲" },
    { rule: "Conserver seulement les symboles ronds", examples: ["●▲○ -> ●○", "◆○■ -> ○", "●○▲ -> ●○"], correct: "●○" },
  ] as const;
  const selected = variants[randomInt(`${seed}:symbol:${difficulty}`, 0, variants.length - 1)] ?? variants[0];
  if (!selected) {
    throw new Error("Regle symbole introuvable.");
  }
  return { rule: selected.rule, examples: [...selected.examples] as [string, string, string], correct: selected.correct };
}

function answer(display: string) {
  return { accepted: [display], display };
}

function makeAnalogy(context: GeneratedExerciseContext): AnalogyQuestion & { kind: "synapse" } {
  const banks = [
    { left: "boussole", right: "orientation", missing: "horloge", correct: "temps", relation: "outil et fonction", wrong: ["distance", "lumiere", "volume"] },
    { left: "graine", right: "arbre", missing: "croquis", correct: "dessin", relation: "forme initiale et resultat", wrong: ["cadre", "couleur", "papier"] },
    { left: "cle", right: "serrure", missing: "mot de passe", correct: "compte", relation: "moyen d'acces et cible", wrong: ["clavier", "ecran", "signal"] },
  ];
  const selected = banks[randomInt(`${context.seed}:analogy:${context.index}`, 0, banks.length - 1)] ?? banks[0];
  if (!selected) {
    throw new Error("Analogie Synapse introuvable.");
  }
  const correctOptionId = "a";
  return {
    ...baseQuestionFields(context, "Analogie"),
    type: "analogy",
    prompt: `${selected.left} est a ${selected.right} ce que ${selected.missing} est a ...`,
    left: selected.left,
    right: selected.right,
    relation: selected.relation,
    missing: selected.missing,
    options: shuffledOptions([
      option(correctOptionId, selected.correct),
      option("b", selected.wrong[0] ?? "option B"),
      option("c", selected.wrong[1] ?? "option C"),
      option("d", selected.wrong[2] ?? "option D"),
    ], `${context.seed}:analogy-options:${context.index}`),
    correctOptionId,
    answer: answer(selected.correct),
    explanation: `Le lien attendu est: ${selected.relation}.`,
    contextualHint: `Cherchez la meme relation: ${selected.relation}.`,
  };
}

function makeSequence(context: GeneratedExerciseContext): SequenceQuestion & { kind: "synapse" } {
  const sequence = generateNumericSequence(`${context.seed}:${context.index}`, context.difficulty);
  const correctOptionId = "a";
  const next = Number(sequence.nextItem);
  return {
    ...baseQuestionFields(context, "Suite logique"),
    type: "sequence",
    prompt: `Quel nombre complete la suite : ${sequence.items.join(" - ")} - ?`,
    items: [...sequence.items],
    nextItem: sequence.nextItem,
    options: shuffledOptions([
      option(correctOptionId, sequence.nextItem),
      option("b", String(next + context.difficulty)),
      option("c", String(next - context.difficulty)),
      option("d", String(next + context.difficulty + 2)),
    ], `${context.seed}:sequence-options:${context.index}`),
    correctOptionId,
    answer: answer(sequence.nextItem),
    explanation: "La suite progresse avec un ecart constant.",
    contextualHint: "Comparez deux nombres voisins pour trouver l'ecart.",
  };
}

function makeMemory(context: GeneratedExerciseContext, reverse: boolean): MemoryQuestion & { kind: "synapse" } {
  const shown = generateDigitSequence(`${context.seed}:${context.index}`, context.difficulty);
  const expected = reverse ? [...shown].reverse() : [...shown];
  const correct = expected.join(" ");
  const correctOptionId = "a";
  const wrongOne = [...expected].sort().join(" ");
  const wrongTwo = [...expected.slice(1), expected[0] ?? "0"].join(" ");
  const wrongThree = [...expected.slice(0, -1), String((Number(expected.at(-1) ?? "0") + 1) % 10)].join(" ");
  return {
    ...baseQuestionFields(context, reverse ? "Memoire inversee" : "Memoire de chiffres"),
    type: "memory",
    prompt: reverse ? "Memorisez la sequence puis choisissez son ordre inverse." : "Memorisez la sequence puis retrouvez-la.",
    items: [...shown],
    recallPrompt: reverse ? "Quelle etait la sequence en ordre inverse ?" : "Quelle etait la sequence affichee ?",
    mode: reverse ? "reverse" : "forward",
    displaySeconds: 1,
    options: shuffledOptions([
      option(correctOptionId, correct),
      option("b", wrongOne === correct ? wrongTwo : wrongOne),
      option("c", wrongTwo),
      option("d", wrongThree),
    ], `${context.seed}:memory-options:${context.index}`),
    correctOptionId,
    answer: answer(correct),
    explanation: reverse ? "Il fallait restituer les chiffres dans le sens inverse." : "Il fallait restituer les chiffres dans le meme ordre.",
  };
}

function makeIntruder(context: GeneratedExerciseContext): IntruderQuestion & { kind: "synapse" } {
  const banks = [
    { items: ["triangle", "carre", "cercle", "orchestre"], correct: "orchestre", theme: "formes" },
    { items: ["cuivre", "argent", "fer", "nuage"], correct: "nuage", theme: "metaux" },
    { items: ["roman", "poeme", "conte", "boussole"], correct: "boussole", theme: "textes" },
  ];
  const selected = banks[randomInt(`${context.seed}:intruder:${context.index}`, 0, banks.length - 1)] ?? banks[0];
  if (!selected) {
    throw new Error("Intrus Synapse introuvable.");
  }
  const options = selected.items.map((label, index) => option(String.fromCharCode(97 + index), label));
  const correctOptionId = options.find((item) => item.label === selected.correct)?.id ?? "d";
  return {
    ...baseQuestionFields(context, "Intrus conceptuel"),
    type: "intruder",
    prompt: `Quel element ne partage pas le theme: ${selected.theme} ?`,
    items: asFourOptions(options),
    correctOptionId,
    answer: answer(selected.correct),
    explanation: `${selected.correct} ne correspond pas au theme ${selected.theme}.`,
  };
}

function makeOrdering(context: GeneratedExerciseContext): ChronologyQuestion & { kind: "synapse" } {
  const order = generateLogicalOrder(`${context.seed}:${context.index}`, context.difficulty);
  const itemIds = ["a", "b", "c", "d"];
  const items = order.map((label, index) => ({ id: itemIds[index] ?? `i${index}`, label }));
  const correctOptionId = "a";
  const reversed = [...order].reverse().join(" > ");
  return {
    ...baseQuestionFields(context, "Classement"),
    type: "chronology",
    prompt: "Choisissez l'ordre logique le plus coherent.",
    items,
    correctOrderIds: items.map((item) => item.id),
    options: shuffledOptions([
      option(correctOptionId, order.join(" > ")),
      option("b", reversed),
      option("c", [order[1], order[0], order[2], order[3]].filter(Boolean).join(" > ")),
      option("d", [order[0], order[2], order[1], order[3]].filter(Boolean).join(" > ")),
    ], `${context.seed}:ordering-options:${context.index}`),
    correctOptionId,
    explanation: "L'ordre suit une progression naturelle d'etapes.",
  };
}

function makeVisualMatrix(context: GeneratedExerciseContext): VisualMatrixQuestion & { kind: "synapse" } {
  const variants = [
    { grid: ["●", "●●", "●●●", "◆", "◆◆", "◆◆◆", "▲", "▲▲", "?"] as const, answer: "▲▲▲", rule: "Chaque ligne ajoute un symbole." },
    { grid: ["■", "●", "▲", "■■", "●●", "▲▲", "■■■", "●●●", "?"] as const, answer: "▲▲▲", rule: "Chaque colonne conserve le symbole et augmente la quantite." },
    { grid: ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "?"] as const, answer: "C3", rule: "La lettre suit la ligne, le nombre suit la colonne." },
  ];
  const selected = variants[randomInt(`${context.seed}:matrix:${context.index}`, 0, variants.length - 1)] ?? variants[0];
  if (!selected) {
    throw new Error("Matrice Synapse introuvable.");
  }
  const correctOptionId = "a";
  return {
    ...baseQuestionFields(context, "Matrice visuelle"),
    type: "visual_matrix",
    prompt: "Quel symbole complete la matrice ?",
    grid: [...selected.grid] as [string, string, string, string, string, string, string, string, string],
    missingIndex: 8,
    options: shuffledOptions([
      option(correctOptionId, selected.answer),
      option("b", "●●"),
      option("c", "◆◆◆"),
      option("d", "▲▲"),
    ], `${context.seed}:matrix-options:${context.index}`),
    correctOptionId,
    ruleLabel: selected.rule,
    answer: answer(selected.answer),
    explanation: selected.rule,
  };
}

function makeSymbolRule(context: GeneratedExerciseContext): SymbolRuleQuestion & { kind: "synapse" } {
  const generated = generateSymbolRule(`${context.seed}:${context.index}`, context.difficulty);
  const correctOptionId = "a";
  return {
    ...baseQuestionFields(context, "Association symbole-regle"),
    type: "symbol_rule",
    prompt: "Appliquez la regle aux symboles proposes.",
    rule: generated.rule,
    examples: generated.examples,
    options: shuffledOptions([
      option(correctOptionId, generated.correct),
      option("b", "●●"),
      option("c", "◆★"),
      option("d", "▲■"),
    ], `${context.seed}:symbol-options:${context.index}`),
    correctOptionId,
    answer: answer(generated.correct),
    explanation: generated.rule,
  };
}

function makeQuestion(context: GeneratedExerciseContext): SynapseQuestion {
  if (context.exerciseType === "analogy") return makeAnalogy(context);
  if (context.exerciseType === "sequence") return makeSequence(context);
  if (context.exerciseType === "digit_memory") return makeMemory(context, false);
  if (context.exerciseType === "reverse_memory") return makeMemory(context, true);
  if (context.exerciseType === "intruder") return makeIntruder(context);
  if (context.exerciseType === "ordering") return makeOrdering(context);
  if (context.exerciseType === "visual_matrix") return makeVisualMatrix(context);
  return makeSymbolRule(context);
}

export function selectSynapseExerciseTypes(seed: string): readonly SynapseExerciseType[] {
  const selected: SynapseExerciseType[] = [];
  const counts = new Map<SynapseExerciseType, number>();
  const pool = shuffleWithSeed([...EXERCISE_TYPES, ...EXERCISE_TYPES], `${seed}:synapse-types`);
  for (const exerciseType of pool) {
    if ((counts.get(exerciseType) ?? 0) >= 2) {
      continue;
    }
    selected.push(exerciseType);
    counts.set(exerciseType, (counts.get(exerciseType) ?? 0) + 1);
    if (selected.length === SYNAPSE_QUESTION_COUNT) {
      return selected;
    }
  }
  return selected;
}

export function buildSynapseQuestionSet(seed: string): readonly SynapseQuestion[] {
  return selectSynapseExerciseTypes(seed).map((exerciseType, index) => makeQuestion({
    seed,
    index,
    exerciseType,
    difficulty: DIFFICULTY_PATH[index] ?? 5,
  }));
}

export function isSynapseQuestion(question: { kind: string; type: string; editorialStatus?: string }): question is SynapseQuestion {
  return question.kind === "synapse" && question.editorialStatus === "approved";
}

export function synapseOptions(question: SynapseQuestion): readonly MultipleChoiceOption[] {
  if (question.type === "chronology") return question.options ?? [];
  if (question.type === "analogy") return question.options ?? [];
  if (question.type === "memory") return question.options ?? [];
  if (question.type === "sequence") return question.options ?? [];
  if (question.type === "intruder") return question.items;
  return question.options;
}

export function correctSynapseOptionId(question: SynapseQuestion): string | undefined {
  if ("correctOptionId" in question) {
    return question.correctOptionId;
  }
  return undefined;
}


export function correctSynapseDisplay(question: SynapseQuestion): string {
  if (question.type === "chronology") {
    const optionId = question.correctOptionId;
    return question.options?.find((optionValue) => optionValue.id === optionId)?.label ?? question.correctOrderIds.join(" > ");
  }
  return question.answer.display;
}
export function synapseExerciseType(question: SynapseQuestion): SynapseExerciseType {
  if (question.type === "memory") return question.mode === "reverse" ? "reverse_memory" : "digit_memory";
  if (question.type === "chronology") return "ordering";
  return question.type;
}

export function synapseBasePoints(difficulty: Difficulty): number {
  if (difficulty <= 2) return 150;
  if (difficulty <= 4) return 250;
  return 400;
}

export function calculateSynapseScore(input: SynapseScoreInput): ScoreBreakdown {
  if (!input.isCorrect) {
    return { ...emptyScore };
  }
  const basePoints = synapseBasePoints(input.question.difficulty);
  const safeLimit = Math.max(1, input.timeLimitMs);
  const remainingRatio = Math.max(0, Math.min(1, (safeLimit - input.answeredInMs) / safeLimit));
  const timeBonus = Math.round(basePoints * SYNAPSE_SPEED_BONUS_RATIO * remainingRatio);
  return {
    basePoints,
    timeBonus,
    streakBonus: 0,
    jokerPenalty: 0,
    wagerDelta: 0,
    total: basePoints + timeBonus,
  };
}

export const synapseRound: GameRound<RoundState, SynapseQuestion, string> = {
  definition: {
    id: "synapse",
    kind: "synapse",
    label: "Synapse",
    description: "Six mini-epreuves ludiques de logique, memoire et association.",
    questionTypes: ["chronology", "analogy", "memory", "sequence", "intruder", "visual_matrix", "symbol_rule"],
    questionCount: SYNAPSE_QUESTION_COUNT,
    maxScore: 1_680,
  },
  initializeState: () => ({
    id: "synapse-state",
    definitionId: "synapse",
    status: "active",
    currentQuestionIndex: 0,
    selectedQuestionIds: [],
    answeredQuestionIds: [],
    answerResults: [],
    score: { ...emptyScore },
  }),
  selectQuestions: (input) => buildSynapseQuestionSet(input.seed).filter((question) => !input.alreadyUsedQuestionIds.includes(question.id)),
  handleAnswer: (_state, question, answerValue) => {
    const correctAnswer = correctSynapseOptionId(question) ?? correctSynapseDisplay(question);
    const isCorrect = answerValue === correctAnswer;
    const score = calculateSynapseScore({ question, isCorrect, answeredInMs: 0, timeLimitMs: 30_000 });
    return {
      questionId: question.id as QuestionId,
      isCorrect,
      lockedAnswer: answerValue,
      correctAnswer,
      explanation: question.explanation,
      score,
      usedJokers: [],
    } satisfies AnswerResult;
  },
  calculateScore: (result) => result.score,
  isComplete: (state) => state.answeredQuestionIds.length >= SYNAPSE_QUESTION_COUNT,
  summarize: (state) => ({
    roundId: state.id,
    label: "Synapse",
    answeredQuestions: state.answeredQuestionIds.length,
    score: state.score,
    isComplete: state.status === "complete",
  }),
  restoreState: (savedState) => roundStateSchema.parse(savedState),
};
