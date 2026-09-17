import { expect, test } from "@playwright/test";

// oxlint-disable-next-line effecttsgo/async-function -- Playwright owns the browser test lifecycle.
test("authentication survives SSR and clears protected state on sign-out", async ({ page }) => {
  const email = "ada@example.com";
  const password = "correct-horse-battery-staple";

  await page.goto("/workspaces");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fworkspaces$/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Ada Lovelace");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();

  await expect(page).toHaveURL("/workspaces");
  await expect(page.getByRole("heading", { name: "Workspaces", exact: true })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  const response = await page.reload();
  if (response === null) throw new Error("Reload did not produce an HTTP response");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(email);
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();

  // Check server authorization too, independently of the client-side navigation cache.
  const anonymous = await page.request.get("/workspaces", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(303);
  expect(anonymous.headers()["location"]).toBe("/sign-in?returnTo=%2Fworkspaces");

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/workspaces");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
});
