import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  
  await page.goto('https://d1cdomhzh1pe4j.cloudfront.net/auth', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'patrick_archivist');
  await page.fill('input[type="password"]', 'DeonyPassword2026!');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  await page.goto('https://d1cdomhzh1pe4j.cloudfront.net/library', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const card = page.locator('article.group').first();
  if (await card.isVisible()) {
    await card.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/screenshots/10-experience-detail.png' });
    console.log('Successfully captured docs/screenshots/10-experience-detail.png');
  } else {
    console.log('No card found');
  }
  await browser.close();
}

main();
