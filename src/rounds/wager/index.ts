import type { Difficulty, GameConfig, GameRound, MultipleChoiceOption, QuestionId, RoundState, ScoreBreakdown } from "../../core/types";
import type { MultipleChoiceQuestion } from "../../core/types/question";
import { shuffleWithSeed } from "../../core/engine/random";
import { roundStateSchema } from "../../core/schemas/roundSchemas";

export type WagerDifficultyLabel = "facile" | "moyen" | "difficile" | "expert";
export type WagerQuestion = MultipleChoiceQuestion & { kind: "wager" };

export const WAGER_QUESTION_COUNT = 5;
export const STANDARD_WAGER_AMOUNTS = [100, 250, 500] as const;

const emptyScore: ScoreBreakdown = {
  basePoints: 0,
  timeBonus: 0,
  streakBonus: 0,
  jokerPenalty: 0,
  wagerDelta: 0,
  total: 0,
};

type WagerSeedData = {
  id: string;
  categoryId: string;
  categoryLabel: string;
  subCategoryId: string;
  subCategoryLabel: string;
  difficulty: 1 | 2 | 3 | 4;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  hint: string;
};

const WAGER_BANK: readonly WagerSeedData[] = [
  { id: "geo-facile-capitale-italie", categoryId: "geography", categoryLabel: "Geographie", subCategoryId: "capitales", subCategoryLabel: "Capitales", difficulty: 1, prompt: "Quelle est la capitale de l'Italie ?", options: ["Rome", "Milan", "Naples", "Turin"], correctIndex: 0, explanation: "Rome est la capitale de l'Italie.", hint: "La ville est aussi surnommee la Ville eternelle." },
  { id: "science-facile-eau", categoryId: "science-nature", categoryLabel: "Sciences et nature", subCategoryId: "chimie", subCategoryLabel: "Chimie", difficulty: 1, prompt: "Quelle formule correspond a l'eau ?", options: ["H2O", "CO2", "O2", "NaCl"], correctIndex: 0, explanation: "L'eau est composee de deux atomes d'hydrogene et d'un atome d'oxygene.", hint: "La formule contient deux lettres differentes." },
  { id: "arts-moyen-impressionnisme", categoryId: "arts-literature", categoryLabel: "Arts et litterature", subCategoryId: "peinture", subCategoryLabel: "Peinture", difficulty: 2, prompt: "Quel peintre est associe aux Nympheas ?", options: ["Claude Monet", "Pablo Picasso", "Frida Kahlo", "Gustav Klimt"], correctIndex: 0, explanation: "Claude Monet a peint de nombreuses series autour des Nympheas.", hint: "Il est une figure majeure de l'impressionnisme." },
  { id: "history-moyen-1789", categoryId: "history", categoryLabel: "Histoire", subCategoryId: "revolution-francaise", subCategoryLabel: "Revolution francaise", difficulty: 2, prompt: "Quel evenement francais est associe au 14 juillet 1789 ?", options: ["La prise de la Bastille", "Le sacre de Napoleon", "La bataille de Marignan", "L'appel du 18 juin"], correctIndex: 0, explanation: "Le 14 juillet 1789 correspond a la prise de la Bastille.", hint: "L'evenement se deroule a Paris." },
  { id: "tech-difficile-dns", categoryId: "technology", categoryLabel: "Technologie", subCategoryId: "internet", subCategoryLabel: "Internet", difficulty: 3, prompt: "Quel service traduit un nom de domaine en adresse IP ?", options: ["DNS", "SMTP", "FTP", "NFC"], correctIndex: 0, explanation: "Le DNS associe les noms de domaine a des adresses IP.", hint: "C'est un annuaire distribue du reseau." },
  { id: "music-difficile-famille-bois", categoryId: "music", categoryLabel: "Musique", subCategoryId: "instruments", subCategoryLabel: "Instruments", difficulty: 3, prompt: "A quelle famille orchestrale appartient le hautbois ?", options: ["Les bois", "Les cuivres", "Les cordes frottees", "Les percussions"], correctIndex: 0, explanation: "Le hautbois appartient a la famille des bois.", hint: "Le nom de la famille ne decrit pas toujours le materiau actuel." },
  { id: "world-expert-hangul", categoryId: "world-cultures", categoryLabel: "Cultures du monde", subCategoryId: "ecritures", subCategoryLabel: "Ecritures", difficulty: 4, prompt: "Quel systeme d'ecriture a ete cree sous le roi Sejong ?", options: ["Hangul", "Cyrillique", "Devanagari", "Hiragana"], correctIndex: 0, explanation: "Le hangul coreen est associe au roi Sejong au XVe siecle.", hint: "Il s'agit d'un systeme d'ecriture coreen." },
  { id: "sports-expert-decathlon", categoryId: "sports", categoryLabel: "Sports", subCategoryId: "athletisme", subCategoryLabel: "Athletisme", difficulty: 4, prompt: "Combien d'epreuves compose un decathlon ?", options: ["10", "7", "8", "12"], correctIndex: 0, explanation: "Le decathlon regroupe dix epreuves d'athletisme.", hint: "Le prefixe du mot donne un indice." },
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
    throw new Error("Le Pari exige quatre propositions.");
  }
  return [first, second, third, fourth];
}

function makeQuestion(data: WagerSeedData, seed: string, index: number): WagerQuestion {
  const correctLabel = data.options[data.correctIndex];
  const options = asFourOptions(shuffleWithSeed(data.options.map((label, optionIndex) => option(optionIndex === data.correctIndex ? "a" : `wrong-${optionIndex}`, label)), `${seed}:wager:${data.id}:${index}:options`));
  return {
    id: `wager-${data.id}`,
    kind: "wager",
    type: "multiple_choice",
    categoryId: data.categoryId,
    categoryLabel: data.categoryLabel,
    subCategoryId: data.subCategoryId,
    subCategoryLabel: data.subCategoryLabel,
    difficulty: data.difficulty,
    prompt: data.prompt,
    explanation: data.explanation,
    contextualHint: data.hint,
    tags: ["wager", data.categoryId, data.subCategoryId],
    editorialStatus: "approved",
    version: 1,
    source: "generateur-local",
    author: "TRIUM",
    options,
    correctOptionId: "a",
    answer: { accepted: [correctLabel], display: correctLabel },
    timeLimitSeconds: 30,
  };
}

export function buildWagerQuestionSet(seed: string): readonly WagerQuestion[] {
  return shuffleWithSeed(WAGER_BANK, `${seed}:wager:questions`).map((data, index) => makeQuestion(data, seed, index));
}

export function isWagerQuestion(question: { kind: string; type: string; editorialStatus?: string }): question is WagerQuestion {
  return question.kind === "wager" && question.type === "multiple_choice" && question.editorialStatus === "approved";
}

export function wagerDifficultyLabel(difficulty: Difficulty): WagerDifficultyLabel {
  if (difficulty <= 1) return "facile";
  if (difficulty === 2) return "moyen";
  if (difficulty === 3) return "difficile";
  return "expert";
}

export function coefficientForWagerDifficulty(difficulty: Difficulty): number {
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  if (difficulty === 3) return 3;
  return 5;
}

export function maximumCustomWager(scoreTotal: number): number {
  return Math.max(0, Math.floor(Math.max(0, scoreTotal) * 0.25));
}

export function isFreeMinimumStake(scoreTotal: number, amount: number): boolean {
  return scoreTotal < 100 && amount === 100;
}

export function isAllowedWagerAmount(input: { amount: number; scoreTotal: number }): boolean {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return false;
  if (isFreeMinimumStake(input.scoreTotal, input.amount)) return true;
  if (input.amount > input.scoreTotal) return false;
  if ((STANDARD_WAGER_AMOUNTS as readonly number[]).includes(input.amount)) return true;
  return input.amount <= maximumCustomWager(input.scoreTotal);
}

export function assertAllowedWagerAmount(input: { amount: number; scoreTotal: number }): void {
  if (!isAllowedWagerAmount(input)) {
    throw new Error("Mise invalide pour le score disponible.");
  }
}

export function availableWagerCategories(questions: readonly WagerQuestion[]): readonly { id: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const question of questions) {
    byId.set(question.categoryId, question.categoryLabel);
  }
  return [...byId.entries()].map(([id, label]) => ({ id, label })).sort((left, right) => left.label.localeCompare(right.label, "fr"));
}

export function availableWagerDifficulties(questions: readonly WagerQuestion[], categoryId: string): readonly Difficulty[] {
  const difficulties = new Set<Difficulty>();
  for (const question of questions) {
    if (question.categoryId === categoryId) {
      difficulties.add(question.difficulty);
    }
  }
  return [...difficulties].sort((left, right) => left - right);
}

export function selectWagerQuestions(input: { questions: readonly WagerQuestion[]; alreadyUsedQuestionIds: readonly QuestionId[]; categoryId?: string | undefined; difficulty?: Difficulty | undefined; seed: string; count?: number | undefined }): readonly WagerQuestion[] {
  const used = new Set(input.alreadyUsedQuestionIds);
  const filtered = input.questions.filter((question) => !used.has(question.id) && (input.categoryId === undefined || question.categoryId === input.categoryId) && (input.difficulty === undefined || question.difficulty === input.difficulty));
  return shuffleWithSeed(filtered, `${input.seed}:wager:select:${input.categoryId ?? "any"}:${input.difficulty ?? "any"}`).slice(0, input.count ?? WAGER_QUESTION_COUNT);
}

export function calculateWagerScore(input: { isCorrect: boolean; amount: number; coefficient: number }): ScoreBreakdown {
  const wagerDelta = input.isCorrect ? input.amount * input.coefficient : -input.amount;
  return { ...emptyScore, wagerDelta, total: wagerDelta };
}

export function isWagerComplete(state: Pick<RoundState, "answeredQuestionIds">, config: GameConfig): boolean {
  const definition = config.rounds.find((round) => round.kind === "wager");
  return state.answeredQuestionIds.length >= (definition?.questionCount ?? WAGER_QUESTION_COUNT);
}

export const wagerRound: GameRound<RoundState, WagerQuestion, string> = {
  definition: { id: "wager", kind: "wager", label: "Le Pari", description: "Choisir une categorie, une difficulte et une mise.", questionTypes: ["multiple_choice"], questionCount: WAGER_QUESTION_COUNT, maxScore: 12_500 },
  initializeState: () => ({ id: "wager-state", definitionId: "wager", status: "active", currentQuestionIndex: 0, selectedQuestionIds: [], answeredQuestionIds: [], answerResults: [], score: { ...emptyScore } }),
  selectQuestions: (input) => selectWagerQuestions({ questions: input.questions, alreadyUsedQuestionIds: input.alreadyUsedQuestionIds, seed: input.seed }),
  handleAnswer: (state, question, answerValue) => {
    const isCorrect = answerValue === question.correctOptionId;
    const amount = state.wagerAmount ?? 100;
    const coefficient = state.wagerCoefficient ?? coefficientForWagerDifficulty(question.difficulty);
    return { questionId: question.id, isCorrect, lockedAnswer: answerValue, correctAnswer: question.correctOptionId, explanation: question.explanation, score: calculateWagerScore({ isCorrect, amount, coefficient }), usedJokers: [] };
  },
  calculateScore: (result) => result.score,
  isComplete: (state, config) => isWagerComplete(state, config),
  summarize: (state) => ({ roundId: state.id, label: "Le Pari", answeredQuestions: state.answeredQuestionIds.length, score: state.score, isComplete: state.status === "complete" }),
  restoreState: (savedState) => roundStateSchema.parse(savedState),
};
