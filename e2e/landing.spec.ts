import { expect, test } from "@playwright/test";

test("entry page shows the hero input and submits to Explore", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "Search climate policies" }).last(),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Find a policy, explore its evidence, and compare what could work in your country.",
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search climate policies" })
    .last()
    .fill("heat pumps");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/workspace\?q=heat%20pumps/, { timeout: 5000 });
});

test("clicking an example chip runs the query in Explore", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /building energy codes/i })
    .click();
  await page.waitForURL(/\/workspace\?q=/, { timeout: 5000 });
  await expect(
    page.getByRole("button", { name: "RESULTS", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("old /?q= links redirect into Explore", async ({ page }) => {
  await page.goto("/?q=heat%20pump%20grants");
  await page.waitForURL(/\/workspace\?q=/, { timeout: 5000 });
});

test("nav links reach Explore", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore" }).click();
  await page.waitForURL(/\/workspace/, { timeout: 5000 });
});
