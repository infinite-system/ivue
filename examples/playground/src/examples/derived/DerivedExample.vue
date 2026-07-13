<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Thermo } from './Thermo';

const thermo = new Thermo.Class();

// the state destructure
const {
  // state refs
  celsius,
  // computed refs
  status,
} = thermo;

// Unrelated state — changing it re-renders the demo without touching celsius.
const ticks = ref(0);

// The run counters are plain fields, so a post-flush watcher mirrors them
// into refs the template can display.
const fahrenheitRunsShown = ref(0);
const statusRunsShown = ref(0);
onMounted(() => {
  fahrenheitRunsShown.value = thermo.fahrenheitRuns;
  statusRunsShown.value = thermo.statusRuns;
  watch(
    [() => celsius.value, ticks],
    () => {
      fahrenheitRunsShown.value = thermo.fahrenheitRuns;
      statusRunsShown.value = thermo.statusRuns;
    },
    { flush: 'post' },
  );
});
</script>

<template>
  <div class="pane">
    <p class="note">
      Drag the slider: celsius is a dependency of BOTH, so both bodies run.
      Now click re-render: the plain getter re-derives (zero bytes, re-run per
      render) while the computed body stays frozen — that skip is what its
      ~300 bytes buy.
    </p>
    <div class="vals">
      <div>
        <div class="k">celsius</div>
        <div class="n">{{ celsius }}°</div>
      </div>
      <div>
        <div class="k">fahrenheit · plain getter</div>
        <div class="n grad">{{ thermo.fahrenheit }}°</div>
        <div class="mono">body ran {{ fahrenheitRunsShown }}×</div>
      </div>
      <div>
        <div class="k">status · computed()</div>
        <div class="n">{{ status }}</div>
        <div class="mono">body ran {{ statusRunsShown }}×</div>
      </div>
    </div>
    <div class="row">
      <input
        class="slider"
        type="range"
        min="-5"
        max="35"
        v-model.number="celsius"
        aria-label="celsius"
      />
      <button class="btn" type="button" @click="ticks++">
        re-render ({{ ticks }})
      </button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>
