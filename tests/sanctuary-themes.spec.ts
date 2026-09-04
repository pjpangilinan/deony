import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test.describe('Sanctuary Themes (Parchment, Midnight, Forest)', () => {
  test('sidebar remains focused on core navigation without theme switcher', async ({ page }) => {
    await mockCognitoAuth(page);

    const timestamp = Date.now();
    const email = `clean-sidebar-${timestamp}@deony.local`;
    await page.goto('/auth');
    await page.click('#tab-signup');
    await page.fill('input#signup-username', `cleansb${timestamp}`);
    await page.fill('input#signup-email', email);
    await page.fill('input#signup-password', 'TestPassword123!');
    await page.click('form#form-signup button[type="submit"]');

    await expect(page.locator('text=Verify Account')).toBeVisible();
    await page.fill('input#confirm-code', '123456');
    await page.click('button:has-text("Confirm and Enter")');
    await expect(page).toHaveURL(/\/library/);

    // Sidebar should have Library, Timeline, Settings, Sign Out, New Entry
    await expect(page.locator('nav a:has-text("Library")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Timeline")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Settings")')).toBeVisible();
    await expect(page.locator('nav button:has-text("Sign Out")')).toBeVisible();

    // Theme switcher should NOT be in the sidebar
    await expect(page.locator('button[aria-label="Switch sanctuary theme"]')).not.toBeVisible();
  });

  test('selecting themes in Settings page updates theme immediately and persists', async ({ page }) => {
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

    // Initial theme should be parchment
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'parchment');

    // Select Midnight OLED card
    const midnightCard = page.locator('button[data-theme-id="midnight"]');
    await expect(midnightCard).toBeVisible();
    await midnightCard.click();

    // Toast confirmation & attribute update
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

    // Select Warm Parchment card
    const parchmentCard = page.locator('button[data-theme-id="parchment"]');
    await expect(parchmentCard).toBeVisible();
    await parchmentCard.click();

    await expect(page.locator('text=Switched theme to Warm Parchment')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'parchment');
  });
});
