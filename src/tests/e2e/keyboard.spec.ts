import { expect, test } from "@playwright/test";

test("les boutons principaux peuvent recevoir le focus clavier", async ({ page }) => {
  await page.goto("/");
  const startButton = page.getByTestId("start-button");
  await expect(startButton).toBeVisible();
  await page.evaluate(() => document.body.focus());

  for (let index = 0; index < 4; index += 1) {
    if (await startButton.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }

  await expect(startButton).toBeFocused();
});
