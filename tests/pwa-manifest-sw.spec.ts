import { test, expect } from '@playwright/test';

test.describe('PWA Capabilities & Offline Assets', () => {
  test('manifest.webmanifest is accessible and has valid standalone configuration', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toContain('Deony');
    expect(manifest.short_name).toBe('Deony');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#114349');
    expect(manifest.background_color).toBe('#fff8f5');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('service worker sw.js is served with correct caching logic', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);

    const swContent = await response.text();
    expect(swContent).toContain('addEventListener(\'install\'');
    expect(swContent).toContain('addEventListener(\'activate\'');
    expect(swContent).toContain('addEventListener(\'fetch\'');
    expect(swContent).toContain('caches.open');
  });

  test('index.html contains all essential PWA and iOS home-screen meta tags', async ({ page }) => {
    await page.goto('/');

    // Check manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');

    // Check theme-color meta tag
    const themeColorMeta = page.locator('meta[name="theme-color"]');
    await expect(themeColorMeta).toHaveAttribute('content', '#114349');

    // Check Apple mobile web app capable
    const appleCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleCapable).toHaveAttribute('content', 'yes');

    // Check Apple mobile web app title
    const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(appleTitle).toHaveAttribute('content', 'Deony');

    // Check Apple touch icon
    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute('href', '/icon.jpg?v=3');
  });
});
