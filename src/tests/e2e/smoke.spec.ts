import { expect, test } from "@playwright/test";

async function openKnowledgeGrid(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.getByRole("button", { name: "Choisir le mode" }).click();
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
  await page.getByRole("button", { name: /Culture g.n.rale 200/ }).click();
  await expect(page.getByRole("heading", { name: /Place Stanislas/ })).toBeVisible();
  await page.getByRole("button", { name: /Nancy/ }).click();
  await page.getByTestId("lock-answer-button").click();
  await page.getByTestId("reveal-answer-button").click();

  await expect(page.getByRole("heading", { name: "Nancy" })).toBeVisible();
  await expect(page.getByText(/Score .quipe/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Retour . la grille|Retour a la grille/ })).toBeVisible();
});

test("confirme et applique le joker 50/50", async ({ page }) => {
  await openKnowledgeGrid(page);
  await page.getByRole("button", { name: /Culture g.n.rale 200/ }).click();
  await expect(page.getByRole("heading", { name: /Place Stanislas/ })).toBeVisible();

  await page.getByTestId("joker-fifty_fifty").click();
  await expect(page.getByRole("dialog", { name: /Utiliser 50\/50/ })).toBeVisible();
  await page.getByRole("button", { name: "Utiliser" }).click();

  await expect(page.locator("button.answer-state-disabled")).toHaveCount(2);
  await expect(page.getByTestId("joker-fifty_fifty")).toBeDisabled();
});

async function openClueRace(page: import("@playwright/test").Page) {
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
          players,
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

  await expect(page.getByRole("heading", { name: /Trouvez le personnage historique/ })).toBeVisible();
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

  await page.getByRole("button", { name: /Jeanne d.Arc/ }).click();
  await page.getByTestId("lock-answer-button").click();
  await page.getByTestId("reveal-answer-button").click();

  await expect(page.getByRole("heading", { name: /Jeanne d.Arc/ })).toBeVisible();
  await expect(page.getByText("400").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Enigme suivante" })).toBeVisible();
});
