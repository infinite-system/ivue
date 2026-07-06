/**
 * Flagship grid benchmark — rigorous heap + creation-time measurement.
 *
 * Uses the Playwright install from the realized worktree (chromium already
 * downloaded there). Launches HEADLESS chromium with --expose-gc so window.gc()
 * exists and --enable-precise-memory-info so performance.memory.usedJSHeapSize
 * is byte-accurate.
 *
 * Protocol per arm (repeated RUNS times, median reported):
 *   navigate → wait ready → gc×3 → read heap (baseline)
 *   → click "create model" → wait done → read creationMs
 *   → gc×3 → read heap (after) → delta = model heap
 *   → scroll + edit one cell → assert the DOM updated (live reactivity)
 *
 * If the composable arm OOMs at 100k it is reported as an OOM event and retried
 * at 25k, with a clearly-labeled ×4 extrapolation.
 *
 * Usage: node demo/grid/measure.mjs [baseURL]
 */
import { createRequire } from 'module';

const PW_BASE =
  '/home/parallels/dev/realized/.claude/worktrees/convert-player-to-ivue2/app/package.json';
const require = createRequire(PW_BASE);
const { chromium } = require('playwright');

const BASE =
  process.argv[2] || process.env.GRID_BASE || 'http://localhost:5180';
const RUNS = 3;
const COLS = 40;
const FULL_ROWS = 2500; // 100,000 cells
const FALLBACK_ROWS = 625; // 25,000 cells

const ARMS = [
  { name: 'composable', path: '/grid-composable', reactive: true },
  { name: 'ivue', path: '/grid-ivue', reactive: true },
  { name: 'pojo', path: '/grid-pojo', reactive: false },
];

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

async function readHeap(page, cdp) {
  const h = await page.evaluate(() =>
    performance && performance.memory
      ? performance.memory.usedJSHeapSize
      : null,
  );
  if (h != null) return { bytes: h, source: 'performance.memory' };
  // CDP fallback
  await cdp.send('Performance.enable');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = metrics.find((x) => x.name === 'JSHeapUsedSize');
  return { bytes: m ? m.value : 0, source: 'CDP.JSHeapUsedSize' };
}

/** One full protocol pass for an arm at a given rowCount. */
async function runOnce(browser, arm, rowCount, cellCount) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  let crashed = false;
  page.on('crash', () => {
    crashed = true;
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE + arm.path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__grid && typeof window.__grid.createModel === 'function',
    { timeout: 20000 },
  );

  await gc(page);
  const baseline = await readHeap(page, cdp);

  // create the model
  await page.evaluate((rc) => window.__grid.createModel(rc), rowCount);

  try {
    await page.waitForFunction(() => window.__grid.hasModel(), {
      timeout: 90000,
    });
  } catch (e) {
    if (crashed) {
      await context.close();
      return { oom: true, errors };
    }
    throw e;
  }
  if (crashed) {
    await context.close();
    return { oom: true, errors };
  }

  const creationMs = await page.evaluate(() => window.__grid.creationMs());
  await sleep(300); // let the reactive render settle
  await gc(page);
  const after = await readHeap(page, cdp);
  const modelHeap = after.bytes - baseline.bytes;

  const mountedCount = await page.evaluate(() => window.__grid.mountedCount());

  // --- live reactivity verification ---
  const targetRow = Math.floor(rowCount / 2);
  const targetCol = 1;
  await page.evaluate((r) => window.__grid.scrollToRow(r), targetRow);
  await sleep(200);
  const before = await page.evaluate(
    ([r, c]) => window.__grid.cellText(r, c),
    [targetRow, targetCol],
  );
  await page.evaluate(
    ([r, c]) => window.__grid.editCell(r, c, '987654'),
    [targetRow, targetCol],
  );
  await sleep(200);
  const afterText = await page.evaluate(
    ([r, c]) => window.__grid.cellText(r, c),
    [targetRow, targetCol],
  );
  const reactive =
    afterText !== before && !!afterText && afterText.includes('987,654');

  // --- fully-materialized heap: read EVERY cell's derived values once.
  // For ivue this forces lazy refs/computeds to allocate (its worst case);
  // for the composable (already eagerly allocated) it additionally evaluates
  // every computed — an apples-to-apples "all cells live" comparison. ---
  let materializedHeap = null;
  if (arm.reactive) {
    await page.evaluate(() => window.__grid.materializeAll());
    await sleep(200);
    await gc(page);
    const mat = await readHeap(page, cdp);
    materializedHeap = mat.bytes - baseline.bytes;
  }

  await context.close();
  return {
    oom: false,
    baseline: baseline.bytes,
    after: after.bytes,
    modelHeap,
    materializedHeap,
    creationMs,
    mountedCount,
    reactive,
    heapSource: baseline.source,
    cellCount,
    errors,
  };
}

async function runArm(browser, arm) {
  console.log(`\n=== arm: ${arm.name} (${arm.path}) ===`);

  // First attempt at full 100k.
  let rowCount = FULL_ROWS;
  let cellCount = rowCount * COLS;
  let extrapolated = false;
  let oomEvents = 0;
  const runs = [];

  for (let i = 0; i < RUNS; i++) {
    let res = await runOnce(browser, arm, rowCount, cellCount);
    if (res.oom) {
      oomEvents++;
      console.log(
        `  run ${i + 1}: OOM at ${cellCount} cells — falling back to 25k`,
      );
      // Switch this and all subsequent runs to the 25k fallback.
      rowCount = FALLBACK_ROWS;
      cellCount = rowCount * COLS;
      extrapolated = true;
      res = await runOnce(browser, arm, rowCount, cellCount);
      if (res.oom) {
        console.log(
          `  run ${i + 1}: OOM again at ${cellCount} — giving up on this run`,
        );
        continue;
      }
    }
    if (res.errors && res.errors.length) {
      console.log(`  run ${i + 1}: pageerror(s):`, res.errors.slice(0, 3));
    }
    console.log(
      `  run ${i + 1}: heap +${(res.modelHeap / 1e6).toFixed(1)}MB · create ${res.creationMs.toFixed(1)}ms · mounted ${res.mountedCount} · reactive=${res.reactive} · src=${res.heapSource}` +
        (res.materializedHeap != null
          ? ` · materialized +${(res.materializedHeap / 1e6).toFixed(1)}MB`
          : ''),
    );
    runs.push(res);
  }

  if (!runs.length) {
    return { arm: arm.name, failed: true, oomEvents, extrapolated };
  }

  const scale = extrapolated ? FULL_ROWS / rowCount : 1;
  const medHeap = median(runs.map((r) => r.modelHeap));
  const medCreate = median(runs.map((r) => r.creationMs));
  const measuredCells = runs[0].cellCount;
  const bytesPerCell = medHeap / measuredCells;
  const medMountedCount = median(runs.map((r) => r.mountedCount));
  const allReactive = arm.reactive ? runs.every((r) => r.reactive) : null;
  const matHeaps = runs.map((r) => r.materializedHeap).filter((x) => x != null);
  const medMaterialized = matHeaps.length ? median(matHeaps) : null;

  return {
    arm: arm.name,
    failed: false,
    measuredCells,
    extrapolated,
    scale,
    oomEvents,
    medHeapBytes: medHeap,
    medHeapExtrapolatedBytes: medHeap * scale,
    medCreateMs: medCreate,
    medCreateExtrapolatedMs: medCreate * scale,
    bytesPerCell,
    medMaterializedBytes: medMaterialized,
    bytesPerCellMaterialized:
      medMaterialized != null ? medMaterialized / measuredCells : null,
    medMountedCount,
    reactive: allReactive,
    heapSource: runs[0].heapSource,
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
  });

  const results = [];
  for (const arm of ARMS) {
    results.push(await runArm(browser, arm));
  }
  await browser.close();

  console.log('\n================ MEDIAN RESULTS ================');
  const fmtMB = (b) => (b / 1e6).toFixed(1);
  for (const r of results) {
    if (r.failed) {
      console.log(`${r.arm}: FAILED (oomEvents=${r.oomEvents})`);
      continue;
    }
    const heapNote = r.extrapolated
      ? `${fmtMB(r.medHeapBytes)}MB @${r.measuredCells} → ${fmtMB(r.medHeapExtrapolatedBytes)}MB @100k (×${r.scale})`
      : `${fmtMB(r.medHeapBytes)}MB @100k`;
    const createNote = r.extrapolated
      ? `${r.medCreateMs.toFixed(1)}ms @${r.measuredCells} → ${r.medCreateExtrapolatedMs.toFixed(1)}ms @100k`
      : `${r.medCreateMs.toFixed(1)}ms @100k`;
    console.log(
      `${r.arm.padEnd(11)} | heap ${heapNote} | ${r.bytesPerCell.toFixed(0)} B/cell | create ${createNote} | mounted ${r.medMountedCount} | reactive=${r.reactive} | oom=${r.oomEvents}` +
        (r.medMaterializedBytes != null
          ? ` | materialized ${fmtMB(r.medMaterializedBytes)}MB (${r.bytesPerCellMaterialized.toFixed(0)} B/cell)`
          : ''),
    );
  }
  console.log(
    '\nJSON:\n' + JSON.stringify({ base: BASE, runs: RUNS, results }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
