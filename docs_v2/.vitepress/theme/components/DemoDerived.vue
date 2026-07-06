<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import DemoBox from './DemoBox.vue';

// Plain (non-reactive) counters: incrementing them inside getter bodies is
// side-effect-free for the graph. A post-flush watcher mirrors them into refs.
let fahrRuns = 0;
let statusRuns = 0;
const fahrRunsShown = ref(0);
const statusRunsShown = ref(0);

// Unrelated state — changing it re-renders the demo without touching celsius.
const ticks = ref(0);

class $Thermo {
  get celsius() {
    return ref(21);
  }
  // Plain getter: re-derives on EVERY render — even unrelated ones.
  get fahrenheit() {
    fahrRuns++;
    return Math.round((this.celsius.value * 9) / 5 + 32);
  }
  // computed(): memoized — its body runs only when celsius actually changed.
  get status() {
    return computed(() => {
      statusRuns++;
      const c = this.celsius.value;
      if (c < 10) return 'Cold';
      if (c < 18) return 'Cool';
      if (c < 26) return 'Comfortable';
      return 'Warm';
    });
  }
}
const Thermo = Reactive($Thermo);
const t: any = new Thermo();

onMounted(() => {
  fahrRunsShown.value = fahrRuns;
  statusRunsShown.value = statusRuns;
  watch(
    [() => t.celsius.value, ticks],
    () => {
      fahrRunsShown.value = fahrRuns;
      statusRunsShown.value = statusRuns;
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
        <div class="d-n">{{ t.celsius.value }}&deg;</div>
      </div>
      <div>
        <div class="d-k">fahrenheit &middot; plain getter</div>
        <div class="d-n grad">{{ t.fahrenheit }}&deg;</div>
        <div class="d-mono">body ran {{ fahrRunsShown }}&times;</div>
      </div>
      <div>
        <div class="d-k">status &middot; computed()</div>
        <div class="d-n">{{ t.status.value }}</div>
        <div class="d-mono">body ran {{ statusRunsShown }}&times;</div>
      </div>
    </div>
    <div class="d-row">
      <input
        class="d-slider"
        type="range"
        min="-5"
        max="35"
        v-model.number="t.celsius.value"
        aria-label="celsius"
      />
      <button class="d-btn" @click="ticks++">re-render ({{ ticks }})</button>
    </div>
  </DemoBox>
</template>
