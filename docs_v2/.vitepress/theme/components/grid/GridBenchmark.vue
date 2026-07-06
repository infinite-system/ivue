<script setup lang="ts">
/**
 * The flagship grid benchmark, embedded live in the docs.
 *
 * This is a purpose-built docs widget, NOT the three standalone full-page
 * routes from `demo/grid/` stacked on top of each other. One shared control
 * panel builds all three models at once (from the same seeded data), a
 * comparison strip puts their creation time + measured heap side by side, and
 * a single arm-switcher shows one virtualized grid at a time — so the reader
 * compares numbers directly instead of scrolling between three giant tables.
 *
 * The three arms share every byte of logic except the per-cell model
 * (`cell-logic.ts`, `useRowWindow.ts`, `useGridArm.ts`, `grid.css` — all
 * ported unchanged or near-unchanged from `demo/grid/`). Model creation is
 * always behind an explicit click — nothing runs on mount, so this component
 * is cheap during SSR (`vitepress build`) and cheap on first paint.
 */
import { computed, ref } from 'vue';
import DemoBox from '../DemoBox.vue';
import './grid.css';
import { Cell } from './IvueCell';
import { createComposableCell } from './composableCell';
import { createPojoCell } from './pojoCell';
import {
  COLS,
  ROWS,
  ROWS_1M,
  colLabel,
  fmtSum,
  initialRaw,
  cssOf,
  displayOf,
  isNumberOf,
  numericOf,
} from './cell-logic';
import { useGridArm } from './useGridArm';

type Arm = 'composable' | 'ivue' | 'pojo';

const ARMS: Array<{ key: Arm; tag: string; label: string; accent: string }> = [
  { key: 'composable', tag: 'Arm A', label: 'Composable', accent: 'sky' },
  { key: 'ivue', tag: 'Arm B', label: 'ivue', accent: 'indigo' },
  { key: 'pojo', tag: 'Arm C', label: 'POJO floor', accent: 'slate' },
];

// Measured heap figures from demo/grid/RESULTS.md (median of 3 runs, headless
// Chromium, gc-forced reads). These are NOT computed live in the reader's
// browser — accurate heap deltas require `--js-flags=--expose-gc`, which a
// normal page load does not have. Quoted verbatim, keyed by the exact row
// count each button builds (ROWS → 100k, ROWS_1M → 1M).
const MEASURED_HEAP: Record<number, Record<Arm, string>> = {
  [ROWS]: { composable: '77.3 MB', ivue: '5.7 MB', pojo: '4.5 MB' },
  [ROWS_1M]: { composable: '757.7 MB', ivue: '41.7 MB', pojo: '40.5 MB' },
};

const activeArm = ref<Arm>('ivue');
const lastRowCount = ref<number | null>(null);

const composableG = useGridArm(
  (r, c) => createComposableCell(r, c, initialRaw(r, c)),
  (cell) => cell.numericValue.value,
);
const ivueG = useGridArm(
  (r, c) => new Cell.Class(r, c, initialRaw(r, c)),
  (cell) => cell.numericValue.value,
);
const pojoG = useGridArm(
  (r, c) => createPojoCell(r, c, initialRaw(r, c)),
  (cell) => numericOf(cell.raw),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const controllers: Record<Arm, any> = {
  composable: composableG,
  ivue: ivueG,
  pojo: pojoG,
};

// Only template-ref targets get destructured off each controller (skill
// rule) — distinct top-level names since three controllers coexist here.
const { scrollEl: composableScrollEl } = composableG;
const { scrollEl: ivueScrollEl } = ivueG;
const { scrollEl: pojoScrollEl } = pojoG;

const hasAny = computed(
  () =>
    composableG.hasModel.value || ivueG.hasModel.value || pojoG.hasModel.value,
);

function createAll(rowCount: number) {
  lastRowCount.value = rowCount;
  // Same order every time (A, B, C) — live numbers are illustrative, not the
  // controlled measurement (that lives in RESULTS.md, one fresh page load
  // per arm). See the note under the buttons.
  composableG.createModel(rowCount);
  ivueG.createModel(rowCount);
  pojoG.createModel(rowCount);
}

function heapFor(arm: Arm): string {
  if (!lastRowCount.value) return '—';
  return MEASURED_HEAP[lastRowCount.value]?.[arm] ?? '—';
}

// POJO has no getters at all — derived values are pure functions read at
// render time (this is the arm's whole point: zero reactive machinery).
const pojoDisp = (cell: { raw: string }) =>
  displayOf(cell.raw, isNumberOf(cell.raw), numericOf(cell.raw));
const pojoCls = (cell: { raw: string }) =>
  cssOf(isNumberOf(cell.raw), numericOf(cell.raw));
</script>

<template>
  <DemoBox
    title="Grid benchmark — one grid, three models"
    note="All three arms build from the same seeded 40-column data, at the same time, from the same button click — so every number below is directly comparable. This is a live, in-your-browser illustration; the controlled measurement (gc-forced heap reads, 3-run medians, one fresh page load per arm) lives in demo/grid/RESULTS.md."
  >
    <div class="gb-controls d-row">
      <button class="d-btn primary" type="button" @click="createAll(ROWS)">
        Create 100k (all 3 arms)
      </button>
      <button
        class="d-btn"
        type="button"
        title="Builds all three models at once. The composable arm alone costs ~758 MB at this size — combined peak is roughly 840 MB."
        @click="createAll(ROWS_1M)"
      >
        Create 1M (all 3 arms)
      </button>
      <span v-if="hasAny" class="d-mono gb-last-build">
        last build:
        {{ lastRowCount === ROWS_1M ? '1,000,000' : '100,000' }} cells &times; 3
        arms
      </span>
    </div>
    <p v-if="lastRowCount === ROWS_1M" class="gb-warning">
      ⚠ 1M cells &times; 3 arms in memory at once — mostly the composable arm's
      ~758&nbsp;MB. Fine on a modern desktop browser; may be heavy on a
      memory-constrained device.
    </p>
    <p v-if="!hasAny" class="gb-hint">
      Nothing built yet — click a button above.
    </p>

    <!-- Comparison strip: creation time + measured heap, side by side -->
    <div v-if="hasAny" class="gb-compare">
      <div
        v-for="a in ARMS"
        :key="a.key"
        class="gb-compare-item"
        :class="`gb-accent-${a.accent}`"
      >
        <div class="gb-compare-head">
          <span class="gb-tag">{{ a.tag }}</span>
          <span class="gb-label">{{ a.label }}</span>
        </div>
        <div class="gb-compare-num">
          {{ controllers[a.key].creationMs.value.toFixed(1)
          }}<span class="gb-unit">ms</span>
        </div>
        <div class="gb-compare-sub">
          to create
          {{ controllers[a.key].modelCells.value.toLocaleString() }} cells
        </div>
        <div class="gb-compare-heap">
          <span class="gb-heap-num">{{ heapFor(a.key) }}</span>
          <span class="gb-heap-label">measured heap &middot; RESULTS.md</span>
        </div>
      </div>
    </div>

    <!-- Arm switcher — only ONE grid is mounted below at a time -->
    <div v-if="hasAny" class="gb-tabs" role="tablist">
      <button
        v-for="a in ARMS"
        :key="a.key"
        class="gb-tab"
        :class="[{ active: activeArm === a.key }, `gb-accent-${a.accent}`]"
        type="button"
        role="tab"
        :aria-selected="activeArm === a.key"
        @click="activeArm = a.key"
      >
        {{ a.label }}
      </button>
      <span class="gb-tabs-hint">
        {{
          activeArm === 'pojo'
            ? 'read-only · no reactivity, by design'
            : 'click a cell to edit · scroll to virtualize'
        }}
      </span>
    </div>

    <!-- Grid viewport -->
    <div v-if="hasAny" class="gb-grid-wrap">
      <!-- Composable arm -->
      <div
        v-if="activeArm === 'composable'"
        ref="composableScrollEl"
        class="gc-grid-scroll"
        @scroll="composableG.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in COLS" :key="c" class="gc-cell gc-head-cell">
              {{ colLabel(c - 1) }}
            </div>
            <div class="gc-sum gc-head-cell">Σ</div>
          </div>
          <div
            class="gc-viewport"
            :style="{ height: composableG.totalHeight.value + 'px' }"
          >
            <div
              class="gc-rows"
              :style="{
                transform: `translateY(${composableG.offsetY.value}px)`,
              }"
            >
              <div
                v-for="r in composableG.visibleRows.value"
                :key="r"
                class="gc-row"
              >
                <div class="gc-rownum">{{ r + 1 }}</div>
                <div
                  v-for="(cell, ci) in composableG.model.value[r]"
                  :key="ci"
                  class="gc-cell"
                  :class="cell.cssClass.value"
                  data-grid-cell
                  @click="composableG.edit(r, ci)"
                >
                  <input
                    v-if="composableG.isEditing(r, ci)"
                    class="gc-edit"
                    v-model="cell.raw.value"
                    autofocus
                    @blur="composableG.commitEdit"
                    @keyup.enter="composableG.commitEdit"
                  />
                  <template v-else>{{ cell.display.value }}</template>
                </div>
                <div class="gc-sum">{{ fmtSum(composableG.rowSum(r)) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ivue arm -->
      <div
        v-else-if="activeArm === 'ivue'"
        ref="ivueScrollEl"
        class="gc-grid-scroll"
        @scroll="ivueG.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in COLS" :key="c" class="gc-cell gc-head-cell">
              {{ colLabel(c - 1) }}
            </div>
            <div class="gc-sum gc-head-cell">Σ</div>
          </div>
          <div
            class="gc-viewport"
            :style="{ height: ivueG.totalHeight.value + 'px' }"
          >
            <div
              class="gc-rows"
              :style="{ transform: `translateY(${ivueG.offsetY.value}px)` }"
            >
              <div v-for="r in ivueG.visibleRows.value" :key="r" class="gc-row">
                <div class="gc-rownum">{{ r + 1 }}</div>
                <div
                  v-for="(cell, ci) in ivueG.model.value[r]"
                  :key="ci"
                  class="gc-cell"
                  :class="cell.cssClass"
                  data-grid-cell
                  @click="ivueG.edit(r, ci)"
                >
                  <input
                    v-if="ivueG.isEditing(r, ci)"
                    class="gc-edit"
                    v-model="cell.raw.value"
                    autofocus
                    @blur="ivueG.commitEdit"
                    @keyup.enter="ivueG.commitEdit"
                  />
                  <template v-else>{{ cell.display }}</template>
                </div>
                <div class="gc-sum">{{ fmtSum(ivueG.rowSum(r)) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- POJO arm — display-only, non-reactive by design (no click-to-edit) -->
      <div
        v-else
        ref="pojoScrollEl"
        class="gc-grid-scroll"
        @scroll="pojoG.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in COLS" :key="c" class="gc-cell gc-head-cell">
              {{ colLabel(c - 1) }}
            </div>
            <div class="gc-sum gc-head-cell">Σ</div>
          </div>
          <div
            class="gc-viewport"
            :style="{ height: pojoG.totalHeight.value + 'px' }"
          >
            <div
              class="gc-rows"
              :style="{ transform: `translateY(${pojoG.offsetY.value}px)` }"
            >
              <div v-for="r in pojoG.visibleRows.value" :key="r" class="gc-row">
                <div class="gc-rownum">{{ r + 1 }}</div>
                <div
                  v-for="(cell, ci) in pojoG.model.value[r]"
                  :key="ci"
                  class="gc-cell"
                  :class="pojoCls(cell)"
                  data-grid-cell
                >
                  {{ pojoDisp(cell) }}
                </div>
                <div class="gc-sum">{{ fmtSum(pojoG.rowSum(r)) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="gb-mounted-note d-mono">
        {{ controllers[activeArm].mountedCells.value.toLocaleString() }} DOM
        cells mounted for this view (virtualized) out of
        {{ controllers[activeArm].modelCells.value.toLocaleString() }} in the
        model.
      </div>
    </div>
  </DemoBox>
</template>

<style scoped>
.gb-controls {
  margin-top: 0;
}
.gb-last-build {
  margin-left: 4px;
}
.gb-hint,
.gb-warning {
  margin: 12px 0 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--vp-c-text-3, #8b95b5);
}
.gb-warning {
  color: #f5a524;
}

.gb-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 18px;
}
.gb-compare-item {
  position: relative;
  padding: 12px 14px 13px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-left-width: 3px;
}
.gb-compare-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--vp-font-family-mono);
}
.gb-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #8b95b5;
}
.gb-label {
  font-size: 11.5px;
  font-weight: 650;
  color: #cbd5f0;
}
.gb-compare-num {
  margin-top: 6px;
  font-size: 1.55rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #fff;
  line-height: 1.15;
}
.gb-unit {
  margin-left: 3px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #8b95b5;
}
.gb-compare-sub {
  margin-top: 2px;
  font-size: 11px;
  color: #8b95b5;
}
.gb-compare-heap {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}
.gb-heap-num {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 1rem;
  font-weight: 700;
  color: #e2e8f6;
}
.gb-heap-label {
  display: block;
  margin-top: 1px;
  font-size: 9.5px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #6b7591;
}

.gb-accent-sky {
  border-left-color: #38bdf8;
}
.gb-accent-indigo {
  border-left-color: #818cf8;
}
.gb-accent-slate {
  border-left-color: #94a3b8;
}

.gb-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}
.gb-tab {
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 650;
  cursor: pointer;
  color: #9aa5c6;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.gb-tab:hover {
  color: #cbd5f0;
  transform: translateY(-1px);
}
.gb-tab.active.gb-accent-sky {
  color: #38bdf8;
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
}
.gb-tab.active.gb-accent-indigo {
  color: #818cf8;
  border-color: #818cf8;
  background: rgba(129, 140, 248, 0.14);
}
.gb-tab.active.gb-accent-slate {
  color: #cbd5e1;
  border-color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
}
.gb-tabs-hint {
  margin-left: auto;
  font-size: 11.5px;
  color: #6b7591;
}

.gb-grid-wrap {
  margin-top: 14px;
}
.gb-mounted-note {
  margin-top: 8px;
  font-size: 11px;
  color: #8b95b5;
}
</style>
