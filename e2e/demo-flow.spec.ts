import { expect, test } from "@playwright/test";

interface PactStore {
  toggleCompare?: (id: string) => void;
  openPanel?: (p: string) => void;
  setView?: (v: string) => void;
  select?: (s: { kind: string; id: string } | null) => void;
}
declare global {
  interface Window {
    __pact?: { getState?: () => PactStore };
  }
}

/**
 * The critical demo flow — /demo must be fully deterministic: no network call
 * to /api/analyst is allowed (route-intercepted to prove it).
 */
test("demo flow: curated analyst, compare, outcomes, evidence drawer", async ({
  page,
}) => {
  let analystCalls = 0;
  await page.route("**/api/analyst", (route) => {
    analystCalls += 1;
    route.abort();
  });

  await page.goto("/demo");

  // demo chip + curated analyst response appear without any API call
  await expect(page.getByText("DEMO").first()).toBeVisible();
  await expect(page.getByText("CURATED RESPONSE")).toBeVisible({
    timeout: 8000,
  });
  expect(analystCalls).toBe(0);

  // graph shows highlighted nodes from the curated actions
  await expect(page.locator(".react-flow__node").first()).toBeVisible({
    timeout: 8000,
  });

  // select BUS + BEG 2024 + MaPrimeRénov' and open the comparison
  await page.evaluate(() => {
    const s = window.__pact?.getState?.();
    ["pol_gb_bus", "pol_de_beg_em_2024", "pol_fr_maprimerenov"].forEach((id) =>
      s?.toggleCompare?.(id),
    );
    s?.openPanel?.("COMPARE");
  });
  await expect(page.getByText(/COMPARING 3 POLICIES/i)).toBeVisible();
  await expect(page.getByText(/KEY DIFFERENCES/i)).toBeVisible();

  // SHOW OUTCOMES → outcomes tab renders a chart card
  await page.evaluate(() => {
    const s = window.__pact?.getState?.();
    s?.setView?.("OUTCOMES");
    s?.select?.({ kind: "policy", id: "pol_de_beg_em_2024" });
    s?.openPanel?.("DETAILS");
  });
  await expect(
    page.locator(".recharts-responsive-container").first(),
  ).toBeVisible({ timeout: 8000 });

  // second question through the command bar (still deterministic)
  await page.locator("#pact-command-input").fill("What could the UK learn from Germany?");
  await page.keyboard.press("Enter");
  await expect(page.getByText("CURATED RESPONSE")).toBeVisible({
    timeout: 8000,
  });
  expect(analystCalls).toBe(0);

  // first citation chip opens the evidence drawer
  await page.locator("[data-citation]").first().click();
  await expect(page.getByText(/Open source|No verified link/)).toBeVisible({
    timeout: 5000,
  });
});

/** Guided presenter — Play runs the 12 steps to the end card at fast pacing. */
test("demo presenter: play reaches step 12 with the evidence drawer open", async ({
  page,
}) => {
  await page.goto("/demo?speed=fast");
  await expect(page.getByText("DEMO").first()).toBeVisible();

  await page.locator("[data-demo-play]").click();
  await expect(page.getByText("12 / 12")).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/Every claim traces to evidence/)).toBeVisible();
  // step 11 opened the evidence drawer programmatically
  await expect(page.getByText(/Open source|No verified link/)).toBeVisible();
});
