<script setup lang="ts">
import DemoBox from './DemoBox.vue';
import BenchmarkWinner from '@examples/benchmarks/BenchmarkWinner.vue';
import { DemoPerf } from './DemoPerf';

// wiring only
const perf = new DemoPerf.Class();

// the state destructure
const {
  // state refs
  running,
} = perf;
</script>

<template>
  <DemoBox
    title="Create 100,000 instances, in your browser"
    note="Same shape for all three: two state values and a derived area. Numbers depend on your machine. The ratio is the point."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">ivue &middot; new Class()</div>
        <div class="d-n grad">
          {{ perf.ivueLabel
          }}<BenchmarkWinner v-if="perf.hasIvueResult" placement="after" />
        </div>
      </div>
      <div>
        <div class="d-k">
          reactive(new X())
          <span v-if="perf.hasReactiveResult">&middot; {{ perf.reactiveRatio }}</span>
        </div>
        <div class="d-n">{{ perf.reactiveLabel }}</div>
      </div>
      <div>
        <div class="d-k">
          composable factory
          <span v-if="perf.hasComposableResult">&middot; {{ perf.composableRatio }}</span>
        </div>
        <div class="d-n">{{ perf.composableLabel }}</div>
      </div>
    </div>
    <div class="d-row">
      <button
        class="d-btn primary"
        type="button"
        :disabled="running"
        @click="perf.run()"
      >
        {{ perf.buttonLabel }}
      </button>
    </div>
  </DemoBox>
</template>
