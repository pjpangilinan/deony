import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('user can create and delete custom categories', async ({ page }) => {
  await mockCognitoAuth(page);

  // Sign up and login
  const timestamp = Date.now();
  const email = 'cat-' + timestamp + '@deony.local';
  await page.goto('/auth');
  await page.click('#tab-signup');
  const username = 'testuser' + timestamp;
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'TestPassword123!');
  
  await page.click('form#form-signup button[type="submit"]');
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await expect(page).toHaveURL(/\/library/);

  // Navigate to Category Management
  await page.goto('/categories');
  await expect(page.locator('h1:has-text("Category Management")')).toBeVisible();

  // Open modal
  await page.click('button:has-text("Create Custom Category")');
  await expect(page.locator('h2:has-text("Create Custom Category")')).toBeVisible();

  // Fill modal
  const catName = 'CustomCat ' + timestamp;
  await page.fill('input#cat-name', catName);
  await page.selectOption('select#cat-media-type', 'book');
  await page.click('button:has-text("Create Category")');

  // Verify created
  await expect(page.locator('text=Category created')).toBeVisible();
  const customRow = page.locator('div[draggable]').filter({ hasText: catName }).first();
  await expect(customRow).toBeVisible();
  await expect(customRow.getByText('Custom', { exact: true })).toBeVisible();

  // Setup dialog handler for delete
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain(catName);
    await dialog.accept();
  });

  // Hover and delete custom category
  await customRow.hover();
  await page.click(`button[aria-label="Delete ${catName}"]`);

  // Verify deleted
  await expect(page.locator('text=Category deleted')).toBeVisible();
  await expect(page.locator(`text=${catName}`)).not.toBeVisible();
});
