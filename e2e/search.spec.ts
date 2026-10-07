import { expect, test } from "@playwright/test";

test("command palette finds a source document and opens its policy", async ({
  page,
}) => {
  await page.route("**/api/search*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        documents: [
          {
            id: "doc_boiler_upgrade",
            policy_id: "pol_gb_bus",
            label: "Home Boiler Upgrade Grant",
            url: null,
            snippet:
              "Boiler upgrade grants help households replace fossil-fuel boilers with low-carbon heating.",
          },
        ],
      }),
    });
  });

  await page.goto("/workspace");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const input = page.getByPlaceholder(/Search policies/);
  await input.fill("boiler upgrade");

  await expect(
    page.locator("[cmdk-group-heading]").filter({ hasText: "Documents" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Boiler upgrade grants help households replace fossil-fuel boilers with low-carbon heating.",
    ),
  ).toBeVisible();
  await page
    .getByRole("option", { name: /Home Boiler Upgrade Grant/ })
    .click();

  await expect(page.getByRole("button", { name: /Compare/ })).toBeVisible();
});

test("command palette keeps catalogue fuzzy and full-text matches visible", async ({
  page,
}) => {
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const input = page.getByPlaceholder(/Search policies/);

  await input.fill("manifesto");
  await expect(
    page.getByRole("option", { name: /Social Housing Decarbonisation Fund/ }),
  ).toBeVisible();

  await input.fill("insulaton");
  await expect(
    page.getByRole("option", { name: /insulation/i }).first(),
  ).toBeVisible();

  await input.fill("zx");
  await expect(page.getByText("No results.")).toBeVisible();
});
