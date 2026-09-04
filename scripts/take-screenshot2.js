import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Mock everything
  await page.route('**/*', (route) => {
    if (route.request().url().includes('/api/auth/session')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '1', username: 'test' } }) });
    }
    if (route.request().url().includes('/api/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{id: 'c1', name: 'Film', media_type: 'movie'}] }) });
    }
    if (route.request().url().includes('/api/media/search')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{id: 'm1', title: 'The Matrix', provider: 'tmdb', type: 'Film', year: '1999'}]) });
    }
    if (route.request().url().includes('/api/media/resolve')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({id: 'PROVIDER#tmdb#m1', title: 'The Matrix'}) });
    }
    route.continue();
  });
  
  // Navigate directly to log page
  await page.goto('http://localhost:5173/log');
  
  await page.waitForTimeout(2000);
  
  await page.fill('input[placeholder="Search for a film, book, game, or album..."]', 'matrix');
  await page.waitForTimeout(1000);
  
  await page.click('button:has-text("The Matrix")');
  await page.waitForTimeout(1000);
  
  // Now we are on step 2
  await page.fill('.ProseMirror', 'This is a test of the personal thoughts box.\\n\\n'.repeat(20));
  
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'C:/Users/Patrick James/.gemini/antigravity/brain/63a2f0b0-72cd-4048-84d4-aea78ed58480/screenshot2.png' });
  await browser.close();
})();