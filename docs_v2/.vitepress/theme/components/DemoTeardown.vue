<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import DemoBox from './DemoBox.vue';

class $Sensor {
  get temp() {
    return ref(20);
  }
  get watching() {
    return ref(false);
  }
  get fired() {
    return ref(0);
  }
  get last() {
    return ref('');
  }

  #stop?: () => void;

  start() {
    if (this.watching.value) return;
    this.watching.value = true;
    // $watch registers in the instance's lazy effect scope
    this.#stop = (this as any).$watch(
      () => this.temp.value,
      (v: number, o: number) => {
        this.fired.value++;
        this.last.value = `${o} → ${v}`;
      },
    );
  }
  stop() {
    this.#stop?.();
    this.#stop = undefined;
    this.watching.value = false;
  }
  dispose() {
    (this as any).$stopEffects(); // stops the scope, clears every cached cell
    this.watching.value = false; // fresh cells materialize on next access
  }
}
const Sensor = Reactive($Sensor);
const s: any = new Sensor();
onUnmounted(() => s.$stopEffects());
</script>

<template>
  <DemoBox
    title="$watch and $stopEffects, live"
    note="Start registers a watcher in the instance's lazily created effect scope. Dispose calls $stopEffects: the scope stops and every cached cell is dropped, so state re-materializes fresh."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">temp</div>
        <div class="d-n">{{ s.temp.value }}&deg;</div>
      </div>
      <div>
        <div class="d-k">watcher</div>
        <div class="d-n" :class="s.watching.value ? 'grad' : ''">
          {{ s.watching.value ? 'ON' : 'off' }}
        </div>
      </div>
      <div>
        <div class="d-k">fired</div>
        <div class="d-n">{{ s.fired.value }}&times;</div>
      </div>
    </div>
    <div class="d-row">
      <input
        class="d-slider"
        type="range"
        min="0"
        max="40"
        v-model.number="s.temp.value"
        aria-label="temperature"
      />
    </div>
    <div class="d-row">
      <button
        class="d-btn primary"
        type="button"
        @click="s.watching.value ? s.stop() : s.start()"
      >
        {{ s.watching.value ? 'Stop watch' : 'Start $watch' }}
      </button>
      <button class="d-btn" type="button" @click="s.dispose">Dispose ($stopEffects)</button>
      <span v-if="s.last.value" class="d-mono"><code>$watch</code> {{ s.last.value }}</span>
    </div>
  </DemoBox>
</template>
