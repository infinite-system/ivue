<script setup lang="ts">
/**
 * The VirtualScroller example, live in the docs. The scroller, its class,
 * and the customized Lenis in this folder are the production files —
 * extracted from an app where they drive 100k-item feeds. Only this
 * wrapper (the data and the chrome) is docs code.
 */
import { computed, ref } from 'vue';
import DemoBox from '../DemoBox.vue';
import VirtualScroller from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import type { VirtualScrollerExposedUnwrapped } from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import type { BaseItem } from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.types';

const ITEM_COUNT = 1_000_000;

const OPENERS = [
  'Everything costs proportional to what is observed',
  'The window walks; the list stands still',
  'A million rows, a handful of divs',
  'Estimates decide the spacers; real heights decide the rest',
  'Scroll is virtual — the DOM never learns the total',
  'Heights are captured once, on the way in and on the way out',
];

// One million rows must stay memory-sane: bodies are 24 SHARED string
// variants (opener × padding length) — unique text per row would be
// hundreds of MB of strings. The row number renders from `position`.
const BODY_VARIANTS: string[] = [];
for (let openerIndex = 0; openerIndex < OPENERS.length; openerIndex++) {
  for (let extraSentences = 0; extraSentences < 4; extraSentences++) {
    let body = `${OPENERS[openerIndex]}.`;
    for (let extra = 0; extra < extraSentences; extra++) {
      body +=
        ' Rendered rows are normal-flow blocks between two spacer divs, so the browser stacks them at their real heights for free.';
    }
    BODY_VARIANTS.push(body);
  }
}

function buildItems(): BaseItem[] {
  const items = new Array(ITEM_COUNT);
  for (let index = 0; index < ITEM_COUNT; index++) {
    items[index] = {
      id: String(index),
      body: BODY_VARIANTS[(index * 7) % BODY_VARIANTS.length],
      position: String(index + 1),
    };
  }
  return items;
}

const items = ref<BaseItem[]>(buildItems());
const scroller = ref<VirtualScrollerExposedUnwrapped<BaseItem> | null>(null);

// the scroller's own reactive state — flips off when the reader scrolls up
const isAutoPlaying = computed(() => scroller.value?.isAutoPlaying ?? false);

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
}
</script>

<template>
  <DemoBox
    title="Virtual scroller — 1,000,000 rows, Lenis-driven"
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
        auto-play
        :auto-play-delay="800"
      >
        <template #item="{ item }">
          <div class="evs-row">
            <b>#{{ Number(item.position).toLocaleString() }}</b> — {{ item.body }}
          </div>
        </template>
      </VirtualScroller>
    </div>

    <div class="d-row">
      <button class="d-btn primary" type="button" @click="jumpTo(499999)">
        jump to #500,000
      </button>
      <button class="d-btn" type="button" @click="jumpTo(ITEM_COUNT - 1)">
        jump to the end
      </button>
      <button class="d-btn" type="button" @click="jumpTo(0)">
        back to the top
      </button>
      <button
        class="d-btn"
        :class="{ 'evs-playing': isAutoPlaying }"
        type="button"
        @click="toggleAutoPlay"
      >
        <span class="evs-btn-icon">{{ isAutoPlaying ? '⏸' : '▶' }}</span>
        {{ isAutoPlaying ? 'pause autoplay' : 'autoplay' }}
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

.evs-btn-icon {
  margin-right: 6px;
}
.d-btn.evs-playing {
  border-color: rgba(52, 211, 153, 0.6);
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}
</style>
