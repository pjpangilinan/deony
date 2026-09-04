import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';
import fs from 'fs';
import path from 'path';

test('first-time user end-to-end journey audit', async ({ page }) => {
  const consoleLogs: { type: string; text: string }[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  await mockCognitoAuth(page);

  const timestamp = Date.now();
  const username = `audituser${timestamp}`;
  const email = `audit-${timestamp}@deony.local`;

  const screenshotDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('=== Step 1: Landing Page Audit ===');
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Your life, indexed through the art you love');
  await page.screenshot({ path: path.join(screenshotDir, 'audit-01-landing.png'), fullPage: true });

  // Test anchor scrolling on landing page
  await page.click('nav a:has-text("Features")');
  await page.waitForTimeout(300);
  await page.click('nav a:has-text("Philosophy")');
  await page.waitForTimeout(300);

  // Test clicking "Start Archive" button
  await page.click('header a:has-text("Start Archive")');
  await expect(page).toHaveURL(/\/auth/);
  await page.screenshot({ path: path.join(screenshotDir, 'audit-02-auth-login.png') });

  console.log('=== Step 2: Sign Up & Verification Flow ===');
  await page.click('#tab-signup');
  await page.screenshot({ path: path.join(screenshotDir, 'audit-03-auth-signup-tab.png') });

  // Fill signup form
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'Pass123456!');
  await page.click('form#form-signup button[type="submit"]');

  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-04-auth-verify.png') });

  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');

  // Verify landing on /home
  await page.waitForURL(/\/home/);
  expect(page.url()).toContain('/home');
  console.log('Verified redirect to home:', page.url());

  console.log('=== Step 3: Onboarding Audit via Welcome Banner ===');
  await expect(page.locator('text=Welcome to your personal archive')).toBeVisible();
  await page.click('button:has-text("Set up categories")');
  await page.waitForURL(/\/onboarding/);
  await expect(page.locator('text=Choose your building blocks')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-05-onboarding.png') });

  // Toggle categories (Films and Podcasts)
  await page.click('button:has-text("Films")');
  await page.click('button:has-text("Podcasts")');
  await page.screenshot({ path: path.join(screenshotDir, 'audit-06-onboarding-selected.png') });

  await page.click('button:has-text("Continue")');
  await page.waitForURL(/\/home/);

  console.log('=== Step 4: First-Time Home Dashboard (Empty State) ===');
  await expect(page.locator('text=Nothing in progress')).toBeVisible();
  await expect(page.locator('text=No recent highlights')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-07-home-empty.png'), fullPage: true });

  console.log('=== Step 5: Quick Log Pre-fill Test ===');
  await page.fill('input[placeholder="What are you experiencing right now?"]', 'Princess Mononoke');
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  await page.waitForURL(/\/log/);
  // Verify searchQuery is pre-populated from Quick Log
  const searchInputVal = await page.inputValue('input[placeholder="Search for a film, book, game, or album..."]');
  expect(searchInputVal).toBe('Princess Mononoke');

  console.log('=== Step 6: Library Empty State ===');
  await page.goto('/library');
  await expect(page.locator('text=Your shelves are waiting')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-08-library-empty.png') });

  console.log('=== Step 7: Timeline Empty State ===');
  await page.goto('/timeline');
  await expect(page.locator('text=A quiet time... log an experience to see it here.')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-09-timeline-empty.png') });

  console.log('=== Step 8: Statistics Empty State ===');
  await page.goto('/stats');
  await expect(page.locator('text=Statistics & Retrospectives')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-10-stats-empty.png') });

  console.log('=== Step 9: Log First Experience ===');
  await page.goto('/log');
  await page.fill('input[placeholder="Search for a film, book, game, or album..."]', 'Spirited Away');
  await page.locator('button:has-text("Add Manually")').first().click();
  await expect(page.getByRole('heading', { name: 'Log an Experience' })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-12-log-modal-step2.png') });

  // Set rating: 4 stars
  await page.locator('form button:has(span:has-text("star"))').nth(3).click();

  // Enter thoughts in editor
  const editor = page.locator('.tiptap.ProseMirror');
  if (await editor.isVisible()) {
    await editor.click();
    await editor.fill('A timeless masterpiece of animation, wonder, and emotional depth.');
  }

  // Add tags
  const tagInput = page.locator('input[placeholder*="Add tags"]');
  if (await tagInput.isVisible()) {
    await tagInput.fill('ghibli, anime, masterpiece');
    await tagInput.press('Enter');
  }

  await page.click('button:has-text("Save Experience")');
  await page.waitForURL(/\/experience\//);
  await page.screenshot({ path: path.join(screenshotDir, 'audit-13-experience-detail.png') });

  console.log('=== Step 10: Experience Detail & Edit ===');
  await expect(page.getByRole('heading', { name: 'Spirited Away' })).toBeVisible();
  await page.click('button:has-text("Edit")');
  await page.waitForURL(/\/experience\/.*\/edit/);
  await page.screenshot({ path: path.join(screenshotDir, 'audit-14-experience-edit.png') });

  // Update rating to 5 stars
  await page.locator('button:has(span:has-text("star"))').nth(4).click();
  await page.click('button:has-text("Save Changes")');
  await page.waitForURL(/\/experience\//);
  await page.screenshot({ path: path.join(screenshotDir, 'audit-15-experience-updated.png') });

  console.log('=== Step 11: Check Library With 1 Entry ===');
  await page.goto('/library');
  await expect(page.locator('article')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-16-library-with-entry.png') });

  // Test List View
  await page.click('button[aria-label="List view"]');
  await page.screenshot({ path: path.join(screenshotDir, 'audit-17-library-list-view.png') });

  console.log('=== Step 12: Check Timeline With 1 Entry & Proper Rating ===');
  await page.goto('/timeline');
  await expect(page.locator('text=Spirited Away')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-18-timeline-with-entry.png') });

  console.log('=== Step 13: Category Navigation & Management ===');
  // Check sidebar Categories link
  const categoriesNav = page.locator('nav a:has-text("Categories")').first();
  await expect(categoriesNav).toBeVisible();
  await categoriesNav.click();
  await page.waitForURL(/\/categories/);
  await page.screenshot({ path: path.join(screenshotDir, 'audit-19-categories.png') });

  // Add a new custom category
  await page.click('button:has-text("Create Custom Category")');
  await page.fill('input#cat-name', 'Anime Films');
  await page.click('button:has-text("Create Category")');
  await expect(page.locator('text=Anime Films')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-20-categories-created.png') });

  console.log('=== Step 14: Settings Page & Organization Card ===');
  await page.goto('/settings');
  await expect(page.locator('text=Category Management')).toBeVisible();
  await expect(page.locator('a:has-text("Manage Categories")')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-21-settings.png') });

  // Test Export Data
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Request Export")');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.json');

  console.log('=== Step 15: Public Profile View ===');
  await page.goto(`/u/${username}`);
  await page.screenshot({ path: path.join(screenshotDir, 'audit-22-public-profile.png') });

  console.log('=== Step 16: 404 Error Page ===');
  await page.goto('/non-existent-page-404-test');
  await expect(page.locator('text=404')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'audit-23-404-page.png') });

  console.log('=== Audit Errors and Warnings Summary ===');
  console.log('Page Errors count:', pageErrors.length);
  expect(pageErrors.length).toBe(0);
  const errorLogs = consoleLogs.filter(l => l.type === 'error');
  console.log('Console Errors count:', errorLogs.length);
  if (errorLogs.length > 0) {
    console.log('Console errors:', errorLogs.map(l => l.text));
  }
});
