import { test, expect } from "@playwright/test";

test.describe("Incident Detail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/incidents/INC-2391");
    await page.waitForLoadState("networkidle");
  });

  test("should display incident header", async ({ page }) => {
    await expect(page.locator("text=INC-2391")).toBeVisible();
    await expect(
      page.locator("text=Payment API returning HTTP 500"),
    ).toBeVisible();
    await expect(page.locator("text=P1")).toBeVisible();
  });

  test("should display incident summary and impact", async ({ page }) => {
    await expect(page.locator("text=Summary")).toBeVisible();
    await expect(
      page.locator("text=The Payment API is experiencing"),
    ).toBeVisible();
    await expect(page.locator("text=Impact")).toBeVisible();
    await expect(
      page.locator("text=~12% of payment requests failing"),
    ).toBeVisible();
  });

  test("should display status flow", async ({ page }) => {
    await expect(page.locator("text=Status")).toBeVisible();
    await expect(page.locator("text=DETECTED")).toBeVisible();
    await expect(page.locator("text=INVESTIGATING")).toBeVisible();
    await expect(page.locator("text=MITIGATING")).toBeVisible();
    await expect(page.locator("text=MONITORING")).toBeVisible();
    await expect(page.locator("text=RESOLVED")).toBeVisible();
  });

  test("should display timeline", async ({ page }) => {
    await expect(page.locator("text=Timeline")).toBeVisible();
    await expect(page.locator("text=Deployment v2.8.1")).toBeVisible();
    await expect(page.locator("text=HTTP 500 spike detected")).toBeVisible();
  });

  test("should display affected services", async ({ page }) => {
    await expect(page.locator("text=Affected services")).toBeVisible();
    await expect(page.locator("text=payment-api")).toBeVisible();
    await expect(page.locator("text=checkout-api")).toBeVisible();
  });

  test("should display investigation section", async ({ page }) => {
    await expect(page.locator("text=Evidence graph")).toBeVisible();
  });

  test("should open resolve dialog", async ({ page }) => {
    await page.click('button:has-text("Resolve")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] h2')).toContainText(
      "Resolve INC-2391",
    );
  });

  test("should navigate to investigation", async ({ page }) => {
    await page.click('a:has-text("Investigate")');
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/investigations\//);
  });
});
