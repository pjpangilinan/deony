import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('unauthenticated visitor can view public profile shelves and respects privacy setting', async ({ page, browser }) => {
  await mockCognitoAuth(page);
  const timestamp = Date.now();
  const username = `pubuser${timestamp}`;
  const email = `pub-${timestamp}@deony.local`;

  // 1. Sign up and authenticate user
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

  // 2. Log a manual experience
  await page.goto('/log');
  await page.fill('input[placeholder="Search for a film, book, game, or album..."]', 'Stalker 1979 Film');
  await page.locator('button:has-text("Add Manually")').first().click();
  await expect(page.locator('h2')).toHaveText('Stalker 1979 Film');
  await page.click('button:has-text("Save Experience")');
  await expect(page).toHaveURL(/\/experience\//);

  // 3. Open an unauthenticated guest context (incognito)
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();

  // 4. Navigate as guest to /profile/:username
  await guestPage.goto(`/profile/${username}`);

  // Assert unauthenticated guest navigation adapts
  await expect(guestPage.locator('header a:has-text("Sign In")')).toBeVisible();
  await expect(guestPage.locator('header a:has-text("Join Deony")')).toBeVisible();
  await expect(guestPage.locator('nav a:has-text("Settings")')).toHaveCount(0);

  // Assert public profile details and shelves
  await expect(guestPage.locator(`text=@${username}`)).toBeVisible();
  await expect(guestPage.locator('text=Public Archive')).toBeVisible();
  await expect(guestPage.locator('text=Stalker 1979 Film')).toBeVisible();

  // Assert clicking opens read-only modal without edit/delete buttons
  await guestPage.click('text=Stalker 1979 Film');
  await expect(guestPage.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  await expect(guestPage.locator('button:has-text("Edit")')).toHaveCount(0);
  await expect(guestPage.locator('button:has-text("Delete")')).toHaveCount(0);
  await guestPage.getByRole('button', { name: 'Close', exact: true }).click();

  // 5. Change profile visibility to private in settings as authenticated user
  await page.goto('/settings');
  // Toggle the Public Profile checkbox
  await page.click('input[aria-labelledby="public-profile-label"]', { force: true });
  await page.click('button:has-text("Save Profile")');
  await expect(page.locator('text=Profile saved successfully')).toBeVisible();

  // 6. Reload guest page and assert privacy enforcement
  await guestPage.reload();
  await expect(guestPage.locator('text=This archive is private')).toBeVisible();
  await expect(guestPage.locator('text=Stalker 1979 Film')).toHaveCount(0);

  await guestContext.close();
});
