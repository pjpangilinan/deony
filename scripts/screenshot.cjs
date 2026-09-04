const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/auth');
  await page.click('#tab-signup');
  const email = 'test-' + Date.now() + '@test.local';
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign Up")');
  
  await page.waitForURL('**/onboarding');
  await page.goto('http://localhost:5173/log');
  
  await page.fill('input[placeholder="Search for a film..."]', 'matrix');
  await page.waitForTimeout(2000);
  
  const count = await page.locator('button h3').count();
  if (count > 0) {
    await page.locator('button h3').first().click();
  }
  
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'C:/Users/Patrick James/.gemini/antigravity/brain/63a2f0b0-72cd-4048-84d4-aea78ed58480/scratch/screenshot.png' });
  await browser.close();
})();