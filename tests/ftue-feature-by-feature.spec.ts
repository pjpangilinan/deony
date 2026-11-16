import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('painstaking feature-by-feature FTUE verification', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await mockCognitoAuth(page);

  const ts = Date.now();
  const username = `ftue${ts}`;
  const email = `ftue-${ts}@deony.local`;

  // 1. Landing & Auth Sign Up
  await page.goto('/auth');
  await page.click('#tab-signup');
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'FtuePass123!');
  await page.click('form#form-signup button[type="submit"]');
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await page.waitForURL(/\/library/);

  // 2. Date Bug Verification: Past finish date defaults start date to same day
  await page.goto('/log');
  await page.fill('#search-input', 'Past Finish Entry');
  await page.locator('button:has-text("Add Manually")').first().click();
  await expect(page.locator('text=Step 2: Reflect & Record')).toBeVisible();

  await page.fill('#date-field', '2026-06-12');
  await expect(page.locator('#started-on-field')).toHaveValue('2026-06-12');
  await page.click('button:has-text("Save Experience")');
  await page.waitForURL(/\/experience\//);
  await expect(page.locator('text=2026-06-12').first()).toBeVisible();
  // Ensure today's date (2026-11-16) is NOT used as start date
  await expect(page.locator('text=2026-11-16')).toHaveCount(0);

  // 3. Custom start date before finish date + validation against start > end
  await page.goto('/log');
  await page.fill('#search-input', 'Custom Start Entry');
  await page.locator('button:has-text("Add Manually")').first().click();
  await page.fill('#date-field', '2026-06-12');
  await page.fill('#started-on-field', '2026-06-20'); // Invalid: after end date
  await page.click('button:has-text("Save Experience")');
  await expect(page.locator('text=Start date cannot be after completion date')).toBeVisible();

  await page.fill('#started-on-field', '2026-06-01');
  await page.click('button:has-text("Save Experience")');
  await page.waitForURL(/\/experience\//);
  await expect(page.locator('text=2026-06-01')).toBeVisible();
  await expect(page.locator('text=2026-06-12')).toBeVisible();

  // 4. Want to Experience hides dates and stays off Timeline
  await page.goto('/log');
  await page.fill('#search-input', 'Wishlist Item');
  await page.locator('button:has-text("Add Manually")').first().click();
  await page.selectOption('#status', 'Want to Experience');
  await expect(page.locator('#date-field')).toHaveCount(0);
  await page.click('button:has-text("Save Experience")');
  await page.waitForURL(/\/experience\//);

  await page.goto('/timeline');
  await expect(page.locator('text=Past Finish Entry')).toBeVisible();
  await expect(page.locator('text=Wishlist Item')).toHaveCount(0);

  // 5. Library: List/Grid toggle, Search, Insights & Statistics tab
  await page.goto('/library');
  await expect(page.locator('text=Past Finish Entry')).toBeVisible();
  await expect(page.locator('text=Wishlist Item')).toBeVisible();
  await page.click('button:has-text("Insights & Statistics")');
  await expect(page.locator('text=Total Entries')).toBeVisible();

  // 6. Deonysus Locked Gate (< 20 entries)
  await page.goto('/deonysus');
  await expect(page.locator('text=offerings')).toBeVisible();

  // 7. Settings: Verify private profile, toggle Public Profile ON, verify public profile
  await page.goto(`/u/${username}`);
  await expect(page.locator('text=This archive is private')).toBeVisible();

  await page.goto('/settings');
  await page.locator('input[aria-labelledby="public-profile-label"]').click({ force: true });
  await expect(page.locator('text=Public profile enabled')).toBeVisible();

  await page.goto(`/u/${username}`);
  await expect(page.locator('body')).toContainText(username);
  await expect(page.locator('text=Past Finish Entry')).toBeVisible();

  // 8. Sign Out
  await page.goto('/library');
  await page.locator('button:has-text("Sign Out")').first().click();
  await page.waitForURL(/\/auth|\//);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
