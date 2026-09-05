<script setup lang="ts">
/**
 * Standalone demo: 20 columns × 1,000,000 rows (20,000,000 cells).
 *
 * The SFC is now a thin shell per the ivue operating manual: ONE raw
 * `FlyweightGridPage` instance drives the template; only the template-ref
 * target is destructured. All logic lives as named methods on the class.
 */
import './grid.css';
import { FlyweightLogic } from './FlyweightLogic';

const Logic = FlyweightLogic.Class;
import { FlyweightGridPage } from './FlyweightGridPage';

const page = new FlyweightGridPage.Class();

// THE STATE DESTRUCTURE — every Ref/Computed the template touches, grouped.
// Plain getters (hasModel, modelCells, totals, offsets…) and methods stay
// dotted on the instance.
const {
  // state refs
  creationMs,
  census,
  draft,
  // computed refs
  visibleRows,
  // element refs
  scrollEl,
} = page;

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
      <button class="fw-btn" @click="page.createModel()">
        create model (20M cells)
      </button>
      <template v-if="page.hasModel">
        <span class="fw-stat"
          ><b>{{ page.modelCells.toLocaleString() }}</b> cells</span
        >
        <span class="fw-stat"
          ><b>{{ creationMs.toFixed(1) }}</b> ms create</span
        >
        <span class="fw-stat"
          ><b>{{ census.fineRefs.toLocaleString() }}</b> fine
          refs</span
        >
        <span class="fw-stat"
          ><b>{{ census.blockRefs.toLocaleString() }}</b> block
          refs</span
        >
        <span class="fw-stat"
          ><b>{{ census.formulaComputeds.toLocaleString() }}</b>
          formula computeds</span
        >
      </template>
    </div>

    <template v-if="page.hasModel">
      <!-- Live totals over the FULL million rows (block tier: 245 edges each) -->
      <div class="fw-totals">
        <span
          v-for="entry in page.totals"
          :key="entry.label"
          class="fw-total"
        >
          <code>{{ entry.label }}</code> =
          <b>{{ Logic.displayOf(entry.total.value) }}</b>
        </span>
      </div>

      <div class="fx-bar">
        <span class="fx-name">{{ page.activeRefLabel }}</span>
        <span class="fx-val">{{ page.activeSourceLabel }}</span>
      </div>

      <div ref="scrollEl" class="gc-grid-scroll" @scroll="page.onScroll">
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div
              v-for="col in Logic.COLS"
              :key="col"
              class="gc-cell gc-head-cell"
            >
              {{ page.headerLabel(col) }}
            </div>
          </div>
          <div class="gc-viewport" :style="page.viewportStyle">
            <div
              class="gc-rows"
              :style="page.rowsStyle"
            >
              <div
                v-for="pageRow in visibleRows"
                :key="pageRow.row"
                class="gc-row"
              >
                <div class="gc-rownum">
                  {{ page.rowNumber(pageRow.row) }}
                </div>
                <div
                  v-for="cell in pageRow.cells"
                  :key="cell.col"
                  class="gc-cell"
                  :class="cell.cssClass"
                  data-grid-cell
                  :data-row="cell.row"
                  :data-col="cell.col"
                  :title="cell.source"
                  @click="page.edit(cell)"
                >
                  <input
                    v-if="page.isEditing(cell.row, cell.col)"
                    class="gc-edit"
                    v-model="draft"
                    autofocus
                    @blur="page.commitEdit()"
                    @keyup.enter="page.commitEdit()"
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
