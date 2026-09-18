import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const pagesToCheck = [
    '/login', '/signup', '/dashboard', '/ca-assistant',
    '/audit-logs', '/reports', '/inventory', '/employees',
    '/pos', '/customers', '/invoices', '/payments',
    '/products', '/expenses', '/suppliers', '/purchases',
    '/settings', '/purchases/1/pay'
  ];
  const errors = [];
  for (const url of pagesToCheck) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    try {
      await page.goto('http://localhost:3000' + url, { timeout: 10000 });
      await page.waitForTimeout(800);
    } catch (e) {
      errors.push({ url, error: e.message });
    }
    if (consoleErrors.length > 0) {
      errors.push({ url, consoleErrors });
    }
    await page.close();
  }
  console.log('CONSOLE ERRORS FOUND:', errors.length);
  for (const e of errors) {
    if (e.consoleErrors) {
      console.log('  ' + e.url + ':', e.consoleErrors.join(' | '));
    } else {
      console.log('  ' + e.url + ':', e.error);
    }
  }
  await browser.close();
})();
