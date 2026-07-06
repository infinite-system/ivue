<script setup lang="ts">
import './grid.css';
import { createComposableCell } from './composableCell';
import { ROWS_1M, initialRaw } from './cell-logic';
import { useGridPage } from './useGridPage';

const g = useGridPage('composable', (r, c) =>
  createComposableCell(r, c, initialRaw(r, c)),
);

// Only template-ref targets get destructured off the controller (skill rule).
const { scrollEl } = g;

document.title = 'Grid · Composable model';
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/30"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
        Arm A · composable per cell (eager ref + computed×4)
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white">
        Grid — Composable Model
      </h1>
      <p class="max-w-3xl text-sm leading-relaxed text-slate-400">
        100,000 — or 1,000,000 — cells. Every cell is a factory that eagerly
        builds a
        <code class="text-sky-300">ref()</code> plus four
        <code class="text-sky-300">computed()</code>s (display · isNumber ·
        cssClass · numericValue). Rendering is virtualized — but the whole model
        is created up front.
      </p>
    </header>

    <!-- Controls -->
    <div
      class="flex flex-wrap items-center gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
    >
      <button
        class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-600"
        @click="g.createModel()"
      >
        create model (100k)
      </button>
      <button
        class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-500/25 ring-1 ring-sky-300/40 transition hover:bg-sky-700"
        title="~758 MB model heap — the eager composable cost at 1M cells"
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
        <span class="text-2xl font-extrabold tabular-nums text-sky-300">{{
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
        click a cell to edit · scroll to virtualize
      </div>
    </div>

    <!-- Grid -->
    <div v-if="g.hasModel.value">
      <div ref="scrollEl" class="gc-grid-scroll" @scroll="g.onScroll">
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in g.COLS" :key="c" class="gc-cell gc-head-cell">
              {{ g.colLabel(c - 1) }}
            </div>
            <div class="gc-sum gc-head-cell">Σ</div>
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
                  v-for="(cell, ci) in g.model.value[r]"
                  :key="ci"
                  class="gc-cell"
                  :class="cell.cssClass.value"
                  data-grid-cell
                  :data-row="r"
                  :data-col="ci"
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
                  <template v-else>{{ cell.display.value }}</template>
                </div>
                <div class="gc-sum" :data-rowsum="r">
                  {{ g.fmtSum(g.rowSum(r)) }}
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
      <span class="font-semibold text-sky-300">create model (100k)</span> or
      <span class="font-semibold text-sky-300">create model (1M)</span> to build
      it.
    </div>
  </section>
</template>
