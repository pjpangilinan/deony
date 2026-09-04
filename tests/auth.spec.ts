import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('user can sign up, logout, and login', async ({ page }) => {
  await mockCognitoAuth(page);

  // Sign up
  await page.goto('/auth');
  await page.click('#tab-signup');
  const timestamp = Date.now();
  const username = `testuser${timestamp}`;
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', `test-${timestamp}@deony.local`);
  await page.fill('input#signup-password', 'TestPassword123!');
  await page.click('form#form-signup button[type="submit"]');

  // Verify Account form
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');

  await expect(page).toHaveURL(/\/home/);

  // Logout (logout from sidebar)
  await page.click('button:has-text("Sign Out")');
  await expect(page).toHaveURL(/\//);
});
