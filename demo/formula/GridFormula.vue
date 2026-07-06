<script setup lang="ts">
import '../grid/grid.css';
import './formula.css';
import { ROWS_1M } from './formula-logic';
import { useFormulaGrid } from './useFormulaGrid';

const g = useFormulaGrid();

// Only template-ref targets get destructured off the controller (skill rule).
const { scrollEl } = g;

// The cell currently being edited (drives the formula bar).
function activeCell() {
  const e = g.editing.value;
  if (!e || !g.sheet.value) return null;
  return g.sheet.value.cellAt(e.r + 1, e.c + 1) ?? null;
}
function activeRef() {
  const e = g.editing.value;
  return e ? g.colLabel(e.c) + (e.r + 1) : '';
}

document.title = 'Grid · formula (fast-formula-parser + ivue)';
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/30"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
        real Excel formulas · fast-formula-parser · ivue FormulaCell
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white">
        Formula Grid — 100,000 live cells
      </h1>
      <p class="max-w-3xl text-sm leading-relaxed text-slate-400">
        Every cell is a <code class="text-indigo-300">Reactive()</code>
        <code class="text-indigo-300">FormulaCell</code>: raw is a ref-getter
        holding the literal text (<code class="text-indigo-300">=A1+B2</code>,
        <code class="text-indigo-300">=SUM(A1:D1)</code>,
        <code class="text-indigo-300">=IF(A1&gt;0,B1,C1)</code>), the one
        <code class="text-indigo-300">computed()</code> parses + evaluates it
        with the real <code class="text-indigo-300">fast-formula-parser</code>,
        and Vue discovers the formula's dependencies automatically — no
        hand-built graph. Roughly half the grid is cross-referencing formulas;
        edit an input and watch dependents cascade.
      </p>
    </header>

    <!-- Controls -->
    <div
      class="flex flex-wrap items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
    >
      <button
        class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600"
        @click="g.createModel()"
      >
        create model (100k)
      </button>
      <button
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-300/40 transition hover:bg-indigo-700"
        @click="g.createModel(ROWS_1M)"
      >
        create model (1M)
      </button>
      <div v-if="g.hasModel.value" class="flex items-baseline gap-2">
        <span class="text-2xl font-extrabold tabular-nums text-white">{{
          g.modelCells.value.toLocaleString()
        }}</span>
        <span class="text-xs text-slate-400">cells in model</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-extrabold tabular-nums text-indigo-300">{{
          g.creationMs.value.toFixed(1)
        }}</span>
        <span class="text-xs text-slate-400">ms to create</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-extrabold tabular-nums text-white">{{
          g.mountedCells.value.toLocaleString()
        }}</span>
        <span class="text-xs text-slate-400">mounted DOM cells</span>
      </div>
      <div class="ml-auto text-xs text-slate-500">
        click a cell to edit its formula · scroll to virtualize
      </div>
    </div>

    <!-- Grid -->
    <div v-if="g.hasModel.value" class="space-y-3">
      <!-- Formula bar -->
      <div class="fx-bar">
        <span class="fx-name">{{ activeRef() || 'fx' }}</span>
        <span v-if="activeCell()" class="fx-val">{{
          activeCell()!.raw.value
        }}</span>
        <span v-else class="fx-empty">click a cell to see its formula</span>
      </div>

      <div ref="scrollEl" class="gc-grid-scroll" @scroll="g.onScroll">
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in g.COLS" :key="c" class="gc-cell gc-head-cell">
              {{ g.colLabel(c - 1) }}
            </div>
          </div>
          <div
            class="gc-viewport"
            :style="{ height: g.totalHeight.value + 'px' }"
          >
            <div
              class="gc-rows"
              :style="{ transform: `translateY(${g.offsetY.value}px)` }"
            >
              <div v-for="r in g.visibleRows.value" :key="r" class="gc-row">
                <div class="gc-rownum">{{ r + 1 }}</div>
                <div
                  v-for="(cell, ci) in g.sheet.value!.grid[r]"
                  :key="ci"
                  class="gc-cell"
                  :class="cell.cssClass"
                  data-grid-cell
                  :data-row="r"
                  :data-col="ci"
                  :title="cell.raw.value"
                  @click="g.edit(r, ci)"
                >
                  <input
                    v-if="g.isEditing(r, ci)"
                    class="gc-edit"
                    v-model="cell.raw.value"
                    autofocus
                    @blur="g.commitEdit"
                    @keyup.enter="g.commitEdit"
                  />
                  <template v-else>{{ cell.display }}</template>
                </div>
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
      <span class="font-semibold text-indigo-300">create model (100k)</span> or
      <span class="font-semibold text-indigo-300">create model (1M)</span> to
      build it.
    </div>
  </section>
</template>
