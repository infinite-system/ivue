<script setup lang="ts">
import DemoBox from '../DemoBox.vue';
import { FlyweightGrid20M } from './FlyweightGrid20M';

// wiring only — the model imports the whole app on the first click
const gate = new FlyweightGrid20M.Class();

// the state destructure
const {
  // state refs
  gridApp,
  isLoading,
  loadError,
} = gate;
</script>

<template>
  <DemoBox
    title="The flyweight grid — 20,000,000 cells"
    note="Ground truth in columnar typed arrays, disposable cell facades per render, a sparse reactive overlay that materializes per observation and evicts with the viewport. ~55% real Excel-syntax formulas. Everything costs proportional to what's observed — never to what exists."
  >
    <div v-if="!gate.isLoaded" class="fwl-gate">
      <p class="fwl-copy">
        20 columns × 1,000,000 rows, fully reactive at 4.7 bytes per cell.
        Nothing downloads until you click — the model code and the formula
        parser load on demand, then one more click creates all 20,000,000
        cells in your browser.
      </p>
      <button class="d-btn primary" type="button" :disabled="isLoading" @click="gate.loadGrid()">
        {{ gate.buttonLabel }}
      </button>
      <p v-if="gate.hasError" class="fwl-error">{{ loadError }}</p>
    </div>
    <div v-else class="fw-embed">
      <component :is="gridApp" />
    </div>
  </DemoBox>
</template>

<style scoped>
.fwl-gate {
  padding: 8px 0;
}
.fwl-copy {
  margin: 0 0 14px;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}
.fwl-error {
  margin-top: 10px;
  font-size: 12px;
  color: #f87171;
}
/* the sketch app carries its own page chrome — DemoBox already provides it */
.fw-embed :deep(.fw-page header) {
  display: none;
}
.fw-embed :deep(.fw-page) {
  padding: 0;
  max-width: none;
}
</style>
