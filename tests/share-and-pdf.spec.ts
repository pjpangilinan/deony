import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';
import fs from 'fs';
import path from 'path';

test('verify share profile across settings, public profile, and statistics PDF download', async ({ page }) => {
  await mockCognitoAuth(page);
  const timestamp = Date.now();
  const username = `sharer${timestamp}`;
  const email = `sharer-${timestamp}@deony.local`;

  const screenshotDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // 1. Sign up user
  await page.goto('/auth');
  await page.click('#tab-signup');
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'TestPassword123!');
  await page.click('form#form-signup button[type="submit"]');
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await expect(page).toHaveURL(/\/home/);

  // 2. Log an experience so statistics and profile have content
  await page.goto('/log');
  await page.fill('input[placeholder="Search for a film, book, game, or album..."]', 'Stalker 1979');
  await page.locator('button:has-text("Add Manually")').first().click();
  await expect(page.getByRole('heading', { name: 'Log an Experience' })).toBeVisible();
  await page.selectOption('select#status', 'Completed');
  // 5 stars
  await page.locator('form button:has(span:has-text("star"))').nth(4).click();
  await page.locator('.tiptap').fill('An existential exploration of human desire and the mysterious Zone.');
  await page.click('button:has-text("Save Experience")');
  await expect(page).toHaveURL(/\/experience\//, { timeout: 10000 });

  // 3. Test Share button on Experience Detail Page
  const expShareBtn = page.locator('button:has-text("Share")').first();
  await expect(expShareBtn).toBeVisible();
  await expShareBtn.click();
  await expect(page.locator('text=/Experience (link copied|shared)/i')).toBeVisible();

  // 4. Test Settings Page: Enable Public Profile and Share
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // Ensure Public Profile is ON
  const isChecked = await page.locator('input[aria-labelledby="public-profile-label"]').isChecked();
  if (!isChecked) {
    const publicProfileToggle = page.locator('label:has(input[aria-labelledby="public-profile-label"])');
    await publicProfileToggle.click();
  }

  // Verify the Public Profile Active card appears
  await expect(page.locator('text=Public Profile Active')).toBeVisible();
  await expect(page.locator('code').filter({ hasText: username })).toBeVisible();

  // Click Share Profile in Settings
  const shareProfileBtn = page.locator('button:has-text("Share Profile")');
  await expect(shareProfileBtn).toBeVisible();
  await shareProfileBtn.click();
  await expect(page.locator('text=/Profile (link copied|shared)/i')).toBeVisible();

  // Capture screenshot of Settings Share Card
  await page.screenshot({ path: path.join(screenshotDir, '13-settings-share-profile.png'), fullPage: true });

  // 5. Test Public Profile Page: Verify Share Profile Button
  await page.goto(`/u/${username}`);
  await expect(page.getByRole('heading', { name: 'Public Archive' })).toBeVisible();
  const pubShareBtn = page.locator('button:has-text("Share Profile")');
  await expect(pubShareBtn).toBeVisible();
  await pubShareBtn.click();
  await expect(page.locator('text=/Profile (link copied|shared)/i')).toBeVisible();

  // Capture screenshot of Public Profile with Share button
  await page.screenshot({ path: path.join(screenshotDir, '14-public-profile-with-share.png'), fullPage: true });

  // 6. Test Statistics Page: Share Summary and Download PDF
  await page.goto('/stats');
  await expect(page.locator('text=Your Year in Deony')).toBeVisible();

  // Test Share Summary
  const shareSummaryBtn = page.locator('button:has-text("Share Summary")');
  await expect(shareSummaryBtn).toBeVisible();
  await shareSummaryBtn.click();
  await expect(page.locator('text=/Archive summary (copied|shared)/i')).toBeVisible();

  // Test Download PDF
  const downloadPdfBtn = page.locator('button:has-text("Download PDF")');
  await expect(downloadPdfBtn).toBeVisible();

  // Intercept the browser download event
  const downloadPromise = page.waitForEvent('download');
  await downloadPdfBtn.click();
  const download = await downloadPromise;

  // Assert PDF downloaded
  expect(download.suggestedFilename()).toMatch(/deony-archive-summary.*\.pdf/);
  const downloadPath = path.join(screenshotDir, download.suggestedFilename());
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath)).toBe(true);
  const fileSize = fs.statSync(downloadPath).size;
  expect(fileSize).toBeGreaterThan(1000); // Verify valid PDF with binary content

  // Toast confirmation
  await expect(page.locator('text=Archive summary PDF downloaded!')).toBeVisible();

  // Capture screenshot of Statistics Page with active action buttons
  await page.screenshot({ path: path.join(screenshotDir, '15-stats-with-pdf-and-share.png'), fullPage: true });
});
