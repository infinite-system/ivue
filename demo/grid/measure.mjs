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
 *   → (reactive arms) touch every cell once → gc×3 → fully-materialized heap
 *
 * The cell count is PARAMETRIZED so every configuration stays reproducible:
 *
 *   node demo/grid/measure.mjs [baseURL] [rows]
 *   node demo/grid/measure.mjs http://localhost:5180          # 2,500 rows = 100k cells (default)
 *   node demo/grid/measure.mjs http://localhost:5180 25000    # 25,000 rows = 1M cells
 *   GRID_ROWS=25000 node demo/grid/measure.mjs                # same via env var
 *
 * If an arm OOMs / crashes the tab at the target size, that is REPORTED as a
 * result, its actual ceiling is located by bisection (creation-only probes),
 * and the full protocol re-runs at ~90% of the ceiling with a clearly-labeled
 * linear extrapolation back to the target.
 */
import { createRequire } from 'module';

const PW_BASE =
  '/home/parallels/dev/realized/.claude/worktrees/convert-player-to-ivue2/app/package.json';
const require = createRequire(PW_BASE);
const { chromium } = require('playwright');

const BASE =
  process.argv[2] || process.env.GRID_BASE || 'http://localhost:5180';
const COLS = 40;
const TARGET_ROWS = parseInt(
  process.argv[3] || process.env.GRID_ROWS || '2500',
  10,
);
const TARGET_CELLS = TARGET_ROWS * COLS;
const RUNS = 3;

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
  const heapLimit = await page.evaluate(() =>
    performance && performance.memory
      ? performance.memory.jsHeapSizeLimit
      : null,
  );

  // create the model (a tab crash mid-evaluate throws — treat as OOM)
  try {
    await page.evaluate((rc) => window.__grid.createModel(rc), rowCount);
    await page.waitForFunction(() => window.__grid.hasModel(), {
      timeout: 180000,
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
  await sleep(400); // let the reactive render settle
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
  let materializeOom = false;
  if (arm.reactive) {
    try {
      await page.evaluate(() => window.__grid.materializeAll());
      await sleep(300);
      await gc(page);
      const mat = await readHeap(page, cdp);
      materializedHeap = mat.bytes - baseline.bytes;
    } catch (e) {
      if (crashed) materializeOom = true;
      else throw e;
    }
  }

  await context.close();
  return {
    oom: false,
    baseline: baseline.bytes,
    after: after.bytes,
    heapLimit,
    modelHeap,
    materializedHeap,
    materializeOom,
    creationMs,
    mountedCount,
    reactive,
    heapSource: baseline.source,
    cellCount,
    errors,
  };
}

/** Creation-only probe: does the arm survive building rowCount rows? */
async function probeCreation(browser, arm, rowCount) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let crashed = false;
  page.on('crash', () => {
    crashed = true;
  });
  try {
    await page.goto(BASE + arm.path, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => window.__grid && typeof window.__grid.createModel === 'function',
      { timeout: 20000 },
    );
    await page.evaluate((rc) => window.__grid.createModel(rc), rowCount);
    await page.waitForFunction(() => window.__grid.hasModel(), {
      timeout: 180000,
    });
    await sleep(300);
  } catch {
    crashed = true;
  }
  await context.close();
  return !crashed;
}

/**
 * Bisect the crash ceiling for an arm known to fail at `failedRows`.
 * Resolution ~5% of failedRows. Returns { maxGoodRows, minBadRows }.
 */
async function findCeiling(browser, arm, failedRows) {
  console.log(
    `  bisecting crash ceiling for ${arm.name} (fails at ${failedRows * COLS} cells)…`,
  );
  let hi = failedRows; // known bad
  let probe = Math.floor(failedRows / 2);
  while (probe > 0 && !(await probeCreation(browser, arm, probe))) {
    console.log(`    ${probe * COLS} cells: CRASH`);
    hi = probe;
    probe = Math.floor(probe / 2);
  }
  const lo0 = probe; // known good (possibly 0)
  console.log(`    ${lo0 * COLS} cells: ok`);
  let lo = lo0;
  const res = Math.max(1, Math.floor(failedRows * 0.05));
  while (hi - lo > res) {
    const mid = Math.floor((lo + hi) / 2);
    const ok = await probeCreation(browser, arm, mid);
    console.log(`    ${mid * COLS} cells: ${ok ? 'ok' : 'CRASH'}`);
    if (ok) lo = mid;
    else hi = mid;
  }
  return { maxGoodRows: lo, minBadRows: hi };
}

async function runArm(browser, arm) {
  console.log(
    `\n=== arm: ${arm.name} (${arm.path}) @ ${TARGET_CELLS.toLocaleString()} cells ===`,
  );

  let rowCount = TARGET_ROWS;
  let cellCount = rowCount * COLS;
  let extrapolated = false;
  let oomEvents = 0;
  let ceiling = null;
  const runs = [];

  for (let i = 0; i < RUNS; i++) {
    let res = await runOnce(browser, arm, rowCount, cellCount);
    if (res.oom) {
      oomEvents++;
      console.log(
        `  run ${i + 1}: OOM/crash at ${cellCount} cells — THIS IS A RESULT`,
      );
      if (!ceiling) {
        ceiling = await findCeiling(browser, arm, rowCount);
        console.log(
          `  ceiling: ok at ${ceiling.maxGoodRows * COLS} cells, crashes at ${ceiling.minBadRows * COLS} cells`,
        );
        // Re-run the protocol at ~90% of the ceiling for a scalable number.
        rowCount = Math.max(1, Math.floor(ceiling.maxGoodRows * 0.9));
        cellCount = rowCount * COLS;
        extrapolated = true;
        console.log(
          `  re-running protocol at ${cellCount} cells (~90% of ceiling)`,
        );
      }
      res = await runOnce(browser, arm, rowCount, cellCount);
      if (res.oom) {
        oomEvents++;
        console.log(
          `  run ${i + 1}: OOM again at ${cellCount} — skipping this run`,
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
          : res.materializeOom
            ? ' · materialized: OOM'
            : ''),
    );
    runs.push(res);
  }

  if (!runs.length) {
    return { arm: arm.name, failed: true, oomEvents, extrapolated, ceiling };
  }

  const scale = extrapolated ? TARGET_ROWS / rowCount : 1;
  const medHeap = median(runs.map((r) => r.modelHeap));
  const medCreate = median(runs.map((r) => r.creationMs));
  const measuredCells = runs[0].cellCount;
  const bytesPerCell = medHeap / measuredCells;
  const medMountedCount = median(runs.map((r) => r.mountedCount));
  const allReactive = arm.reactive ? runs.every((r) => r.reactive) : null;
  const matHeaps = runs.map((r) => r.materializedHeap).filter((x) => x != null);
  const medMaterialized = matHeaps.length ? median(matHeaps) : null;
  const materializeOoms = runs.filter((r) => r.materializeOom).length;

  return {
    arm: arm.name,
    failed: false,
    targetCells: TARGET_CELLS,
    measuredCells,
    extrapolated,
    scale,
    oomEvents,
    ceiling: ceiling
      ? {
          maxGoodCells: ceiling.maxGoodRows * COLS,
          minBadCells: ceiling.minBadRows * COLS,
        }
      : null,
    medHeapBytes: medHeap,
    medHeapExtrapolatedBytes: medHeap * scale,
    medCreateMs: medCreate,
    medCreateExtrapolatedMs: medCreate * scale,
    bytesPerCell,
    medMaterializedBytes: medMaterialized,
    bytesPerCellMaterialized:
      medMaterialized != null ? medMaterialized / measuredCells : null,
    materializeOoms,
    medMountedCount,
    reactive: allReactive,
    heapSource: runs[0].heapSource,
    heapLimitBytes: runs[0].heapLimit,
  };
}

async function main() {
  console.log(
    `grid measure: ${TARGET_ROWS.toLocaleString()} rows × ${COLS} cols = ${TARGET_CELLS.toLocaleString()} cells · ${RUNS} runs/arm · ${BASE}`,
  );
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
      console.log(
        `${r.arm}: FAILED (oomEvents=${r.oomEvents})` +
          (r.ceiling
            ? ` ceiling: ok@${r.ceiling.maxGoodRows * COLS} / crash@${r.ceiling.minBadRows * COLS}`
            : ''),
      );
      continue;
    }
    const heapNote = r.extrapolated
      ? `${fmtMB(r.medHeapBytes)}MB @${r.measuredCells} → ~${fmtMB(r.medHeapExtrapolatedBytes)}MB @${r.targetCells} (extrapolated ×${r.scale.toFixed(2)})`
      : `${fmtMB(r.medHeapBytes)}MB @${r.measuredCells}`;
    const createNote = r.extrapolated
      ? `${r.medCreateMs.toFixed(1)}ms @${r.measuredCells} → ~${r.medCreateExtrapolatedMs.toFixed(1)}ms @${r.targetCells} (extrapolated)`
      : `${r.medCreateMs.toFixed(1)}ms @${r.measuredCells}`;
    console.log(
      `${r.arm.padEnd(11)} | heap ${heapNote} | ${r.bytesPerCell.toFixed(0)} B/cell | create ${createNote} | mounted ${r.medMountedCount} | reactive=${r.reactive} | oom=${r.oomEvents}` +
        (r.ceiling
          ? ` | CEILING: ok@${r.ceiling.maxGoodCells} crash@${r.ceiling.minBadCells}`
          : '') +
        (r.medMaterializedBytes != null
          ? ` | materialized ${fmtMB(r.medMaterializedBytes)}MB (${r.bytesPerCellMaterialized.toFixed(0)} B/cell)`
          : r.materializeOoms
            ? ' | materialized: OOM'
            : ''),
    );
  }
  console.log(
    '\nJSON:\n' +
      JSON.stringify(
        {
          base: BASE,
          rows: TARGET_ROWS,
          cols: COLS,
          cells: TARGET_CELLS,
          runs: RUNS,
          results,
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
