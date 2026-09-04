import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';
import fs from 'fs';
import path from 'path';

test('comprehensive test: library ui, 5-star rating scaling, and experience details', async ({ page }) => {
  await mockCognitoAuth(page);
  const timestamp = Date.now();
  const username = `rateuser${timestamp}`;
  const email = `rate-${timestamp}@deony.local`;

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
  await expect(page).toHaveURL(/\/library/);

  // Helper to log an entry
  const logEntry = async (title: string, starCount?: number) => {
    await page.goto('/log');
    await page.fill('input[placeholder="Search for a film, book, game, or album..."]', title);
    await page.locator('button:has-text("Add Manually")').first().click();
    await expect(page.getByRole('heading', { name: 'Log an Experience' })).toBeVisible();

    if (starCount !== undefined) {
      await page.locator('form button:has(span:has-text("star"))').nth(starCount - 1).click();
    }

    await page.click('button:has-text("Save Experience")');
    await expect(page).toHaveURL(/\/experience\//);
  };

  // 2. Log 4 distinct experiences
  // Entry 1: 4 stars (previously would show as 8)
  await logEntry('Stalker 1979 Film', 4);
  // Entry 2: 5 stars
  await logEntry('2001 A Space Odyssey', 5);
  // Entry 3: 3 stars
  await logEntry('Solaris 1972', 3);
  // Entry 4: Unrated
  await logEntry('Blade Runner 2049', undefined);

  // 3. Go to Library Page
  await page.goto('/library');
  await page.waitForSelector('article');

  // Verify cards display 5-star scale
  // Stalker should show "4" (NOT 8)
  const stalkerCard = page.locator('article:has-text("Stalker 1979 Film")');
  await expect(stalkerCard).toBeVisible();
  await expect(stalkerCard.locator('span.font-caption').first()).toHaveText('4');

  // 2001 should show "5" (NOT 10)
  const odysseyCard = page.locator('article:has-text("2001 A Space Odyssey")');
  await expect(odysseyCard).toBeVisible();
  await expect(odysseyCard.locator('span.font-caption').first()).toHaveText('5');

  // Solaris should show "3" (NOT 6)
  const solarisCard = page.locator('article:has-text("Solaris 1972")');
  await expect(solarisCard).toBeVisible();
  await expect(solarisCard.locator('span.font-caption').first()).toHaveText('3');

  // Blade Runner should show "Unrated"
  const bladeCard = page.locator('article:has-text("Blade Runner 2049")');
  await expect(bladeCard).toBeVisible();
  await expect(bladeCard.locator('span.font-caption').first()).toHaveText('Unrated');

  // Take screenshot of Library Overview
  await page.screenshot({ path: path.join(screenshotDir, '01-library-overview.png'), fullPage: true });

  // 4. Test Rating Filter in Library
  await page.click('button:has-text("Rating")');
  await page.click('button:has-text("4 Stars")');
  // Only Stalker should be visible
  await expect(page.locator('article:has-text("Stalker 1979 Film")')).toBeVisible();
  await expect(page.locator('article:has-text("2001 A Space Odyssey")')).toHaveCount(0);
  await expect(page.locator('article:has-text("Solaris 1972")')).toHaveCount(0);

  await page.screenshot({ path: path.join(screenshotDir, '02-library-4star-filter.png'), fullPage: true });

  // Reset filters
  await page.click('button:has-text("Reset")');
  await expect(page.locator('article')).toHaveCount(4);

  // 5. Inspect the 4-star experience detail page
  await page.click('article:has-text("Stalker 1979 Film")');
  await expect(page).toHaveURL(/\/experience\//);
  await expect(page.getByRole('heading', { name: 'Stalker 1979 Film' })).toBeVisible();

  // Assert rating section displays "4 / 5"
  await expect(page.locator('text=4 / 5')).toBeVisible();

  // Assert exactly 4 filled stars and 1 unfilled star
  const filledStars = page.locator('span.material-symbols-outlined.text-primary:has-text("star")');
  await expect(filledStars).toHaveCount(4);
  const unfilledStars = page.locator('span.material-symbols-outlined:not(.text-primary):has-text("star")');
  await expect(unfilledStars).toHaveCount(1);

  await page.screenshot({ path: path.join(screenshotDir, '03-experience-detail-4stars.png'), fullPage: true });

  // 6. Test Edit experience rating
  await page.click('button:has-text("Edit")');
  await expect(page).toHaveURL(/\/edit/);
  await expect(page.locator('text=4 / 5 Stars')).toBeVisible();

  await page.screenshot({ path: path.join(screenshotDir, '04-edit-experience-4stars.png'), fullPage: true });

  // Click 5th star to change rating to 5 stars
  await page.locator('button[aria-label="Rate 5 stars"]').click();
  await expect(page.locator('text=5 / 5 Stars')).toBeVisible();

  await page.click('button:has-text("Save Changes")');
  await expect(page).toHaveURL(/\/experience\//);
  await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Stalker 1979 Film' })).toBeVisible();
  await expect(page.locator('text=5 / 5')).toBeVisible();
  await expect(page.locator('span.material-symbols-outlined.text-primary:has-text("star")')).toHaveCount(5);

  await page.screenshot({ path: path.join(screenshotDir, '05-experience-detail-updated-5stars.png'), fullPage: true });

  // 7. Test Public Profile view
  await page.goto(`/profile/${username}`);
  await expect(page.locator('text=Public Archive')).toBeVisible();
  await expect(page.locator('article:has-text("Stalker 1979 Film")')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, '06-public-profile-archive.png'), fullPage: true });
});
