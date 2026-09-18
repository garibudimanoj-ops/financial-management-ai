import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || process.env.TEST_LOGIN_EMAIL || `auth-test-${Date.now()}@test.local`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || process.env.TEST_LOGIN_PASSWORD || 'TestPassword123!';
const TEST_RESET_EMAIL = process.env.TEST_RESET_EMAIL || process.env.TEST_LOGIN_EMAIL || TEST_EMAIL;

const outputDir = 'auth-debug';
fs.mkdirSync(outputDir, { recursive: true });

function safeUrl(url) {
  try {
    const u = new URL(url);

    // Never save auth codes/tokens in logs.
    for (const key of [
      'code',
      'token',
      'access_token',
      'refresh_token',
      'type',
      'error_description',
    ]) {
      if (u.searchParams.has(key)) {
        u.searchParams.set(key, 'REDACTED');
      }
    }

    return u.toString();
  } catch {
    return url;
  }
}

function safeText(text) {
  return String(text)
    .replace(
      /(?:access_token|refresh_token|token|code|password|api[_-]?key)=?[^&\s]+/gi,
      '$1=REDACTED'
    )
    .slice(0, 2000);
}

const browser = await chromium.launch({
  headless: false,
  slowMo: 250,
});

// Helper for separate contexts
async function createFreshContext() {
  return await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outputDir, size: { width: 1280, height: 720 } },
  });
}

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

const page = await context.newPage();

const events = [];

function record(type, data) {
  const entry = {
    time: new Date().toISOString(),
    type,
    ...data,
  };

  events.push(entry);
  console.log(JSON.stringify(entry));
}

// ------------------------------
// Browser diagnostics
// ------------------------------

page.on('console', (msg) => {
  record('console', {
    level: msg.type(),
    text: safeText(msg.text()),
  });
});

page.on('pageerror', (error) => {
  record('pageerror', {
    message: safeText(error.message),
    stack: safeText(error.stack || ''),
  });
});

page.on('requestfailed', (request) => {
  record('request_failed', {
    method: request.method(),
    url: safeUrl(request.url()),
    failure: request.failure()?.errorText || 'unknown',
  });
});

page.on('response', async (response) => {
  const url = response.url();
  const status = response.status();

  // Record auth/API failures and Supabase calls.
  if (
    status >= 400 ||
    url.includes('/auth/v1/') ||
    url.includes('/api/')
  ) {
    let body = '';

    try {
      const contentType = response.headers()['content-type'] || '';

      if (
        contentType.includes('application/json') ||
        contentType.includes('text/plain')
      ) {
        body = safeText(await response.text());
      }
    } catch {
      body = '[unable to read response body]';
    }

    record('response', {
      method: response.request().method(),
      status,
      url: safeUrl(url),
      body,
    });
  }
});

// ------------------------------
// Helper
// ------------------------------

async function snapshot(name) {
  await page.screenshot({
    path: `${outputDir}/${name}.png`,
    fullPage: true,
  });

  fs.writeFileSync(
    `${outputDir}/${name}.url.txt`,
    safeUrl(page.url()),
  );
}

// ------------------------------
// TEST 1 — Signup
// ------------------------------

console.log('\n=== TEST 1: SIGNUP ===\n');

await page.goto(`${BASE_URL}/signup`, {
  waitUntil: 'networkidle',
});

await snapshot('01-signup-before');

await page.locator('input[name="email"]').fill(TEST_EMAIL);
await page.locator('input[name="password"]').fill(TEST_PASSWORD);

record('action', {
  action: 'filled_signup_form',
  email: TEST_EMAIL,
});

await page.getByRole('button', {
  name: /create account/i,
}).click();

record('action', {
  action: 'clicked_create_account',
});

await page.waitForTimeout(5000);

record('signup_result', {
  url: safeUrl(page.url()),
  title: await page.title(),
  bodyText: safeText(
    await page.locator('body').innerText()
  ),
});

await snapshot('02-signup-after');

// ------------------------------
// TEST 2 — Login
// ------------------------------

console.log('\n=== TEST 2: LOGIN ===\n');

await page.goto(`${BASE_URL}/login`, {
  waitUntil: 'networkidle',
});

await snapshot('03-login-before');

// Allow an existing session to be detected.
await page.waitForTimeout(1500);

record('login_initial_state', {
  url: safeUrl(page.url()),
  bodyText: safeText(
    await page.locator('body').innerText()
  ),
});

const emailInput = page.locator('input[name="email"]');
const passwordInput = page.locator('input[name="password"]');

if (
  await emailInput.count() > 0 &&
  await passwordInput.count() > 0
) {
  await emailInput.fill(
    process.env.TEST_LOGIN_EMAIL || TEST_EMAIL
  );

  await passwordInput.fill(
    process.env.TEST_LOGIN_PASSWORD || TEST_PASSWORD
  );

  await page.getByRole('button', {
    name: /sign in/i,
  }).click();

  await page.waitForTimeout(5000);

  record('login_result', {
    url: safeUrl(page.url()),
    bodyText: safeText(
      await page.locator('body').innerText()
    ),
  });

  await snapshot('04-login-after');
} else {
  record('login_skipped', {
    reason:
      'Login form was not visible; possible existing authenticated session or middleware redirect.',
    url: safeUrl(page.url()),
  });
}

// ------------------------------
// TEST 3 — Forgot Password
// ------------------------------

console.log('\n=== TEST 3: FORGOT PASSWORD ===\n');

await page.goto(`${BASE_URL}/forgot-password`, {
  waitUntil: 'networkidle',
});

await snapshot('05-forgot-before');

const forgotEmail = page.locator('input[name="email"]');

if (await forgotEmail.count() > 0) {
  await forgotEmail.fill(TEST_RESET_EMAIL);

  await page.getByRole('button', {
    name: /send reset link/i,
  }).click();

  await page.waitForTimeout(5000);

  record('forgot_password_result', {
    url: safeUrl(page.url()),
    bodyText: safeText(await page.locator('body').innerText()),
    note: 'Forgot-password submitted using TEST_RESET_EMAIL (not @example.com). Check Supabase Auth / SMTP / Resend manually.',
  });

  await snapshot('06-forgot-after');
} else {
  record('forgot_password_skipped', {
    reason: 'Forgot-password form was not visible.',
    url: safeUrl(page.url()),
  });
}

// Note: Full reset-flow verification requires a real Supabase recovery email.
// The reset-password page uses getSession() to verify recovery state.
record('manual_reset_note', {
  note: 'Reset-password verification requires manual interaction with a real Supabase recovery email. Use /auth/callback?next=/reset-password after receiving the new reset link.',
  resetLinkBase: `http://localhost:3000/auth/callback?next=/reset-password`,
  lanResetLinkBase: `http://192.168.1.6:3000/auth/callback?next=/reset-password`,
});

// ------------------------------
// Summary
// ------------------------------

fs.writeFileSync(
  `${outputDir}/auth-debug.json`,
  JSON.stringify(events, null, 2),
);

console.log('\n======================================');
console.log('AUTH DIAGNOSTIC COMPLETE');
console.log('======================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Output: ${outputDir}/`);
console.log('Check auth-debug.json and screenshots.');
console.log('======================================\n');

await browser.close();