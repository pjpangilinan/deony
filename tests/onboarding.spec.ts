import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('user can complete onboarding', async ({ page }) => {
  await mockCognitoAuth(page);

  // Sign up
  const email = `onboard-${Date.now()}@deony.local`;
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

  await expect(page).toHaveURL(/\/home/);
  
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/onboarding/);

  // Check default categories
  await expect(page.locator('text=Films')).toBeVisible();
  await expect(page.locator('text=Shows')).toBeVisible();
  await expect(page.locator('text=Books')).toBeVisible();
  await expect(page.locator('text=Games')).toBeVisible();

  // Select all
  await page.click('text=Films');
  await page.click('text=Shows');
  await page.click('text=Books');
  await page.click('text=Games');

  await page.click('button:has-text("Continue")');

  // Should redirect to home
  await expect(page).toHaveURL(/\/home/);

  // Check home dashboard rendered
  await expect(page.locator('text=Recent Highlights').first()).toBeVisible();
});
