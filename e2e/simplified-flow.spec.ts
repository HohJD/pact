import { expect, test } from "@playwright/test";

const stubAnalyst = async (page: import("@playwright/test").Page) => {
  await page.route("**/api/analyst/stream", (route) => route.fulfill({
    contentType: "text/event-stream",
    body: `event: final\ndata: ${JSON.stringify({ answer: "Test answer", claims: [], citations: [], confidence: "LOW", actions: [], insufficient_evidence: true, source: "LLM" })}\n\n`,
  }));
};

test("home search button leads to readable policy results", async ({ page }) => {
  await stubAnalyst(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "Search climate policies" }).fill("heat pump grants");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: 'Policies for “heat pump grants”' })).toBeVisible();
  await expect(page.locator("a[href^='/policy/']").first()).toBeVisible();
  await expect(page.locator("aside").filter({ hasText: "Jurisdictions" })).toHaveCount(0);
});

test("failed search offers retry and recovers", async ({ page }) => {
  await stubAnalyst(page);
  let failed = true;
  await page.route("**/api/search/policies?**", async (route) => {
    if (failed) { failed = false; await route.fulfill({ status: 503 }); }
    else await route.continue();
  });
  await page.goto("/workspace?q=heat%20pump%20grants");
  await page.getByRole("button", { name: "Retry search" }).click();
  await expect(page.locator("a[href^='/policy/']").first()).toBeVisible();
});

test("mobile results stay accessible while analysis is available on demand", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubAnalyst(page);
  await page.goto("/workspace?q=heat%20pump%20grants");
  await expect(page.locator("a[href^='/policy/']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Close panel" })).toHaveCount(0);
  await page.getByRole("button", { name: "Panel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Close panel" })).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
