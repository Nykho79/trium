import type { AnswerResult, ConnectionsQuestion, GameConfig, GameRound, MultipleChoiceOption, QuestionId, RoundState, ScoreBreakdown } from "../../core/types";
import { shuffleWithSeed } from "../../core/engine/random";
import { roundStateSchema } from "../../core/schemas/roundSchemas";

export const CONNECTIONS_QUESTION_COUNT = 5;
export const CONNECTIONS_POINTS = [500, 400, 250, 150] as const;

const emptyScore: ScoreBreakdown = {
  basePoints: 0,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total: 0,
};

type ConnectionSeedData = {
  id: string;
  categoryId: string;
  categoryLabel: string;
  subCategoryId: string;
  subCategoryLabel: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  items: [string, string, string, string];
  details: [string, string, string, string];
  answer: string;
  wrong: [string, string, string];
  hint: string;
};

const CONNECTION_BANK: readonly ConnectionSeedData[] = [
  {
    id: "planetes-telluriques",
    categoryId: "science-nature",
    categoryLabel: "Sciences et nature",
    subCategoryId: "astronomie",
    subCategoryLabel: "Astronomie",
    difficulty: 2,
    items: ["Mercure", "Venus", "Terre", "Mars"],
    details: ["Mercure est rocheuse.", "Venus est rocheuse.", "La Terre est rocheuse.", "Mars est rocheuse."],
    answer: "Les planetes telluriques du Systeme solaire",
    wrong: ["Les planetes gazeuses", "Les lunes de Jupiter", "Les constellations zodiacales"],
    hint: "Cherchez une famille d'objets du Systeme solaire.",
  },
  {
    id: "impressionnistes",
    categoryId: "arts-literature",
    categoryLabel: "Arts et litterature",
    subCategoryId: "peinture",
    subCategoryLabel: "Peinture",
    difficulty: 3,
    items: ["Monet", "Renoir", "Pissarro", "Sisley"],
    details: ["Monet est associe a l'impressionnisme.", "Renoir est associe a l'impressionnisme.", "Pissarro est associe a l'impressionnisme.", "Sisley est associe a l'impressionnisme."],
    answer: "Des peintres impressionnistes",
    wrong: ["Des compositeurs romantiques", "Des architectes du Bauhaus", "Des sculpteurs antiques"],
    hint: "Le lien est un mouvement artistique du XIXe siecle.",
  },
  {
    id: "protocoles-internet",
    categoryId: "technology",
    categoryLabel: "Technologie",
    subCategoryId: "internet",
    subCategoryLabel: "Internet",
    difficulty: 3,
    items: ["HTTP", "SMTP", "DNS", "FTP"],
    details: ["HTTP sert au Web.", "SMTP sert a l'envoi de courriels.", "DNS associe noms et adresses.", "FTP sert au transfert de fichiers."],
    answer: "Des protocoles ou services fondamentaux d'Internet",
    wrong: ["Des formats d'image", "Des langages de programmation", "Des composants d'ordinateur"],
    hint: "Ce sont des briques de communication reseau.",
  },
  {
    id: "cordes-frottees",
    categoryId: "music",
    categoryLabel: "Musique",
    subCategoryId: "instruments",
    subCategoryLabel: "Instruments",
    difficulty: 2,
    items: ["Violon", "Alto", "Violoncelle", "Contrebasse"],
    details: ["Le violon appartient aux cordes frottees.", "L'alto appartient aux cordes frottees.", "Le violoncelle appartient aux cordes frottees.", "La contrebasse appartient aux cordes frottees."],
    answer: "La famille orchestrale des cordes frottees",
    wrong: ["Les cuivres", "Les percussions a peau", "Les bois a anche double"],
    hint: "Pensez a une famille d'instruments d'orchestre.",
  },
  {
    id: "iles-mediterranee",
    categoryId: "geography",
    categoryLabel: "Geographie",
    subCategoryId: "europe",
    subCategoryLabel: "Europe",
    difficulty: 4,
    items: ["Sicile", "Sardaigne", "Corse", "Crete"],
    details: ["La Sicile est en Mediterranee.", "La Sardaigne est en Mediterranee.", "La Corse est en Mediterranee.", "La Crete est en Mediterranee."],
    answer: "De grandes iles de la Mediterranee",
    wrong: ["Des archipels du Pacifique", "Des capitales insulaires", "Des volcans actifs"],
    hint: "Le lien est geographique et maritime.",
  },
  {
    id: "gaz-nobles",
    categoryId: "science-nature",
    categoryLabel: "Sciences et nature",
    subCategoryId: "chimie",
    subCategoryLabel: "Chimie",
    difficulty: 4,
    items: ["Helium", "Neon", "Argon", "Krypton"],
    details: ["L'helium est un gaz noble.", "Le neon est un gaz noble.", "L'argon est un gaz noble.", "Le krypton est un gaz noble."],
    answer: "Des gaz nobles",
    wrong: ["Des metaux alcalins", "Des acides amines", "Des isotopes radioactifs"],
    hint: "Ce sont des elements d'une meme colonne du tableau periodique.",
  },
];

function option(id: string, label: string): MultipleChoiceOption {
  return { id, label };
}

function asFourOptions(options: readonly MultipleChoiceOption[]): [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption] {
  const first = options[0];
  const second = options[1];
  const third = options[2];
  const fourth = options[3];
  if (!first || !second || !third || !fourth) {
    throw new Error("Une connexion exige quatre propositions.");
  }
  return [first, second, third, fourth];
}

function makeQuestion(data: ConnectionSeedData, seed: string, index: number): ConnectionsQuestion {
  const itemOrder = shuffleWithSeed(data.items.map((item, itemIndex) => ({ item, detail: data.details[itemIndex] ?? item })), `${seed}:connections:${data.id}:items`);
  const items = itemOrder.map((entry) => entry.item) as [string, string, string, string];
  const itemDetails = itemOrder.map((entry) => entry.detail) as [string, string, string, string];
  const correctOptionId = "a";
  return {
    id: `conn-${data.id}`,
    kind: "connections",
    type: "connection",
    categoryId: data.categoryId,
    categoryLabel: data.categoryLabel,
    subCategoryId: data.subCategoryId,
    subCategoryLabel: data.subCategoryLabel,
    difficulty: data.difficulty,
    prompt: "Quel lien commun unit ces quatre elements ?",
    explanation: `${data.answer}. ${itemDetails.join(" ")}`,
    contextualHint: data.hint,
    tags: ["connections", data.categoryId, data.subCategoryId],
    editorialStatus: "approved",
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
    items,
    itemDetails,
    randomizeItems: true,
    options: asFourOptions(shuffleWithSeed([
      option(correctOptionId, data.answer),
      option("b", data.wrong[0]),
      option("c", data.wrong[1]),
      option("d", data.wrong[2]),
    ], `${seed}:connections:${index}:options`)),
    correctOptionId,
    answer: { accepted: [data.answer], display: data.answer },
  };
}

export function buildConnectionsQuestionSet(seed: string): readonly ConnectionsQuestion[] {
  return shuffleWithSeed(CONNECTION_BANK, `${seed}:connections:questions`)
    .slice(0, CONNECTIONS_QUESTION_COUNT)
    .map((data, index) => makeQuestion(data, seed, index));
}

export function isConnectionsQuestion(question: { kind: string; type: string; editorialStatus?: string }): question is ConnectionsQuestion {
  return question.kind === "connections" && question.type === "connection" && question.editorialStatus === "approved";
}

export function pointsForConnectionItemIndex(itemIndex: number): number {
  const points = CONNECTIONS_POINTS[itemIndex];
  if (points === undefined) {
    throw new Error(`Element de connexion invalide: ${itemIndex + 1}.`);
  }
  return points;
}

export function visibleConnectionItems(question: ConnectionsQuestion, itemIndex: number): readonly string[] {
  return question.items.slice(0, Math.min(4, itemIndex + 1));
}

export function revealNextConnectionItemInState(state: RoundState): RoundState {
  const current = state.connectionItemIndex ?? 0;
  if (current >= 3) {
    return state;
  }
  return { ...state, connectionItemIndex: current + 1, answersVisible: false };
}

export function showConnectionAnswersInState(state: RoundState): RoundState {
  return { ...state, answersVisible: true };
}

export function calculateConnectionsScore(input: { isCorrect: boolean; itemIndex: number }): ScoreBreakdown {
  if (!input.isCorrect) {
    return { ...emptyScore };
  }
  const basePoints = pointsForConnectionItemIndex(input.itemIndex);
  return {
    basePoints,
    timeBonus: 0,
    streakBonus: 0,
    jokerPenalty: 0,
    wagerDelta: 0,
    total: basePoints,
  };
}

export function selectConnectionsQuestions(input: {
  questions: readonly ConnectionsQuestion[];
  alreadyUsedQuestionIds: readonly QuestionId[];
  seed: string;
  count?: number | undefined;
}): readonly ConnectionsQuestion[] {
  const used = new Set(input.alreadyUsedQuestionIds);
  return shuffleWithSeed(input.questions.filter((question) => !used.has(question.id)), `${input.seed}:connections:select`).slice(0, input.count ?? CONNECTIONS_QUESTION_COUNT);
}

export function isConnectionsComplete(state: Pick<RoundState, "answeredQuestionIds">, config: GameConfig): boolean {
  const definition = config.rounds.find((round) => round.kind === "connections");
  return state.answeredQuestionIds.length >= (definition?.questionCount ?? CONNECTIONS_QUESTION_COUNT);
}

export const connectionsRound: GameRound<RoundState, ConnectionsQuestion, string> = {
  definition: {
    id: "connections",
    kind: "connections",
    label: "Connexions",
    description: "Identifier le lien commun entre quatre elements.",
    questionTypes: ["connection"],
    questionCount: CONNECTIONS_QUESTION_COUNT,
    maxScore: 2_500,
  },
  initializeState: () => ({
    id: "connections-state",
    definitionId: "connections",
    status: "active",
    currentQuestionIndex: 0,
    selectedQuestionIds: [],
    answeredQuestionIds: [],
    answerResults: [],
    score: { ...emptyScore },
    connectionItemIndex: 0,
    answersVisible: false,
  }),
  selectQuestions: (input) => selectConnectionsQuestions({
    questions: input.questions,
    alreadyUsedQuestionIds: input.alreadyUsedQuestionIds,
    seed: input.seed,
  }),
  handleAnswer: (state, question, answerValue) => {
    const isCorrect = question.correctOptionId !== undefined ? answerValue === question.correctOptionId : question.answer.accepted.includes(answerValue);
    const score = calculateConnectionsScore({ isCorrect, itemIndex: state.connectionItemIndex ?? 0 });
    return {
      questionId: question.id,
      isCorrect,
      lockedAnswer: answerValue,
      correctAnswer: question.correctOptionId ?? question.answer.display,
      explanation: question.explanation,
      score,
      usedJokers: [],
    } satisfies AnswerResult;
  },
  calculateScore: (result) => result.score,
  isComplete: (state, config) => isConnectionsComplete(state, config),
  summarize: (state) => ({
    roundId: state.id,
    label: "Connexions",
    answeredQuestions: state.answeredQuestionIds.length,
    score: state.score,
    isComplete: state.status === "complete",
  }),
  restoreState: (savedState) => roundStateSchema.parse(savedState),
};
