import { expect, test } from "@playwright/test";

type Store = {
  getState: () => {
    select: (s: { kind: string; id: string }) => void;
    openPanel: (p: string) => void;
  };
};

test("CPDB policies stay hidden until the Sources filter includes them", async ({ page }) => {
  await page.goto("/workspace");
  await page.waitForFunction(() => !!(window as unknown as { __pact?: Store }).__pact);

  const inView = page.getByText(/^\d+ policies in view$/);
  const before = Number((await inView.textContent())!.split(" ")[0]);

  const toggle = page.getByRole("button", { name: /\+ Climate Policy Database \(\d+\)/ });
  const imported = Number((await toggle.textContent())!.match(/\((\d+)\)/)![1]);
  expect(imported).toBeGreaterThan(0);

  await toggle.click();
  await expect(inView).toHaveText(`${before + imported} policies in view`);

  await toggle.click();
  await expect(inView).toHaveText(`${before} policies in view`);
});

test("command palette finds an imported policy and its card shows the CPDB label", async ({
  page,
}) => {
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder(/Search policies/).fill("KfW Ecological Construction");
  await page.getByRole("option", { name: /^KfW Ecological Construction\s*DE$/ }).click();

  await expect(page.getByText("CPDB", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Record from the Climate Policy Database, NewClimate Institute/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Climate Policy Database" })).toHaveAttribute(
    "href",
    "https://climatepolicydatabase.org/",
  );
});
