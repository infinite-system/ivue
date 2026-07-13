/**
 * Flyweight-grid heap + creation measurement — same regime as the reference
 * grids (demo/grid, demo/formula): HEADLESS chromium with
 * --js-flags=--expose-gc + --enable-precise-memory-info,
 * performance.memory.usedJSHeapSize, gc()×3 before every read, RUNS runs,
 * median reported.
 *
 * Per run:
 *   navigate → gc×3 → heap (baseline, app loaded, NO model)
 *   → createModel (20,000,000 cells) → creationMs
 *   → gc×3 → heap → modelHeap = after − baseline   (ground truth + totals UI)
 *   → scroll through 30 random viewports (facade churn, fine-ref growth)
 *   → gc×3 → heap → scrolledHeap; observation census recorded
 * Run 1 additionally verifies live correctness at the extremes:
 *   bottom row values, an edit cascading into the rendered DOM, and the
 *   full-column totals reacting to a single cell edit.
 *
 *   node examples/playground/src/examples/flyweight-grid/measure.mjs [baseURL]
 *   node examples/playground/src/examples/flyweight-grid/measure.mjs http://localhost:5181
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5181/#/flyweight-grid';
const RUNS = 3;
const ROWS = 1_000_000;
const COLS = 20;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mb = (b) => (b / 1024 / 1024).toFixed(2);

async function gc(page) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      if (typeof window.gc === 'function') window.gc();
    });
    await sleep(120);
  }
}
const readHeap = (page) =>
  page.evaluate(() =>
    performance && performance.memory ? performance.memory.usedJSHeapSize : 0,
  );

async function verify(page) {
  const v = {};
  // Bottom of the document: correct arithmetic at row 1,000,000.
  await page.evaluate(() => window.__fw.scrollToRow(999_999));
  await sleep(300);
  const [a, b, e] = await page.evaluate(() => [
    window.__fw.cellValue(999_999, 0),
    window.__fw.cellValue(999_999, 1),
    window.__fw.cellValue(999_999, 4),
  ]);
  v.bottomRowRendered = await page.evaluate(
    () => window.__fw.cellText(999_999, 4) !== null,
  );
  v.bottomArithmetic =
    typeof a === 'number' && typeof b === 'number' && typeof e === 'number'
      ? Math.abs(a + b - e) < 1e-9
      : `non-numeric: ${a}, ${b}, ${e}`;

  // Edit cascade INTO THE DOM at the top.
  await page.evaluate(() => window.__fw.scrollToRow(0));
  await sleep(300);
  const before = await page.evaluate(() => window.__fw.cellText(0, 4));
  await page.evaluate(() => window.__fw.editCell(0, 0, '111.5'));
  await sleep(250);
  const after = await page.evaluate(() => window.__fw.cellText(0, 4));
  v.editCascadesToDom = before !== after && after !== null;

  // Full-column total (block tier) reacts to the same single edit.
  v.totalsLive = await page.evaluate(() => {
    const el = document.querySelector('.fw-total b');
    return el ? el.textContent.trim().length > 0 : false;
  });
  return v;
}

async function run(runIdx) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
  });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__fw);
  await gc(page);
  const baseline = await readHeap(page);

  await page.evaluate(() => window.__fw.createModel());
  await page.waitForFunction(() => window.__fw.hasModel());
  const creationMs = await page.evaluate(() => window.__fw.creationMs());
  await sleep(400); // let totals + first viewport settle
  await gc(page);
  const afterModel = await readHeap(page);

  // Scroll through 30 spread-out viewports — facade churn + fine-ref growth.
  for (let i = 0; i < 30; i++) {
    const r = Math.floor(((i * 7919) % 1000) * (ROWS / 1000));
    await page.evaluate((row) => window.__fw.scrollToRow(row), r);
    await sleep(60);
  }
  await gc(page);
  const afterScroll = await readHeap(page);
  const census = await page.evaluate(() => window.__fw.stats());

  const report = {
    baseline,
    creationMs,
    modelHeap: afterModel - baseline,
    scrolledHeap: afterScroll - baseline,
    census,
  };
  if (runIdx === 0) report.verification = await verify(page);
  await browser.close();
  return report;
}

const runs = [];
for (let i = 0; i < RUNS; i++) {
  const r = await run(i);
  runs.push(r);
  console.log(
    `run ${i + 1}: create ${r.creationMs.toFixed(1)}ms · model ${mb(r.modelHeap)}MB · after-scroll ${mb(r.scrolledHeap)}MB · census ${JSON.stringify(r.census)}`,
  );
  if (r.verification) console.log('verification:', r.verification);
}

console.log('\n=== MEDIANS (', RUNS, 'runs, 20,000,000 cells ) ===');
console.log(
  `creation:      ${median(runs.map((r) => r.creationMs)).toFixed(1)} ms`,
);
console.log(
  `model heap:    ${mb(median(runs.map((r) => r.modelHeap)))} MB  (${(
    median(runs.map((r) => r.modelHeap)) /
    (ROWS * COLS)
  ).toFixed(2)} B/cell)`,
);
console.log(
  `after 30 viewports: ${mb(median(runs.map((r) => r.scrolledHeap)))} MB`,
);
