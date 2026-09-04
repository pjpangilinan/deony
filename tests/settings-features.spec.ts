import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('settings: search indexing, avatar selection, and manage categories modal', async ({ page }) => {
  await mockCognitoAuth(page);

  const timestamp = Date.now();
  const email = `settings-${timestamp}@deony.local`;
  await page.goto('/auth');
  await page.click('#tab-signup');
  const username = `setuser${timestamp}`;
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'TestPassword123!');
  
  await page.click('form#form-signup button[type="submit"]');
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await expect(page).toHaveURL(/\/library/);

  // Navigate to Settings
  await page.goto('/settings');
  await expect(page.locator('h1:has-text("Settings")')).toBeVisible();

  // 1. Test Search Indexing Toggle (sr-only checkbox requires force click)
  const indexingToggle = page.locator('div:has-text("Search Engine Indexing") + label input[type="checkbox"]');
  await indexingToggle.click({ force: true });
  // Should show success toast instead of "Failed to update indexing setting"
  await expect(page.locator('text=Search engine indexing disabled')).toBeVisible();

  // 2. Test Manage Categories button opens modal
  const manageCatBtn = page.locator('button:has-text("Manage Categories")');
  await expect(manageCatBtn).toBeVisible();
  await manageCatBtn.click();
  
  // Modal should be visible
  await expect(page.locator('h2:has-text("Manage Categories")')).toBeVisible();
  await expect(page.locator('text=Reorder your categories using the arrows')).toBeVisible();
  
  // Close the modal
  await page.click('button:has-text("Done")');
  await expect(page.locator('h2:has-text("Manage Categories")')).not.toBeVisible();

  // 3. Test Avatar Preset Selection
  const choosePresetBtn = page.locator('button:has-text("Choose Preset")');
  await expect(choosePresetBtn).toBeVisible();
  await choosePresetBtn.click();

  // Avatar Modal should be visible
  await expect(page.locator('h2:has-text("Select Profile Picture")')).toBeVisible();
  await expect(page.locator('text=Choose from Curated Archetypes')).toBeVisible();

  // Click on a preset (e.g. Cinephile or Retro Gamer)
  const gamerPreset = page.locator('button:has-text("Retro Gamer")');
  await expect(gamerPreset).toBeVisible();
  await gamerPreset.click();

  // Toast should confirm update
  await expect(page.locator('text=Profile picture updated!')).toBeVisible();
});
