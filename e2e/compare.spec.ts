import { expect, test } from "@playwright/test";

type Store = {
  getState: () => {
    select: (s: { kind: string; id: string }) => void;
    openPanel: (p: string) => void;
  };
};

test("policies added to compare can be opened from the view bar", async ({ page }) => {
  await page.goto("/workspace");
  await page.waitForFunction(() => !!(window as unknown as { __pact?: Store }).__pact);

  const openPolicy = (id: string) =>
    page.evaluate((policyId) => {
      const s = (window as unknown as { __pact: Store }).__pact.getState();
      s.select({ kind: "policy", id: policyId });
      s.openPanel("DETAILS");
    }, id);

  await openPolicy("pol_gb_bus");
  await page.getByRole("button", { name: /^Compare$/ }).click();
  await expect(page.getByRole("button", { name: "Compare 1/2" })).toBeDisabled();

  await openPolicy("pol_de_beg");
  await page.getByRole("button", { name: /^Compare 1$/ }).click();
  await page.getByRole("button", { name: "Compare 2 →" }).click();
  await expect(page.getByText(/Comparing 2 policies/i)).toBeVisible();

  // a view tab leaves the comparison for that view
  await page.getByRole("button", { name: "TIMELINE" }).click();
  await expect(page.getByText(/Comparing 2 policies/i)).toBeHidden();
  await expect(page.getByRole("button", { name: "Compare 2 →" })).toBeVisible();
});
