<script setup lang="ts">
/**
 * Standalone demo: 20 columns × 1,000,000 rows (20,000,000 cells).
 *
 * The viewport renders FlyweightCell facades created per visible row — the
 * cells on screen are the only cell objects in existence. The observation
 * census (fine refs / block refs / formula computeds) is live in the header:
 * watch it stay tiny while you scroll a 20M-cell document.
 */
import { computed, onMounted, ref, shallowRef } from 'vue';
import './grid.css';
import {
  COLS,
  OVERSCAN,
  ROWS_1M,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  colLabel,
  displayOf,
} from './flyweight-logic';
import { FlyweightCell } from './model/FlyweightCell';
import { FlyweightSheet } from './model/FlyweightSheet';

const sheet = shallowRef<FlyweightSheet.Instance | null>(null);
const hasModel = ref(false);
const creationMs = ref(0);

// --- row windowing (same strategy as the reference grids, local copy) ---
const scrollEl = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);
const totalHeight = computed(() =>
  sheet.value ? sheet.value.rows * ROW_HEIGHT : 0,
);
const startRow = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN),
);
const endRow = computed(() =>
  sheet.value
    ? Math.min(sheet.value.rows, startRow.value + visibleCount + OVERSCAN * 2)
    : 0,
);
const offsetY = computed(() => startRow.value * ROW_HEIGHT);
function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop;
}

/** The ONLY cell objects in existence: facades for the visible window. */
const visibleRows = computed(() => {
  const s = sheet.value;
  if (!s) return [] as { r: number; cells: FlyweightCell.Instance[] }[];
  const rows: { r: number; cells: FlyweightCell.Instance[] }[] = [];
  for (let r = startRow.value; r < endRow.value; r++) {
    const cells: FlyweightCell.Instance[] = new Array(COLS);
    for (let c = 0; c < COLS; c++) cells[c] = new FlyweightCell.Class(s, r, c);
    rows.push({ r, cells });
  }
  return rows;
});

// --- observation census (polled — it's diagnostics, not model state) ---
const census = ref({
  fineRefs: 0,
  blockRefs: 0,
  formulaComputeds: 0,
  adHocFormulas: 0,
});
function pollCensus() {
  if (sheet.value) census.value = sheet.value.stats();
}
onMounted(() => {
  setInterval(pollCensus, 500);
});

// --- totals bar: live ad-hoc formulas over the FULL 1M-row data columns ---
const totals = computed(() => {
  const s = sheet.value;
  if (!s) return [];
  return [
    { label: `SUM(A1:A${s.rows})`, c: s.liveFormula(`SUM(A1:A${s.rows})`) },
    {
      label: `AVERAGE(B1:B${s.rows})`,
      c: s.liveFormula(`AVERAGE(B1:B${s.rows})`),
    },
    { label: `SUM(D1:D${s.rows})`, c: s.liveFormula(`SUM(D1:D${s.rows})`) },
  ];
});

function createModel() {
  editing.value = null;
  const t0 = performance.now();
  const s = new FlyweightSheet.Class(ROWS_1M, COLS);
  creationMs.value = performance.now() - t0;
  sheet.value = s;
  hasModel.value = true;
  pollCensus();
  // eslint-disable-next-line no-console
  console.log(
    `[flyweight] created ${(ROWS_1M * COLS).toLocaleString()} cells in ${creationMs.value.toFixed(1)}ms`,
  );
}

// --- click-to-edit ---
const editing = ref<{ r: number; c: number } | null>(null);
const draft = ref('');
const isEditing = (r: number, c: number) =>
  !!editing.value && editing.value.r === r && editing.value.c === c;
function edit(cell: FlyweightCell.Instance) {
  editing.value = { r: cell.row, c: cell.col };
  draft.value = cell.source;
}
function commitEdit() {
  const e = editing.value;
  if (e && sheet.value) sheet.value.write(e.r, e.c, draft.value);
  editing.value = null;
}
function activeRef() {
  const e = editing.value;
  return e ? colLabel(e.c) + (e.r + 1) : '';
}
function activeSource() {
  const e = editing.value;
  return e && sheet.value ? sheet.value.sourceAt(e.r, e.c) : '';
}

document.title = 'Flyweight Grid · 20×1,000,000 (ivue sketch)';
</script>

<template>
  <section class="fw-page">
    <header>
      <h1>Flyweight Grid — 20 × 1,000,000 <small>(20,000,000 cells)</small></h1>
      <p class="fw-sub">
        Columnar ground truth · flyweight cell facades · two-tier discovered
        dependency graph. Google Sheets caps at 10M cells — this document cannot
        exist there. The census below is the law, live:
        <em>cost ∝ observed, never ∝ existing.</em>
      </p>
    </header>

    <div class="fw-controls">
      <button class="fw-btn" @click="createModel()">
        create model (20M cells)
      </button>
      <template v-if="hasModel">
        <span class="fw-stat"
          ><b>{{ (ROWS_1M * COLS).toLocaleString() }}</b> cells</span
        >
        <span class="fw-stat"
          ><b>{{ creationMs.toFixed(1) }}</b> ms create</span
        >
        <span class="fw-stat"
          ><b>{{ census.fineRefs.toLocaleString() }}</b> fine refs</span
        >
        <span class="fw-stat"
          ><b>{{ census.blockRefs.toLocaleString() }}</b> block refs</span
        >
        <span class="fw-stat"
          ><b>{{ census.formulaComputeds.toLocaleString() }}</b> formula
          computeds</span
        >
      </template>
    </div>

    <template v-if="hasModel && sheet">
      <!-- Live totals over the FULL million rows (block tier: 245 edges each) -->
      <div class="fw-totals">
        <span v-for="t in totals" :key="t.label" class="fw-total">
          <code>{{ t.label }}</code> = <b>{{ displayOf(t.c.value) }}</b>
        </span>
      </div>

      <div class="fx-bar">
        <span class="fx-name">{{ activeRef() || 'fx' }}</span>
        <span class="fx-val">{{
          activeSource() || 'click a cell to see + edit its formula'
        }}</span>
      </div>

      <div ref="scrollEl" class="gc-grid-scroll" @scroll="onScroll">
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in COLS" :key="c" class="gc-cell gc-head-cell">
              {{ colLabel(c - 1) }}
            </div>
          </div>
          <div class="gc-viewport" :style="{ height: totalHeight + 'px' }">
            <div
              class="gc-rows"
              :style="{ transform: `translateY(${offsetY}px)` }"
            >
              <div v-for="row in visibleRows" :key="row.r" class="gc-row">
                <div class="gc-rownum">{{ (row.r + 1).toLocaleString() }}</div>
                <div
                  v-for="cell in row.cells"
                  :key="cell.col"
                  class="gc-cell"
                  :class="cell.cssClass"
                  :title="cell.source"
                  @click="edit(cell)"
                >
                  <input
                    v-if="isEditing(cell.row, cell.col)"
                    class="gc-edit"
                    v-model="draft"
                    autofocus
                    @blur="commitEdit"
                    @keyup.enter="commitEdit"
                  />
                  <template v-else>{{ cell.display }}</template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="fw-empty">
      No model yet — click <b>create model (20M cells)</b>. Creation fills
      ~95&nbsp;MB of typed arrays and allocates <b>zero</b> reactive state.
    </div>
  </section>
</template>
