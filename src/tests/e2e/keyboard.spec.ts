import { expect, test } from "@playwright/test";

test("les boutons principaux peuvent recevoir le focus clavier", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("start-button")).toBeVisible();
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("start-button")).toBeFocused();
});
