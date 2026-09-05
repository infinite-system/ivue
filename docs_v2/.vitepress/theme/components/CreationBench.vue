<script setup lang="ts">
import DemoBox from './DemoBox.vue';
import { CreationBench } from './CreationBench';

// wiring only — the model imports InteractiveBox on first run
const bench = new CreationBench.Class();

// the state destructure
const {
  // state refs
  isRunning,
} = bench;
</script>

<template>
  <DemoBox
    title="Creation & method dispatch — the primitives"
    note="InteractiveBox is a three-level Reactive() hierarchy hosting a composable. Creation stays plain-object cheap because nothing materializes until first access; the method benchmark hammers a prototype-bound method with reactive reads inside."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">create {{ bench.instanceCountLabel }} instances</div>
        <div class="d-n grad">{{ bench.creationLabel }}</div>
      </div>
      <div>
        <div class="d-k">{{ bench.callCountLabel }} method calls</div>
        <div class="d-n">{{ bench.methodLabel }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" :disabled="isRunning" @click="bench.runBench()">
        {{ bench.buttonLabel }}
      </button>
    </div>
  </DemoBox>
</template>
