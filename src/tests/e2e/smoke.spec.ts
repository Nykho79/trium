import { expect, test } from "@playwright/test";

test("ouvre l'accueil TRIUM", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TRIUM" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nouvelle partie" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reprendre" })).toBeVisible();
  await expect(page.getByRole("button", { name: /R.gles/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Param/ })).toBeVisible();
});

test("parcourt le flux principal jusqu'a l'ecran de jeu", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.getByRole("button", { name: "Choisir le mode" }).click();
  await page.getByRole("button", { name: "Choisir le mode classique" }).click();
  await page.getByRole("button", { name: /Entrer dans la premi.re manche/ }).click();
  await page.getByRole("button", { name: /Lancer la premi.re question/ }).click();
  await expect(page.getByRole("heading", { name: /Place Stanislas/ })).toBeVisible();
});

test("affiche le bilan complet depuis une question validee", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.getByRole("button", { name: "Choisir le mode" }).click();
  await page.getByRole("button", { name: "Choisir le mode classique" }).click();
  await page.getByRole("button", { name: /Entrer dans la premi.re manche/ }).click();
  await page.getByRole("button", { name: /Lancer la premi.re question/ }).click();
  await page.getByRole("button", { name: /Nancy/ }).click();
  await page.getByRole("button", { name: /Valider/ }).click();
  await page.getByRole("button", { name: /R.sultat de manche/ }).click();
  await page.getByRole("button", { name: "Bilan complet" }).click();

  await expect(page.getByRole("heading", { name: /Equipe|Collectif|Architectes|Triade/ })).toBeVisible();
  await expect(page.getByText(/Taux de bonnes r.ponses/)).toBeVisible();
  await expect(page.getByText(/Score par manche/)).toBeVisible();
});