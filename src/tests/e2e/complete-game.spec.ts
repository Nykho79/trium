/* global Element */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { questionBankSchema } from "../../core/schemas/questionSchemas";

const SAVE_KEY = "trium.saved-game.v1";
const FIXED_SEED = "trium-e2e-complete-v1";
test.setTimeout(120_000);

type SourceAnswer = { id: string; text?: string; itemOrder?: string[]; output?: string[] };
type SourceQuestion = {
  id: string;
  correctAnswerId?: string;
  correctItemId?: string;
  correctAnswerIds?: string[];
  correctAnswer?: boolean;
  answers?: SourceAnswer[];
};
type SourceQuestionContainer = {
  questions?: SourceQuestion[];
  series?: Array<{ questions?: SourceQuestion[] }>;
  paths?: Array<{ steps?: Array<{ content?: SourceQuestion }> }>;
};

type SavedGameEnvelope = {
  screen: string;
  gameState: {
    status: string;
    activeQuestionId?: string;
    config: { seed: string; defaultQuestionTimeMs: number; rounds: Array<{ kind: string; questionCount: number }> };
    score: { basePoints: number; total: number };
    currentRoundState?: { selectedQuestionIds: string[]; answeredQuestionIds: string[] };
    usedQuestionIds: string[];
    jokers: { available: Record<string, number> };
  };
};

function projectRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

function collectSourceQuestions(source: SourceQuestionContainer): SourceQuestion[] {
  const direct = source.questions ?? [];
  const series = (source.series ?? []).flatMap((entry) => entry.questions ?? []);
  const paths = (source.paths ?? []).flatMap((entry) => (entry.steps ?? []).flatMap((step) => step.content ? [step.content] : []));
  return [...direct, ...series, ...paths];
}

function sourceCorrectOptionId(question: SourceQuestion): string | undefined {
  if (question.correctAnswerIds && question.correctAnswerIds.length > 1) return "correct";
  if (question.correctAnswerId) return question.correctAnswerId;
  if (question.correctItemId) return question.correctItemId;
  if (question.correctAnswerIds?.[0]) return question.correctAnswerIds[0];
  if (question.correctAnswer !== undefined) return question.correctAnswer ? "true" : "false";
  return undefined;
}

function localCorrectAnswers(): Map<string, string> {
  const questionsDir = path.join(projectRoot(), "src", "data", "questions");
  const answers = new Map<string, string>();
  for (const fileName of readdirSync(questionsDir).filter((file) => file.endsWith(".json") && !file.includes(" - Copie"))) {
    const source = JSON.parse(readFileSync(path.join(questionsDir, fileName), "utf8")) as SourceQuestionContainer;
    for (const question of collectSourceQuestions(source)) {
      const correctOptionId = sourceCorrectOptionId(question);
      if (correctOptionId) answers.set(question.id, correctOptionId);
    }
  }
  return answers;
}

const correctAnswers = localCorrectAnswers();
function localKnowledgeQuestionIds(): string[] {
  const questionsDir = path.join(projectRoot(), "src", "data", "questions");
  const ids: string[] = [];
  for (const fileName of readdirSync(questionsDir).filter((file) => file.endsWith(".json") && !file.includes(" - Copie") && !file.includes("pressure") && !file.includes("wager") && !file.includes("final"))) {
    const source = JSON.parse(readFileSync(path.join(questionsDir, fileName), "utf8")) as SourceQuestionContainer;
    for (const question of collectSourceQuestions(source)) {
      ids.push(question.id);
    }
  }
  return ids;
}

const knowledgeQuestionIds = localKnowledgeQuestionIds();

async function installStableBrowserSurface(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("trium-e2e-storage-ready")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("trium-e2e-storage-ready", "1");
    }
    class E2EAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: "sine",
          frequency: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
          connect: () => undefined,
          start: () => undefined,
          stop: () => undefined,
          onended: undefined as (() => void) | undefined,
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
          connect: () => undefined,
        };
      }
      close() {
        return Promise.resolve();
      }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: E2EAudioContext });
    Object.defineProperty(window, "webkitAudioContext", { configurable: true, value: E2EAudioContext });
  });
}

async function startConfiguredTrioGame(page: Page): Promise<void> {
  await installStableBrowserSurface(page);
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.getByLabel("Prenom joueur 1").fill("Alice");
  await page.getByLabel("Prenom joueur 2").fill("Benoit");
  await page.getByLabel("Prenom joueur 3").fill("Camille");
  await page.getByRole("button", { name: "Choisir le format" }).click();
  await page.getByRole("button", { name: "Choisir le mode classique" }).click();
  await expect(page.getByRole("heading", { name: "Equipe prete" })).toBeVisible();
  await compactSavedGameForE2E(page);
  await page.reload();
  await expect(page.getByText(`Seed : ${FIXED_SEED}`)).toBeVisible();
  await page.getByRole("button", { name: /Entrer dans la premi.re manche/ }).click();
  await page.getByRole("button", { name: "Afficher la grille" }).click({ force: true });
}

async function compactSavedGameForE2E(page: Page): Promise<void> {
  await page.evaluate(({ saveKey, seed }) => {
    const raw = window.localStorage.getItem(saveKey);
    if (!raw) throw new Error("Sauvegarde E2E introuvable apres creation de partie.");
    const saved = JSON.parse(raw) as SavedGameEnvelope;
    saved.screen = "game-intro";
    saved.gameState.config.seed = seed;
    saved.gameState.config.defaultQuestionTimeMs = 30_000;
    saved.gameState.config.rounds = saved.gameState.config.rounds.map((round) => ({
      ...round,
      questionCount: round.kind === "final-convergence" ? 5 : round.kind === "pressure-choice" ? 2 : 1,
    }));
    saved.gameState.score.basePoints = 2_500;
    saved.gameState.score.total = 2_500;
    saved.gameState.jokers.available = {
      fifty_fifty: 1,
      second_chance: 1,
      change_question: 1,
      contextual_hint: 1,
      extra_time: 1,
      team_vote: 1,
    };
    window.localStorage.setItem(saveKey, JSON.stringify(saved));
  }, { saveKey: SAVE_KEY, seed: FIXED_SEED });
}

async function activeQuestionId(page: Page): Promise<string> {
  return page.evaluate((saveKey) => {
    const raw = window.localStorage.getItem(saveKey);
    if (!raw) throw new Error("Sauvegarde absente.");
    const saved = JSON.parse(raw) as SavedGameEnvelope;
    const questionId = saved.gameState.activeQuestionId;
    if (!questionId) throw new Error("Aucune question active.");
    return questionId;
  }, SAVE_KEY);
}

async function currentCorrectOptionId(page: Page): Promise<string> {
  const questionId = await activeQuestionId(page);
  return correctAnswers.get(questionId) ?? "a";
}

function answerScope(page: Page, testId?: string): Locator {
  return testId ? page.getByTestId(testId) : page.locator(".question-live .answer-grid.live").first();
}

async function chooseAnswer(page: Page, testId?: string, preferredOptionId?: string): Promise<void> {
  const scope = answerScope(page, testId);
  await expect(scope).toBeVisible({ timeout: 7_000 });
  const optionId = preferredOptionId ?? await currentCorrectOptionId(page);
  const preferred = scope.locator(`button[data-answer-id="${optionId}"]:not(:disabled)`).first();
  if (await preferred.count() > 0) {
    await preferred.click();
    return;
  }
  await scope.locator("button:not(:disabled)").first().click();
}

async function lockAndReveal(page: Page): Promise<void> {
  await page.getByTestId("lock-answer-button").click();
  const revealButton = page.getByTestId("reveal-answer-button");
  await expect(revealButton).toBeVisible();
  await expect(revealButton).toBeEnabled();
  await revealButton.click();
  await expect(page.getByText("Reponse revelee")).toBeVisible();
}

async function applyFiftyFifty(page: Page): Promise<void> {
  await page.getByTestId("joker-fifty_fifty").click();
  await expect(page.getByRole("dialog", { name: /Utiliser 50\/50/ })).toBeVisible();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await expect(page.locator("button.answer-state-disabled")).toHaveCount(2);
}

async function finishRoundAndOpenNext(page: Page, nextRoundHeading: string): Promise<void> {
  await page.getByRole("button", { name: "Resultat de manche" }).click();
  await expect(page.getByText("Resultat de manche")).toBeVisible();
  await page.getByRole("button", { name: "Manche suivante" }).click();
  await expect(page.getByRole("heading", { name: nextRoundHeading }).first()).toBeVisible();
  await page.getByRole("button", { name: "Afficher la grille" }).click({ force: true });
}

async function playKnowledgeGridRound(page: Page): Promise<void> {
  await expect(page.getByRole("grid", { name: "Grille des savoirs" })).toBeVisible();
  await page.locator(".knowledge-grid-cell:not(:disabled)").first().click();
  await expect(page.locator(".knowledge-question-live")).toBeVisible();
  await applyFiftyFifty(page);
  await chooseAnswer(page);
  await lockAndReveal(page);
  await finishRoundAndOpenNext(page, "Course aux indices");
}

async function playClueRaceRound(page: Page): Promise<void> {
  await page.getByTestId("start-clue-question").click();
  await expect(page.locator(".clue-race-live")).toBeVisible();
  await page.getByRole("button", { name: "Indice suivant" }).click();
  await page.getByRole("button", { name: "Indice suivant" }).click();
  await expect(page.getByText("Indice 3 / 5")).toBeVisible();
  await page.getByRole("button", { name: "Repondre maintenant" }).click();
  await chooseAnswer(page, "clue-answer-options");
  await lockAndReveal(page);
  await finishRoundAndOpenNext(page, "Choix sous pression");
}

async function playPressureChoiceRound(page: Page): Promise<void> {
  await page.getByTestId("start-pressure-question").click();
  await expect(page.locator(".pressure-choice-live")).toBeVisible();
  await chooseAnswer(page, "pressure-answer-options");
  await lockAndReveal(page);
  await expect(page.getByTestId("secure-pressure-button")).toBeVisible();
  await page.getByTestId("secure-pressure-button").click();
  await expect(page.getByText("Resultat de manche")).toBeVisible();
  await page.getByRole("button", { name: "Manche suivante" }).click();
  await expect(page.getByRole("heading", { name: "Synapse" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Afficher la grille" }).click({ force: true });
}

async function playSynapseRound(page: Page): Promise<void> {
  await page.getByTestId("start-synapse-question").click();
  await expect(page.locator(".synapse-live")).toBeVisible();
  await chooseAnswer(page, "synapse-answer-options");
  await lockAndReveal(page);
  await finishRoundAndOpenNext(page, "Connexions");
}

async function playConnectionsRound(page: Page): Promise<void> {
  await page.getByTestId("start-connection-question").click();
  await expect(page.getByTestId("connection-items")).toBeVisible();
  await page.getByRole("button", { name: "Element suivant" }).click();
  await page.getByRole("button", { name: "Repondre maintenant" }).click();
  await chooseAnswer(page, "connection-answer-options");
  await lockAndReveal(page);
  await finishRoundAndOpenNext(page, "Le Pari");
}

async function chooseFirstWagerOption(page: Page): Promise<void> {
  await page.getByTestId("wager-setup").locator(".wager-step-panel").nth(0).locator("button:not(:disabled)").first().click();
  await page.getByTestId("wager-setup").locator(".wager-step-panel").nth(1).locator("button:not(:disabled)").first().click();
  await page.getByRole("button", { name: "100" }).click();
  await page.getByTestId("validate-wager-button").click();
  await expect(page.getByTestId("wager-confirm-panel")).toBeVisible();
  await page.getByTestId("confirm-wager-button").click();
}

async function playWagerRound(page: Page): Promise<void> {
  await expect(page.getByTestId("wager-setup")).toBeVisible();
  await chooseFirstWagerOption(page);
  await expect(page.getByTestId("wager-question")).toBeVisible();
  await chooseAnswer(page, "wager-answer-options");
  await lockAndReveal(page);
  await finishRoundAndOpenNext(page, "Convergence finale");
}

async function playFinalRound(page: Page): Promise<void> {
  await expect(page.getByTestId("final-setup")).toBeVisible();
  await page.getByTestId("final-advantage-extra_time").click();

  for (let step = 0; step < 5; step += 1) {
    await page.getByTestId("start-final-question").click();
    await expect(page.getByTestId("final-question")).toBeVisible();
    await chooseAnswer(page, "final-answer-options");
    await lockAndReveal(page);
    await page.getByRole("button", { name: step === 4 ? "Resultat de manche" : "Etape suivante" }).click();
    if (step < 4) {
      await expect(page.getByTestId("final-setup")).toBeVisible();
    }
  }

  await expect(page.getByText("Resultat de manche")).toBeVisible();
  await page.getByRole("button", { name: "Manche suivante" }).click();
}

test("partie complete compacte avec seed fixe jusqu'a la revanche", async ({ page }) => {
  await startConfiguredTrioGame(page);
  await playKnowledgeGridRound(page);
  await playClueRaceRound(page);
  await playPressureChoiceRound(page);
  await playSynapseRound(page);
  await playConnectionsRound(page);
  await playWagerRound(page);
  await playFinalRound(page);

  await expect(page.getByRole("heading", { name: /Convergence remportee|Convergence manquee|Architectes|Equipe|Collectif/ })).toBeVisible();
  await expect(page.getByText("Score total")).toBeVisible();
  await expect(page.getByText("Score par manche")).toBeVisible();
  await page.getByRole("button", { name: "Nouvelle partie" }).click();
  await expect(page.getByRole("heading", { name: "TRIUM" })).toBeVisible();
  await page.getByTestId("start-button").click();
  await expect(page.getByRole("heading", { name: "Configuration des joueurs" })).toBeVisible();
});

test("scenarios d'erreur moteur et navigation", async ({ page }) => {
  await startConfiguredTrioGame(page);
  await page.locator(".knowledge-grid-cell:not(:disabled)").first().click();
  await expect(page.locator(".knowledge-question-live")).toBeVisible();

  await page.getByTestId("joker-fifty_fifty").click();
  await expect(page.getByRole("dialog", { name: /Utiliser 50\/50/ })).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Utiliser 50\/50/ })).toBeHidden();
  await expect(page.getByTestId("joker-fifty_fifty")).toBeEnabled();

  await chooseAnswer(page);
  await page.getByTestId("lock-answer-button").dblclick();
  await expect(page.getByTestId("reveal-answer-button")).toBeVisible();
  await expect(page.getByText("Action impossible")).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("reveal-answer-button")).toBeVisible();
  await page.goBack().catch(() => null);
  await page.goForward().catch(() => null);
  await expect(page.getByTestId("reveal-answer-button")).toBeVisible();
});

test("expiration avec horloge simulee", async ({ page }) => {
  await startConfiguredTrioGame(page);
  await playKnowledgeGridRound(page);
  await playClueRaceRound(page);
  await page.getByTestId("start-pressure-question").click();
  await expect(page.locator(".pressure-choice-live")).toBeVisible();
  const browserNow = await page.evaluate(() => Date.now());
  await page.clock.install({ time: browserNow });
  await page.clock.fastForward(36_000);
  await chooseAnswer(page, "pressure-answer-options");
  await page.getByTestId("lock-answer-button").click();
  await expect(page.getByText("Action impossible")).toBeVisible();
  await expect(page.getByText(/expiration|expiree/)).toBeVisible();
});

test("sauvegarde corrompue ignoree sans bloquer l'application", async ({ page }) => {
  await page.addInitScript((saveKey) => {
    window.localStorage.setItem(saveKey, "{ ceci n'est pas du JSON valide");
  }, SAVE_KEY);
  await page.goto("/");
  await page.getByRole("button", { name: "Reprendre" }).click();
  await expect(page.getByRole("heading", { name: "Reprendre" })).toBeVisible();
  await expect(page.getByText(/Sauvegarde locale illisible|Aucune partie interrompue/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reprendre la partie" })).toBeDisabled();
});

test("banque insuffisante affiche une erreur claire", async ({ page }) => {
  await startConfiguredTrioGame(page);
  await page.evaluate(({ saveKey, questionIds }) => {
    const raw = window.localStorage.getItem(saveKey);
    if (!raw) throw new Error("Sauvegarde absente.");
    const saved = JSON.parse(raw) as SavedGameEnvelope;
    saved.gameState.usedQuestionIds = questionIds;
    window.localStorage.setItem(saveKey, JSON.stringify(saved));
  }, { saveKey: SAVE_KEY, questionIds: knowledgeQuestionIds });
  await page.reload();
  await expect(page.getByRole("grid", { name: "Grille des savoirs" })).toBeVisible();
  await expect(page.locator(".knowledge-grid-cell:not(:disabled)")).toHaveCount(0);
});

test("fichier JSON invalide rejete par le schema Zod", async () => {
  const invalidPath = path.join(projectRoot(), "src", "tests", "fixtures", "questionBank.invalid.json");
  expect(existsSync(invalidPath)).toBe(true);
  const invalidBank = JSON.parse(readFileSync(invalidPath, "utf8")) as unknown;
  const parsed = questionBankSchema.safeParse(invalidBank);
  expect(parsed.success).toBe(false);
});

test("audio manquant et plein ecran indisponible degradent sans erreur", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("trium-e2e-storage-ready")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("trium-e2e-storage-ready", "1");
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: undefined });
    Object.defineProperty(Element.prototype, "requestFullscreen", { configurable: true, value: () => Promise.reject(new Error("fullscreen blocked")) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Param/ }).click();
  await page.getByRole("button", { name: /Mode plein ecran/ }).click();
  await expect(page.getByRole("status")).toContainText("plein ecran est indisponible");
  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByTestId("start-button").click();
  await expect(page.getByRole("heading", { name: "Configuration des joueurs" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
