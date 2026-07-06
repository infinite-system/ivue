<script setup lang="ts">
import './grid.css';
import { computed, onMounted, ref, shallowRef } from 'vue';
import {
  COLS,
  OVERSCAN,
  ROWS,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  colLabel,
  cssOf,
  displayOf,
  fmtSum,
  initialRaw,
  isNumberOf,
  numericOf,
} from './cell-logic';
import { createPojoCell, pojoRowSum, type PojoCell } from './pojoCell';
import { useRowWindow } from './useRowWindow';

const model = shallowRef<PojoCell[][]>([]);
const hasModel = ref(false);
const creationMs = ref(0);
const scrollEl = ref<HTMLElement | null>(null);

const win = useRowWindow({
  rowCount: () => model.value.length,
  rowHeight: ROW_HEIGHT,
  viewportHeight: VIEWPORT_HEIGHT,
  overscan: OVERSCAN,
});
const mountedCells = computed(() => win.visibleRows.value.length * COLS);

function createModel(rowCount: number = ROWS) {
  const t0 = performance.now();
  const rows: PojoCell[][] = new Array(rowCount);
  for (let r = 0; r < rowCount; r++) {
    const row: PojoCell[] = new Array(COLS);
    for (let c = 0; c < COLS; c++)
      row[c] = createPojoCell(r, c, initialRaw(r, c));
    rows[r] = row;
  }
  creationMs.value = performance.now() - t0;
  model.value = rows;
  hasModel.value = true;
}

const disp = (cell: PojoCell) =>
  displayOf(cell.raw, isNumberOf(cell.raw), numericOf(cell.raw));
const cls = (cell: PojoCell) =>
  cssOf(isNumberOf(cell.raw), numericOf(cell.raw));
const rsum = (r: number) => (model.value[r] ? pojoRowSum(model.value[r]) : 0);

function setScroll(px: number) {
  const max = Math.max(0, win.totalHeight.value - VIEWPORT_HEIGHT);
  const clamped = Math.min(Math.max(0, px), max);
  win.scrollTop.value = clamped;
  if (scrollEl.value) scrollEl.value.scrollTop = clamped;
}

onMounted(() => {
  (window as any).__grid = {
    arm: 'pojo',
    cols: COLS,
    reactive: false,
    createModel: (rowCount?: number) => createModel(rowCount),
    hasModel: () => hasModel.value,
    creationMs: () => creationMs.value,
    mountedCount: () => document.querySelectorAll('[data-grid-cell]').length,
    scrollToRow: (r: number) => setScroll(r * ROW_HEIGHT - VIEWPORT_HEIGHT / 2),
    setScroll,
    // Non-reactive by design: mutating raw does NOT re-render.
    editCell: (r: number, c: number, v: string) => {
      const row = model.value[r];
      if (row && row[c]) row[c].raw = v;
    },
    materializeAll: () => {},
    cellText: (r: number, c: number) => {
      const el = document.querySelector(
        `[data-grid-cell][data-row="${r}"][data-col="${c}"]`,
      );
      return el ? (el.textContent || '').trim() : null;
    },
  };
});

document.title = 'Grid · POJO floor';
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-400/30"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
        Arm C · plain POJO (no reactivity) — memory floor
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white">
        Grid — POJO Floor
      </h1>
      <p class="max-w-3xl text-sm leading-relaxed text-slate-400">
        100,000 cells as plain
        <code class="text-slate-300">{ row, col, raw }</code> objects. No refs,
        no computeds — derived values are pure functions at render time. The
        theoretical minimum; edits do <em>not</em> re-render (non-reactive by
        design).
      </p>
    </header>

    <div
      class="flex flex-wrap items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
    >
      <button
        class="rounded-lg bg-slate-500 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-slate-600 disabled:opacity-40"
        :disabled="hasModel"
        @click="createModel()"
      >
        {{ hasModel ? 'model created' : 'create model (100k)' }}
      </button>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-extrabold tabular-nums text-slate-300">{{
          creationMs.toFixed(1)
        }}</span>
        <span class="text-xs text-slate-400">ms to create</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-extrabold tabular-nums text-white">{{
          mountedCells.toLocaleString()
        }}</span>
        <span class="text-xs text-slate-400">mounted DOM cells</span>
      </div>
    </div>

    <div v-if="hasModel">
      <div ref="scrollEl" class="gc-grid-scroll" @scroll="win.onScroll">
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
            :style="{ height: win.totalHeight.value + 'px' }"
          >
            <div
              class="gc-rows"
              :style="{ transform: `translateY(${win.offsetY.value}px)` }"
            >
              <div v-for="r in win.visibleRows.value" :key="r" class="gc-row">
                <div class="gc-rownum">{{ r + 1 }}</div>
                <div
                  v-for="(cell, ci) in model[r]"
                  :key="ci"
                  class="gc-cell"
                  :class="cls(cell)"
                  data-grid-cell
                  :data-row="r"
                  :data-col="ci"
                >
                  {{ disp(cell) }}
                </div>
                <div class="gc-sum" :data-rowsum="r">{{ fmtSum(rsum(r)) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-slate-500"
    >
      No model yet — click
      <span class="font-semibold text-slate-300">create model (100k)</span> to
      build it.
    </div>
  </section>
</template>
