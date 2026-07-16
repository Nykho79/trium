/* global Element, Event, KeyboardEvent, Window */
import { expect, test, type Page } from "@playwright/test";

type FullscreenWindow = Window & typeof globalThis & { __triumFullscreen?: boolean };

async function installFullscreenMock(page: Page) {
  await page.addInitScript(() => {
    const runtimeWindow = window as FullscreenWindow;
    Object.defineProperty(Object.getPrototypeOf(document), "fullscreenElement", {
      configurable: true,
      get: () => runtimeWindow.__triumFullscreen === true ? document.documentElement : null,
    });
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: async () => {
        runtimeWindow.__triumFullscreen = true;
        document.dispatchEvent(new Event("fullscreenchange"));
      },
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: async () => {
        runtimeWindow.__triumFullscreen = false;
        document.dispatchEvent(new Event("fullscreenchange"));
      },
    });
  });
}

test("affiche une surface TV lisible aux tailles 16:9 supportees", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Plein ecran" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".screen-frame")).toBeVisible();
});

test("signale une fenetre sous 1280 x 720", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 650 });
  await page.goto("/");

  await expect(page.getByRole("alert")).toContainText("Fenetre trop petite");
});

test("gere le plein ecran par bouton et raccourci F", async ({ page }) => {
  await installFullscreenMock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Plein ecran" }).click();
  await expect(page.getByRole("button", { name: "Sortir" })).toBeVisible();

  await page.getByRole("button", { name: "Sortir" }).click();
  await expect(page.getByRole("button", { name: "Plein ecran" })).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", code: "KeyF", bubbles: true })));
  await expect(page.getByRole("button", { name: "Sortir" })).toBeVisible();
});

test("ouvre le menu avec Echap et conserve le zoom 125 pour l'interface", async ({ page }) => {
  await page.goto("/");
  await page.locator(".app-shell").focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Parametres" })).toBeVisible();

  const zoomInput = page.locator(".setting-row").filter({ hasText: "Zoom interface" }).locator("input");
  await zoomInput.focus();
  for (let step = 0; step < 5; step += 1) {
    await page.keyboard.press("ArrowRight");
  }

  await expect(page.locator(".app-shell")).toHaveAttribute("style", /--trium-ui-scale: 1.25/);
  await page.evaluate(() => document.documentElement.style.setProperty("zoom", "125%"));
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mode plein ecran/ })).toBeVisible();
});









