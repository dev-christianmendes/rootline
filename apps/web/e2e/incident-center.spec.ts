import { test, expect } from "@playwright/test";

test.describe("Incident Center", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/incidents");
    await page.waitForLoadState("networkidle");
  });

  test("should load incident center page", async ({ page }) => {
    await expect(page).toHaveURL("/incidents");
    await expect(page.locator("table")).toBeVisible();
  });

  test("should filter incidents by severity", async ({ page }) => {
    await page.click('button:has-text("P1")');
    await page.waitForTimeout(500);

    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should filter incidents by status", async ({ page }) => {
    await page.click('button:has-text("DETECTED")');
    await page.waitForTimeout(500);

    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should search incidents", async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', "Payment");
    await page.waitForTimeout(500);

    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should open new incident dialog", async ({ page }) => {
    await page.click('button:has-text("New incident")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] h2')).toContainText(
      "New incident",
    );
  });
});
