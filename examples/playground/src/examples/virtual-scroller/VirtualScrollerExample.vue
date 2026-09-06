<script setup lang="ts">
import VirtualScroller from './VirtualScroller.vue';
import { VirtualScrollerExample } from './VirtualScrollerExample';

const example = new VirtualScrollerExample.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  items,
  speed,
  // element refs
  scroller,
} = example;
</script>

<template>
  <div class="example">
    <header class="example-header">
      <p>
        {{ example.itemCountLabel }} rows ·
        {{ example.renderedCount }} in the DOM
      </p>
      <nav>
        <button
          type="button"
          class="play"
          :class="{ playing: example.isAutoPlaying }"
          @click="example.toggleAutoPlay()"
        >
          <span class="btn-icon">{{ example.playButtonIcon }}</span>
          {{ example.playButtonLabel }}
        </button>
        <button type="button" @click="example.jumpTo(499999)">
          jump to #500,000
        </button>
        <button type="button" @click="example.jumpToEnd()">
          the end
        </button>
        <button type="button" @click="example.jumpTo(0)">the top</button>
        <label class="speed">
          speed
          <input
            v-model.number="speed"
            type="range"
            min="1"
            max="60"
            step="0.1"
          />
          <span class="speed-value">{{ example.speedLabel }}</span>
        </label>
      </nav>
      <p class="hint">{{ example.autoPlayHint }}</p>
    </header>
    <main class="example-body">
      <VirtualScroller
        ref="scroller"
        v-model="items"
        :assumed-size="56"
        :padding-quantity="10"
        :creep-ms-per-px="example.creepMsPerPx"
        auto-play
        :auto-play-delay="800"
      >
        <template #item="{ item }">
          <div class="row">
            <b>#{{ Number(item.position).toLocaleString() }}</b> —
            {{ item.body }}
          </div>
        </template>
      </VirtualScroller>
    </main>
  </div>
</template>

<style scoped>
.example {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.example-header {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.example-header p {
  margin: 0 0 10px;
  font-size: 13px;
  color: #8b95b5;
}
nav {
  display: flex;
  gap: 8px;
}
nav button {
  padding: 6px 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #dbe1f4;
  font-size: 12.5px;
  cursor: pointer;
}
nav button:hover {
  border-color: #6366f1;
}
nav .btn-icon {
  margin-right: 6px;
}
.speed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #8b95b5;
}
.speed input {
  width: 140px;
  accent-color: #6366f1;
}
.speed-value {
  min-width: 58px;
  color: #dbe1f4;
  font-variant-numeric: tabular-nums;
}
nav button.playing {
  border-color: rgba(52, 211, 153, 0.7);
  background: rgba(52, 211, 153, 0.12);
  color: #6ee7b7;
}
.example-body {
  flex: 1;
  min-height: 0;
}
.row {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  font-size: 13.5px;
  line-height: 1.6;
}
.row b {
  color: #7dd3fc;
}
.example-header .hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8b95b5;
  min-height: 1.6em;
}
nav .play {
  min-width: 8.5em;
  justify-content: center;
}
</style>
