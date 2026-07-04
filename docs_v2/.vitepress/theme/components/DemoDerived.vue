<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import DemoBox from './DemoBox.vue';

// Plain (non-reactive) counter: incrementing it inside the computed body is
// side-effect-free for the graph. A post-flush watcher mirrors it into a ref.
let runs = 0;
const statusRuns = ref(0);

class $Thermo {
  get celsius() {
    return ref(21);
  }
  // Plain getter: re-derives every render. Perfect for trivial math.
  get fahrenheit() {
    return Math.round((this.celsius.value * 9) / 5 + 32);
  }
  // computed(): memoized. Reach for it when the work is real.
  get status() {
    return computed(() => {
      runs++;
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
  statusRuns.value = runs;
  watch(
    () => t.celsius.value,
    () => {
      statusRuns.value = runs;
    },
    { flush: 'post' },
  );
});
</script>

<template>
  <DemoBox
    title="Plain getter vs computed(), side by side"
    note="fahrenheit is a plain getter: zero bytes per instance, re-derived on render. status is a computed(): memoized, so its body runs only when celsius actually changes."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">celsius</div>
        <div class="d-n">{{ t.celsius.value }}&deg;</div>
      </div>
      <div>
        <div class="d-k">fahrenheit &middot; plain getter</div>
        <div class="d-n grad">{{ t.fahrenheit }}&deg;</div>
      </div>
      <div>
        <div class="d-k">status &middot; computed()</div>
        <div class="d-n">{{ t.status.value }}</div>
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
      <span class="d-mono"><code>computed</code> body ran {{ statusRuns }}&times;</span>
    </div>
  </DemoBox>
</template>
