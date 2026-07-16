import { expect, test } from "@playwright/test";

test("ouvre l'accueil TRIUM", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TRIUM" })).toBeVisible();
  await expect(page.getByTestId("start-button")).toBeVisible();
});

test("parcourt le flux principal jusqu'a l'ecran de jeu", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-button").click();
  await page.getByRole("button", { name: "Choisir le format" }).click();
  await page.getByRole("button", { name: "Préparer la partie" }).click();
  await page.getByRole("button", { name: "Lancer la première question" }).click();
  await expect(page.getByRole("heading", { name: "Dans quelle ville française se trouve la Place Stanislas ?" })).toBeVisible();
});
