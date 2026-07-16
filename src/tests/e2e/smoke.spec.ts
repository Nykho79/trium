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
