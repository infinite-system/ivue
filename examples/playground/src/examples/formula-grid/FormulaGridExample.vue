<script setup lang="ts">
// The playground route for the formula grid. The MODEL — Sheet (the one
// shared parser + O(1) cellAt) and FormulaCell (ref-getter raw, ONE
// computed value, plain getters) — is the exact code the measured
// RESULTS.md numbers were produced with; only this chrome differs.
// `fast-formula-parser` loads via a dynamic import inside the click
// handler, so the route costs nothing until you build a sheet.
import { computed, ref, shallowRef } from 'vue';
import '../benchmarks/grid.css';
import './formula.css';
import {
  COLS,
  ROWS,
  ROWS_1M,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  OVERSCAN,
  colLabel,
} from './formula-logic';
import type { Sheet as SheetModel } from './Sheet';
import { useRowWindow } from '../benchmarks/useRowWindow';

const sheet = shallowRef<SheetModel | null>(null);
const hasModel = ref(false);
const loading = ref(false);
const creationMs = ref(0);

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
  const { Sheet } = await import('./Sheet');
  const start = performance.now();
  const model = new Sheet(rows, COLS);
  creationMs.value = performance.now() - start;
  sheet.value = model;
  hasModel.value = true;
  loading.value = false;
}

// --- click-to-edit + the fx bar (active cell's literal text + live deps) ---
const editing = ref<{ r: number; c: number } | null>(null);
const depsBump = ref(0);
const isEditing = (row: number, col: number) =>
  !!editing.value && editing.value.r === row && editing.value.c === col;
const edit = (row: number, col: number) => {
  editing.value = { r: row, c: col };
};
const commitEdit = () => {
  editing.value = null;
  depsBump.value++; // re-trace deps after an edit (traceDeps is not reactive)
};

const a1 = (row0: number, col0: number) => colLabel(col0) + (row0 + 1);

const activeCell = computed(() => {
  const active = editing.value;
  if (!active || !sheet.value) return null;
  return sheet.value.cellAt(active.r + 1, active.c + 1) ?? null;
});

const activeDeps = computed(() => {
  void depsBump.value;
  const active = editing.value;
  const model = sheet.value;
  if (!active || !model) return [];
  return model
    .traceDeps(active.r + 1, active.c + 1)
    .map(([row, col]) => a1(row - 1, col - 1));
});
</script>

<template>
  <div class="pane pane-wide">
    <p class="note">
      Every cell in columns E–J (and every odd column beyond) holds a real
      formula — evaluated by fast-formula-parser, with the dependency graph
      discovered by Vue. Click a cell to edit; watch dependents cascade.
    </p>
    <div class="row" style="margin-bottom: 12px">
      <button
        class="btn primary"
        type="button"
        :disabled="loading"
        @click="create(ROWS)"
      >
        {{ loading ? 'Loading parser…' : 'Create 100k cells' }}
      </button>
      <button
        class="btn"
        type="button"
        :disabled="loading"
        title="40 columns × 25,000 rows. ~68 MB of model — fine on a desktop browser."
        @click="create(ROWS_1M)"
      >
        Create 1M cells
      </button>
      <span v-if="hasModel" class="mono">
        {{ modelCells.toLocaleString() }} cells · created in
        {{ creationMs.toFixed(1) }} ms
      </span>
    </div>

    <template v-if="hasModel">
      <div class="fx-bar fg-fx">
        <span class="fx-name">{{
          editing ? a1(editing.r, editing.c) : 'fx'
        }}</span>
        <span v-if="activeCell" class="fx-val">{{
          activeCell.raw.value
        }}</span>
        <span v-else class="fx-empty">click a cell to see its formula</span>
        <span v-if="activeDeps.length" class="fg-deps mono">
          reads: {{ activeDeps.join(', ') }}
        </span>
      </div>

      <div ref="scrollEl" class="gc-grid-scroll" @scroll="win.onScroll">
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

      <div class="mono" style="margin-top: 8px">
        {{ mountedCells.toLocaleString() }} DOM cells mounted (virtualized)
        out of {{ modelCells.toLocaleString() }} in the model — an unrendered
        formula cell never allocates its ref or computed.
      </div>
    </template>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.pane-wide {
  max-width: 980px;
}
.fg-fx {
  margin-bottom: 10px;
}
.fg-deps {
  margin-left: auto;
  color: #34d399 !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
