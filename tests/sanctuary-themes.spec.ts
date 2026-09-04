import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test.describe('Sanctuary Themes (Parchment, Midnight, Forest)', () => {
  test('cycling themes in sidebar updates data-theme attribute and persists', async ({ page }) => {
    await mockCognitoAuth(page);

    const timestamp = Date.now();
    const email = `theme-user-${timestamp}@deony.local`;
    await page.goto('/auth');
    await page.click('#tab-signup');
    await page.fill('input#signup-username', `themeuser${timestamp}`);
    await page.fill('input#signup-email', email);
    await page.fill('input#signup-password', 'TestPassword123!');
    await page.click('form#form-signup button[type="submit"]');

    await expect(page.locator('text=Verify Account')).toBeVisible();
    await page.fill('input#confirm-code', '123456');
    await page.click('button:has-text("Confirm and Enter")');
    await expect(page).toHaveURL(/\/library/);

    // Initial theme should be parchment
    const htmlEl = page.locator('html');
    await expect(htmlEl).toHaveAttribute('data-theme', 'parchment');

    // Find the theme switcher button in the desktop sidebar
    const themeBtn = page.locator('button[aria-label="Switch sanctuary theme"]').first();
    await expect(themeBtn).toBeVisible();

    // Cycle 1: parchment -> midnight
    await themeBtn.click();
    await expect(htmlEl).toHaveAttribute('data-theme', 'midnight');

    // Cycle 2: midnight -> forest
    await themeBtn.click();
    await expect(htmlEl).toHaveAttribute('data-theme', 'forest');

    // Cycle 3: forest -> parchment
    await themeBtn.click();
    await expect(htmlEl).toHaveAttribute('data-theme', 'parchment');
  });

  test('selecting themes in Settings page updates theme immediately and shows toast', async ({ page }) => {
    await mockCognitoAuth(page);

    const timestamp = Date.now();
    const email = `settings-theme-${timestamp}@deony.local`;
    await page.goto('/auth');
    await page.click('#tab-signup');
    await page.fill('input#signup-username', `settheme${timestamp}`);
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

    // Appearance section should be visible
    const appearanceSection = page.locator('#settings-appearance');
    await expect(appearanceSection).toBeVisible();
    await expect(page.locator('h2:has-text("Sanctuary Theme & Appearance")')).toBeVisible();

    // Select Midnight OLED card
    const midnightCard = page.locator('button[data-theme-id="midnight"]');
    await expect(midnightCard).toBeVisible();
    await midnightCard.click();

    // Toast confirmation
    await expect(page.locator('text=Switched theme to Midnight OLED')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');

    // Reload page to verify persistence
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');

    // Select Dark Forest card
    const forestCard = page.locator('button[data-theme-id="forest"]');
    await expect(forestCard).toBeVisible();
    await forestCard.click();

    await expect(page.locator('text=Switched theme to Dark Forest')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'forest');
  });
});
