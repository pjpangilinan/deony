import { test } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';
import * as path from 'path';

test('capture sanctuary themes and annual goal visuals', async ({ page }) => {
  await mockCognitoAuth(page);
  const screenshotDir = path.resolve('screenshots-audit');

  const ts = Date.now();
  await page.goto('/auth');
  await page.click('#tab-signup');
  await page.fill('input#signup-username', 'sanctuary' + ts);
  await page.fill('input#signup-email', 'sanctuary' + ts + '@deony.local');
  await page.fill('input#signup-password', 'TestPassword123!');
  await page.click('form#form-signup button[type="submit"]');
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await page.waitForURL(/\/library/);

  // 1. Warm Parchment Library
  await page.screenshot({ path: path.join(screenshotDir, '01-theme-parchment-library.png'), fullPage: true });

  // 2. Settings Appearance & Theme Selector
  await page.goto('/settings');
  await page.waitForSelector('#settings-appearance');
  await page.screenshot({ path: path.join(screenshotDir, '02-settings-appearance-section.png'), fullPage: true });

  // 3. Switch to Midnight OLED
  await page.click('button[data-theme-id="midnight"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotDir, '03-theme-midnight-settings.png'), fullPage: true });

  // 4. Switch to Dark Forest and view Library
  await page.click('button[data-theme-id="forest"]');
  await page.waitForTimeout(400);
  await page.goto('/library');
  await page.screenshot({ path: path.join(screenshotDir, '04-theme-forest-library.png'), fullPage: true });

  // 5. Insights tab with Annual Goal Ring
  await page.click('button:has-text("Insights & Statistics")');
  await page.waitForSelector('svg[aria-label*="Annual Goal"]');
  await page.screenshot({ path: path.join(screenshotDir, '05-insights-annual-goal-ring.png'), fullPage: true });

  // 6. Goal Adjustment Drawer open
  await page.click('button:has-text("Adjust Goal")');
  await page.waitForSelector('text=50 Experiences');
  await page.screenshot({ path: path.join(screenshotDir, '06-goal-adjust-drawer.png'), fullPage: true });
});
