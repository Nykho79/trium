import { expect, test } from "@playwright/test";

test("ouvre la page interne du design system en developpement", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Param/ }).click();
  await page.getByRole("button", { name: /Design system/ }).click();

  await expect(page.getByRole("heading", { name: "Design system TRIUM" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Question 2 / 5" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primaire" })).toBeVisible();
});