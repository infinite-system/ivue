// End-to-end walk of the BUILT admin dashboard against a local Worker.
//
// Prereqs (see README "Dashboard" section):
//   npx vite build newsletter/dashboard
//   npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --local
//   npx wrangler@4.120.1 dev --port 8787 \
//     --var ADMIN_SECRET:e2e-local-secret \
//     --var POSTMARK_SERVER_TOKEN:invalid-local-token
//
//   node newsletter/scripts/e2e-walk.mjs [shotDirectory]
//
// Walks: login rejection → unlock → subscribers table → search →
// pagination → bulk unsubscribe/resubscribe → add subscriber → detail
// drawer (send history) → posts + email preview → targeted send (fails
// cleanly on the invalid local Postmark token) → drip preview → stats →
// lock. Screenshots each station; exits non-zero on any failed check.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8787';
const ADMIN_SECRET = process.env.E2E_ADMIN_SECRET ?? 'e2e-local-secret';
const shotDirectory = resolve(process.argv[2] ?? 'newsletter/e2e-shots');
mkdirSync(shotDirectory, { recursive: true });

const checks = [];
function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
let shotIndex = 0;
async function shot(name) {
  shotIndex += 1;
  const path = resolve(
    shotDirectory,
    `${String(shotIndex).padStart(2, '0')}-${name}.png`,
  );
  // fast-forward CSS animations so shots never catch a mid-fade frame
  await page.screenshot({ path, fullPage: false, animations: 'disabled' });
  console.log(`shot: ${path}`);
}

try {
  // ---- station 1: the login gate ----
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.login', { timeout: 15_000 });
  await shot('login-gate');

  await page.fill('#admin-secret', 'wrong-secret');
  await page.click('.login button.primary');
  await page.waitForSelector('.login .error', { timeout: 10_000 });
  check(
    'wrong secret is rejected with a visible error',
    await page.locator('.login .error').isVisible(),
  );
  await shot('login-rejected');

  await page.fill('#admin-secret', ADMIN_SECRET);
  await page.click('.login button.primary');

  // ---- station 2: subscribers table ----
  await page.waitForSelector('[data-view="subscribers"] tbody tr', {
    timeout: 15_000,
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-view="subscribers"] tbody tr').length >
      20,
  );
  const firstPageRows = await page
    .locator('[data-view="subscribers"] tbody tr')
    .count();
  check('page 1 shows a full page of 25 rows', firstPageRows === 25);
  check(
    'pager reports two pages',
    (await page.locator('.pager .muted').innerText()).includes(
      'Page 1 of 2',
    ),
  );
  await shot('subscribers');

  // search
  await page.fill('[data-view="subscribers"] input[type="search"]', 'evgeny');
  await page.click('.searchbar button.primary');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-view="subscribers"] tbody')
      ?.textContent?.includes('evgeny@ivue.dev'),
  );
  check(
    'search narrows to evgeny@ivue.dev',
    (await page.locator('[data-view="subscribers"] tbody').innerText()).includes(
      'evgeny@ivue.dev',
    ),
  );
  await shot('search');

  // pagination
  await page.fill('[data-view="subscribers"] input[type="search"]', '');
  await page.click('.searchbar button.primary');
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-view="subscribers"] tbody tr').length >
      20,
  );
  await page.click('.pager button:last-child');
  await page.waitForFunction(() =>
    document.querySelector('.pager .muted')?.textContent?.includes('Page 2'),
  );
  const secondPageRows = await page
    .locator('[data-view="subscribers"] tbody tr')
    .count();
  check('page 2 shows the remaining rows', secondPageRows > 0 && secondPageRows < 25);
  await shot('page-two');
  await page.click('.pager button:first-child');
  await page.waitForFunction(() =>
    document.querySelector('.pager .muted')?.textContent?.includes('Page 1'),
  );

  // bulk unsubscribe → resubscribe (round-trip, leaves state as found)
  await page.check('[data-view="subscribers"] th.check input');
  await page.waitForSelector('.bulkbar');
  check(
    'select-page arms the bulk bar with 25 selected',
    (await page.locator('.bulkbar span').first().innerText()).includes('25'),
  );
  await shot('bulk-selected');
  await page.click('.bulkbar button:has-text("Unsubscribe")');
  await page.waitForSelector('.toast.success', { timeout: 10_000 });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-view="subscribers"] tr.suppressed')
        .length >= 24,
  );
  check(
    'bulk unsubscribe suppresses the whole page',
    (await page.locator('[data-view="subscribers"] tr.suppressed').count()) >=
      24,
  );
  await shot('bulk-unsubscribed');
  await page.check('[data-view="subscribers"] th.check input');
  await page.click('.bulkbar button:has-text("Resubscribe")');
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-view="subscribers"] tr.suppressed')
        .length <= 1,
  );
  check(
    'bulk resubscribe restores the page (only the seeded unsubscribe remains)',
    (await page.locator('[data-view="subscribers"] tr.suppressed').count()) <=
      1,
  );

  // add subscriber
  await page.fill('.addbar input[type="email"]', 'playwright-e2e@example.com');
  await page.fill('.addbar input[aria-label="Name"]', 'Playwright');
  await page.click('.addbar button.primary');
  await page.waitForSelector('.toast.success');
  await page.fill(
    '[data-view="subscribers"] input[type="search"]',
    'playwright-e2e',
  );
  await page.click('.searchbar button.primary');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-view="subscribers"] tbody')
      ?.textContent?.includes('playwright-e2e@example.com'),
  );
  check(
    'added subscriber is findable',
    (await page.locator('[data-view="subscribers"] tbody').innerText()).includes(
      'playwright-e2e@example.com',
    ),
  );
  await shot('added-subscriber');

  // detail drawer: send history
  await page.fill('[data-view="subscribers"] input[type="search"]', 'evgeny');
  await page.click('.searchbar button.primary');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-view="subscribers"] tbody')
      ?.textContent?.includes('evgeny@ivue.dev'),
  );
  await page.click('[data-view="subscribers"] tbody .linklike');
  await page.waitForSelector('.drawer .history li', { timeout: 10_000 });
  const historyCount = await page.locator('.drawer .history li').count();
  check('detail drawer lists the 2 seeded sends', historyCount === 2);
  check(
    'history names the sent posts',
    (await page.locator('.drawer').innerText()).includes(
      'the-field-not-the-rules',
    ),
  );
  await shot('detail-drawer');
  await page.click('.drawer .ghost');

  // ---- station 3: posts + email preview ----
  await page.click('.tab[data-tab="posts"]');
  await page.waitForSelector('[data-view="posts"] tbody tr', {
    timeout: 20_000,
  });
  const postCount = await page.locator('[data-view="posts"] tbody tr').count();
  check('post catalog loads from the live blog index', postCount > 10);
  await page
    .locator('[data-view="posts"] tbody tr')
    .first()
    .locator('button.primary')
    .click();
  await page.waitForSelector('.preview-frame', { timeout: 20_000 });
  const frameBody = await page
    .frameLocator('.preview-frame')
    .locator('body')
    .innerText();
  check('email preview iframe renders real content', frameBody.length > 200);
  check(
    'preview has no unfilled unsubscribe placeholder',
    !frameBody.includes('{{UNSUBSCRIBE_URL}}'),
  );
  await shot('email-preview');

  // ---- station 4: targeted send (invalid local Postmark token → clean failure) ----
  await page.click('.tab[data-tab="send"]');
  // <option> elements count as hidden — poll the option count instead
  await page.waitForFunction(
    () => document.querySelectorAll('#send-slug option').length > 1,
    undefined,
    { timeout: 20_000 },
  );
  await page.selectOption('#send-slug', { index: 1 });
  await page.fill('#send-recipients', 'evgeny@ivue.dev');
  await page.click('[data-view="send"] form button.primary');
  await page.waitForSelector('[data-role="send-result"]', { timeout: 20_000 });
  const sendResultText = await page
    .locator('[data-role="send-result"]')
    .innerText();
  check(
    'send result reports the outcome per recipient',
    sendResultText.includes('evgeny@ivue.dev'),
  );
  check(
    'invalid local Postmark token fails cleanly (delivered 0, no ledger write)',
    sendResultText.includes('Delivered 0'),
  );
  await shot('send-result');

  // ---- station 5: drip preview ----
  await page.click('.tab[data-tab="drip"]');
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-view="drip"] tbody tr').length > 5,
    undefined,
    { timeout: 20_000 },
  );
  const dripRows = await page.locator('[data-view="drip"] tbody tr').count();
  check('drip preview lists every active subscriber', dripRows >= 30);
  check(
    'drip preview shows due-now subscribers',
    (await page.locator('[data-view="drip"] .statline').innerText()).match(
      /\d+\s+due now/,
    ) !== null,
  );
  await shot('drip-preview');

  // ---- station 6: stats ----
  await page.click('.tab[data-tab="stats"]');
  await page.waitForSelector('[data-view="stats"] .statline', {
    timeout: 20_000,
  });
  const statsText = await page.locator('[data-view="stats"]').innerText();
  check('stats shows list totals', statsText.includes('newsletter'));
  check('stats shows sends per post', statsText.includes('one-kilobyte'));
  await shot('stats');

  // ---- station 7: lock ----
  await page.click('.topbar button.ghost');
  await page.waitForSelector('.login');
  check('lock returns to the gate', await page.locator('.login').isVisible());
  await shot('locked');
} finally {
  await browser.close();
}

const failed = checks.filter((entry) => !entry.passed);
console.log(
  `\ne2e-walk: ${checks.length - failed.length}/${checks.length} checks passed`,
);
if (failed.length) {
  for (const entry of failed) console.error(`FAILED: ${entry.name}`);
  process.exit(1);
}
