/**
 * Structural proofs for the flyweight grid, run at the REAL scale the design
 * claims: 20 columns × 1,000,000 rows = 20,000,000 cells, real
 * fast-formula-parser. Each test pins one clause of the law:
 *
 *   "everything costs proportional to what's observed;
 *    nothing costs proportional to what exists."
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { watch, watchEffect } from 'vue';
import {
  BLOCK_ROWS,
  isFormulaError,
  numDataValue,
  type CellValue,
} from '../flyweight-logic';
import { FlyweightCell } from '../model/FlyweightCell';
import { FlyweightSheet } from '../model/FlyweightSheet';

const ROWS = 1_000_000;
const COLS = 20;

let sheet: FlyweightSheet.Instance;
let creationMs = 0;

beforeAll(() => {
  const t0 = performance.now();
  sheet = new FlyweightSheet.Class(ROWS, COLS);
  creationMs = performance.now() - t0;
  // eslint-disable-next-line no-console
  console.log(
    `[flyweight] created ${(ROWS * COLS).toLocaleString()} cells in ${creationMs.toFixed(1)}ms`,
  );
});

const num = (v: CellValue): number => {
  expect(typeof v).toBe('number');
  return v as number;
};

describe('FlyweightSheet @ 20 × 1,000,000 (20M cells)', () => {
  it('creates the 20M-cell model with ZERO reactive allocations', () => {
    const s = sheet.stats();
    expect(s.fineRefs).toBe(0);
    expect(s.blockRefs).toBe(0);
    expect(s.formulaComputeds).toBe(0);
    // Generous CI bound — locally this is well under a second.
    expect(creationMs).toBeLessThan(5000);
  });

  it('writes to unobserved cells allocate nothing and notify no one', () => {
    const before = sheet.stats();
    sheet.write(500_000, 0, '123.45');
    sheet.write(700_000, 2, 'hello');
    expect(sheet.rawAt(500_000, 0)).toBe(123.45);
    expect(sheet.rawAt(700_000, 2)).toBe('hello');
    expect(sheet.stats()).toEqual(before);
    // restore the numeric cell for later aggregate checks
    const orig = numDataValue(500_000, 0);
    sheet.write(500_000, 0, orig === null ? '' : String(orig));
    sheet.write(
      700_000,
      2,
      (() => {
        const o = numDataValue(700_000, 2);
        return o === null ? '' : String(o);
      })(),
    );
  });

  it('point observation is O(observed): only watched cells cost and notify', () => {
    let runs = 0;
    const stop = watchEffect(
      () => {
        void sheet.valueAt(10, 0);
        runs++;
      },
      { flush: 'sync' },
    );
    expect(runs).toBe(1);
    const fineAfterObserve = sheet.stats().fineRefs;
    expect(fineAfterObserve).toBeGreaterThan(0);

    sheet.write(10, 0, '42'); // observed → notifies
    expect(runs).toBe(2);

    sheet.write(999_999, 0, '7'); // unobserved → silent, no new refs
    expect(runs).toBe(2);
    expect(sheet.stats().fineRefs).toBe(fineAfterObserve);
    stop();
  });

  it('evaluates real formulas through fast-formula-parser', () => {
    const a = num(sheet.valueAt(0, 0));
    const b = num(sheet.valueAt(0, 1));
    expect(num(sheet.valueAt(0, 4))).toBeCloseTo(a + b, 10); // =A1+B1

    // =SUM(A1:D1) — small range, fine tier; blanks sum as 0.
    let manual = 0;
    for (let c = 0; c <= 3; c++) {
      const v = sheet.rawAt(0, c);
      if (typeof v === 'number') manual += v;
    }
    expect(num(sheet.valueAt(0, 6))).toBeCloseTo(manual, 10);

    // =IF(A1>0,B1,C1)
    const cVal = sheet.valueAt(0, 2);
    const expected = a > 0 ? b : cVal;
    expect(sheet.valueAt(0, 7)).toEqual(expected);

    // =H1*2 — formula-on-formula
    const h = sheet.valueAt(0, 7);
    if (typeof h === 'number') {
      expect(num(sheet.valueAt(0, 8))).toBeCloseTo(h * 2, 10);
    }

    // running sum J: rows 0..3 (block starts at row 0 → =A1, then +A{r})
    let run = 0;
    for (let r = 0; r <= 3; r++) {
      const av = sheet.rawAt(r, 0);
      run += typeof av === 'number' ? av : 0;
      expect(num(sheet.valueAt(r, 9))).toBeCloseTo(run, 8);
    }
  });

  it('conditional dependencies SHIFT with the executed branch', () => {
    // Find a row where A > 0 so IF takes the B branch.
    let row = -1;
    for (let r = 100; r < 200; r++) {
      const v = sheet.rawAt(r, 0);
      if (typeof v === 'number' && v > 0) {
        row = r;
        break;
      }
    }
    expect(row).toBeGreaterThan(-1);

    let recomputes = 0;
    const stop = watch(
      () => sheet.valueAt(row, 7), // =IF(A>0,B,C)
      () => recomputes++,
      { flush: 'sync' },
    );

    // A > 0 → tracked branch is B; editing C (dead branch) must NOT recompute.
    sheet.write(row, 2, '111');
    expect(recomputes).toBe(0);
    // Editing B (live branch) recomputes.
    sheet.write(row, 1, '222');
    expect(recomputes).toBe(1);

    // Flip the condition: A negative → branch shifts to C.
    sheet.write(row, 0, '-5');
    expect(recomputes).toBe(2);
    // Now B is the dead branch…
    sheet.write(row, 1, '333');
    expect(recomputes).toBe(2);
    // …and C is live.
    sheet.write(row, 2, '444');
    expect(recomputes).toBe(3);

    // traceDeps agrees (1-based): {A, C} while A<0.
    const deps = sheet
      .traceDeps(row + 1, 8)
      .map(([r, c]) => `${r},${c}`)
      .sort();
    expect(deps).toContain(`${row + 1},1`); // A
    expect(deps).toContain(`${row + 1},3`); // C
    expect(deps).not.toContain(`${row + 1},2`); // B (dead)
    stop();
  });

  it('a 1M-cell range costs O(blocks): 245 edges, not 1,000,000', () => {
    const before = sheet.stats();
    const total = sheet.liveFormula(`SUM(A1:A${ROWS})`);

    let recomputes = 0;
    const stop = watch(total, () => recomputes++, { flush: 'sync' });

    // Correct against a manual raw scan.
    let manual = 0;
    for (let r = 0; r < ROWS; r++) {
      const v = sheet.rawAt(r, 0);
      if (typeof v === 'number') manual += v;
    }
    expect(num(total.value)).toBeCloseTo(manual, 6);

    const after = sheet.stats();
    const expectedBlocks = Math.ceil(ROWS / BLOCK_ROWS); // 245
    expect(after.blockRefs - before.blockRefs).toBe(expectedBlocks);
    // Column A is pure data — the giant range materialized NO formula
    // computeds and NO fine refs.
    expect(after.formulaComputeds).toBe(before.formulaComputeds);
    expect(after.fineRefs).toBe(before.fineRefs);

    // In-range write → exactly one recompute, correct delta.
    const old = sheet.rawAt(123_456, 0);
    const oldNum = typeof old === 'number' ? old : 0;
    sheet.write(123_456, 0, String(oldNum + 1000));
    expect(recomputes).toBe(1);
    expect(num(total.value)).toBeCloseTo(manual + 1000 - 0, 6);

    // Write to ANOTHER column → no recompute (blocks are per-column).
    sheet.write(123_456, 1, '9');
    expect(recomputes).toBe(1);
    stop();
    // restore
    sheet.write(123_456, 0, old === null ? '' : String(old));
  });

  it('derived changes propagate to block subscribers (the bridge)', () => {
    // SUM over 200 FORMULA cells (E = =A+B) → coarse tier (200 > 64).
    // Rows 201–400: untouched by earlier tests, so the materialization
    // census is exact.
    const before = sheet.stats();
    const sumE = sheet.liveFormula('SUM(E201:E400)');

    let recomputes = 0;
    const stop = watch(sumE, () => recomputes++, { flush: 'sync' });

    let manual = 0;
    for (let r = 200; r < 400; r++) {
      const a = sheet.rawAt(r, 0);
      const b = sheet.rawAt(r, 1);
      manual +=
        (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0);
    }
    expect(num(sumE.value)).toBeCloseTo(manual, 6);

    // Transitive observation, priced: exactly the 200 formulas materialized.
    const after = sheet.stats();
    expect(after.formulaComputeds - before.formulaComputeds).toBe(200);

    // Edit an INPUT (column A, outside the E range): A250 → E250 → block →
    // SUM recomputes with the correct new total. No fine edge from SUM to A.
    const old = sheet.rawAt(249, 0);
    const oldNum = typeof old === 'number' ? old : 0;
    sheet.write(249, 0, String(oldNum + 500));
    expect(recomputes).toBeGreaterThanOrEqual(1);
    expect(num(sumE.value)).toBeCloseTo(manual + 500, 6);
    stop();
    sheet.write(249, 0, old === null ? '' : String(old));
  });

  it('cycles resolve to #REF!, not a stack overflow', () => {
    sheet.write(900_000, 0, '=B900001');
    sheet.write(900_000, 1, '=A900001');
    const v = sheet.valueAt(900_000, 0);
    expect(isFormulaError(v)).toBe(true);
    sheet.write(900_000, 0, '');
    sheet.write(900_000, 1, '');
  });

  it('kind transitions keep observers correct (number → formula → text)', () => {
    const seen: CellValue[] = [];
    const stop = watch(
      () => sheet.valueAt(42, 10), // K43 — a data cell
      (v) => seen.push(v),
      { flush: 'sync' },
    );
    sheet.write(42, 10, '5');
    sheet.write(42, 10, '=A43+1');
    const a = sheet.rawAt(42, 0);
    if (typeof a === 'number') {
      expect(seen[seen.length - 1]).toBeCloseTo(a + 1, 10);
    }
    sheet.write(42, 10, 'plain text');
    expect(seen[seen.length - 1]).toBe('plain text');
    stop();
    sheet.write(42, 10, '5');
  });

  it('the facade is a true flyweight: three own fields, fully live', () => {
    const cell = new FlyweightCell.Class(sheet, 0, 4); // E1 = =A1+B1
    const a = num(sheet.valueAt(0, 0));
    const b = num(sheet.valueAt(0, 1));
    expect(num(cell.value as CellValue)).toBeCloseTo(a + b, 10);
    expect(cell.isFormula).toBe(true);
    expect(typeof cell.display).toBe('string');

    // Flyweight-ness: reads added NO own string-keyed state to the instance.
    const own = Object.getOwnPropertyNames(cell);
    expect(own.sort()).toEqual(['col', 'row', 'sheet']);

    // Live through the facade: edit an input, facade value follows.
    let runs = 0;
    const stop = watch(
      () => cell.value,
      () => runs++,
      { flush: 'sync' },
    );
    const old = sheet.rawAt(0, 0);
    const oldNum = typeof old === 'number' ? old : 0;
    cell.sheet.write(0, 0, String(oldNum + 1));
    expect(runs).toBe(1);
    stop();
    sheet.write(0, 0, old === null ? '' : String(old));
  });

  it('viewport eviction releases far rows; kept + re-observed rows stay correct', () => {
    // Materialize formulas in two far-apart bands.
    const nearE = num(sheet.valueAt(1000, 4)); // E1001 (band A: rows ~1000)
    void sheet.valueAt(800_000, 4); // E800001 (band B: far away)
    const beforeEvict = sheet.stats().formulaComputeds;

    // Keep band A (with margin); band B must be released.
    const released = sheet.evictOutsideRows(500, 2000);
    expect(released).toBeGreaterThan(0);
    expect(sheet.stats().formulaComputeds).toBeLessThan(beforeEvict);

    // KEPT cell still live: its input edit still propagates.
    let runs = 0;
    const stop = watch(
      () => sheet.valueAt(1000, 4),
      () => runs++,
      { flush: 'sync' },
    );
    const oldA = sheet.rawAt(1000, 0);
    const oldNum = typeof oldA === 'number' ? oldA : 0;
    sheet.write(1000, 0, String(oldNum + 3));
    expect(runs).toBe(1);
    expect(num(sheet.valueAt(1000, 4))).toBeCloseTo(nearE + 3, 8);
    stop();
    sheet.write(1000, 0, oldA === null ? '' : String(oldA));

    // RELEASED cell re-materializes fresh and CORRECT — including a write
    // that happened while it was unobserved (peek-only bump hit nothing).
    const oldFarA = sheet.rawAt(800_000, 0);
    const oldFarNum = typeof oldFarA === 'number' ? oldFarA : 0;
    sheet.write(800_000, 0, String(oldFarNum + 7));
    const farB = sheet.rawAt(800_000, 1);
    const farBNum = typeof farB === 'number' ? farB : 0;
    expect(num(sheet.valueAt(800_000, 4))).toBeCloseTo(
      oldFarNum + 7 + farBNum,
      8,
    );
    sheet.write(800_000, 0, oldFarA === null ? '' : String(oldFarA));
  });

  it('release drops the overlay; ground truth and correctness survive', () => {
    const s1 = sheet.stats();
    expect(s1.fineRefs + s1.blockRefs + s1.formulaComputeds).toBeGreaterThan(0);
    sheet.releaseAll();
    const s2 = sheet.stats();
    expect(s2.fineRefs).toBe(0);
    expect(s2.blockRefs).toBe(0);
    expect(s2.formulaComputeds).toBe(0);
    // Re-observation re-materializes correctly.
    const a = num(sheet.valueAt(0, 0));
    const b = num(sheet.valueAt(0, 1));
    expect(num(sheet.valueAt(0, 4))).toBeCloseTo(a + b, 10);
    expect(sheet.stats().formulaComputeds).toBeGreaterThan(0);
  });
});
