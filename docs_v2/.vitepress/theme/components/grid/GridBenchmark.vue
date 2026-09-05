<script setup lang="ts">
/**
 * The flagship grid benchmark, embedded live in the docs.
 *
 * This is a purpose-built docs widget, NOT the three standalone full-page
 * routes from `demo/grid/` stacked on top of each other — see
 * `GridBenchmark.ts`, the model that owns all of it. This SFC is wiring.
 */
import DemoBox from '../DemoBox.vue';
import BenchmarkWinner from '@examples/benchmarks/BenchmarkWinner.vue';
import '@examples/benchmarks/grid.css';
import { GridBenchmark } from './GridBenchmark';

const benchmark = new GridBenchmark.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // element refs — one per arm, distinct names since three coexist
  composableScrollEl,
  ivueScrollEl,
  pojoScrollEl,
} = benchmark;
</script>

<template>
  <DemoBox
    title="Grid benchmark — one grid, three models"
    note="All three arms build from the same seeded 40-column data, at the same time, from the same button click — so every number below is directly comparable. This is a live, in-your-browser illustration; the controlled measurement (gc-forced heap reads, 3-run medians, one fresh page load per arm) lives in demo/grid/RESULTS.md."
  >
    <div class="gb-controls d-row">
      <button class="d-btn primary" type="button" @click="benchmark.createHundredThousand()">
        Create 100k (all 3 arms)
      </button>
      <button
        class="d-btn"
        type="button"
        title="Builds all three models at once. The composable arm alone costs ~758 MB at this size — combined peak is roughly 840 MB."
        @click="benchmark.createMillion()"
      >
        Create 1M (all 3 arms)
      </button>
      <span v-if="benchmark.hasAny" class="d-mono gb-last-build">
        last build:
        {{ benchmark.lastBuildLabel }} cells &times; 3
        arms
      </span>
    </div>
    <p v-if="benchmark.isMillionBuild" class="gb-warning">
      ⚠ 1M cells &times; 3 arms in memory at once — mostly the composable arm's
      ~758&nbsp;MB. Fine on a modern desktop browser; may be heavy on a
      memory-constrained device.
    </p>
    <p v-if="!benchmark.hasAny" class="gb-hint">
      Nothing built yet — click a button above.
    </p>
    <p v-else class="gb-hint">
      Best measured fully reactive result. POJO is the non-reactive floor.
      <BenchmarkWinner placement="after" />
    </p>

    <!-- Comparison strip: creation time + measured heap, side by side -->
    <div v-if="benchmark.hasAny" class="gb-compare">
      <div
        v-for="arm in benchmark.arms"
        :key="arm.key"
        class="gb-compare-item"
        :class="benchmark.accentClass(arm)"
      >
        <div class="gb-compare-head">
          <span class="gb-tag">{{ arm.tag }}</span>
          <span class="gb-label">{{ arm.label }}</span>
        </div>
        <div class="gb-compare-num">
          {{ benchmark.creationLabel(arm)
          }}<span class="gb-unit">ms</span
          ><BenchmarkWinner v-if="benchmark.isIvueArm(arm)" placement="after" />
        </div>
        <div class="gb-compare-sub">
          to create
          {{ benchmark.modelCellsLabel(arm) }} cells
        </div>
        <div class="gb-compare-heap">
          <span class="gb-heap-num"
            >{{ benchmark.heapLabel(arm)
            }}<BenchmarkWinner v-if="benchmark.isIvueArm(arm)" placement="after"
          /></span>
          <span class="gb-heap-label">measured heap &middot; RESULTS.md</span>
        </div>
      </div>
    </div>

    <!-- Arm switcher — only ONE grid is mounted below at a time -->
    <div v-if="benchmark.hasAny" class="gb-tabs" role="tablist">
      <button
        v-for="arm in benchmark.arms"
        :key="arm.key"
        class="gb-tab"
        :class="benchmark.tabClass(arm)"
        type="button"
        role="tab"
        :aria-selected="benchmark.isActiveArm(arm)"
        @click="benchmark.showArm(arm)"
      >
        {{ arm.label }}
      </button>
      <span class="gb-tabs-hint">
        {{ benchmark.activeArmHint }}
      </span>
    </div>

    <!-- Grid viewport -->
    <div v-if="benchmark.hasAny" class="gb-grid-wrap">
      <!-- Composable arm -->
      <div
        v-if="benchmark.isComposableActive"
        ref="composableScrollEl"
        class="gc-grid-scroll"
        @scroll="benchmark.composable.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="column in benchmark.columns" :key="column" class="gc-cell gc-head-cell">
              {{ benchmark.headerLabel(column) }}
            </div>
            <div class="gc-sum gc-head-cell">Σ</div>
          </div>
          <div
            class="gc-viewport"
            :style="benchmark.viewportStyle('composable')"
          >
            <div
              class="gc-rows"
              :style="benchmark.rowsStyle('composable')"
            >
              <div
                v-for="row in benchmark.composable.visibleRows.value"
                :key="row"
                class="gc-row"
              >
                <div class="gc-rownum">{{ benchmark.rowNumber(row) }}</div>
                <div
                  v-for="(cell, columnIndex) in benchmark.composable.model.value[row]"
                  :key="columnIndex"
                  class="gc-cell"
                  :class="cell.cssClass.value"
                  data-grid-cell
                  @click="benchmark.composable.edit(row, columnIndex)"
                >
                  <input
                    v-if="benchmark.composable.isEditing(row, columnIndex)"
                    class="gc-edit"
                    v-model="cell.raw.value"
                    autofocus
                    @blur="benchmark.composable.commitEdit"
                    @keyup.enter="benchmark.composable.commitEdit"
                  />
                  <template v-else>{{ cell.display.value }}</template>
                </div>
                <div class="gc-sum">{{ benchmark.sumLabel('composable', row) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ivue arm -->
      <div
        v-else-if="benchmark.isIvueActive"
        ref="ivueScrollEl"
        class="gc-grid-scroll"
        @scroll="benchmark.ivue.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="column in benchmark.columns" :key="column" class="gc-cell gc-head-cell">
              {{ benchmark.headerLabel(column) }}
            </div>
            <div class="gc-sum gc-head-cell">Σ</div>
          </div>
          <div
            class="gc-viewport"
            :style="benchmark.viewportStyle('ivue')"
          >
            <div
              class="gc-rows"
              :style="benchmark.rowsStyle('ivue')"
            >
              <div v-for="row in benchmark.ivue.visibleRows.value" :key="row" class="gc-row">
                <div class="gc-rownum">{{ benchmark.rowNumber(row) }}</div>
                <div
                  v-for="(cell, columnIndex) in benchmark.ivue.model.value[row]"
                  :key="columnIndex"
                  class="gc-cell"
                  :class="cell.cssClass"
                  data-grid-cell
                  @click="benchmark.ivue.edit(row, columnIndex)"
                >
                  <input
                    v-if="benchmark.ivue.isEditing(row, columnIndex)"
                    class="gc-edit"
                    v-model="cell.raw.value"
                    autofocus
                    @blur="benchmark.ivue.commitEdit"
                    @keyup.enter="benchmark.ivue.commitEdit"
                  />
                  <template v-else>{{ cell.display }}</template>
                </div>
                <div class="gc-sum">{{ benchmark.sumLabel('ivue', row) }}</div>
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
        @scroll="benchmark.pojo.onScroll"
      >
        <div class="gc-inner">
          <div class="gc-head">
            <div class="gc-rownum gc-head-cell">#</div>
            <div v-for="column in benchmark.columns" :key="column" class="gc-cell gc-head-cell">
              {{ benchmark.headerLabel(column) }}
            </div>
            <div class="gc-sum gc-head-cell">Σ</div>
          </div>
          <div
            class="gc-viewport"
            :style="benchmark.viewportStyle('pojo')"
          >
            <div
              class="gc-rows"
              :style="benchmark.rowsStyle('pojo')"
            >
              <div v-for="row in benchmark.pojo.visibleRows.value" :key="row" class="gc-row">
                <div class="gc-rownum">{{ benchmark.rowNumber(row) }}</div>
                <div
                  v-for="(cell, columnIndex) in benchmark.pojo.model.value[row]"
                  :key="columnIndex"
                  class="gc-cell"
                  :class="benchmark.pojoClass(cell)"
                  data-grid-cell
                >
                  {{ benchmark.pojoDisplay(cell) }}
                </div>
                <div class="gc-sum">{{ benchmark.sumLabel('pojo', row) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="gb-mounted-note d-mono">
        {{ benchmark.mountedCellsLabel }} DOM
        cells mounted for this view (virtualized) out of
        {{ benchmark.activeModelCellsLabel }} in the
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
  color: var(--vp-c-text-3);
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
  background: color-mix(in srgb, currentColor 4%, transparent);
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
  color: var(--vp-c-text-2);
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
  color: var(--vp-c-text-2);
}
.gb-compare-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--vp-c-text-2);
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
  background: color-mix(in srgb, currentColor 4%, transparent);
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
  color: var(--vp-c-text-2);
}
</style>
