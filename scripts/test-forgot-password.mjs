import { chromium } from 'playwright';

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const EMAIL = process.env.TEST_RESET_EMAIL;

if (!EMAIL) {
  throw new Error('TEST_RESET_EMAIL is required');
}

const browser = await chromium.launch({
  headless: false,
  slowMo: 250,
});

const context = await browser.newContext();
const page = await context.newPage();

page.on('response', async (response) => {
  const url = response.url();

  if (url.includes('/auth/v1/') || response.status() >= 400) {
    let body = '';

    try {
      body = await response.text();
    } catch {}

    console.log(
      'RESPONSE:',
      response.status(),
      response.request().method(),
      url,
      body.slice(0, 1000)
    );
  }
});

page.on('console', (msg) => {
  console.log('BROWSER:', msg.type(), msg.text());
});

await page.goto(`${BASE_URL}/forgot-password`, {
  waitUntil: 'networkidle',
});

console.log('PAGE:', page.url());

await page.locator('input[name="email"]').fill(EMAIL);

await page.getByRole('button', {
  name: /send reset link/i,
}).click();

await page.waitForTimeout(5000);

console.log('FINAL URL:', page.url());
console.log(
  'PAGE TEXT:',
  await page.locator('body').innerText()
);

await browser.close();
