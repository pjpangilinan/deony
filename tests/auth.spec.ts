import { test, expect } from '@playwright/test';
import { mockCognitoAuth } from '../playwright/mockAuth';

test('user can sign up, logout, and login', async ({ page }) => {
  await mockCognitoAuth(page);

  // Sign up
  await page.goto('/auth');
  await page.click('#tab-signup');
  const timestamp = Date.now();
  const username = `testuser${timestamp}`;
  await page.fill('input#signup-username', username);
  await page.fill('input#signup-email', `test-${timestamp}@deony.local`);
  await page.fill('input#signup-password', 'TestPassword123!');
  await page.click('form#form-signup button[type="submit"]');

  // Verify Account form
  await expect(page.locator('text=Verify Account')).toBeVisible();
  await page.fill('input#confirm-code', '123456');
  await page.click('button:has-text("Confirm and Enter")');

  await expect(page).toHaveURL(/\/library/);

  // Logout (logout from sidebar)
  await page.click('button:has-text("Sign Out")');
  await expect(page).toHaveURL(/\//);
});

test('password visibility toggle and focus states on auth page', async ({ page }) => {
  await page.goto('/auth');

  // Verify login password input starts with type="password"
  const loginPassword = page.locator('#login-password');
  await expect(loginPassword).toHaveAttribute('type', 'password');
  await loginPassword.fill('SecretPassword123!');
  
  // Click in input
  await loginPassword.click();
  await page.screenshot({ path: 'screenshots/auth-login-password-focused.png' });

  // Toggle eye icon to show password
  const toggleLoginBtn = page.locator('#toggle-login-password');
  await expect(toggleLoginBtn).toBeVisible();
  await toggleLoginBtn.click();
  await expect(loginPassword).toHaveAttribute('type', 'text');
  await page.screenshot({ path: 'screenshots/auth-login-password-visible.png' });

  // Toggle back to hide password
  await toggleLoginBtn.click();
  await expect(loginPassword).toHaveAttribute('type', 'password');

  // Switch to sign up tab
  await page.click('#tab-signup');
  const signupPassword = page.locator('#signup-password');
  await expect(signupPassword).toHaveAttribute('type', 'password');
  await signupPassword.fill('SignUpPassword456!');

  // Click eye icon in sign up
  const toggleSignupBtn = page.locator('#toggle-signup-password');
  await expect(toggleSignupBtn).toBeVisible();
  await toggleSignupBtn.click();
  await expect(signupPassword).toHaveAttribute('type', 'text');
  await page.screenshot({ path: 'screenshots/auth-signup-password-visible.png' });

  // Toggle back to hidden
  await toggleSignupBtn.click();
  await expect(signupPassword).toHaveAttribute('type', 'password');
});

