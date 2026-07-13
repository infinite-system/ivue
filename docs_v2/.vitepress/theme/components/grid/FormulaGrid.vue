<script setup lang="ts">
/**
 * The formula grid, embedded live in the docs.
 *
 * The MODEL is imported from the playground's `formula-grid` example unchanged — `Sheet` (the one
 * shared parser + O(1) cellAt) and `FormulaCell` (ref-getter raw, ONE
 * computed value, plain getters) are the exact files the measured
 * RESULTS.md numbers were produced with. Only the docs chrome around them
 * lives here.
 *
 * `fast-formula-parser` (chevrotain-based, ~real bytes) is loaded via a
 * DYNAMIC import inside the click handler: `vitepress build` (SSR) never
 * executes it and readers who don't click never download it. Nothing runs
 * on mount.
 */
import { computed, ref, shallowRef } from 'vue';
import DemoBox from '../DemoBox.vue';
import '@examples/benchmarks/grid.css';
import '@examples/formula-grid/formula.css';
import {
  COLS,
  ROWS,
  ROWS_1M,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  OVERSCAN,
  colLabel,
} from '@examples/formula-grid/formula-logic';
import type { Sheet as SheetModel } from '@examples/formula-grid/Sheet';
import { useRowWindow } from '@examples/benchmarks/useRowWindow';

const sheet = shallowRef<SheetModel | null>(null);
const hasModel = ref(false);
const loading = ref(false);
const creationMs = ref(0);
const lastRows = ref(0);

const win = useRowWindow({
  rowCount: () => (sheet.value ? sheet.value.rows : 0),
  rowHeight: ROW_HEIGHT,
  viewportHeight: VIEWPORT_HEIGHT,
  overscan: OVERSCAN,
});
const { scrollEl } = win;

const modelCells = computed(() => (sheet.value ? sheet.value.rows * COLS : 0));
const mountedCells = computed(() => win.visibleRows.value.length * COLS);

async function create(rows: number) {
  loading.value = true;
  editing.value = null;
  // The parser ships in its own lazy chunk; first click pays it once.
  const { Sheet } = await import('@examples/formula-grid/Sheet');
  const t0 = performance.now();
  const s = new Sheet(rows, COLS);
  creationMs.value = performance.now() - t0;
  sheet.value = s;
  lastRows.value = rows;
  hasModel.value = true;
  loading.value = false;
}

// --- click-to-edit + the fx bar (active cell's literal text + live deps) ---
const editing = ref<{ r: number; c: number } | null>(null);
const depsBump = ref(0);
const isEditing = (r: number, c: number) =>
  !!editing.value && editing.value.r === r && editing.value.c === c;
const edit = (r: number, c: number) => {
  editing.value = { r, c };
};
const commitEdit = () => {
  editing.value = null;
  depsBump.value++; // re-trace deps after an edit (traceDeps is not reactive)
};

const a1 = (r0: number, c0: number) => colLabel(c0) + (r0 + 1);

const activeCell = computed(() => {
  const e = editing.value;
  if (!e || !sheet.value) return null;
  return sheet.value.cellAt(e.r + 1, e.c + 1) ?? null;
});

/** The ACTIVE cell's live tracked dependency set, as A1 refs. This is the
 *  conditional-dependency proof, interactive: select I1 and flip A1's sign —
 *  the set shifts between {A1, C1} and {A1, B1}. */
const activeDeps = computed(() => {
  void depsBump.value;
  const e = editing.value;
  const s = sheet.value;
  if (!e || !s) return [];
  return s.traceDeps(e.r + 1, e.c + 1).map(([rr, cc]) => a1(rr - 1, cc - 1));
});
</script>

<template>
  <DemoBox
    title="The formula grid — real formulas, live"
    note="The model is the exact Sheet/FormulaCell code the measured numbers were produced with; the parser (fast-formula-parser, 280 Excel functions) loads on demand when you click. Live numbers are illustrative — the controlled gc-forced protocol lives in demo/formula/RESULTS.md."
  >
    <div class="d-row fg-controls">
      <button
        class="d-btn primary"
        type="button"
        :disabled="loading"
        @click="create(ROWS)"
      >
        {{ loading ? 'Loading parser…' : 'Create 100k cells' }}
      </button>
      <button
        class="d-btn"
        type="button"
        :disabled="loading"
        title="40 columns × 25,000 rows. ~68 MB of model — fine on a desktop browser."
        @click="create(ROWS_1M)"
      >
        Create 1M cells
      </button>
      <span v-if="hasModel" class="d-mono">
        {{ modelCells.toLocaleString() }} cells &middot; 52.5% live formulas
        &middot; created in {{ creationMs.toFixed(1) }} ms
      </span>
    </div>

    <p v-if="!hasModel" class="fg-hint">
      Nothing built yet. Every cell in columns E–J (and every odd column
      beyond) holds a real formula — <code>=A1+B1</code>,
      <code>=SUM(A1:D1)</code>, <code>=IF(A1&gt;0,B1,C1)</code>, a running
      sum — evaluated by a real parser, with the dependency graph discovered
      by Vue.
    </p>

    <template v-if="hasModel">
      <p class="fg-hint">
        Click a cell to edit its formula or value. Try it: set
        <strong>A1</strong> to <code>5000</code> and watch E1, G1, H1, I1 and
        the J column cascade. Select <strong>I1</strong> and flip A1's sign —
        the tracked dependency set shifts branches.
      </p>

      <!-- fx bar: active cell's literal text + its LIVE tracked deps -->
      <div class="fx-bar fg-fx">
        <span class="fx-name">{{
          editing ? a1(editing.r, editing.c) : 'fx'
        }}</span>
        <span v-if="activeCell" class="fx-val">{{
          activeCell.raw.value
        }}</span>
        <span v-else class="fx-empty">click a cell to see its formula</span>
        <span v-if="activeDeps.length" class="fg-deps d-mono">
          reads: {{ activeDeps.join(', ') }}
        </span>
      </div>

      <div
        ref="scrollEl"
        class="gc-grid-scroll"
        @scroll="win.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in COLS" :key="c" class="gc-cell gc-head-cell">
              {{ colLabel(c - 1) }}
            </div>
          </div>
          <div
            class="gc-viewport"
            :style="{ height: win.totalHeight.value + 'px' }"
          >
            <div
              class="gc-rows"
              :style="{ transform: `translateY(${win.offsetY.value}px)` }"
            >
              <div v-for="r in win.visibleRows.value" :key="r" class="gc-row">
                <div class="gc-rownum">{{ r + 1 }}</div>
                <div
                  v-for="(cell, ci) in sheet!.grid[r]"
                  :key="ci"
                  class="gc-cell"
                  :class="cell.cssClass"
                  data-grid-cell
                  :data-row="r"
                  :data-col="ci"
                  :title="cell.raw.value"
                  @click="edit(r, ci)"
                >
                  <input
                    v-if="isEditing(r, ci)"
                    class="gc-edit"
                    v-model="cell.raw.value"
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

      <div class="fg-mounted d-mono">
        {{ mountedCells.toLocaleString() }} DOM cells mounted (virtualized)
        out of {{ modelCells.toLocaleString() }} in the model — an unrendered
        formula cell never allocates its ref or computed.
      </div>
    </template>
  </DemoBox>
</template>

<style scoped>
.fg-controls {
  margin-top: 0;
}
.fg-hint {
  margin: 12px 0 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}
.fg-hint code {
  color: #a5b4fc;
  font-size: 0.8rem;
}
.fg-hint strong {
  color: #cbd5f0;
}
.fg-fx {
  margin-top: 14px;
  margin-bottom: 10px;
}
.fg-deps {
  margin-left: auto;
  color: #34d399 !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fg-mounted {
  margin-top: 8px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}
</style>
