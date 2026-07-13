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
  const startedAt = performance.now();
  sheet = new FlyweightSheet.Class(ROWS, COLS);
  creationMs = performance.now() - startedAt;
  // eslint-disable-next-line no-console
  console.log(
    `[flyweight] created ${(ROWS * COLS).toLocaleString()} cells in ${creationMs.toFixed(1)}ms`,
  );
});

const num = (cellValue: CellValue): number => {
  expect(typeof cellValue).toBe('number');
  return cellValue as number;
};

/** Restore a data cell to its deterministic seed value. */
const restoreSeed = (row: number, col: number) => {
  const seedValue = numDataValue(row, col);
  sheet.write(row, col, seedValue === null ? '' : String(seedValue));
};

describe('FlyweightSheet @ 20 × 1,000,000 (20M cells)', () => {
  it('creates the 20M-cell model with ZERO reactive allocations', () => {
    const stats = sheet.stats();
    expect(stats.fineRefs).toBe(0);
    expect(stats.blockRefs).toBe(0);
    expect(stats.formulaComputeds).toBe(0);
    // Generous CI bound — locally this is well under a second.
    expect(creationMs).toBeLessThan(5000);
  });

  it('writes to unobserved cells allocate nothing and notify no one', () => {
    const statsBefore = sheet.stats();
    sheet.write(500_000, 0, '123.45');
    sheet.write(700_000, 2, 'hello');
    expect(sheet.rawAt(500_000, 0)).toBe(123.45);
    expect(sheet.rawAt(700_000, 2)).toBe('hello');
    expect(sheet.stats()).toEqual(statsBefore);
    // Restore the seed values for later aggregate checks.
    restoreSeed(500_000, 0);
    restoreSeed(700_000, 2);
  });

  it('point observation is O(observed): only watched cells cost and notify', () => {
    let observerRuns = 0;
    const stopObserver = watchEffect(
      () => {
        void sheet.valueAt(10, 0);
        observerRuns++;
      },
      { flush: 'sync' },
    );
    expect(observerRuns).toBe(1);
    const fineRefsAfterObserve = sheet.stats().fineRefs;
    expect(fineRefsAfterObserve).toBeGreaterThan(0);

    sheet.write(10, 0, '42'); // observed → notifies
    expect(observerRuns).toBe(2);

    sheet.write(999_999, 0, '7'); // unobserved → silent, no new refs
    expect(observerRuns).toBe(2);
    expect(sheet.stats().fineRefs).toBe(fineRefsAfterObserve);
    stopObserver();
  });

  it('evaluates real formulas through fast-formula-parser', () => {
    const valueA = num(sheet.valueAt(0, 0));
    const valueB = num(sheet.valueAt(0, 1));
    expect(num(sheet.valueAt(0, 4))).toBeCloseTo(valueA + valueB, 10); // =A1+B1

    // =SUM(A1:D1) — small range, fine tier; blanks sum as 0.
    let manualSum = 0;
    for (let col = 0; col <= 3; col++) {
      const cellValue = sheet.rawAt(0, col);
      if (typeof cellValue === 'number') manualSum += cellValue;
    }
    expect(num(sheet.valueAt(0, 6))).toBeCloseTo(manualSum, 10);

    // =IF(A1>0,B1,C1)
    const valueC = sheet.valueAt(0, 2);
    const expectedBranch = valueA > 0 ? valueB : valueC;
    expect(sheet.valueAt(0, 7)).toEqual(expectedBranch);

    // =H1*2 — formula-on-formula
    const valueH = sheet.valueAt(0, 7);
    if (typeof valueH === 'number') {
      expect(num(sheet.valueAt(0, 8))).toBeCloseTo(valueH * 2, 10);
    }

    // Running sum J: rows 0..3 (block starts at row 0 → =A1, then +A{row}).
    let runningSum = 0;
    for (let row = 0; row <= 3; row++) {
      const rowValueA = sheet.rawAt(row, 0);
      runningSum += typeof rowValueA === 'number' ? rowValueA : 0;
      expect(num(sheet.valueAt(row, 9))).toBeCloseTo(runningSum, 8);
    }
  });

  it('conditional dependencies SHIFT with the executed branch', () => {
    // Find a row where A > 0 so IF takes the B branch.
    let targetRow = -1;
    for (let row = 100; row < 200; row++) {
      const valueA = sheet.rawAt(row, 0);
      if (typeof valueA === 'number' && valueA > 0) {
        targetRow = row;
        break;
      }
    }
    expect(targetRow).toBeGreaterThan(-1);

    let recomputes = 0;
    const stopWatch = watch(
      () => sheet.valueAt(targetRow, 7), // =IF(A>0,B,C)
      () => recomputes++,
      { flush: 'sync' },
    );

    // A > 0 → tracked branch is B; editing C (dead branch) must NOT recompute.
    sheet.write(targetRow, 2, '111');
    expect(recomputes).toBe(0);
    // Editing B (live branch) recomputes.
    sheet.write(targetRow, 1, '222');
    expect(recomputes).toBe(1);

    // Flip the condition: A negative → branch shifts to C.
    sheet.write(targetRow, 0, '-5');
    expect(recomputes).toBe(2);
    // Now B is the dead branch…
    sheet.write(targetRow, 1, '333');
    expect(recomputes).toBe(2);
    // …and C is live.
    sheet.write(targetRow, 2, '444');
    expect(recomputes).toBe(3);

    // traceDeps agrees (1-based): {A, C} while A<0.
    const dependencies = sheet
      .traceDeps(targetRow + 1, 8)
      .map(([depRow, depCol]) => `${depRow},${depCol}`)
      .sort();
    expect(dependencies).toContain(`${targetRow + 1},1`); // A
    expect(dependencies).toContain(`${targetRow + 1},3`); // C
    expect(dependencies).not.toContain(`${targetRow + 1},2`); // B (dead)
    stopWatch();
  });

  it('a 1M-cell range costs O(blocks): 245 edges, not 1,000,000', () => {
    const statsBefore = sheet.stats();
    const total = sheet.liveFormula(`SUM(A1:A${ROWS})`);

    let recomputes = 0;
    const stopWatch = watch(total, () => recomputes++, { flush: 'sync' });

    // Correct against a manual raw scan.
    let manualSum = 0;
    for (let row = 0; row < ROWS; row++) {
      const cellValue = sheet.rawAt(row, 0);
      if (typeof cellValue === 'number') manualSum += cellValue;
    }
    expect(num(total.value)).toBeCloseTo(manualSum, 6);

    const statsAfter = sheet.stats();
    const expectedBlocks = Math.ceil(ROWS / BLOCK_ROWS); // 245
    expect(statsAfter.blockRefs - statsBefore.blockRefs).toBe(expectedBlocks);
    // Column A is pure data — the giant range materialized NO formula
    // computeds and NO fine refs.
    expect(statsAfter.formulaComputeds).toBe(statsBefore.formulaComputeds);
    expect(statsAfter.fineRefs).toBe(statsBefore.fineRefs);

    // In-range write → exactly one recompute, correct delta.
    const originalValue = sheet.rawAt(123_456, 0);
    const originalNumber =
      typeof originalValue === 'number' ? originalValue : 0;
    sheet.write(123_456, 0, String(originalNumber + 1000));
    expect(recomputes).toBe(1);
    expect(num(total.value)).toBeCloseTo(manualSum + 1000, 6);

    // Write to ANOTHER column → no recompute (blocks are per-column).
    sheet.write(123_456, 1, '9');
    expect(recomputes).toBe(1);
    stopWatch();
    restoreSeed(123_456, 0);
  });

  it('derived changes propagate to block subscribers (the bridge)', () => {
    // SUM over 200 FORMULA cells (E = =A+B) → coarse tier (200 > 64).
    // Rows 201–400: untouched by earlier tests, so the materialization
    // census is exact.
    const statsBefore = sheet.stats();
    const sumOfColumnE = sheet.liveFormula('SUM(E201:E400)');

    let recomputes = 0;
    const stopWatch = watch(sumOfColumnE, () => recomputes++, {
      flush: 'sync',
    });

    let manualSum = 0;
    for (let row = 200; row < 400; row++) {
      const valueA = sheet.rawAt(row, 0);
      const valueB = sheet.rawAt(row, 1);
      manualSum +=
        (typeof valueA === 'number' ? valueA : 0) +
        (typeof valueB === 'number' ? valueB : 0);
    }
    expect(num(sumOfColumnE.value)).toBeCloseTo(manualSum, 6);

    // Transitive observation, priced: exactly the 200 formulas materialized.
    const statsAfter = sheet.stats();
    expect(statsAfter.formulaComputeds - statsBefore.formulaComputeds).toBe(
      200,
    );

    // Edit an INPUT (column A, outside the E range): A250 → E250 → block →
    // SUM recomputes with the correct new total. No fine edge from SUM to A.
    const originalValue = sheet.rawAt(249, 0);
    const originalNumber =
      typeof originalValue === 'number' ? originalValue : 0;
    sheet.write(249, 0, String(originalNumber + 500));
    expect(recomputes).toBeGreaterThanOrEqual(1);
    expect(num(sumOfColumnE.value)).toBeCloseTo(manualSum + 500, 6);
    stopWatch();
    restoreSeed(249, 0);
  });

  it('cycles resolve to #REF!, not a stack overflow', () => {
    sheet.write(900_000, 0, '=B900001');
    sheet.write(900_000, 1, '=A900001');
    const cellValue = sheet.valueAt(900_000, 0);
    expect(isFormulaError(cellValue)).toBe(true);
    sheet.write(900_000, 0, '');
    sheet.write(900_000, 1, '');
  });

  it('kind transitions keep observers correct (number → formula → text)', () => {
    const seenValues: CellValue[] = [];
    const stopWatch = watch(
      () => sheet.valueAt(42, 10), // K43 — a data cell
      (cellValue) => seenValues.push(cellValue),
      { flush: 'sync' },
    );
    sheet.write(42, 10, '5');
    sheet.write(42, 10, '=A43+1');
    const valueA = sheet.rawAt(42, 0);
    if (typeof valueA === 'number') {
      expect(seenValues[seenValues.length - 1]).toBeCloseTo(valueA + 1, 10);
    }
    sheet.write(42, 10, 'plain text');
    expect(seenValues[seenValues.length - 1]).toBe('plain text');
    stopWatch();
    sheet.write(42, 10, '5');
  });

  it('the facade is a true flyweight: three own fields, fully live', () => {
    const cell = new FlyweightCell.Class(sheet, 0, 4); // E1 = =A1+B1
    const valueA = num(sheet.valueAt(0, 0));
    const valueB = num(sheet.valueAt(0, 1));
    expect(num(cell.value as CellValue)).toBeCloseTo(valueA + valueB, 10);
    expect(cell.isFormula).toBe(true);
    expect(typeof cell.display).toBe('string');

    // Flyweight-ness: reads added NO own string-keyed state to the instance.
    const ownProperties = Object.getOwnPropertyNames(cell);
    expect(ownProperties.sort()).toEqual(['col', 'row', 'sheet']);

    // Live through the facade: edit an input, facade value follows.
    let observerRuns = 0;
    const stopWatch = watch(
      () => cell.value,
      () => observerRuns++,
      { flush: 'sync' },
    );
    const originalValue = sheet.rawAt(0, 0);
    const originalNumber =
      typeof originalValue === 'number' ? originalValue : 0;
    cell.sheet.write(0, 0, String(originalNumber + 1));
    expect(observerRuns).toBe(1);
    stopWatch();
    restoreSeed(0, 0);
  });

  it('viewport eviction releases far rows; kept + re-observed rows stay correct', () => {
    // Materialize formulas in two far-apart bands.
    const nearbyValueE = num(sheet.valueAt(1000, 4)); // E1001 (band A: rows ~1000)
    void sheet.valueAt(800_000, 4); // E800001 (band B: far away)
    const computedsBeforeEvict = sheet.stats().formulaComputeds;

    // Keep band A (with margin); band B must be released.
    const releasedCount = sheet.evictOutsideRows(500, 2000);
    expect(releasedCount).toBeGreaterThan(0);
    expect(sheet.stats().formulaComputeds).toBeLessThan(computedsBeforeEvict);

    // KEPT cell still live: its input edit still propagates.
    let observerRuns = 0;
    const stopWatch = watch(
      () => sheet.valueAt(1000, 4),
      () => observerRuns++,
      { flush: 'sync' },
    );
    const originalNearby = sheet.rawAt(1000, 0);
    const originalNearbyNumber =
      typeof originalNearby === 'number' ? originalNearby : 0;
    sheet.write(1000, 0, String(originalNearbyNumber + 3));
    expect(observerRuns).toBe(1);
    expect(num(sheet.valueAt(1000, 4))).toBeCloseTo(nearbyValueE + 3, 8);
    stopWatch();
    restoreSeed(1000, 0);

    // RELEASED cell re-materializes fresh and CORRECT — including a write
    // that happened while it was unobserved (peek-only bump hit nothing).
    const originalFarA = sheet.rawAt(800_000, 0);
    const originalFarNumber =
      typeof originalFarA === 'number' ? originalFarA : 0;
    sheet.write(800_000, 0, String(originalFarNumber + 7));
    const farValueB = sheet.rawAt(800_000, 1);
    const farNumberB = typeof farValueB === 'number' ? farValueB : 0;
    expect(num(sheet.valueAt(800_000, 4))).toBeCloseTo(
      originalFarNumber + 7 + farNumberB,
      8,
    );
    restoreSeed(800_000, 0);
  });

  it('release drops the overlay; ground truth and correctness survive', () => {
    const statsBefore = sheet.stats();
    expect(
      statsBefore.fineRefs +
        statsBefore.blockRefs +
        statsBefore.formulaComputeds,
    ).toBeGreaterThan(0);
    sheet.releaseAll();
    const statsAfter = sheet.stats();
    expect(statsAfter.fineRefs).toBe(0);
    expect(statsAfter.blockRefs).toBe(0);
    expect(statsAfter.formulaComputeds).toBe(0);
    // Re-observation re-materializes correctly.
    const valueA = num(sheet.valueAt(0, 0));
    const valueB = num(sheet.valueAt(0, 1));
    expect(num(sheet.valueAt(0, 4))).toBeCloseTo(valueA + valueB, 10);
    expect(sheet.stats().formulaComputeds).toBeGreaterThan(0);
  });
});
