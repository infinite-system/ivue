<script setup lang="ts">
/**
 * The formula grid, embedded live in the docs.
 *
 * The MODEL is imported from the playground's `formula-grid` example
 * unchanged — `Sheet` (the one shared parser + O(1) cellAt), `FormulaCell`
 * (ref-getter raw, ONE computed value, plain getters) and `FormulaLogic`
 * are the exact files the measured RESULTS.md numbers were produced with,
 * and the page state is the playground's own `FormulaGridExample` class.
 * Only the docs chrome around them lives here: this SFC is wiring.
 *
 * `fast-formula-parser` (chevrotain-based, ~real bytes) is loaded via a
 * DYNAMIC import inside the class's create(): `vitepress build` (SSR)
 * never executes it and readers who don't click never download it.
 * Nothing runs on mount.
 */
import DemoBox from '../DemoBox.vue';
import '@examples/benchmarks/grid.css';
import '@examples/formula-grid/formula.css';
import { FormulaGridExample } from '@examples/formula-grid/FormulaGridExample';

const grid = new FormulaGridExample.Class();

// the state destructure
const {
  // state refs
  sheet,
  loading,
  // element refs
  scrollEl,
} = grid;
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
        @click="grid.createSmall()"
      >
        {{ grid.createLabel }}
      </button>
      <button
        class="d-btn"
        type="button"
        :disabled="loading"
        title="40 columns × 25,000 rows. ~68 MB of model — fine on a desktop browser."
        @click="grid.createLarge()"
      >
        Create 1M cells
      </button>
      <span v-if="grid.hasModel" class="d-mono">
        {{ grid.modelCellsLabel }} cells &middot; 52.5% live formulas
        &middot; created in {{ grid.creationLabel }} ms
      </span>
    </div>

    <p v-if="!grid.hasModel" class="fg-hint">
      Nothing built yet. Every cell in columns E–J (and every odd column
      beyond) holds a real formula — <code>=A1+B1</code>,
      <code>=SUM(A1:D1)</code>, <code>=IF(A1&gt;0,B1,C1)</code>, a running
      sum — evaluated by a real parser, with the dependency graph discovered
      by Vue.
    </p>

    <template v-if="grid.hasModel">
      <p class="fg-hint">
        Click a cell to edit its formula or value. Try it: set
        <strong>A1</strong> to <code>5000</code> and watch E1, G1, H1, I1 and
        the J column cascade. Select <strong>I1</strong> and flip A1's sign —
        the tracked dependency set shifts branches.
      </p>

      <!-- fx bar: active cell's literal text + its LIVE tracked deps -->
      <div class="fx-bar fg-fx">
        <span class="fx-name">{{
          grid.activeName
        }}</span>
        <span v-if="grid.activeCell" class="fx-val">{{
          grid.activeCell.raw.value
        }}</span>
        <span v-else class="fx-empty">click a cell to see its formula</span>
        <span v-if="grid.hasActiveDeps" class="fg-deps d-mono">
          reads: {{ grid.activeDepsLabel }}
        </span>
      </div>

      <div
        ref="scrollEl"
        class="gc-grid-scroll"
        @scroll="grid.window.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="c in grid.columnCount" :key="c" class="gc-cell gc-head-cell">
              {{ grid.headerLabel(c) }}
            </div>
          </div>
          <div
            class="gc-viewport"
            :style="{ height: grid.window.totalHeight.value + 'px' }"
          >
            <div
              class="gc-rows"
              :style="{ transform: `translateY(${grid.window.offsetY.value}px)` }"
            >
              <div v-for="r in grid.window.visibleRows.value" :key="r" class="gc-row">
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
                  @click="grid.edit(r, ci)"
                >
                  <input
                    v-if="grid.isEditing(r, ci)"
                    class="gc-edit"
                    v-model="cell.raw.value"
                    autofocus
                    @blur="grid.commitEdit()"
                    @keyup.enter="grid.commitEdit()"
                  />
                  <template v-else>{{ cell.display }}</template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="fg-mounted d-mono">
        {{ grid.mountedCellsLabel }} DOM cells mounted (virtualized)
        out of {{ grid.modelCellsLabel }} in the model — an unrendered
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
