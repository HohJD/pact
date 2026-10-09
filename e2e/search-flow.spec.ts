import { expect, test } from "@playwright/test";

test("search → tangle → compare flow", async ({ page }) => {
  await page.goto("/?q=heat%20pump%20grants");

  // ranked list + tangle
  const listLinks = page.locator("a[href^='/policy/']");
  await expect(listLinks.first()).toBeVisible({ timeout: 15000 });
  expect(await listLinks.count()).toBeGreaterThanOrEqual(3);

  const circles = page.locator("svg[aria-label='Policy similarity tangle'] circle");
  await expect(circles.first()).toBeVisible();
  expect(await circles.count()).toBeGreaterThanOrEqual(3);

  // click first circle → list rows gain similarity bands
  await circles.first().click();
  const banded = page.locator("[data-sim]");
  await expect(banded.first()).toBeAttached();
  expect(await banded.count()).toBeGreaterThanOrEqual(1);

  // click a link → navigates to /compare/a/b (midpoints can sit under nodes,
  // so dispatch the click on the link's hit-area directly)
  const links = page.locator(
    "svg[aria-label='Policy similarity tangle'] line[data-link]",
  );
  expect(await links.count()).toBeGreaterThanOrEqual(1);
  await links.first().dispatchEvent("click");
  await page.waitForURL(/\/compare\/[^/]+\/[^/]+/, { timeout: 5000 });
  await expect(page.getByText("out of 100")).toBeVisible();
});

test("analyst summary block renders a LIVE or CURATED chip", async ({
  page,
}) => {
  test.setTimeout(70000);
  await page.goto("/?q=heat%20pump%20grants");
  // the stream always resolves — live model or curated fallback on error
  await expect(page.getByText(/^(LIVE|CURATED)/)).toBeVisible({
    timeout: 60000,
  });
});

test("policy detail page shows similar policies with compare links", async ({
  page,
}) => {
  await page.goto("/policy/pol_gb_bus");
  await expect(page.locator("h1")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Similar policies" }),
  ).toBeVisible();
  expect(await page.locator("a[href^='/compare/']").count()).toBeGreaterThanOrEqual(1);
});

test("weights dialog: threshold at 100 removes all tangle lines", async ({
  page,
}) => {
  await page.goto("/?q=heat%20pump%20grants");
  await expect(page.locator("svg[aria-label='Policy similarity tangle'] circle").first()).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: /Similarity weights/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // drag threshold slider to max — shadcn slider is keyboard-accessible
  const threshold = dialog.getByRole("slider").first();
  await threshold.focus();
  for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.locator("svg[aria-label='Policy similarity tangle'] line")).toHaveCount(0);
});
