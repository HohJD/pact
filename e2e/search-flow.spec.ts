import { expect, test } from "@playwright/test";

test("explore → results → tangle → in-workspace compare flow", async ({
  page,
}) => {
  await page.goto("/workspace?q=heat%20pump%20grants");

  // RESULTS view: ranked list + tangle
  await expect(
    page.getByRole("button", { name: "RESULTS", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const policyLinks = page.locator("a[href^='/policy/']");
  await expect(policyLinks.first()).toBeVisible({ timeout: 15000 });
  expect(await policyLinks.count()).toBeGreaterThanOrEqual(3);

  const circles = page.locator(
    "svg[aria-label='Policy similarity tangle'] circle",
  );
  await expect(circles.first()).toBeVisible();
  expect(await circles.count()).toBeGreaterThanOrEqual(3);

  // click first circle → list rows gain similarity bands
  await circles.first().click();
  const banded = page.locator("[data-sim]");
  await expect(banded.first()).toBeAttached();
  expect(await banded.count()).toBeGreaterThanOrEqual(1);

  // click a tangle link → in-workspace compare (midpoints can sit under
  // nodes, so dispatch the click on the link's hit-area directly)
  const links = page.locator(
    "svg[aria-label='Policy similarity tangle'] line[data-link]",
  );
  expect(await links.count()).toBeGreaterThanOrEqual(1);
  await links.first().dispatchEvent("click");
  await expect(page.getByText(/Comparing 2 policies/i)).toBeVisible({
    timeout: 5000,
  });
});

test("a submitted query opens the ANALYST panel", async ({ page }) => {
  test.setTimeout(70000);
  await page.goto("/workspace?q=heat%20pump%20grants");
  // the right panel opens on ANALYST and the stream always resolves —
  // live model or curated fallback on error
  await expect(
    page.locator("aside").last().getByText("Analyst", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
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
  expect(
    await page.locator("a[href^='/compare/']").count(),
  ).toBeGreaterThanOrEqual(1);
});

test("showcase: full flow", async ({ page }) => {
  // 1. entry page → example chip → /workspace?q=… on RESULTS
  await page.goto("/");
  await page
    .getByRole("button", { name: /accelerated heat-pump adoption/i })
    .click();
  await page.waitForURL(/\/workspace\?q=/, { timeout: 5000 });
  await expect(
    page.locator("a[href^='/policy/']").first(),
  ).toBeVisible({ timeout: 15000 });

  // 2. select BUS via the row's select button → BEG row gets a sim band
  const busRow = page.locator("li", {
    has: page.locator("a[href='/policy/pol_gb_bus']"),
  });
  await busRow.hover();
  await busRow.getByRole("button", { name: /Select/i }).click();
  const begRow = page.locator("li", {
    has: page.locator("a[href='/policy/pol_de_beg']"),
  });
  await expect(begRow).toHaveAttribute("data-sim", /.+/);

  // 3. BEG row's compare icon → in-workspace compare
  await begRow.getByRole("button", { name: /Compare with/i }).click();
  await expect(page.getByText(/Comparing 2 policies/i)).toBeVisible({
    timeout: 5000,
  });
  await expect(
    page.getByRole("link", { name: /Share \/ open as page/i }),
  ).toBeVisible();

  // 4. back to RESULTS, open BEG's policy page via the external-link icon
  await page.getByRole("button", { name: "RESULTS", exact: true }).click();
  await page
    .locator("li", { has: page.locator("a[href='/policy/pol_de_beg']") })
    .hover();
  await page
    .locator("li", {
      has: page.locator("a[href='/policy/pol_de_beg']"),
    })
    .getByRole("link", { name: "Open policy page" })
    .click();
  await page.waitForURL(/\/policy\/pol_de_beg/, { timeout: 5000 });
  await expect(page.locator("h1")).toContainText(
    /Bundesförderung für effiziente Gebäude|BEG/,
  );
  await expect(
    page.getByRole("heading", { name: "Similar policies" }),
  ).toBeVisible();

  // 5. Open in Explore → workspace selects the policy in DETAILS
  await page.getByRole("link", { name: /Open in Explore/i }).click();
  await page.waitForURL(/\/workspace\?policy=pol_de_beg/, { timeout: 5000 });
  await expect(
    page
      .locator("aside")
      .last()
      .getByRole("heading", {
        name: /Bundesförderung für effiziente Gebäude|BEG/,
      }),
  ).toBeVisible({ timeout: 10000 });
});

test("workspace ?compare= deep link opens the compare panel", async ({
  page,
}) => {
  await page.goto("/workspace?compare=pol_gb_bus,pol_de_beg");
  await expect(page.getByText(/Comparing 2 policies/i)).toBeVisible({
    timeout: 10000,
  });
  await expect(
    page.getByText(/Boiler Upgrade Scheme|BUS/).first(),
  ).toBeVisible();
  await expect(page.getByText(/Bundesförderung|BEG/).first()).toBeVisible();
});

test("weights dialog: threshold at 100 removes all tangle lines", async ({
  page,
}) => {
  await page.goto("/workspace?q=heat%20pump%20grants");
  await expect(
    page
      .locator("svg[aria-label='Policy similarity tangle'] circle")
      .first(),
  ).toBeVisible({ timeout: 15000 });

  await page
    .getByRole("button", { name: /Similarity weights/i })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // drag threshold slider to max — shadcn slider is keyboard-accessible
  const threshold = dialog.getByRole("slider").first();
  await threshold.focus();
  for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(
    page.locator("svg[aria-label='Policy similarity tangle'] line"),
  ).toHaveCount(0);
});
