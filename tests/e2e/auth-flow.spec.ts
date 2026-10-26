import { test, expect } from "@playwright/test";

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

test("register, create post, and post a comment", async ({ page }) => {
  const email = uniqueEmail();
  const password = "password123";

  await page.goto("/register");
  await page.fill('input[name="name"]', "E2E Tester");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard/);

  await page.click('a:has-text("New post")');
  await page.fill('input[name="title"]', "E2E Test Post");
  await page.fill('textarea[name="content"]', "Body content written by Playwright.");
  await page.click('button:has-text("Publish post")');

  await expect(page.locator("h1")).toContainText("E2E Test Post");

  await page.fill("#comment", "First comment from the e2e suite.");
  await page.click('button:has-text("Post comment")');

  await expect(page.locator("text=First comment from the e2e suite.")).toBeVisible({
    timeout: 10_000,
  });
});
