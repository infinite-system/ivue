<script setup lang="ts">
import '../benchmarks/grid.css';
import './formula.css';
import { FormulaGridExample } from './FormulaGridExample';

const grid = new FormulaGridExample.Class();

// the state destructure
const {
  // state refs
  sheet,
  loading,
  creationMs,
  editing,
  // element refs
  scrollEl,
} = grid;
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
        @click="grid.createSmall()"
      >
        {{ grid.createLabel }}
      </button>
      <button
        class="btn"
        type="button"
        :disabled="loading"
        title="40 columns × 25,000 rows. ~68 MB of model — fine on a desktop browser."
        @click="grid.createLarge()"
      >
        Create 1M cells
      </button>
      <span v-if="grid.hasModel" class="mono">
        {{ grid.modelCellsLabel }} cells · created in
        {{ grid.creationLabel }} ms
      </span>
    </div>

    <template v-if="grid.hasModel">
      <div class="fx-bar fg-fx">
        <span class="fx-name">{{
          grid.activeName
        }}</span>
        <span v-if="grid.activeCell" class="fx-val">{{
          grid.activeCell.raw.value
        }}</span>
        <span v-else class="fx-empty">click a cell to see its formula</span>
        <span v-if="grid.hasActiveDeps" class="fg-deps mono">
          reads: {{ grid.activeDepsLabel }}
        </span>
      </div>

      <div ref="scrollEl" class="gc-grid-scroll" @scroll="grid.window.onScroll">
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
              :style="{
                transform: `translateY(${grid.window.offsetY.value}px)`,
              }"
            >
              <div
                v-for="r in grid.window.visibleRows.value"
                :key="r"
                class="gc-row"
              >
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

      <div class="mono" style="margin-top: 8px">
        {{ grid.mountedCellsLabel }} DOM cells mounted
        (virtualized) out of {{ grid.modelCellsLabel }} in the
        model — an unrendered formula cell never allocates its ref or
        computed.
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
