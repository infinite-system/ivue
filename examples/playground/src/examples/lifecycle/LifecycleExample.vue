<script setup lang="ts">
import { LifecycleExample } from './LifecycleExample';

// ONE model owns the route. Its constructor touches both hosted models in
// setup, so Ticker's plain watch and hooks belong to this component and
// Sensor's onScopeDispose bridge ties its disposal to unmount.
const example = new LifecycleExample.Class();

// the state destructure — refs forwarded from the two hosted models
const {
  // state refs
  ticks,
  crossings,
  temp,
  fired,
} = example;
</script>

<template>
  <div class="pane">
    <p class="note">
      <strong>Component lifetime</strong> — Ticker's constructor ran inside
      setup: its plain watch() and onMounted/onUnmounted register against
      this component, and unmount releases the interval through an ordinary
      dispose() method.
    </p>
    <div class="vals">
      <div>
        <div class="k">ticks</div>
        <div class="n">{{ ticks }}</div>
      </div>
      <div>
        <div class="k">interval</div>
        <div class="n" :class="example.runningClass">{{ example.runningLabel }}</div>
      </div>
      <div>
        <div class="k">crossings (every 5th)</div>
        <div class="n">{{ crossings }}×</div>
      </div>
    </div>
    <div class="row">
      <button class="btn" type="button" @click="example.toggleTicker()">
        {{ example.toggleLabel }}
      </button>
    </div>

    <p class="note">
      <strong>Outliving instance</strong> — Start registers a watcher in the
      Sensor's lazily created effect scope. Suspend calls
      $stopEffects({ reset: false }): the watcher dies but every value
      survives — start resumes where it left off. Dispose calls
      $stopEffects(): the scope stops AND every cached cell is dropped.
    </p>
    <div class="vals">
      <div>
        <div class="k">temp</div>
        <div class="n">{{ temp }}°</div>
      </div>
      <div>
        <div class="k">watcher</div>
        <div class="n" :class="example.watchingClass">{{ example.watchingLabel }}</div>
      </div>
      <div>
        <div class="k">fired</div>
        <div class="n">{{ fired }}×</div>
      </div>
      <div>
        <div class="k">last change</div>
        <div class="n mono">{{ example.lastChangeLabel }}</div>
      </div>
    </div>
    <div class="row">
      <input
        class="slider"
        type="range"
        min="0"
        max="40"
        v-model.number="temp"
        aria-label="temperature"
      />
      <button class="btn primary" type="button" @click="example.startWatch()">
        start
      </button>
      <button class="btn" type="button" @click="example.stopWatch()">stop</button>
      <button class="btn" type="button" @click="example.suspendSensor()">
        suspend
      </button>
      <button class="btn" type="button" @click="example.disposeSensor()">
        dispose
      </button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>
