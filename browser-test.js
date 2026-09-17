import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';
const outputDir = 'browser-debug';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const results = { VERIFIED: [], FAILED: [], NEEDS_VALIDATION: [] };

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    results.FAILED.push({ type: 'console_error', text: msg.text().slice(0, 200) });
  }
});

page.on('pageerror', (error) => {
  results.FAILED.push({ type: 'page_error', message: error.message.slice(0, 200) });
});

page.on('requestfailed', (request) => {
  results.FAILED.push({ type: 'request_failed', url: request.url(), error: request.failure()?.errorText || 'unknown' });
});

async function testPage(path, name, bodyContains) {
  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);
    const title = await page.title();
    const url = page.url();
    const bodyText = await page.locator('body').innerText();
    const screenshotPath = `${outputDir}/${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    if (url.includes('/login') && path !== '/login') {
      results.NEEDS_VALIDATION.push({ name, status: 'REDIRECTED_TO_LOGIN', url });
    } else if (bodyContains && bodyText.includes(bodyContains)) {
      results.VERIFIED.push({ name, status: 'PAGE_LOADED', title, url, bodyContains });
    } else {
      results.NEEDS_VALIDATION.push({ name, status: 'UNEXPECTED', title, url, bodySnippet: bodyText.slice(0, 120) });
    }
  } catch (e) {
    results.FAILED.push({ name, error: e.message.slice(0, 200) });
  }
}

// Test 1: Protected-route access (should redirect to login when unauthenticated)
await testPage('/dashboard', 'protected-dashboard', null);
await testPage('/ca-assistant', 'protected-ca-assistant', null);
await testPage('/audit-logs', 'protected-audit-logs', null);
await testPage('/invoices', 'protected-invoices', null);
await testPage('/settings', 'protected-settings', null);

// Test 2: Public pages that load without auth
await testPage('/signup', 'page-signup', 'Get Started');
await testPage('/login', 'page-login', 'Welcome Back');
await testPage('/forgot-password', 'page-forgot-password', 'Reset Password');
await testPage('/reset-password', 'page-reset-password', 'Update Password');

// Test 3: Error state - 404 page
await testPage('/nonexistent-page-12345', 'error-404', null);

// Test 4: Onboarding page (redirects if already has business)
await testPage('/onboarding', 'page-onboarding', 'Onboard Your Business');

// Test 5: CA Assistant page without auth (should redirect to login)
await testPage('/ca-assistant', 'ca-assistant-ui', null);

// Test 6: Audit Log UI without auth (should redirect to login)
await testPage('/audit-logs', 'audit-log-ui', null);

// Test 7: Responsive layout - mobile viewport
const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 });
await mobilePage.waitForTimeout(2000);
const mobileTitle = await mobilePage.title();
results.NEEDS_VALIDATION.push({ name: 'responsive-mobile-dashboard', status: 'VIEWPORT_CHECK', title: mobileTitle });
await mobilePage.screenshot({ path: `${outputDir}/responsive-mobile.png`, fullPage: true });
await mobileContext.close();

// Test 8: Logout flow (if logged in, test redirects)
// Try to visit /login to see if already logged in
await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(1000);
const loginUrl = page.url();
const loginBody = await page.locator('body').innerText();
if (loginUrl.includes('/dashboard') || loginBody.includes('Dashboard')) {
  results.VERIFIED.push({ name: 'logout-existing-session', status: 'REDIRECTED_OR_LOGGED_IN' });
} else {
  results.NEEDS_VALIDATION.push({ name: 'logout-no-session', status: 'NOT_AUTHENTICATED' });
}

// Summary
const report = {
  timestamp: new Date().toISOString(),
  base_url: BASE_URL,
  results,
  total_verified: results.VERIFIED.length,
  total_failed: results.FAILED.length,
  total_needs_validation: results.NEEDS_VALIDATION.length,
};

fs.writeFileSync(`${outputDir}/browser-report.json`, JSON.stringify(report, null, 2));
console.log('Browser verification complete.');
console.log(JSON.stringify(report, null, 2));

await browser.close();
