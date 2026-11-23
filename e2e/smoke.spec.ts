import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("unauthenticated visit to / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("protected route keeps the destination in ?next", async ({ page }) => {
  await page.goto("/users?q=x");
  await expect(page).toHaveURL(/\/login\?next=%2Fusers%3Fq%3Dx$/);
});

test("login page has no axe violations", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// Needs a seeded admin without `admin.manage` and E2E credentials; enable once
// spec 01 ships the login screen.
test.skip("route without permission renders the 403 page", async ({ page }) => {
  await page.goto("/roles");
  await expect(page.getByText("You don't have access to this area")).toBeVisible();
});
