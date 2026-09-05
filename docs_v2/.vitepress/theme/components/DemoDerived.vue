<script setup lang="ts">
import DemoBox from './DemoBox.vue';
import { DerivedExample } from '@examples/derived/DerivedExample';

// Pure wiring: the playground's route model owns the demo — it hosts the
// Thermo, forwards its cells, and mirrors the run counters.
const view = new DerivedExample.Class();

// the state destructure
const {
  // state refs
  celsius,
  ticks,
  fahrenheitRunsShown,
  statusRunsShown,
  // computed refs
  status,
} = view;
</script>

<template>
  <DemoBox
    title="Plain getter vs computed(), side by side"
    note="Drag the slider: celsius is a dependency of BOTH, so both bodies run — memoization never skips real dependency changes. Now click re-render: the plain getter re-derives (that's its deal — zero bytes, re-run per render), while the computed body stays frozen. THAT skip is what its ~300 bytes buy."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">celsius</div>
        <div class="d-n">{{ celsius }}&deg;</div>
      </div>
      <div>
        <div class="d-k">fahrenheit &middot; plain getter</div>
        <div class="d-n grad">{{ view.fahrenheit }}&deg;</div>
        <div class="d-mono">body ran {{ fahrenheitRunsShown }}&times;</div>
      </div>
      <div>
        <div class="d-k">status &middot; computed()</div>
        <div class="d-n">{{ status }}</div>
        <div class="d-mono">body ran {{ statusRunsShown }}&times;</div>
      </div>
    </div>
    <div class="d-row">
      <input
        class="d-slider"
        type="range"
        min="-5"
        max="35"
        v-model.number="celsius"
        aria-label="celsius"
      />
      <button class="d-btn" type="button" @click="view.reRender()">{{ view.reRenderLabel }}</button>
    </div>
  </DemoBox>
</template>
