import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display dashboard overview", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Overview");
    await expect(
      page.locator("text=Current state of your systems"),
    ).toBeVisible();
  });

  test("should display health overview cards", async ({ page }) => {
    await expect(page.locator("text=Availability")).toBeVisible();
    await expect(page.locator("text=Avg latency")).toBeVisible();
    await expect(page.locator("text=Error rate")).toBeVisible();
    await expect(page.locator("text=Services").first()).toBeVisible();
    await expect(page.locator("text=Active incidents").first()).toBeVisible();
  });

  test("should display active incidents panel", async ({ page }) => {
    await expect(page.locator("text=Active incidents").first()).toBeVisible();
    await expect(
      page.locator("text=Payment API returning HTTP 500"),
    ).toBeVisible();
  });

  test("should display service health table", async ({ page }) => {
    await expect(page.locator("text=Service health").first()).toBeVisible();
    await expect(page.locator("table")).toBeVisible();

    // Check table headers
    await expect(page.locator('th:has-text("Service")')).toBeVisible();
    await expect(page.locator('th:has-text("Health")')).toBeVisible();
    await expect(page.locator('th:has-text("Latency")')).toBeVisible();
    await expect(page.locator('th:has-text("Errors")')).toBeVisible();
    await expect(page.locator('th:has-text("Version")')).toBeVisible();
  });

  test("should display recent deployments", async ({ page }) => {
    await expect(page.locator("text=Recent deployments").first()).toBeVisible();
    await expect(page.locator("text=payment-api").first()).toBeVisible();
  });
});
