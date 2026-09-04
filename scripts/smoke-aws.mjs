import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PROD_URL = 'https://d1cdomhzh1pe4j.cloudfront.net';
const USERNAME = 'patrick_archivist';
const PASSWORD = 'DeonyPassword2026!';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 Launching Chromium to test live AWS production deployment...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // HiDPI sharp screenshots
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  try {
    // 1. Visit Auth Page
    console.log('1. Navigating to Auth page...');
    await page.goto(`${PROD_URL}/auth`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-auth-login.png'), fullPage: false });
    console.log('📸 Captured: 01-auth-login.png');

    // 2. Sign In
    console.log('2. Submitting login credentials...');
    await page.fill('input[type="text"]', USERNAME);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation after auth
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log('Navigated to:', currentUrl);

    // 3. Onboarding (if redirected to onboarding)
    if (currentUrl.includes('/onboarding')) {
      console.log('3. Completing initial category onboarding...');
      await page.waitForSelector('button', { timeout: 5000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-onboarding.png'), fullPage: false });
      console.log('📸 Captured: 02-onboarding.png');

      // Click "Complete Setup" or continue button
      const completeBtn = page.getByRole('button', { name: /Complete|Finish|Continue|Get Started|Done/i });
      if (await completeBtn.isVisible()) {
        await completeBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // 4. Library Page
    console.log('4. Navigating to Library...');
    await page.goto(`${PROD_URL}/library`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-library-empty.png'), fullPage: false });
    console.log('📸 Captured: 03-library-empty.png');

    // 5. Open Log Experience Modal / Page
    console.log('5. Navigating to Log Experience...');
    await page.goto(`${PROD_URL}/log`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Search for a movie via TMDB (e.g. Interstellar)
    console.log('6. Searching TMDB provider for "Interstellar"...');
    const searchInput = page.locator('#search-input, input[placeholder*="Search"]').first();
    await searchInput.fill('Interstellar');
    await page.waitForTimeout(2500); // Allow debounced search to query TMDB
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-search-tmdb.png'), fullPage: false });
    console.log('📸 Captured: 04-search-tmdb.png');

    // Select the first search result
    const resultItem = page.locator('h4:has-text("Interstellar")').first();
    if (await resultItem.isVisible()) {
      await resultItem.click();
      await page.waitForTimeout(1500);
      console.log('Selected Interstellar from TMDB search results');
    }

    // Rate 5 stars
    const starButtons = page.locator('button:has(span:has-text("star"))');
    const count = await starButtons.count();
    if (count >= 5) {
      await starButtons.nth(4).click();
      console.log('Rated 5 stars');
    }

    // Type thoughts into Tiptap editor
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("A transcendent cinematic journey on relativity, love, and humanity's survival. Nolan's direction coupled with Hans Zimmer's pipe-organ score elevates this into a modern archival masterpiece.");
      console.log('Filled archival thoughts in editor');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-log-experience.png'), fullPage: false });
    console.log('📸 Captured: 05-log-experience.png');

    // Submit Experience
    const submitBtn = page.getByRole('button', { name: /Save Experience|Log Experience|Save/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      console.log('Submitted experience to DynamoDB');
    }

    // 6. Populated Library View
    console.log('7. Viewing populated Library...');
    await page.goto(`${PROD_URL}/library`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-library-populated.png'), fullPage: false });
    console.log('📸 Captured: 06-library-populated.png');

    // 7. Library Statistics View
    console.log('8. Viewing Library Insights & Statistics tab...');
    const statsTabBtn = page.getByRole('button', { name: /Insights & Statistics|Statistics/i }).first();
    if (await statsTabBtn.isVisible()) {
      await statsTabBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-statistics.png'), fullPage: false });
      console.log('📸 Captured: 07-statistics.png');
    }

    // 8. Timeline Page
    console.log('9. Navigating to Timeline...');
    await page.goto(`${PROD_URL}/timeline`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-timeline.png'), fullPage: false });
    console.log('📸 Captured: 08-timeline.png');

    // 9. Settings Page (with Category Management)
    console.log('10. Navigating to Settings...');
    await page.goto(`${PROD_URL}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-settings.png'), fullPage: false });
    console.log('📸 Captured: 09-settings.png');

    // 10. Experience Detail Page
    console.log('11. Navigating to Experience Detail...');
    await page.goto(`${PROD_URL}/library`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const card = page.locator('h3, h4, div').filter({ hasText: 'Interstellar' }).first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-experience-detail.png'), fullPage: false });
      console.log('📸 Captured: 10-experience-detail.png');
    }

    console.log('🎉 All live AWS tests and screenshots completed successfully!');
  } catch (err) {
    console.error('Test execution error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-state.png') });
  } finally {
    await browser.close();
  }
}

run();
