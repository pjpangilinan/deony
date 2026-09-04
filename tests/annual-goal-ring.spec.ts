import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test.describe('Annual Challenge / Goal Ring', () => {
  test('displays annual goal ring in insights and allows customizing target', async ({ page }) => {
    await mockCognitoAuth(page);

    const timestamp = Date.now();
    const email = `goal-user-${timestamp}@deony.local`;
    await page.goto('/auth');
    await page.click('#tab-signup');
    await page.fill('input#signup-username', `goaluser${timestamp}`);
    await page.fill('input#signup-email', email);
    await page.fill('input#signup-password', 'TestPassword123!');
    await page.click('form#form-signup button[type="submit"]');

    await expect(page.locator('text=Verify Account')).toBeVisible();
    await page.fill('input#confirm-code', '123456');
    await page.click('button:has-text("Confirm and Enter")');
    await expect(page).toHaveURL(/\/library/);

    // Switch to Insights & Statistics tab
    const insightsTab = page.locator('button:has-text("Insights & Statistics")');
    await expect(insightsTab).toBeVisible();
    await insightsTab.click();

    // Verify Annual Challenge section and current year
    const currentYear = new Date().getFullYear().toString();
    await expect(page.locator(`h3:has-text("${currentYear} Annual Challenge")`)).toBeVisible();

    // Verify SVG progress ring is rendered
    const goalRingSvg = page.locator('svg[aria-label*="Annual Goal"]');
    await expect(goalRingSvg).toBeVisible();

    // Verify default target (e.g. 25) is displayed
    await expect(page.locator('text=of 25')).toBeVisible();

    // Click Adjust Goal button
    const adjustBtn = page.locator('button:has-text("Adjust Goal")');
    await expect(adjustBtn).toBeVisible();
    await adjustBtn.click();

    // Preset buttons should appear
    await expect(page.locator('text=50 Experiences')).toBeVisible();

    // Select 50 Experiences preset
    await page.click('button:has-text("50 Experiences")');

    // Target should update to 50
    await expect(page.locator('text=of 50')).toBeVisible();

    // Reload page to verify localStorage persistence
    await page.reload();
    await expect(page.locator('text=of 50')).toBeVisible();
  });
});
