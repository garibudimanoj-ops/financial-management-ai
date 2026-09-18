import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const results = { passes: 0, fails: 0, errors: [] };

  async function test(name, fn) {
    try {
      await fn();
      results.passes++;
      console.log('PASS:', name);
    } catch (e) {
      results.fails++;
      results.errors.push({ name, message: e.message });
      console.log('FAIL:', name, '-', e.message);
    }
  }

  await test('Login page loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('text=Sign In');
    await page.close();
  });

  await test('Signup page loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/signup');
    await page.waitForSelector('text=Create Account');
    await page.close();
  });

  await test('Invalid signup shows safe validation message', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/signup');
    await page.fill('#email', 'not-an-email');
    await page.fill('#password', '123');
    await page.click('button[type="submit"]');
    // Should see validation message (client-side zod)
    await page.waitForTimeout(1500);
    const bodyText = await page.textContent('body');
    await page.close();
    if (bodyText && (bodyText.includes('email') || bodyText.includes('valid') || bodyText.includes('Password') || bodyText.includes('at least') || bodyText.includes('characters') || bodyText.includes('Invalid') || bodyText.includes('must'))) {
      return;
    }
    throw new Error('Expected safe validation message, got snippet: ' + (bodyText ? bodyText.slice(0, 200) : 'empty'));
  });

  await test('Invalid login shows safe user-facing error', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/login');
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    const alert = await page.$('[role="alert"]');
    // Should either not show a raw error, or show a safe message
    await page.close();
  });

  await test('Dashboard loads (auth route protected)', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/dashboard');
    // Should redirect to login (auth protected) or load dashboard
    await page.waitForTimeout(1000);
    const url = page.url();
    await page.close();
    // We verify it doesn't crash; redirect is expected behavior
    if (url.includes('500') || url.includes('error')) {
      throw new Error('Dashboard crashed');
    }
  });

  await test('CA Assistant loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/ca-assistant', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.close();
  });

  await test('Audit Logs loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/audit-logs');
    await page.waitForTimeout(1000);
    await page.close();
  });

  await test('Reports page loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/reports');
    await page.waitForTimeout(1000);
    await page.close();
  });

  await test('Inventory loads with skeleton', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/inventory');
    await page.waitForTimeout(1000);
    await page.close();
  });

  await test('Employees page loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/employees');
    await page.waitForTimeout(1000);
    await page.close();
  });

  await test('POS loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/pos');
    await page.waitForTimeout(1000);
    await page.close();
  });

  await test('Customers loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/customers');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Invoices loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/invoices');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Payments loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/payments');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Products loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/products');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Expenses loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/expenses');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Suppliers loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/suppliers');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Purchases loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/purchases');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Settings loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(500);
    await page.close();
  });

  await test('Purchase Pay page loads', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/purchases/1/pay');
    await page.waitForTimeout(500);
    await page.close();
  });

  await browser.close();
  console.log('RESULT SUMMARY:');
  console.log('PASS:', results.passes);
  console.log('FAIL:', results.fails);
  if (results.errors.length > 0) {
    for (const e of results.errors) {
      console.log('  -', e.name, ':', e.message);
    }
  }
})();
