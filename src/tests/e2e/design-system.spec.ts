import { expect, test } from "@playwright/test";

test("ouvre la page interne du design system en developpement", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Param/ }).click();
  await page.getByRole("button", { name: /Design system/ }).click();

  await expect(page.getByRole("heading", { name: "Design system TRIUM" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Question 2 / 5" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primaire" })).toBeVisible();
});

test("ouvre la banque de questions en developpement", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Param/ }).click();
  await page.getByRole("button", { name: /Banque de questions/ }).click();

  await expect(page.getByRole("heading", { name: "Banque de questions" })).toBeVisible();
  await expect(page.getByText("Questions chargées")).toBeVisible();
  await expect(page.getByText("Jouables")).toBeVisible();
  await expect(page.getByText("Doublons exacts")).toBeVisible();
});
