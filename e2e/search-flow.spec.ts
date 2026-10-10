import { expect, test } from "@playwright/test";

// deterministic analyst stream — the real answer (live or curated) can
// apply a CHANGE_VIEW action that leaves RESULTS mid-test
const stubAnalyst = async (page: import("@playwright/test").Page) => {
  const payload = {
    answer: "Stubbed analyst answer.",
    claims: [],
    citations: [],
    confidence: "LOW",
    actions: [],
    insufficient_evidence: true,
    source: "LLM",
  };
  await page.route("**/api/analyst/stream", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: `event: final\ndata: ${JSON.stringify(payload)}\n\n`,
    });
  });
};

test("explore → results → chart → in-workspace compare flow", async ({
  page,
}) => {
  await stubAnalyst(page);
  await page.goto("/workspace?q=heat%20pump%20grants");

  // RESULTS view: ranked list + ranking chart
  await expect(
    page.getByRole("button", { name: "RESULTS", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const policyLinks = page.locator("a[href^='/policy/']");
  await expect(policyLinks.first()).toBeVisible({ timeout: 15000 });
  expect(await policyLinks.count()).toBeGreaterThanOrEqual(3);

  const chart = page.getByTestId("results-chart");
  await expect(chart).toBeVisible();
  const bars = chart.locator("[class*='bar-pol_']");
  await expect(bars.first()).toBeVisible();
  expect(await bars.count()).toBeGreaterThanOrEqual(3);

  // click the BUS bar → similarity mode, list rows gain bands (retry —
  // the click can land before hydration finishes under parallel load)
  // real mouse click needed — Recharts resolves the bar from coordinates;
  // retry tolerates a pre-hydration click, guards against a repeat click
  // toggling the selection off again
  const similarityVisible = () =>
    page
      .getByText(/^Similarity to BUS|^Similarity to Boiler/i)
      .isVisible()
      .catch(() => false);
  await expect(async () => {
    if (!(await similarityVisible()))
      await page.locator(".bar-pol_gb_bus").first().click({ timeout: 2000 });
    await expect(
      page.getByText(/^Similarity to BUS|^Similarity to Boiler/i),
    ).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  const banded = page.locator("[data-sim]");
  await expect(banded.first()).toBeAttached();
  expect(await banded.count()).toBeGreaterThanOrEqual(1);

  // click the BEG bar → in-workspace compare
  const comparingVisible = () =>
    page
      .getByText(/Comparing 2 policies/i)
      .isVisible()
      .catch(() => false);
  await expect(async () => {
    if (!(await comparingVisible()))
      await page.locator(".bar-pol_de_beg").first().click({ timeout: 2000 });
    await expect(page.getByText(/Comparing 2 policies/i)).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 15000 });
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
  await stubAnalyst(page);
  // 1. entry page → example chip → /workspace?q=… on RESULTS
  await page.goto("/");
  await page
    .getByRole("button", { name: /accelerated heat-pump adoption/i })
    .click();
  await page.waitForURL(/\/workspace\?q=/, { timeout: 5000 });
  await expect(
    page.locator("a[href^='/policy/']").first(),
  ).toBeVisible({ timeout: 15000 });

  // 2. select BUS via the row's crosshair → BEG row gets a sim band
  // (row action icons are opacity-0 until hover on lg; retry-click tolerates
  // pre-hydration clicks while the analyst stream settles)
  const busRow = page.locator("li", {
    has: page.locator("a[href='/policy/pol_gb_bus']"),
  });
  const begRow = page.locator("li", {
    has: page.locator("a[href='/policy/pol_de_beg']"),
  });
  await expect(async () => {
    if ((await begRow.getAttribute("data-sim")) == null)
      await busRow
        .getByRole("button", { name: /Select/i })
        .evaluate((el: HTMLElement) => el.click());
    await expect(begRow).toHaveAttribute("data-sim", /.+/, {
      timeout: 2000,
    });
  }).toPass({ timeout: 15000 });

  // 3. BEG row's compare icon → in-workspace compare
  const comparingVisible = () =>
    page
      .getByText(/Comparing 2 policies/i)
      .isVisible()
      .catch(() => false);
  await expect(async () => {
    if (!(await comparingVisible()))
      await begRow
        .getByRole("button", { name: /Compare with/i })
        .evaluate((el: HTMLElement) => el.click());
    await expect(page.getByText(/Comparing 2 policies/i)).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 15000 });
  await expect(
    page.getByRole("link", { name: /Share \/ open as page/i }),
  ).toBeVisible();

  // 4. back to RESULTS, open BEG's policy page via the external-link icon
  await page.getByRole("button", { name: "RESULTS", exact: true }).click();
  await expect(page.getByTestId("results-chart")).toBeVisible({
    timeout: 30000,
  });
  await page
    .locator("li", {
      has: page.locator("a[href='/policy/pol_de_beg']"),
    })
    .getByRole("link", { name: "Open policy page" })
    .dispatchEvent("click");
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

test("weights dialog: threshold at 100 leaves only the pinned bar", async ({
  page,
}) => {
  await stubAnalyst(page);
  await page.goto("/workspace?q=heat%20pump%20grants");
  await expect(
    page.locator(".bar-pol_gb_bus").first(),
  ).toBeVisible({ timeout: 15000 });
  // enter similarity mode so the threshold filters the chart
  const similarityVisible = () =>
    page
      .getByText(/^Similarity to BUS|^Similarity to Boiler/i)
      .isVisible()
      .catch(() => false);
  await expect(async () => {
    if (!(await similarityVisible()))
      await page.locator(".bar-pol_gb_bus").first().click({ timeout: 2000 });
    await expect(
      page.getByText(/^Similarity to BUS|^Similarity to Boiler/i),
    ).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });

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

  // no edge passes 100 — only the pinned selected bar remains
  await expect(
    page.getByTestId("results-chart").locator("[class*='bar-pol_']"),
  ).toHaveCount(1);
});
