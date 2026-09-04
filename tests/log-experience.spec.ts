import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('user can search and log an experience', async ({ page }) => {
  await mockCognitoAuth(page);
  // Mock external API
  await page.route('**/media/search?*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        source: 'tmdb',
        external_id: '12345',
        title: 'Mocked Movie Title',
        release_date: '2023-01-01',
        cover_image: null,
        description: 'A mock movie for testing'
      }])
    });
  });

  // Mock resolve API
  await page.route('**/media/resolve', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'PROVIDER#tmdb#12345' })
    });
  });

  // Mock experiences API to bypass DynamoDB media check
  await page.route('**/experiences*', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'exp-123' })
      });
    } else if (route.request().method() === 'GET' && route.request().url().includes('exp-123')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'exp-123',
          media_id: 'PROVIDER#tmdb#12345',
          media_title: 'Mocked Movie Title',
          media_type: 'Film',
          status: 'Completed',
          rating: 8
        })
      });
    } else {
      await route.continue();
    }
  });

  const email = `log-${Date.now()}@deony.local`;
  await page.goto('/auth');
  await page.click('#tab-signup');
  const username = `testuser${Date.now()}`;
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', email);
  await page.fill('input#signup-password', 'TestPassword123!');
  
  await page.click('form#form-signup button[type="submit"]');
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');
  await expect(page).toHaveURL(/\/home/);

  await page.goto('/log');
  
  // Search
  await page.fill('input[placeholder="Search for a film, book, game, or album..."]', 'Mocked');
  
  // Click result
  await page.click('text=Mocked Movie Title');
  
  // Submit
  await page.click('button:has-text("Save Experience")');
  
  // Verify
  await expect(page).toHaveURL(/\/experience\//);
});
