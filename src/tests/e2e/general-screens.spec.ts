import { expect, test } from "@playwright/test";

test("valide exactement trois prenoms uniques", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nouvelle partie" }).click();

  await expect(page.getByRole("button", { name: "Choisir le mode" })).toBeEnabled();
  await page.getByLabel("Prenom joueur 2").fill("Joueur 1");
  await expect(page.getByText("Les prenoms doivent etre uniques.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choisir le mode" })).toBeDisabled();

  await page.getByLabel("Prenom joueur 2").fill("Benoit");
  await page.getByLabel("Prenom joueur 3").fill("");
  await expect(page.getByText(/obligatoires/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Choisir le mode" })).toBeDisabled();
});

test("prepare les trois modes et bloque les modes hors V1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nouvelle partie" }).click();
  await page.getByRole("button", { name: "Choisir le mode" }).click();

  await expect(page.getByRole("heading", { name: "Modes de partie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Express" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classique" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grande aventure" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choisir le mode classique" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Indisponible en V1" }).first()).toBeDisabled();
});

test("ouvre la reprise sans sauvegarde et les parametres generaux", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reprendre" }).click();
  await expect(page.getByRole("heading", { name: "Reprendre" })).toBeVisible();
  await expect(page.getByText(/Aucune partie interrompue/)).toBeVisible();

  await page.getByRole("button", { name: "Retour" }).click();
  await page.getByRole("button", { name: /Param/ }).click();
  await expect(page.getByRole("heading", { name: /Param/ })).toBeVisible();
  await expect(page.getByText("Volume musique")).toBeVisible();
  await expect(page.getByText("Volume effets")).toBeVisible();
  await expect(page.getByRole("button", { name: /Mode plein/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Questions recemment vues/ })).toBeVisible();
});