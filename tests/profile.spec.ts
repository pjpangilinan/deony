import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('user can update profile', async ({ page }) => {
  await mockCognitoAuth(page);
  const email = `profile-${Date.now()}@deony.local`;
  await page.goto('/auth');
  await page.click('#tab-signup');
  const username = `testuser${Date.now()}`;
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'TestPassword123!');
  
  await page.click('form#form-signup button[type="submit"]');
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/settings');
  
  await page.fill('input[placeholder="Your display name"]', 'Playwright Tester');
  await page.fill('input[placeholder="@username"]', `pwtester${Date.now()}`);
  await page.click('button:has-text("Save Profile")');

  // Wait for toast
  await expect(page.locator('text=Profile saved successfully')).toBeVisible();
});
