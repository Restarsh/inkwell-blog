import { test, expect } from "@playwright/test";

test("a comment posted in one tab appears in another via SSE", async ({ browser }) => {
  const context = await browser.newContext();
  const tab1 = await context.newPage();
  const tab2 = await context.newPage();

  const email = `e2e-tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = "password123";

  // Register + create a post in tab 1.
  await tab1.goto("/register");
  await tab1.fill('input[name="name"]', "Tab Tester");
  await tab1.fill('input[name="email"]', email);
  await tab1.fill('input[name="password"]', password);
  await tab1.click('button[type="submit"]');
  await expect(tab1).toHaveURL(/\/dashboard/);

  await tab1.click('a:has-text("New post")');
  await tab1.fill('input[name="title"]', "SSE Tab Test");
  await tab1.fill('textarea[name="content"]', "Testing live comment propagation.");
  await tab1.click('button:has-text("Publish post")');
  await expect(tab1.locator("h1")).toContainText("SSE Tab Test");

  const postUrl = tab1.url();

  // Open the same post in tab 2 (shared cookies).
  await tab2.goto(postUrl);

  // Wait for tab 1's SSE to be live before posting.
  await expect(tab1.locator('section[data-connected="true"]')).toBeAttached({
    timeout: 10_000,
  });

  // Post from tab 2.
  await tab2.fill("#comment", "Hello from tab 2");
  await tab2.click('button:has-text("Post comment")');

  // Tab 1 should see it without a refresh.
  await expect(tab1.locator("text=Hello from tab 2")).toBeVisible({ timeout: 10_000 });

  await context.close();
});
