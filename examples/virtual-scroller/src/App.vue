<script setup lang="ts">
import { ref } from 'vue';
import VirtualScroller from './VirtualScroller.vue';
import type { VirtualScrollerExposedUnwrapped } from './VirtualScroller.vue';
import type { BaseItem } from './VirtualScroller.types';

const ITEM_COUNT = 100_000;

// deterministic pseudo-random so every run shows the same list
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const OPENERS = [
  'Everything costs proportional to what is observed',
  'The window walks; the list stands still',
  'A hundred thousand rows, a handful of divs',
  'Estimates decide the spacers; real heights decide the rest',
  'Scroll is virtual — the DOM never learns the total',
  'Heights are captured once, on the way in and on the way out',
];

function buildItems(): BaseItem[] {
  const random = seededRandom(42);
  const items = new Array(ITEM_COUNT);
  for (let index = 0; index < ITEM_COUNT; index++) {
    const opener = OPENERS[index % OPENERS.length];
    const extraSentences = Math.floor(random() * 4);
    let body = `<b>#${(index + 1).toLocaleString()}</b> — ${opener}.`;
    for (let extra = 0; extra < extraSentences; extra++) {
      body +=
        ' Rendered rows are normal-flow blocks between two spacer divs, so the browser stacks them at their real heights for free.';
    }
    items[index] = { id: `row-${index}`, body, position: String(index + 1) };
  }
  return items;
}

const items = ref<BaseItem[]>(buildItems());
const scroller = ref<VirtualScrollerExposedUnwrapped<BaseItem> | null>(null);

function jumpTo(index: number) {
  scroller.value?.scrollToIndex(index, undefined, true, 12);
}
</script>

<template>
  <div class="page">
    <header>
      <h1>ivue · Virtual Scroller on Lenis</h1>
      <p>
        {{ ITEM_COUNT.toLocaleString() }} rows ·
        {{ scroller?.visibleItems.length ?? 0 }} in the DOM
      </p>
      <nav>
        <button type="button" @click="jumpTo(49999)">jump to #50,000</button>
        <button type="button" @click="jumpTo(ITEM_COUNT - 1)">the end</button>
        <button type="button" @click="jumpTo(0)">the top</button>
      </nav>
    </header>
    <main>
      <VirtualScroller
        ref="scroller"
        v-model="items"
        :assumed-height="56"
        :padding-quantity="10"
      >
        <template #item="{ item }">
          <div class="row" v-html="item.body" />
        </template>
      </VirtualScroller>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: #0d1226;
  color: #b7c0dc;
}
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
header h1 {
  font-size: 18px;
  color: #fff;
}
header p {
  margin: 4px 0 10px;
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
main {
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
</style>
