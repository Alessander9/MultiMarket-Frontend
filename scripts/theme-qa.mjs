import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
const apiBase = process.env.API_URL || 'http://localhost:8080';
const outDir = path.resolve(process.cwd(), 'qa-artifacts', 'theme');

const credentials = {
  buyer: { correo: 'comprador@multimarket.com', password: 'comprador123', roles: ['COMPRADOR'] },
  seller: { correo: 'vendedor@multimarket.com', password: 'vendedor123', roles: ['VENDEDOR'] },
  admin: { correo: 'admin@multimarket.com', password: 'admin123', roles: ['ADMIN'] }
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loginViaApi(account) {
  const response = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: account.correo, password: account.password })
  });
  if (!response.ok) {
    throw new Error(`Login API failed for ${account.correo}: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  return {
    token: body.token,
    correo: body.correo ?? account.correo,
    roles: Array.isArray(body.roles) ? body.roles : account.roles
  };
}

async function createAuthedPage(browser, session, theme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  await context.addInitScript(({ sessionData, themeValue }) => {
    localStorage.setItem('token', sessionData.token);
    localStorage.setItem('correo', sessionData.correo);
    localStorage.setItem('roles', JSON.stringify(sessionData.roles));
    localStorage.setItem('multimarket-theme', themeValue);
  }, {
    sessionData: session,
    themeValue: theme
  });

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(themeValue => {
    document.documentElement.setAttribute('data-theme', themeValue);
    document.body.setAttribute('data-theme', themeValue);
  }, theme);
  return { context, page };
}

async function assertOnPath(page, expectedPath) {
  await page.waitForURL(url => new URL(url).pathname === expectedPath, { timeout: 15000 });
  const currentPath = new URL(page.url()).pathname;
  if (currentPath !== expectedPath) {
    throw new Error(`Expected path ${expectedPath}, got ${currentPath}`);
  }
}

async function assertThemeApplied(page, theme) {
  const applied = await page.evaluate(() => ({
    html: document.documentElement.getAttribute('data-theme'),
    body: document.body.getAttribute('data-theme'),
    stored: localStorage.getItem('multimarket-theme')
  }));
  if (applied.html !== theme || applied.body !== theme || applied.stored !== theme) {
    throw new Error(`Theme not applied correctly. Got ${JSON.stringify(applied)}`);
  }
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

async function expectVisible(page, selector, name) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  const box = await locator.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error(`Element ${name} is not visible`);
  }
}

async function openThemeSample(page, route, expectedPath, screenshotName, selectors = []) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  await assertOnPath(page, expectedPath);
  await assertThemeApplied(page, screenshotName.includes('-light') ? 'light' : 'dark');
  for (const selector of selectors) {
    await expectVisible(page, selector, selector);
  }
  await capture(page, screenshotName);
}

async function runScenario(browser, account, theme) {
  const session = await loginViaApi(account);
  const { context, page } = await createAuthedPage(browser, session, theme);

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await assertThemeApplied(page, theme);
    await capture(page, `${account.correo.split('@')[0]}-login-${theme}`);

    if (account.correo === credentials.buyer.correo) {
      await openThemeSample(page, '/', '/', `customer-home-${theme}`, ['main, .customer-layout']);
      await openThemeSample(page, '/stores', '/stores', `customer-stores-${theme}`, ['main, .customer-layout']);
      await openThemeSample(page, '/products', '/products', `customer-products-${theme}`, ['main, .customer-layout']);
      await openThemeSample(page, '/favorites', '/favorites', `customer-favorites-${theme}`, ['main, .customer-layout']);
      await openThemeSample(page, '/dashboard', '/dashboard', `customer-dashboard-${theme}`, ['main, .customer-layout']);
      await openThemeSample(page, '/chat', '/chat', `customer-chat-${theme}`, ['main, .customer-layout']);
    } else if (account.correo === credentials.seller.correo) {
      await openThemeSample(page, '/seller/dashboard', '/seller/dashboard', `seller-dashboard-${theme}`, ['.app-layout', '.app-sidebar', '.app-header']);
      await page.locator('.header-action-btn').nth(1).click();
      await expectVisible(page, '.messages-dropdown', 'seller messages dropdown');
      await capture(page, `seller-messages-dropdown-${theme}`);
      await page.locator('.header-action-btn').nth(1).click();
      await openThemeSample(page, '/seller/chat', '/seller/chat', `seller-chat-${theme}`, ['.chat-wrapper', '.chat-main', '.chat-sidebar']);
    } else if (account.correo === credentials.admin.correo) {
      await openThemeSample(page, '/admin/dashboard', '/admin/dashboard', `admin-dashboard-${theme}`, ['.dashboard-layout', '.sidebar', '.theme-nav-toggle']);
    }
  } finally {
    await context.close();
  }
}

async function main() {
  await ensureDir(outDir);

  const browser = await chromium.launch({ headless: true });

  try {
    for (const theme of ['dark', 'light']) {
      await runScenario(browser, credentials.buyer, theme);
      await runScenario(browser, credentials.seller, theme);
      await runScenario(browser, credentials.admin, theme);
    }
    console.log(`Theme QA completed. Screenshots saved in ${outDir}`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
