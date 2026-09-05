<script setup lang="ts">
import { DerivedExample } from './DerivedExample';

const view = new DerivedExample.Class();

// the state destructure — the model's cells arrive forwarded through the view
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
        <div class="n grad">{{ view.fahrenheit }}°</div>
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
      <button class="btn" type="button" @click="view.reRender()">
        {{ view.reRenderLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>
