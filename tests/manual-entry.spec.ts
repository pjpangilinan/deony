import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('user can log a manual entry', async ({ page }) => {
  await mockCognitoAuth(page);
  
  const email = `manual-${Date.now()}@deony.local`;
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

  await page.goto('/log');
  
  // Fill manual entry search bar
  await page.fill('input[placeholder="Search for a film, book, game, or album..."]', 'My Custom Entry');
  
  // Click Add Manually
  await page.click('button:has-text("Add Manually")');
  
  // Wait for step 2 (logging details)
  await expect(page.locator('h2')).toHaveText('My Custom Entry');
  
  // Submit log
  await page.click('button:has-text("Save Experience")');
  
  // Should go to library
  await expect(page).toHaveURL(/\/experience\//);
  await expect(page.locator('text=My Custom Entry')).toBeVisible();
});
