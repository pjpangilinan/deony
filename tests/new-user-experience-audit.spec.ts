import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';
import path from 'path';
import fs from 'fs';

test('first-time user audit: sidebar navigation, library landing, search outline, and inline cover error placement', async ({ page }) => {
  await mockCognitoAuth(page);

  const screenshotDir = path.join(process.cwd(), 'screenshots-new-user-audit');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // 1. Sign up as a first-time user
  await page.goto('/auth');
  await page.click('#tab-signup');
  const timestamp = Date.now();
  const username = `firsttime${timestamp}`;
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', `firsttime-${timestamp}@deony.local`);
  await page.fill('input#signup-password', 'FirstTime123!');
  await page.click('form#form-signup button[type="submit"]');

  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');

  // 2. Verify user lands DIRECTLY on /library (NOT /home)
  await page.waitForURL(/\/library/);
  expect(page.url()).toContain('/library');
  await page.screenshot({ path: path.join(screenshotDir, '01-landing-library.png'), fullPage: true });

  // 3. Verify Sidebar Navigation items:
  // MUST contain: Library, Timeline, Settings, Sign Out, and New Entry at bottom left
  // MUST NOT contain: Journal
  const sidebar = page.locator('nav.hidden.md\\:flex');
  await expect(sidebar.locator('a:has-text("Library")')).toBeVisible();
  await expect(sidebar.locator('a:has-text("Timeline")')).toBeVisible();
  await expect(sidebar.locator('a:has-text("Settings")')).toBeVisible();
  await expect(sidebar.locator('button:has-text("Sign Out")')).toBeVisible();
  await expect(sidebar.locator('a:has-text("New Entry")')).toBeVisible();
  await expect(sidebar.locator('a:has-text("Journal")')).toHaveCount(0);

  // 4. Click "+ New Entry" pinned at the bottom left of the sidebar
  await sidebar.locator('a:has-text("New Entry")').click();
  await page.waitForURL(/\/log/);
  await page.screenshot({ path: path.join(screenshotDir, '02-log-page.png'), fullPage: true });

  // 5. Test search input focus & outline
  const searchInput = page.locator('#search-input');
  await expect(searchInput).toBeVisible();
  await searchInput.click();
  await page.screenshot({ path: path.join(screenshotDir, '03-search-input-focused.png') });

  // Verify computed outline style is 'none' or '0px'
  const outlineStyle = await searchInput.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow
    };
  });
  expect(outlineStyle.outlineStyle).toBe('none');

  // 6. Enter a manual media item
  await searchInput.fill('Solaris by Andrei Tarkovsky');
  await page.locator('button:has-text("Add Manually")').first().click();

  // Wait for Step 2 modal
  await page.waitForSelector('text=Log an Experience');
  await expect(page.locator('text=Step 2: Reflect & Record')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, '04-step2-modal.png'), fullPage: true });

  // 7. Test Inline Cover Error Placement
  // Click URL button to open URL input
  await page.click('button:has-text("URL")');
  await expect(page.locator('input[placeholder="https://.../cover.jpg"]')).toBeVisible();

  // Enter invalid URL and click Apply
  await page.fill('input[placeholder="https://.../cover.jpg"]', 'not-a-valid-url');
  await page.locator('button:has-text("Apply")').click();

  // Verify specific error message appears INLINE directly under the URL input (NOT in a toast on the left)
  const inlineError = page.locator('span:has-text("Please enter a valid image web link starting with https:// or http://")');
  await expect(inlineError).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, '05-inline-cover-error.png') });

  // 8. Now enter a valid URL and apply
  await page.fill('input[placeholder="https://.../cover.jpg"]', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400');
  await page.locator('button:has-text("Apply")').click();

  // Verify cover image updated and inline error is gone
  await expect(inlineError).toHaveCount(0);
  const coverImg = page.locator('img[alt="Solaris by Andrei Tarkovsky"]');
  await expect(coverImg).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, '06-cover-updated.png') });

  // 9. Rate 5 stars, add thoughts, and save
  await page.locator('form button:has(span:has-text("star"))').nth(4).click();
  await page.click('button:has-text("Save Experience")');

  // Redirects to experience detail
  await page.waitForURL(/\/experience\//);
  await expect(page.locator('h1:has-text("Solaris by Andrei Tarkovsky")')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, '07-experience-detail.png'), fullPage: true });

  // 10. Click Edit to test EditExperiencePage cover photo controls & inline error
  await page.click('button:has-text("Edit")');
  await page.waitForURL(/\/edit/);
  await expect(page.locator('h1:has-text("Edit Solaris by Andrei Tarkovsky")')).toBeVisible();

  // Test invalid URL on Edit page
  await page.click('button:has-text("URL")');
  await page.fill('input[placeholder="https://.../cover.jpg"]', 'bad-url-protocol');
  await page.locator('button:has-text("Apply")').click();

  // Verify inline error in Edit page
  const editInlineError = page.locator('span:has-text("Please enter a valid image web link starting with https:// or http://")');
  await expect(editInlineError).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, '08-edit-inline-cover-error.png') });

  // Clear error by typing valid URL
  await page.fill('input[placeholder="https://.../cover.jpg"]', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400');
  await page.locator('button:has-text("Apply")').click();
  await expect(editInlineError).toHaveCount(0);

  // Save updated experience
  await page.click('button:has-text("Save Changes")');
  await page.waitForURL(/\/experience\//);
  await page.screenshot({ path: path.join(screenshotDir, '09-experience-updated.png'), fullPage: true });

  // 11. Navigate to /library and verify entry is listed
  await sidebar.locator('a:has-text("Library")').click();
  await page.waitForURL(/\/library/);
  await expect(page.locator('h3:has-text("Solaris by Andrei Tarkovsky")')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, '10-library-with-entry.png'), fullPage: true });
});
