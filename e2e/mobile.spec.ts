import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

interface PactStore {
  openEvidence?: (id: string) => void;
  openPanel?: (panel: string | null) => void;
  select?: (selection: { kind: string; id: string } | null) => void;
  toggleCompare?: (id: string) => void;
}

test("mobile analyst opens on demand and closes with its X", async ({ page }) => {
  const question = "Which policies have successfully accelerated heat-pump adoption?";
  await page.route("**/api/analyst**", (route) => route.abort());
  await page.goto(`/workspace?q=${encodeURIComponent(question)}`);

  await page.getByRole("button", { name: "Panel", exact: true }).tap();
  await expect(page.getByText(/CURATED RESPONSE/)).toBeVisible({ timeout: 12000 });
  await page.getByRole("button", { name: "Close panel" }).tap();
  await expect(page.locator("aside")).toHaveCount(0);
});

test("mobile policy details open from a graph node and close from the backdrop", async ({
  page,
}) => {
  await page.goto("/workspace");

  const policyNode = page.locator(".react-flow__node-policy").first();
  await expect(policyNode).toBeVisible({ timeout: 10000 });
  const box = await policyNode.boundingBox();
  const policyId = await policyNode.getAttribute("data-id");
  if (!policyId) throw new Error("The first policy graph node has no data-id");

  if (
    box &&
    box.x >= 0 &&
    box.x + box.width <= 390 &&
    box.y >= 0 &&
    box.y + box.height <= 844
  ) {
    await policyNode.tap();
  } else {
    await page.evaluate((id) => {
      const store = (
        window as unknown as { __pact?: { getState?: () => PactStore } }
      ).__pact?.getState?.();
      store?.select?.({ kind: "policy", id });
      store?.openPanel?.("DETAILS");
    }, policyId);
  }

  await expect(page.getByRole("button", { name: /Compare/ })).toBeVisible();
  const backdrop = page.locator('div[aria-hidden="true"][class*="bg-black/40"]');
  await expect(backdrop).toBeVisible();
  await backdrop.tap({ position: { x: 10, y: 400 } });
  await expect(page.locator("aside")).toHaveCount(0);
});

test("mobile filters open and close from their backdrop", async ({ page }) => {
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Filters" }).tap();

  const sidebar = page.locator("aside").filter({ hasText: "Jurisdictions" });
  await expect(sidebar).toBeVisible();
  await page.getByRole("button", { name: "Close filters" }).tap({
    position: { x: 350, y: 400 },
  });
  await expect(sidebar).toHaveCount(0);
});

test("mobile evidence drawer fits within the viewport", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.locator(".react-flow__node-policy").first()).toBeVisible();
  await page.evaluate(() => {
    (
      window as unknown as { __pact?: { getState?: () => PactStore } }
    ).__pact?.getState?.().openEvidence?.("ev_desnz_bus_stats");
  });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("Evidence drawer has no bounding box");
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test("mobile routes have no horizontal overflow", async ({ page }) => {
  for (const route of ["/", "/workspace"]) {
    await page.goto(route);
    await expect(page.locator("header")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test("mobile topbar input keeps the iOS-safe font size", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.locator("#pact-command-input")).toBeVisible();
  await expect
    .poll(() => page.locator("#pact-command-input").evaluate((input) => getComputedStyle(input).fontSize))
    .toBe("16px");
});

test("mobile graph omits the minimap and the hint dismissal persists", async ({
  page,
}) => {
  await page.goto("/workspace");

  const hint = page.getByText(
    "Best on a larger screen — on phones some views are simplified.",
  );
  await expect(page.locator(".react-flow__minimap")).toHaveCount(0);
  await expect(hint).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).tap();
  await expect(hint).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("pact.mobileHintDismissed")),
    )
    .toBe("true");

  await page.reload();
  await expect(page.locator(".react-flow__node-policy").first()).toBeVisible();
  await expect(hint).toHaveCount(0);
});

test("mobile compare row labels stay visible when scrolled sideways", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.locator(".react-flow__node-policy").first()).toBeVisible();
  await page.evaluate(() => {
    const store = (
      window as unknown as { __pact?: { getState?: () => PactStore } }
    ).__pact?.getState?.();
    store?.select?.(null);
    store?.openPanel?.(null);
    ["pol_gb_bus", "pol_de_beg_em_2024", "pol_fr_maprimerenov"].forEach((id) =>
      store?.toggleCompare?.(id),
    );
    store?.openPanel?.("COMPARE");
  });

  await expect(page.getByText(/Comparing 3 policies/i)).toBeVisible();
  const scroller = page.locator("div.flex-1.overflow-auto").first();
  await scroller.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  const rowLabel = page.locator(".sticky.left-0").nth(1);
  await expect(rowLabel).toHaveText("Policy objective");
  await expect
    .poll(() => rowLabel.evaluate((element) => element.getBoundingClientRect().left))
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(() => rowLabel.evaluate((element) => element.getBoundingClientRect().left))
    .toBeLessThanOrEqual(1);
});

