import { test } from "@playwright/test";

test("landing search navigates to /workspace?q=", async ({ page }) => {
  await page.goto("/");
  await page
    .getByPlaceholder("What climate policy are you investigating?")
    .fill("heat pumps");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/workspace\?q=heat%20pumps/, { timeout: 5000 });
});

test("landing suggested chip navigates with the question", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /accelerated heat-pump adoption/i })
    .click();
  await page.waitForURL(/\/workspace\?q=/, { timeout: 5000 });
});
