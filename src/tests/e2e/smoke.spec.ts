import { expect, test, type Page } from "@playwright/test";

async function chooseFirstAvailableAnswer(page: Page, containerTestId?: string): Promise<void> {
  const answers = containerTestId ? page.getByTestId(containerTestId) : page.locator(".question-live .answer-grid.live");
  await answers.locator("button:not(:disabled)").first().click();
}

async function answerAndReveal(page: Page, containerTestId?: string): Promise<void> {
  await chooseFirstAvailableAnswer(page, containerTestId);
  await expect(page.getByText("Reponse revelee")).toBeVisible();
}

async function openKnowledgeGrid(page: Page) {
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.getByRole("button", { name: "Choisir le format" }).click();
  await page.getByRole("button", { name: "Choisir le mode classique" }).click();
  await page.getByRole("button", { name: /Entrer dans la premi.re manche/ }).click();
  await page.getByRole("button", { name: /Afficher la grille/ }).click();
}

test("ouvre l'accueil TRIUM", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TRIUM" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nouvelle partie" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reprendre" })).toBeVisible();
  await expect(page.getByRole("button", { name: /R.gles/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Param/ })).toBeVisible();
});

test("parcourt le flux principal jusqu'a la grille de jeu", async ({ page }) => {
  await openKnowledgeGrid(page);
  await expect(page.getByRole("grid", { name: "Grille des savoirs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "200" }).first()).toBeVisible();
});

test("revele une reponse depuis une case de grille", async ({ page }) => {
  await openKnowledgeGrid(page);
  await page.getByRole("button", { name: "200" }).first().click();
  await expect(page.locator(".knowledge-question-live")).toBeVisible();
  await answerAndReveal(page);

  await expect(page.getByRole("button", { name: /Retour . la grille|Retour a la grille/ })).toBeVisible();
});

test("confirme et applique le joker 50/50", async ({ page }) => {
  await openKnowledgeGrid(page);
  await page.getByRole("button", { name: "200" }).first().click();
  await expect(page.locator(".knowledge-question-live")).toBeVisible();

  await page.getByTestId("joker-fifty_fifty").click();
  await expect(page.getByRole("dialog", { name: /Utiliser 50\/50/ })).toBeVisible();
  await page.getByRole("button", { name: "Utiliser" }).click();

  await expect(page.locator("button.answer-state-disabled")).toHaveCount(2);
  await expect(page.getByTestId("joker-fifty_fifty")).toBeDisabled();
});

async function openClueRace(page: Page) {
  const players = [
    { id: "player-1", name: "Alice", color: "amber", ready: true },
    { id: "player-2", name: "Benoit", color: "cyan", ready: true },
    { id: "player-3", name: "Camille", color: "magenta", ready: true },
  ];
  const score = { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 };
  const jokerInventory = { fifty_fifty: 1, second_chance: 1, change_question: 0, contextual_hint: 0, extra_time: 1, team_vote: 0 };
  const zeroJokers = { fifty_fifty: 0, second_chance: 0, change_question: 0, contextual_hint: 0, extra_time: 0, team_vote: 0 };
  const rounds = [
    { id: "knowledge-grid", kind: "knowledge-grid", label: "Grille des savoirs", description: "Choix libre.", questionTypes: ["multiple_choice"], questionCount: 8, maxScore: 4100 },
    { id: "clue-race", kind: "clue-race", label: "Course aux indices", description: "Indices progressifs.", questionTypes: ["progressive_clues"], questionCount: 5, maxScore: 2500 },
  ];
  await page.addInitScript(({ players, score, jokerInventory, zeroJokers, rounds }) => {
    window.localStorage.setItem("trium.saved-game.v1", JSON.stringify({
      version: 1,
      savedAt: "2026-07-16T12:00:00.000Z",
      screen: "game",
      gameState: {
        status: "round_intro",
        config: {
          id: "e2e-clue-race",
          mode: "standard",
          seed: "e2e-clue-seed",
          playerMode: "trio", players,
          rounds,
          questionBankVersion: 1,
          allowRecentlyPlayedFallback: true,
          defaultQuestionTimeMs: 30000,
        },
        currentRoundIndex: 1,
        currentRoundState: {
          id: "round-state-2",
          definitionId: "clue-race",
          status: "active",
          currentQuestionIndex: 0,
          selectedQuestionIds: [],
          answeredQuestionIds: [],
          answerResults: [],
          score,
          clueIndex: 0,
          answersVisible: false,
        },
        captainPlayerId: "player-1",
        usedQuestionIds: ["cl-fr-002", "cl-fr-003", "cl-fr-004", "cl-fr-005"],
        recentlyPlayedQuestionIds: [],
        jokers: { available: jokerInventory, used: zeroJokers, disabled: [] },
        jokerEffects: { eliminatedOptionIds: [], secondChanceActive: false, secondChanceConsumed: false, changedQuestionIds: [] },
        score,
        eventLog: [{ id: "event-1-game_created", type: "game_created", at: "2026-07-16T12:00:00.000Z", toStatus: "round_intro" }],
      },
      recentQuestionIds: [],
    }));
  }, { players, score, jokerInventory, zeroJokers, rounds });
  await page.goto("/");
}

test("joue une enigme de Course aux indices avec 50/50 apres les propositions", async ({ page }) => {
  await openClueRace(page);
  await expect(page.getByRole("button", { name: /Afficher l.indice 1/ })).toBeVisible();
  await page.getByTestId("start-clue-question").click();

  await expect(page.locator(".clue-race-live")).toBeVisible();
  await expect(page.getByText("Indice 1 / 5")).toBeVisible();
  await expect(page.getByText("500 points")).toBeVisible();
  await expect(page.getByTestId("joker-fifty_fifty")).toBeDisabled();

  await page.getByRole("button", { name: "Indice suivant" }).click();
  await expect(page.getByText("Indice 2 / 5")).toBeVisible();
  await expect(page.getByText("400 points")).toBeVisible();

  await page.getByRole("button", { name: "Repondre maintenant" }).click();
  await expect(page.getByTestId("clue-answer-options")).toBeVisible();
  await expect(page.getByTestId("joker-fifty_fifty")).toBeEnabled();
  await page.getByTestId("joker-fifty_fifty").click();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await expect(page.locator("button.answer-state-disabled")).toHaveCount(2);

  await answerAndReveal(page, "clue-answer-options");

  await expect(page.getByRole("button", { name: "Enigme suivante" })).toBeVisible();
});

async function openPressureChoice(page: Page) {
  const players = [
    { id: "player-1", name: "Alice", color: "amber", ready: true },
    { id: "player-2", name: "Benoit", color: "cyan", ready: true },
    { id: "player-3", name: "Camille", color: "magenta", ready: true },
  ];
  const score = { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 };
  const jokerInventory = { fifty_fifty: 1, second_chance: 1, change_question: 0, contextual_hint: 0, extra_time: 1, team_vote: 0 };
  const zeroJokers = { fifty_fifty: 0, second_chance: 0, change_question: 0, contextual_hint: 0, extra_time: 0, team_vote: 0 };
  const rounds = [
    { id: "knowledge-grid", kind: "knowledge-grid", label: "Grille des savoirs", description: "Choix libre.", questionTypes: ["multiple_choice"], questionCount: 8, maxScore: 4100 },
    { id: "clue-race", kind: "clue-race", label: "Course aux indices", description: "Indices progressifs.", questionTypes: ["progressive_clues"], questionCount: 5, maxScore: 2500 },
    { id: "pressure-choice", kind: "pressure-choice", label: "Choix sous pression", description: "QCM sous pression.", questionTypes: ["multiple_choice"], questionCount: 5, maxScore: 4700 },
  ];
  await page.addInitScript(({ players, score, jokerInventory, zeroJokers, rounds }) => {
    window.localStorage.setItem("trium.saved-game.v1", JSON.stringify({
      version: 1,
      savedAt: "2026-07-16T12:00:00.000Z",
      screen: "game",
      gameState: {
        status: "round_intro",
        config: {
          id: "e2e-pressure-choice",
          mode: "standard",
          seed: "e2e-pressure-seed",
          playerMode: "trio", players,
          rounds,
          questionBankVersion: 1,
          allowRecentlyPlayedFallback: true,
          defaultQuestionTimeMs: 30000,
        },
        currentRoundIndex: 2,
        currentRoundState: {
          id: "round-state-3",
          definitionId: "pressure-choice",
          status: "active",
          currentQuestionIndex: 0,
          selectedQuestionIds: [],
          answeredQuestionIds: [],
          answerResults: [],
          score,
          securedPoints: 0,
          riskPoints: 0,
        },
        captainPlayerId: "player-1",
        usedQuestionIds: [],
        recentlyPlayedQuestionIds: [],
        jokers: { available: jokerInventory, used: zeroJokers, disabled: [] },
        jokerEffects: { eliminatedOptionIds: [], secondChanceActive: false, secondChanceConsumed: false, changedQuestionIds: [] },
        score,
        eventLog: [{ id: "event-1-game_created", type: "game_created", at: "2026-07-16T12:00:00.000Z", toStatus: "round_intro" }],
      },
      recentQuestionIds: [],
    }));
  }, { players, score, jokerInventory, zeroJokers, rounds });
  await page.goto("/");
}

test("joue et securise le premier palier de Choix sous pression", async ({ page }) => {
  await openPressureChoice(page);
  await expect(page.getByTestId("start-pressure-question")).toBeVisible();
  await page.getByTestId("start-pressure-question").click();

  await expect(page.locator(".pressure-choice-live")).toBeVisible();
  await expect(page.getByText("x1")).toBeVisible();
  await expect(page.getByText("35 s")).toBeVisible();

  await answerAndReveal(page, "pressure-answer-options");

});

async function openSynapse(page: Page) {
  const players = [
    { id: "player-1", name: "Alice", color: "amber", ready: true },
    { id: "player-2", name: "Benoit", color: "cyan", ready: true },
    { id: "player-3", name: "Camille", color: "magenta", ready: true },
  ];
  const score = { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 };
  const jokerInventory = { fifty_fifty: 1, second_chance: 1, change_question: 0, contextual_hint: 1, extra_time: 1, team_vote: 0 };
  const zeroJokers = { fifty_fifty: 0, second_chance: 0, change_question: 0, contextual_hint: 0, extra_time: 0, team_vote: 0 };
  const rounds = [
    { id: "knowledge-grid", kind: "knowledge-grid", label: "Grille des savoirs", description: "Choix libre.", questionTypes: ["multiple_choice"], questionCount: 8, maxScore: 4100 },
    { id: "clue-race", kind: "clue-race", label: "Course aux indices", description: "Indices progressifs.", questionTypes: ["progressive_clues"], questionCount: 5, maxScore: 2500 },
    { id: "pressure-choice", kind: "pressure-choice", label: "Choix sous pression", description: "QCM sous pression.", questionTypes: ["multiple_choice"], questionCount: 5, maxScore: 4700 },
    { id: "synapse", kind: "synapse", label: "Synapse", description: "Mini-epreuves.", questionTypes: ["chronology", "analogy", "memory", "sequence", "intruder", "visual_matrix", "symbol_rule"], questionCount: 6, maxScore: 1680 },
  ];
  await page.addInitScript(({ players, score, jokerInventory, zeroJokers, rounds }) => {
    window.localStorage.setItem("trium.saved-game.v1", JSON.stringify({
      version: 1,
      savedAt: "2026-07-16T12:00:00.000Z",
      screen: "game",
      gameState: {
        status: "round_intro",
        config: {
          id: "e2e-synapse",
          mode: "standard",
          seed: "e2e-synapse-seed",
          playerMode: "trio", players,
          rounds,
          questionBankVersion: 1,
          allowRecentlyPlayedFallback: true,
          defaultQuestionTimeMs: 30000,
        },
        currentRoundIndex: 3,
        currentRoundState: {
          id: "round-state-4",
          definitionId: "synapse",
          status: "active",
          currentQuestionIndex: 0,
          selectedQuestionIds: [],
          answeredQuestionIds: [],
          answerResults: [],
          score,
        },
        captainPlayerId: "player-1",
        usedQuestionIds: [],
        recentlyPlayedQuestionIds: [],
        jokers: { available: jokerInventory, used: zeroJokers, disabled: [] },
        jokerEffects: { eliminatedOptionIds: [], secondChanceActive: false, secondChanceConsumed: false, changedQuestionIds: [] },
        score,
        eventLog: [{ id: "event-1-game_created", type: "game_created", at: "2026-07-16T12:00:00.000Z", toStatus: "round_intro" }],
      },
      recentQuestionIds: [],
    }));
  }, { players, score, jokerInventory, zeroJokers, rounds });
  await page.goto("/");
}

test("joue une mini-epreuve Synapse", async ({ page }) => {
  await openSynapse(page);
  await expect(page.getByTestId("start-synapse-question")).toBeVisible();
  await page.getByTestId("start-synapse-question").click();

  await expect(page.getByText("Synapse").first()).toBeVisible();
  await expect(page.getByTestId("joker-fifty_fifty")).toBeDisabled();
  await expect(page.getByTestId("joker-team_vote")).toBeDisabled();
  await expect(page.getByTestId("synapse-answer-options")).toBeVisible({ timeout: 3000 });

  await answerAndReveal(page, "synapse-answer-options");

  await expect(page.getByRole("button", { name: "Epreuve suivante" })).toBeVisible();
});
async function openConnections(page: Page) {
  const players = [
    { id: "player-1", name: "Alice", color: "amber", ready: true },
    { id: "player-2", name: "Benoit", color: "cyan", ready: true },
    { id: "player-3", name: "Camille", color: "magenta", ready: true },
  ];
  const score = { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 };
  const jokerInventory = { fifty_fifty: 1, second_chance: 1, change_question: 0, contextual_hint: 1, extra_time: 1, team_vote: 0 };
  const zeroJokers = { fifty_fifty: 0, second_chance: 0, change_question: 0, contextual_hint: 0, extra_time: 0, team_vote: 0 };
  const rounds = [
    { id: "knowledge-grid", kind: "knowledge-grid", label: "Grille des savoirs", description: "Choix libre.", questionTypes: ["multiple_choice"], questionCount: 8, maxScore: 4100 },
    { id: "clue-race", kind: "clue-race", label: "Course aux indices", description: "Indices progressifs.", questionTypes: ["progressive_clues"], questionCount: 5, maxScore: 2500 },
    { id: "pressure-choice", kind: "pressure-choice", label: "Choix sous pression", description: "QCM sous pression.", questionTypes: ["multiple_choice"], questionCount: 5, maxScore: 4700 },
    { id: "synapse", kind: "synapse", label: "Synapse", description: "Mini-epreuves.", questionTypes: ["chronology", "analogy", "memory", "sequence", "intruder", "visual_matrix", "symbol_rule"], questionCount: 6, maxScore: 1680 },
    { id: "connections", kind: "connections", label: "Connexions", description: "Lien commun.", questionTypes: ["connection"], questionCount: 5, maxScore: 2500 },
  ];
  await page.addInitScript(({ players, score, jokerInventory, zeroJokers, rounds }) => {
    window.localStorage.setItem("trium.saved-game.v1", JSON.stringify({
      version: 1,
      savedAt: "2026-07-16T12:00:00.000Z",
      screen: "game",
      gameState: {
        status: "round_intro",
        config: {
          id: "e2e-connections",
          mode: "standard",
          seed: "e2e-connections-seed",
          playerMode: "trio", players,
          rounds,
          questionBankVersion: 1,
          allowRecentlyPlayedFallback: true,
          defaultQuestionTimeMs: 30000,
        },
        currentRoundIndex: 4,
        currentRoundState: {
          id: "round-state-5",
          definitionId: "connections",
          status: "active",
          currentQuestionIndex: 0,
          selectedQuestionIds: [],
          answeredQuestionIds: [],
          answerResults: [],
          score,
          connectionItemIndex: 0,
          answersVisible: false,
        },
        captainPlayerId: "player-1",
        usedQuestionIds: [],
        recentlyPlayedQuestionIds: [],
        jokers: { available: jokerInventory, used: zeroJokers, disabled: [] },
        jokerEffects: { eliminatedOptionIds: [], secondChanceActive: false, secondChanceConsumed: false, changedQuestionIds: [] },
        score,
        eventLog: [{ id: "event-1-game_created", type: "game_created", at: "2026-07-16T12:00:00.000Z", toStatus: "round_intro" }],
      },
      recentQuestionIds: [],
    }));
  }, { players, score, jokerInventory, zeroJokers, rounds });
  await page.goto("/");
}

test("joue une connexion progressive avec 50/50 apres les propositions", async ({ page }) => {
  await openConnections(page);
  await expect(page.getByTestId("start-connection-question")).toBeVisible();
  await page.getByTestId("start-connection-question").click();

  await expect(page.getByText("500 points")).toBeVisible();
  await expect(page.getByTestId("connection-items")).toBeVisible();
  await expect(page.getByTestId("joker-fifty_fifty")).toBeDisabled();

  await page.getByRole("button", { name: "Element suivant" }).click();
  await expect(page.getByText("400 points")).toBeVisible();

  await page.getByRole("button", { name: "Repondre maintenant" }).click();
  await expect(page.getByTestId("connection-answer-options")).toBeVisible();
  await expect(page.getByTestId("joker-fifty_fifty")).toBeEnabled();
  await page.getByTestId("joker-fifty_fifty").click();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await expect(page.getByTestId("connection-answer-options").locator("button.answer-state-disabled")).toHaveCount(2);

  await answerAndReveal(page, "connection-answer-options");

  await expect(page.getByTestId("connection-reveal-items")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connexion suivante" })).toBeVisible();
});
async function openWager(page: Page) {
  const players = [
    { id: "player-1", name: "Alice", color: "amber", ready: true },
    { id: "player-2", name: "Benoit", color: "cyan", ready: true },
    { id: "player-3", name: "Camille", color: "magenta", ready: true },
  ];
  const score = { basePoints: 1_000, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 1_000 };
  const roundScore = { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 };
  const jokerInventory = { fifty_fifty: 1, second_chance: 1, change_question: 1, contextual_hint: 1, extra_time: 1, team_vote: 1 };
  const zeroJokers = { fifty_fifty: 0, second_chance: 0, change_question: 0, contextual_hint: 0, extra_time: 0, team_vote: 0 };
  const rounds = [
    { id: "knowledge-grid", kind: "knowledge-grid", label: "Grille des savoirs", description: "Choix libre.", questionTypes: ["multiple_choice"], questionCount: 8, maxScore: 4100 },
    { id: "clue-race", kind: "clue-race", label: "Course aux indices", description: "Indices progressifs.", questionTypes: ["progressive_clues"], questionCount: 5, maxScore: 2500 },
    { id: "pressure-choice", kind: "pressure-choice", label: "Choix sous pression", description: "QCM sous pression.", questionTypes: ["multiple_choice"], questionCount: 5, maxScore: 4700 },
    { id: "synapse", kind: "synapse", label: "Synapse", description: "Mini-epreuves.", questionTypes: ["chronology", "analogy", "memory", "sequence", "intruder", "visual_matrix", "symbol_rule"], questionCount: 6, maxScore: 1680 },
    { id: "connections", kind: "connections", label: "Connexions", description: "Lien commun.", questionTypes: ["connection"], questionCount: 5, maxScore: 2500 },
    { id: "wager", kind: "wager", label: "Le Pari", description: "Categorie, difficulte et mise.", questionTypes: ["multiple_choice"], questionCount: 5, maxScore: 12500 },
  ];
  await page.addInitScript(({ players, score, roundScore, jokerInventory, zeroJokers, rounds }) => {
    window.localStorage.setItem("trium.saved-game.v1", JSON.stringify({
      version: 1,
      savedAt: "2026-07-16T12:00:00.000Z",
      screen: "game",
      gameState: {
        status: "round_intro",
        config: {
          id: "e2e-wager",
          mode: "standard",
          seed: "e2e-wager-seed",
          playerMode: "trio", players,
          rounds,
          questionBankVersion: 1,
          allowRecentlyPlayedFallback: true,
          defaultQuestionTimeMs: 30000,
        },
        currentRoundIndex: 5,
        currentRoundState: {
          id: "round-state-6",
          definitionId: "wager",
          status: "active",
          currentQuestionIndex: 0,
          selectedQuestionIds: [],
          answeredQuestionIds: [],
          answerResults: [],
          score: roundScore,
        },
        captainPlayerId: "player-1",
        usedQuestionIds: [],
        recentlyPlayedQuestionIds: [],
        jokers: { available: jokerInventory, used: zeroJokers, disabled: [] },
        jokerEffects: { eliminatedOptionIds: [], secondChanceActive: false, secondChanceConsumed: false, changedQuestionIds: [] },
        score,
        eventLog: [{ id: "event-1-game_created", type: "game_created", at: "2026-07-16T12:00:00.000Z", toStatus: "round_intro" }],
      },
      recentQuestionIds: [],
    }));
  }, { players, score, roundScore, jokerInventory, zeroJokers, rounds });
  await page.goto("/");
}

test("configure et joue un pari confirme", async ({ page }) => {
  await openWager(page);
  await expect(page.getByTestId("wager-setup")).toBeVisible();

  await page.getByRole("button", { name: "Arts et litterature" }).click();
  await page.getByRole("button", { name: /moyen/ }).click();
  await page.getByRole("button", { name: "250" }).click();
  await page.getByTestId("validate-wager-button").click();
  await expect(page.getByTestId("wager-confirm-panel")).toBeVisible();
  await page.getByTestId("confirm-wager-button").click();

  await expect(page.getByTestId("wager-question")).toBeVisible();
  await expect(page.getByText("Gain possible : 500")).toBeVisible();
  await expect(page.getByTestId("joker-fifty_fifty")).toBeEnabled();
  await expect(page.getByTestId("joker-change_question")).toBeDisabled();
  await expect(page.getByTestId("joker-team_vote")).toBeDisabled();

  await page.getByTestId("joker-fifty_fifty").click();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await expect(page.getByTestId("wager-answer-options").locator("button.answer-state-disabled")).toHaveCount(2);

  await answerAndReveal(page, "wager-answer-options");

  await expect(page.getByRole("button", { name: "Pari suivant" })).toBeVisible();
});
async function openFinalConvergence(page: Page) {
  const players = [
    { id: "player-1", name: "Alice", color: "amber", ready: true },
    { id: "player-2", name: "Benoit", color: "cyan", ready: true },
    { id: "player-3", name: "Camille", color: "magenta", ready: true },
  ];
  const score = { basePoints: 2_000, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 2_000 };
  const roundScore = { basePoints: 0, timeBonus: 0, streakBonus: 0, jokerPenalty: 0, wagerDelta: 0, total: 0 };
  const jokerInventory = { fifty_fifty: 1, second_chance: 1, change_question: 1, contextual_hint: 1, extra_time: 1, team_vote: 1 };
  const zeroJokers = { fifty_fifty: 0, second_chance: 0, change_question: 0, contextual_hint: 0, extra_time: 0, team_vote: 0 };
  const rounds = [
    { id: "knowledge-grid", kind: "knowledge-grid", label: "Grille des savoirs", description: "Choix libre.", questionTypes: ["multiple_choice"], questionCount: 8, maxScore: 4100 },
    { id: "clue-race", kind: "clue-race", label: "Course aux indices", description: "Indices progressifs.", questionTypes: ["progressive_clues"], questionCount: 5, maxScore: 2500 },
    { id: "pressure-choice", kind: "pressure-choice", label: "Choix sous pression", description: "QCM sous pression.", questionTypes: ["multiple_choice"], questionCount: 5, maxScore: 4700 },
    { id: "synapse", kind: "synapse", label: "Synapse", description: "Mini-epreuves.", questionTypes: ["chronology", "analogy", "memory", "sequence", "intruder", "visual_matrix", "symbol_rule"], questionCount: 6, maxScore: 1680 },
    { id: "connections", kind: "connections", label: "Connexions", description: "Lien commun.", questionTypes: ["connection"], questionCount: 5, maxScore: 2500 },
    { id: "wager", kind: "wager", label: "Le Pari", description: "Categorie, difficulte et mise.", questionTypes: ["multiple_choice"], questionCount: 5, maxScore: 12500 },
    { id: "final-convergence", kind: "final-convergence", label: "Convergence finale", description: "Finale en cinq etapes.", questionTypes: ["multiple_choice", "progressive_clues", "connection", "memory", "chronology", "analogy", "sequence"], questionCount: 5, maxScore: 5000 },
  ];
  await page.addInitScript(({ players, score, roundScore, jokerInventory, zeroJokers, rounds }) => {
    window.localStorage.setItem("trium.saved-game.v1", JSON.stringify({
      version: 1,
      savedAt: "2026-07-16T12:00:00.000Z",
      screen: "game",
      gameState: {
        status: "round_intro",
        config: { id: "e2e-final", mode: "standard", seed: "e2e-final-seed", playerMode: "trio", players, rounds, questionBankVersion: 1, allowRecentlyPlayedFallback: true, defaultQuestionTimeMs: 30000 },
        currentRoundIndex: 6,
        currentRoundState: { id: "round-state-7", definitionId: "final-convergence", status: "active", currentQuestionIndex: 0, selectedQuestionIds: [], answeredQuestionIds: [], answerResults: [], score: roundScore, finalPurchasedAdvantageIds: [], finalUsedAdvantageIds: [] },
        captainPlayerId: "player-1",
        usedQuestionIds: [],
        recentlyPlayedQuestionIds: [],
        jokers: { available: jokerInventory, used: zeroJokers, disabled: [] },
        jokerEffects: { eliminatedOptionIds: [], secondChanceActive: false, secondChanceConsumed: false, changedQuestionIds: [] },
        score,
        eventLog: [{ id: "event-1-game_created", type: "game_created", at: "2026-07-16T12:00:00.000Z", toStatus: "round_intro" }],
      },
      recentQuestionIds: [],
    }));
  }, { players, score, roundScore, jokerInventory, zeroJokers, rounds });
  await page.goto("/");
}

test("achete des avantages et joue la premiere etape de Convergence", async ({ page }) => {
  await openFinalConvergence(page);
  await expect(page.getByTestId("final-setup")).toBeVisible();
  await page.getByTestId("final-advantage-extra_time").click();
  await page.getByTestId("final-advantage-remove_wrong_answer").click();
  await page.getByTestId("start-final-question").click();

  await expect(page.getByTestId("final-question")).toBeVisible();
  await expect(page.getByText("QCM culture generale")).toBeVisible();
  await expect(page.getByTestId("final-answer-options").locator("button.answer-state-disabled")).toHaveCount(1);
  await expect(page.getByTestId("joker-fifty_fifty")).toBeDisabled();

  await answerAndReveal(page, "final-answer-options");

  await expect(page.getByRole("button", { name: "Etape suivante" })).toBeVisible();
});
