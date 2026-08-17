// Production verification walk — READ-ONLY on the real audience except
// one sanctioned targeted send to a test recipient. Never touches bulk
// actions, broadcast, or drip on production.
//
//   set -a; . newsletter/.env; set +a
//   E2E_ADMIN_SECRET="$ADMIN_SECRET" \
//   E2E_BASE_URL=https://ivue-newsletter.ekalashnikov.workers.dev \
//   E2E_SEND_TO=newsletter@ivue.dev \
//   node newsletter/scripts/prod-walk.mjs [shotDirectory]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL ?? '';
const ADMIN_SECRET = process.env.E2E_ADMIN_SECRET ?? '';
const SEND_TO = process.env.E2E_SEND_TO ?? '';
if (!BASE_URL || !ADMIN_SECRET)
  throw new Error('E2E_BASE_URL and E2E_ADMIN_SECRET are required');
const shotDirectory = resolve(process.argv[2] ?? 'newsletter/prod-shots');
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
  await page.screenshot({ path });
  console.log(`shot: ${path}`);
}

try {
  // login
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.login', { timeout: 20_000 });
  await shot('login-gate');
  await page.fill('#admin-secret', ADMIN_SECRET);
  await page.click('.login button.primary');

  // real audience renders
  await page.waitForFunction(() =>
    document
      .querySelector('[data-view="subscribers"] tbody')
      ?.textContent?.includes('@'),
  );
  const tableText = await page
    .locator('[data-view="subscribers"] tbody')
    .innerText();
  check('real subscriber list renders', tableText.includes('@'));
  check('evgeny@ivue.dev is on the list', tableText.includes('evgeny@ivue.dev'));
  await shot('subscribers');

  // detail: real send history
  await page.fill('[data-view="subscribers"] input[type="search"]', 'evgeny@ivue.dev');
  await page.click('.searchbar button.primary');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-view="subscribers"] tbody')
      ?.textContent?.includes('evgeny@ivue.dev'),
  );
  await page.click('[data-view="subscribers"] tbody .linklike');
  await page.waitForSelector('.drawer h3', { timeout: 15_000 });
  // innerText reflects the rendered text, and h3 is CSS-uppercased
  const drawerText = (await page.locator('.drawer').innerText()).toLowerCase();
  check(
    'detail drawer shows real send history',
    drawerText.includes('emails received'),
  );
  await shot('detail');
  await page.click('.drawer .ghost');

  // posts + preview
  await page.click('.tab[data-tab="posts"]');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-view="posts"] tbody tr').length > 10,
    undefined,
    { timeout: 20_000 },
  );
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
  check('email preview renders production content', frameBody.length > 200);
  await shot('preview');

  // drip preview + stats (read-only)
  await page.click('.tab[data-tab="drip"]');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-view="drip"] tbody tr').length > 0,
    undefined,
    { timeout: 20_000 },
  );
  check(
    'drip preview computes on production data',
    (await page.locator('[data-view="drip"] .statline').innerText()).includes(
      'due now',
    ),
  );
  await shot('drip');
  await page.click('.tab[data-tab="stats"]');
  await page.waitForSelector('[data-view="stats"] .statline', {
    timeout: 20_000,
  });
  check(
    'stats aggregates production sends',
    (await page.locator('[data-view="stats"]').innerText()).includes(
      'emails sent',
    ),
  );
  await shot('stats');

  // targeted send to the sanctioned test recipient — force guarantees
  // delivery even if the ledger already has the pair; the follow-up
  // send WITHOUT force must be refused (the invariant, live in prod)
  if (SEND_TO) {
    await page.click('.tab[data-tab="send"]');
    await page.waitForFunction(
      () => document.querySelectorAll('#send-slug option').length > 1,
      undefined,
      { timeout: 20_000 },
    );
    await page.selectOption('#send-slug', { index: 1 });
    await page.fill('#send-recipients', SEND_TO);
    await page.check('.checkline input');
    await page.click('[data-view="send"] form button.primary');
    await page.waitForSelector('[data-role="send-result"]', {
      timeout: 30_000,
    });
    const forcedText = await page
      .locator('[data-role="send-result"]')
      .innerText();
    check(
      `forced send delivered to ${SEND_TO}`,
      forcedText.includes('Delivered 1'),
    );
    await shot('send-delivered');

    await page.uncheck('.checkline input');
    await page.click('[data-view="send"] form button.primary');
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-role="send-result"]')
          ?.textContent?.includes('Delivered 0'),
      undefined,
      { timeout: 30_000 },
    );
    const repeatText = await page
      .locator('[data-role="send-result"]')
      .innerText();
    check(
      'repeat without force is refused by the ledger',
      repeatText.includes('Delivered 0') && repeatText.includes(SEND_TO),
    );
    await shot('send-repeat-refused');
  }
} finally {
  await browser.close();
}

const failed = checks.filter((entry) => !entry.passed);
console.log(
  `\nprod-walk: ${checks.length - failed.length}/${checks.length} checks passed`,
);
if (failed.length) {
  for (const entry of failed) console.error(`FAILED: ${entry.name}`);
  process.exit(1);
}
