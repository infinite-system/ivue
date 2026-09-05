<script setup lang="ts">
import DemoBox from './DemoBox.vue';
import { Sensor } from '@examples/lifecycle/Sensor';

// The Sensor's constructor bridges to this component's scope
// (getCurrentScope() && onScopeDispose(() => this.dispose())), so
// unmount disposes it — no hook to write here.
const sensor = new Sensor.Class();
// the state destructure
const { temp, fired, lastChange } = sensor;
</script>

<template>
  <DemoBox
    title="$watch and $stopEffects, live"
    note="Start registers a watcher in the instance's lazily created effect scope. Dispose calls $stopEffects: the scope stops and every cached cell is dropped, so state re-materializes fresh."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">temp</div>
        <div class="d-n">{{ temp }}&deg;</div>
      </div>
      <div>
        <div class="d-k">watcher</div>
        <div class="d-n" :class="sensor.watchingClass">
          {{ sensor.watchingLabel }}
        </div>
      </div>
      <div>
        <div class="d-k">fired</div>
        <div class="d-n">{{ fired }}&times;</div>
      </div>
    </div>
    <div class="d-row">
      <input
        class="d-slider"
        type="range"
        min="0"
        max="40"
        v-model.number="temp"
        aria-label="temperature"
      />
    </div>
    <div class="d-row">
      <button
        class="d-btn primary"
        type="button"
        @click="sensor.toggleWatch()"
      >
        {{ sensor.toggleLabel }}
      </button>
      <button class="d-btn" type="button" @click="sensor.suspend">Suspend (reset: false)</button>
      <button class="d-btn" type="button" @click="sensor.dispose">Dispose ($stopEffects)</button>
      <span v-if="lastChange" class="d-mono"><code>$watch</code> {{ lastChange }}</span>
    </div>
  </DemoBox>
</template>
