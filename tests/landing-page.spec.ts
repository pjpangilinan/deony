import { test, expect } from '@playwright/test';
import path from 'path';

test('landing page screenshot and transitions', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Your life, indexed through the art you love');
  
  const screenshotDir = path.resolve(process.cwd(), 'screenshots');
  await page.screenshot({ path: path.join(screenshotDir, '11-landing-page-hero.png'), fullPage: false });
  await page.screenshot({ path: path.join(screenshotDir, '12-landing-page-full.png'), fullPage: true });
});
