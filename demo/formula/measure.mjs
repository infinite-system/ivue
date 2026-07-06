/**
 * Formula-grid benchmark — rigorous heap + creation-time measurement AND the
 * correctness/reactivity verification the brief requires, in one reproducible
 * Playwright script. Same measurement regime as demo/grid/measure.mjs:
 *
 *   HEADLESS chromium, --js-flags=--expose-gc + --enable-precise-memory-info,
 *   performance.memory.usedJSHeapSize, gc()×3 before every read, RUNS runs,
 *   median reported.
 *
 * Per run:
 *   navigate → wait ready → gc×3 → heap (baseline)
 *   → create model → creationMs → gc×3 → heap (after) → modelHeap = after−base
 *   → materializeAll (force every cell's ref+computed live) → gc×3 → matHeap
 * Run 1 additionally executes the full verification suite:
 *   - real formula evaluation (=A+B, =SUM, =AVERAGE, =IF) is correct
 *   - the CONDITIONAL-DEPENDENCY test: editing A1 across 0 shifts =IF's live
 *     tracked deps (B1 ⇄ C1), proven both by the dep-trace and behaviorally
 *   - cross-cell CASCADE: editing one input updates a running-sum dependent
 *     several rows down, live in the DOM
 *
 *   node demo/formula/measure.mjs [baseURL] [rows]
 *   node demo/formula/measure.mjs http://localhost:5182          # 2,500 rows = 100k
 *   node demo/formula/measure.mjs http://localhost:5182 25000    # 25,000 rows = 1M
 */
import { chromium } from 'playwright';

const BASE =
  process.argv[2] || process.env.GRID_BASE || 'http://localhost:5182';
const COLS = 40;
const TARGET_ROWS = parseInt(
  process.argv[3] || process.env.GRID_ROWS || '2500',
  10,
);
const TARGET_CELLS = TARGET_ROWS * COLS;
const RUNS = 3;
const PATH = '/grid-formula';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function gc(page) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      if (typeof window.gc === 'function') window.gc();
    });
    await sleep(120);
  }
}
async function readHeap(page) {
  return page.evaluate(() =>
    performance && performance.memory ? performance.memory.usedJSHeapSize : 0,
  );
}
const G = (page, fn, ...args) => page.evaluate(fn, ...args);

/** The full verification suite — runs once, returns a report object. */
async function verify(page, rowCount) {
  const checks = [];
  const ok = (name, pass, detail) => checks.push({ name, pass, detail });

  // --- 1. real formula evaluation is correct ---
  const [a1, b1, c1, d1] = await Promise.all(
    [0, 1, 2, 3].map((c) =>
      G(page, ([r, c]) => window.__grid.cellValue(r, c), [0, c]),
    ),
  );
  const e1 = await G(page, () => window.__grid.cellValue(0, 4)); // =A1+B1
  const g1 = await G(page, () => window.__grid.cellValue(0, 6)); // =SUM(A1:D1)
  const h1 = await G(page, () => window.__grid.cellValue(0, 7)); // =AVERAGE(A1:D1)
  const near = (x, y) => Math.abs(x - y) < 1e-6;
  ok('=A1+B1', near(e1, a1 + b1), `E1=${e1} vs A1+B1=${a1 + b1}`);
  ok(
    '=SUM(A1:D1)',
    near(g1, a1 + b1 + c1 + d1),
    `G1=${g1} vs ${a1 + b1 + c1 + d1}`,
  );
  ok('=AVERAGE(A1:D1)', near(h1, (a1 + b1 + c1 + d1) / 4), `H1=${h1}`);

  // --- 2. CONDITIONAL-DEPENDENCY test on I1 = =IF(A1>0, B1, C1) ---
  // Force A1 negative, then positive, and prove I1's tracked deps shift B1⇄C1.
  await G(page, () => window.__grid.editCell(0, 0, '-5')); // A1 = -5  (< 0)
  await sleep(60);
  const depsNeg = await G(page, () =>
    window.__grid.deps(0, 8).map((d) => d.ref),
  );
  const iNeg = await G(page, () => window.__grid.cellValue(0, 8));
  const cNeg = await G(page, () => window.__grid.cellValue(0, 2));
  ok(
    'IF deps when A1<0 = {A1,C1}, no B1',
    depsNeg.includes('A1') && depsNeg.includes('C1') && !depsNeg.includes('B1'),
    `deps=${JSON.stringify(depsNeg)}`,
  );
  ok('IF picks C1 when A1<0', near(iNeg, cNeg), `I1=${iNeg} C1=${cNeg}`);

  await G(page, () => window.__grid.editCell(0, 0, '5')); // A1 = 5  (> 0)
  await sleep(60);
  const depsPos = await G(page, () =>
    window.__grid.deps(0, 8).map((d) => d.ref),
  );
  const iPos = await G(page, () => window.__grid.cellValue(0, 8));
  const bPos = await G(page, () => window.__grid.cellValue(0, 1));
  ok(
    'IF deps SHIFTED when A1>0 = {A1,B1}, no C1',
    depsPos.includes('A1') && depsPos.includes('B1') && !depsPos.includes('C1'),
    `deps=${JSON.stringify(depsPos)}`,
  );
  ok('IF picks B1 when A1>0', near(iPos, bPos), `I1=${iPos} B1=${bPos}`);

  // Behavioral proof: with A1>0 (I1 depends on B1, not C1) —
  // editing C1 must NOT move I1; editing B1 MUST move it.
  const iBefore = await G(page, () => window.__grid.cellValue(0, 8));
  await G(page, () => window.__grid.editCell(0, 2, '424242')); // edit C1 (not a dep now)
  await sleep(60);
  const iAfterC = await G(page, () => window.__grid.cellValue(0, 8));
  ok(
    'editing off-branch C1 does NOT change I1',
    near(iBefore, iAfterC),
    `I1 ${iBefore}→${iAfterC}`,
  );
  await G(page, () => window.__grid.editCell(0, 1, '777')); // edit B1 (the live dep)
  await sleep(60);
  const iAfterB = await G(page, () => window.__grid.cellValue(0, 8));
  ok(
    'editing live-branch B1 DOES change I1 to 777',
    near(iAfterB, 777),
    `I1=${iAfterB}`,
  );

  // --- 3. cross-cell CASCADE, live in the DOM ---
  // J is a running sum (block-reset every 50 rows): J[r]=J[r-1]+A[r].
  // Block starting at row index 100 → edit A101 and watch J105 update in DOM.
  const editRow = 100; // A101 (block start)
  const watchRow = 105; // J106, 5 links down the running sum
  await G(page, (r) => window.__grid.scrollToRow(r), watchRow);
  await sleep(200);
  const jDomBefore = await G(page, ([r, c]) => window.__grid.cellText(r, c), [
    watchRow,
    9,
  ]);
  const jValBefore = await G(page, ([r, c]) => window.__grid.cellValue(r, c), [
    watchRow,
    9,
  ]);
  await G(page, ([r, c]) => window.__grid.editCell(r, c, '100000'), [
    editRow,
    0,
  ]);
  await sleep(200);
  const jDomAfter = await G(page, ([r, c]) => window.__grid.cellText(r, c), [
    watchRow,
    9,
  ]);
  const jValAfter = await G(page, ([r, c]) => window.__grid.cellValue(r, c), [
    watchRow,
    9,
  ]);
  ok(
    'editing A101 cascades to J106 (running sum), live in DOM',
    jDomAfter !== jDomBefore && jValAfter !== jValBefore,
    `J106 DOM ${jDomBefore}→${jDomAfter}, value ${jValBefore}→${jValAfter}`,
  );

  // basic single-cell reactivity in the DOM (edit reflects in rendered text)
  const midRow = Math.floor(rowCount / 2);
  await G(page, (r) => window.__grid.scrollToRow(r), midRow);
  await sleep(150);
  const before = await G(page, ([r, c]) => window.__grid.cellText(r, c), [
    midRow,
    0,
  ]);
  await G(page, ([r, c]) => window.__grid.editCell(r, c, '987654'), [
    midRow,
    0,
  ]);
  await sleep(150);
  const after = await G(page, ([r, c]) => window.__grid.cellText(r, c), [
    midRow,
    0,
  ]);
  ok(
    'single-cell edit updates DOM',
    after !== before && after.includes('987,654'),
    `${before}→${after}`,
  );

  return checks;
}

async function runOnce(browser, rowCount, doVerify) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE + PATH, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__grid && typeof window.__grid.createModel === 'function',
    { timeout: 20000 },
  );

  await gc(page);
  const baseline = await readHeap(page);
  const heapLimit = await page.evaluate(() =>
    performance && performance.memory
      ? performance.memory.jsHeapSizeLimit
      : null,
  );

  await page.evaluate((rc) => window.__grid.createModel(rc), rowCount);
  await page.waitForFunction(() => window.__grid.hasModel(), {
    timeout: 180000,
  });
  const creationMs = await page.evaluate(() => window.__grid.creationMs());

  await sleep(400);
  await gc(page);
  const after = await readHeap(page);
  const modelHeap = after - baseline;
  const mountedCount = await page.evaluate(() => window.__grid.mountedCount());

  let checks = null;
  if (doVerify) checks = await verify(page, rowCount);

  // fully-materialized heap: force every cell's ref+computed to allocate
  await page.evaluate(() => window.__grid.materializeAll());
  await sleep(400);
  await gc(page);
  const matHeap = (await readHeap(page)) - baseline;

  await ctx.close();
  return {
    baseline,
    after,
    heapLimit,
    modelHeap,
    matHeap,
    creationMs,
    mountedCount,
    checks,
    errors,
  };
}

async function main() {
  console.log(
    `formula measure: ${TARGET_ROWS.toLocaleString()} rows × ${COLS} cols = ${TARGET_CELLS.toLocaleString()} cells · ${RUNS} runs · ${BASE}${PATH}`,
  );
  const browser = await chromium.launch({
    headless: true,
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
  });

  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const res = await runOnce(browser, TARGET_ROWS, i === 0);
    if (res.errors.length)
      console.log(`  run ${i + 1}: pageerror(s):`, res.errors.slice(0, 3));
    console.log(
      `  run ${i + 1}: model +${(res.modelHeap / 1e6).toFixed(2)}MB · materialized +${(res.matHeap / 1e6).toFixed(2)}MB · create ${res.creationMs.toFixed(1)}ms · mounted ${res.mountedCount}`,
    );
    if (res.checks) {
      console.log('\n  === verification ===');
      for (const c of res.checks)
        console.log(`   ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  [${c.detail}]`);
      console.log('');
    }
    runs.push(res);
  }
  await browser.close();

  const medModel = median(runs.map((r) => r.modelHeap));
  const medMat = median(runs.map((r) => r.matHeap));
  const medCreate = median(runs.map((r) => r.creationMs));
  const allPass = runs[0].checks.every((c) => c.pass);

  console.log('\n================ MEDIAN RESULTS ================');
  console.log(
    `formula | model heap ${(medModel / 1e6).toFixed(2)}MB (${(medModel / TARGET_CELLS).toFixed(0)} B/cell) | ` +
      `materialized ${(medMat / 1e6).toFixed(2)}MB (${(medMat / TARGET_CELLS).toFixed(0)} B/cell) | ` +
      `create ${medCreate.toFixed(1)}ms | mounted ${runs[0].mountedCount} | verification ${allPass ? 'ALL PASS' : 'FAILURES'}`,
  );
  console.log(
    '\nJSON:\n' +
      JSON.stringify(
        {
          base: BASE,
          rows: TARGET_ROWS,
          cols: COLS,
          cells: TARGET_CELLS,
          runs: RUNS,
          medianModelHeapBytes: medModel,
          medianMaterializedHeapBytes: medMat,
          bytesPerCell: medModel / TARGET_CELLS,
          bytesPerCellMaterialized: medMat / TARGET_CELLS,
          medianCreateMs: medCreate,
          heapLimitBytes: runs[0].heapLimit,
          verificationAllPass: allPass,
          runs: runs.map((r) => ({
            modelHeap: r.modelHeap,
            matHeap: r.matHeap,
            creationMs: r.creationMs,
            mountedCount: r.mountedCount,
          })),
          checks: runs[0].checks,
        },
        null,
        2,
      ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
