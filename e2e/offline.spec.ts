import { expect, test } from "@playwright/test";

test("analyst fetch failure falls back to a curated response", async ({
  page,
}) => {
  await page.route("**/api/analyst**", (route) => route.abort());
  await page.goto("/workspace");

  await page.locator("#pact-command-input").fill("heat pumps?");
  await page.keyboard.press("Enter");

  await expect(page.getByText("OFFLINE — CURATED RESPONSE")).toBeVisible({
    timeout: 8000,
  });
});
