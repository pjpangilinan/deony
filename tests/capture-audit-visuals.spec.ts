import { test } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';
import * as path from 'path';

test('capture full visual audit screenshots', async ({ page }) => {
  await mockCognitoAuth(page);
  const screenshotDir = path.resolve('screenshots-audit');

  // Sign up a test user
  const ts = Date.now();
  await page.goto('/auth');
  await page.click('#tab-signup');
  await page.fill('input#signup-username', 'visualuser' + ts);
  await page.fill('input#signup-email', 'visual' + ts + '@deony.local');
  await page.fill('input#signup-password', 'TestPassword123!');
  await page.click('form#form-signup button[type="submit"]');
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await page.waitForURL(/\/library/);

  // 1. Library Empty
  await page.screenshot({ path: path.join(screenshotDir, '01-library-empty.png'), fullPage: true });

  // 2. Log an experience - Step 1
  await page.goto('/log');
  await page.screenshot({ path: path.join(screenshotDir, '02-log-step1.png'), fullPage: true });

  // 3. Log an experience - Step 2 (Media selected)
  await page.fill('input[placeholder*="Search"]', 'Blade Runner');
  await page.locator('button:has-text("Add Manually")').first().click();
  await page.waitForSelector('text=Log an Experience');
  await page.screenshot({ path: path.join(screenshotDir, '03-log-step2-modal.png'), fullPage: true });

  // Save an entry
  await page.locator('form button:has(span:has-text("star"))').nth(3).click();
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await editor.fill('A stunning cyberpunk neo-noir exploring humanity and artificial life.');
  await page.click('button:has-text("Save Experience")');
  await page.waitForURL(/\/experience\//);
  await page.waitForSelector('text=Blade Runner');
  await page.waitForTimeout(500);

  // 4. Experience Detail
  await page.screenshot({ path: path.join(screenshotDir, '04-experience-detail.png'), fullPage: true });

  // 5. Edit Experience
  await page.click('button:has-text("Edit")');
  await page.waitForURL(/\/experience\/.*\/edit/);
  await page.waitForSelector('text=Edit Blade Runner');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, '05-experience-edit.png'), fullPage: true });

  // 6. Home Dashboard with entry
  await page.goto('/home');
  await page.screenshot({ path: path.join(screenshotDir, '06-home-with-entry.png'), fullPage: true });

  // 7. Library Catalog
  await page.goto('/library');
  await page.screenshot({ path: path.join(screenshotDir, '07-library-catalog.png'), fullPage: true });

  // 8. Library Stats View
  await page.click('#tab-library-stats');
  await page.screenshot({ path: path.join(screenshotDir, '08-library-stats.png'), fullPage: true });

  // 9. Timeline
  await page.goto('/timeline');
  await page.screenshot({ path: path.join(screenshotDir, '09-timeline.png'), fullPage: true });

  // 10. Settings
  await page.goto('/settings');
  await page.screenshot({ path: path.join(screenshotDir, '10-settings.png'), fullPage: true });
});
