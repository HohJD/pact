import { expect, test } from "@playwright/test";

test("search page shows examples and runs a query into the URL", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByPlaceholder("Search climate policies — keywords or a question"),
  ).toBeVisible();
  await page
    .getByPlaceholder("Search climate policies — keywords or a question")
    .fill("heat pumps");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\?q=heat%20pumps/, { timeout: 5000 });
});

test("clicking an example query fills and runs the search", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /building energy codes/i })
    .click();
  await page.waitForURL(/\?q=/, { timeout: 5000 });
});

test("nav links reach Explore", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore" }).click();
  await page.waitForURL(/\/workspace/, { timeout: 5000 });
});
