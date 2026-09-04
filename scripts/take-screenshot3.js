import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Go to root to set local storage
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiAiMTIzNDUiLCAiY29nbml0bzp1c2VybmFtZSI6ICJ0ZXN0dXNlciJ9.dummy');
  });
  
  // Now go to log page
  await page.goto('http://localhost:5173/log');
  await page.waitForTimeout(2000);
  
  // Search
  await page.fill('input[type=`"text`"]', 'matrix');
  await page.waitForTimeout(2000);
  
  await page.click('button h3:has-text("The Matrix")');
  await page.waitForTimeout(1000);
  
  // On step 2
  await page.fill('textarea#thoughts', 'This is a test of the personal thoughts box.\\n\\n'.repeat(20));
  
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'C:/Users/Patrick James/.gemini/antigravity/brain/63a2f0b0-72cd-4048-84d4-aea78ed58480/screenshot3.png' });
  await browser.close();
})();
