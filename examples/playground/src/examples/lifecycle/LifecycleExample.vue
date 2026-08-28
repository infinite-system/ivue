<script setup lang="ts">
import { onUnmounted } from 'vue';
import { Sensor } from './Sensor';

const sensor = new Sensor.Class();

// the state destructure
const {
  // state refs
  temp,
  watching,
  fired,
  lastChange,
} = sensor;

onUnmounted(() => sensor.$stopEffects());
</script>

<template>
  <div class="pane">
    <p class="note">
      Start registers a watcher in the instance's lazily created effect scope.
      Suspend calls $stopEffects({ reset: false }): the watcher dies but every
      value survives — start resumes where it left off. Dispose calls
      $stopEffects(): the scope stops AND every cached cell is dropped —
      terminal for this pane's bindings; fresh consumers get fresh cells.
    </p>
    <div class="vals">
      <div>
        <div class="k">temp</div>
        <div class="n">{{ temp }}°</div>
      </div>
      <div>
        <div class="k">watcher</div>
        <div class="n" :class="watching ? 'grad' : ''">
          {{ watching ? 'ON' : 'off' }}
        </div>
      </div>
      <div>
        <div class="k">fired</div>
        <div class="n">{{ fired }}×</div>
      </div>
      <div>
        <div class="k">last change</div>
        <div class="n mono">{{ lastChange || '—' }}</div>
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
      <button class="btn primary" type="button" @click="sensor.start()">
        start
      </button>
      <button class="btn" type="button" @click="sensor.stop()">stop</button>
      <button class="btn" type="button" @click="sensor.suspend()">
        suspend
      </button>
      <button class="btn" type="button" @click="sensor.dispose()">
        dispose
      </button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>
