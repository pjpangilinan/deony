import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';
import fs from 'fs';
import path from 'path';

test('verify library search, status badges, list view, tightened onboarding, and settings logout removal', async ({ page }) => {
  await mockCognitoAuth(page);
  const timestamp = Date.now();
  const username = `polishuser${timestamp}`;
  const email = `polish-${timestamp}@deony.local`;

  const screenshotDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // 1. Sign up user
  await page.goto('/auth');
  await page.click('#tab-signup');
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'TestPassword123!');
  await page.click('form#form-signup button[type="submit"]');
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await expect(page).toHaveURL(/\/home/);

  // 2. Verify tightened Onboarding Page
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Choose your building blocks' })).toBeVisible();
  // Ensure cards exist and toggling works
  const movieCard = page.locator('button:has-text("Films")');
  await expect(movieCard).toBeVisible();
  // Take screenshot of tightened onboarding
  await page.screenshot({ path: path.join(screenshotDir, '07-tight-onboarding.png'), fullPage: true });

  // 3. Log a few experiences with different statuses and thoughts
  const logWithDetails = async (title: string, status: string, thoughts: string, stars?: number) => {
    await page.goto('/log');
    await page.fill('input[placeholder="Search for a film, book, game, or album..."]', title);
    await page.locator('button:has-text("Add Manually")').first().click();
    await expect(page.getByRole('heading', { name: 'Log an Experience' })).toBeVisible();

    await page.selectOption('select#status', status);

    if (stars) {
      await page.locator('form button:has(span:has-text("star"))').nth(stars - 1).click();
    }

    // Add thoughts
    await page.locator('.tiptap').fill(thoughts);

    await page.click('button:has-text("Save Experience")');
    await expect(page).toHaveURL(/\/experience\//, { timeout: 10000 });
  };

  await logWithDetails('Solaris 1972', 'Completed', 'A deep contemplative sci-fi masterpiece by Tarkovsky', 4);
  await logWithDetails('Dune Messiah', 'Currently Experiencing', 'Intriguing political intrigue and prophecy continuation', 5);
  await logWithDetails('Neuromancer', 'Want to Experience', 'Classic cyberpunk foundational novel');

  // 4. Test Library Page
  await page.goto('/library');
  await expect(page.locator('article')).toHaveCount(3);

  // Verify status badges on cards
  await expect(page.locator('article:has-text("Solaris 1972")').locator('text=Completed')).toBeVisible();
  await expect(page.locator('article:has-text("Dune Messiah")').locator('text=In Progress')).toBeVisible();
  await expect(page.locator('article:has-text("Neuromancer")').locator('text=Wishlist')).toBeVisible();

  // Test Search functionality: Title search
  const searchInput = page.locator('#library-search-input');
  await searchInput.fill('Solaris');
  await expect(page.locator('article:has-text("Solaris 1972")')).toBeVisible();
  await expect(page.locator('article:has-text("Dune Messiah")')).toHaveCount(0);
  await expect(page.locator('article:has-text("Neuromancer")')).toHaveCount(0);
  await expect(page.locator('text=Filtering:')).toBeVisible();

  // Test Search functionality: Thoughts search ("cyberpunk")
  await searchInput.fill('cyberpunk');
  await expect(page.locator('article:has-text("Neuromancer")')).toBeVisible();
  await expect(page.locator('article:has-text("Solaris 1972")')).toHaveCount(0);

  // Test Search functionality: Status token search ("Progress")
  await searchInput.fill('Progress');
  await expect(page.locator('article:has-text("Dune Messiah")')).toBeVisible();
  await expect(page.locator('article:has-text("Solaris 1972")')).toHaveCount(0);

  // Clear search with clear button
  await page.click('button[aria-label="Clear search"]');
  await expect(page.locator('article')).toHaveCount(3);

  // Capture Screenshot of Grid with Status Badges and active cards
  await page.screenshot({ path: path.join(screenshotDir, '08-library-grid-with-status-badges.png'), fullPage: true });

  // 5. Test List View Toggle
  await page.click('button[aria-label="List view"]');
  await expect(page.locator('text=Title & Category')).toBeVisible();
  await expect(page.locator('article:has-text("Solaris 1972")')).toBeVisible();

  // Capture Screenshot of List View
  await page.screenshot({ path: path.join(screenshotDir, '09-library-list-view.png'), fullPage: true });

  // Switch back to Grid view
  await page.click('button[aria-label="Grid view"]');

  // 6. Test Settings Page: Verify NO Log Out button inside settings
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // Ensure there is no button with text "Log Out" inside main container
  const logoutInMain = page.locator('main button:has-text("Log Out")');
  await expect(logoutInMain).toHaveCount(0);

  // Capture Screenshot of Settings Page
  await page.screenshot({ path: path.join(screenshotDir, '10-settings-no-logout.png'), fullPage: true });
});
