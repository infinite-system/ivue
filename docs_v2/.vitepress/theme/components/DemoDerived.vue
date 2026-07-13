<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import DemoBox from './DemoBox.vue';
import { Thermo } from '@examples/derived/Thermo';

const thermo = new Thermo.Class();
// the state destructure
const { celsius, status } = thermo;

// Unrelated state — changing it re-renders the demo without touching celsius.
const ticks = ref(0);

// The run counters are plain (non-reactive) fields on the class; a
// post-flush watcher mirrors them into refs the template can display.
const fahrRunsShown = ref(0);
const statusRunsShown = ref(0);

onMounted(() => {
  fahrRunsShown.value = thermo.fahrenheitRuns;
  statusRunsShown.value = thermo.statusRuns;
  watch(
    [() => celsius.value, ticks],
    () => {
      fahrRunsShown.value = thermo.fahrenheitRuns;
      statusRunsShown.value = thermo.statusRuns;
    },
    { flush: 'post' },
  );
});
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
        <div class="d-n grad">{{ thermo.fahrenheit }}&deg;</div>
        <div class="d-mono">body ran {{ fahrRunsShown }}&times;</div>
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
      <button class="d-btn" @click="ticks++">re-render ({{ ticks }})</button>
    </div>
  </DemoBox>
</template>
