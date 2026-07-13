<script setup lang="ts">
/**
 * The VirtualScroller example, live in the docs. The scroller, its class,
 * and the customized Lenis in this folder are the production files —
 * extracted from an app where they drive 100k-item feeds. Only this
 * wrapper (the data and the chrome) is docs code.
 */
import { ref } from 'vue';
import DemoBox from '../../DemoBox.vue';
import VirtualScroller from './VirtualScroller.vue';
import type { VirtualScrollerExposedUnwrapped } from './VirtualScroller.vue';
import type { BaseItem } from './VirtualScroller.types';

const ITEM_COUNT = 100_000;

// deterministic pseudo-random so every visitor sees the same list
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
    const extraSentences = Math.floor(random() * 4); // varied heights
    let body = `<b>#${(index + 1).toLocaleString()}</b> — ${opener}.`;
    for (let extra = 0; extra < extraSentences; extra++) {
      body +=
        ' Rendered rows are normal-flow blocks between two spacer divs, so the browser stacks them at their real heights for free.';
    }
    items[index] = {
      id: `row-${index}`,
      body,
      position: String(index + 1),
    };
  }
  return items;
}

const items = ref<BaseItem[]>(buildItems());
const scroller = ref<VirtualScrollerExposedUnwrapped<BaseItem> | null>(null);
const isAutoPlaying = ref(false);

function jumpTo(index: number) {
  scroller.value?.scrollToIndex(index, undefined, true, 12);
}

function toggleAutoPlay() {
  if (!scroller.value) return;
  if (isAutoPlaying.value) {
    scroller.value.stopAutoPlay();
  } else {
    scroller.value.startAutoPlay(0);
  }
  isAutoPlaying.value = !isAutoPlaying.value;
}
</script>

<template>
  <DemoBox
    title="Virtual scroller — 100,000 rows, Lenis-driven"
    note="The list is virtual: two spacer divs stand in for everything off-screen, rendered rows flow at their real heights, and a customized Lenis drives the scroll over translateY — the DOM never holds more than the window plus padding. Wheel, drag the touch way, or jump — landings converge as real heights measure in."
  >
    <div class="d-vals evs-stats">
      <div>
        <div class="d-k">items in the list</div>
        <div class="d-n">{{ ITEM_COUNT.toLocaleString() }}</div>
      </div>
      <div>
        <div class="d-k">rows in the DOM</div>
        <div class="d-n grad">{{ scroller?.visibleItems.length ?? 0 }}</div>
      </div>
    </div>

    <div class="evs-frame">
      <VirtualScroller
        ref="scroller"
        v-model="items"
        :assumed-height="56"
        :padding-quantity="10"
      >
        <template #item="{ item }">
          <div class="evs-row" v-html="item.body" />
        </template>
      </VirtualScroller>
    </div>

    <div class="d-row">
      <button class="d-btn primary" type="button" @click="jumpTo(49999)">
        jump to #50,000
      </button>
      <button class="d-btn" type="button" @click="jumpTo(ITEM_COUNT - 1)">
        jump to the end
      </button>
      <button class="d-btn" type="button" @click="jumpTo(0)">
        back to the top
      </button>
      <button class="d-btn" type="button" @click="toggleAutoPlay">
        {{ isAutoPlaying ? 'stop autoplay' : 'autoplay' }}
      </button>
    </div>
  </DemoBox>
</template>

<style scoped>
.evs-stats {
  margin-bottom: 14px;
}
.evs-frame {
  height: 440px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
}
.evs-row {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  font-size: 13.5px;
  line-height: 1.6;
  color: #b7c0dc;
}
.evs-row :deep(b) {
  color: #7dd3fc;
  font-weight: 700;
}
</style>
