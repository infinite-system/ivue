<script setup lang="ts">
/**
 * The HorizontalVirtualScroller example, live in the docs. The scroller
 * is the vertical class rotated through its axis seams — the same tuned
 * physics, running sideways over a million cards. Only this wrapper (the
 * data and the chrome) is docs code, and its model lives in
 * HorizontalScrollerExample.ts, written to the same standard the page
 * teaches.
 */
import DemoBox from '../DemoBox.vue';
import HorizontalVirtualScroller from '../../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue';
import { HorizontalScrollerExample } from './HorizontalScrollerExample';

const example = new HorizontalScrollerExample.Class();

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
  <DemoBox
    title="Horizontal scroller — 1,000,000 cards, the vertical class sideways"
    note="The same production scroller class, extended: eight overridden axis seams turn translateY into translateX, heights into widths, deltaY into deltaX. Cursor math, origin rebasing, the creep integrator and the seek pipeline run unchanged. Shift+wheel or swipe drives the strip; a plain vertical wheel scrolls this page; the bar below the cards drags in progress space."
  >
    <div class="d-vals ehs-stats">
      <div>
        <div class="d-k">cards in the list</div>
        <div class="d-n">{{ example.itemCountLabel }}</div>
      </div>
      <div>
        <div class="d-k">cards in the DOM</div>
        <div class="d-n grad">{{ example.renderedCount }}</div>
      </div>
    </div>

    <div class="ehs-frame">
      <HorizontalVirtualScroller
        ref="scroller"
        v-model="items"
        scrollbar
        :assumed-size="230"
        :padding-quantity="8"
        :creep-ms-per-px="example.creepMsPerPx"
        auto-play
        :auto-play-delay="800"
      >
        <template #item="{ item }">
          <div class="ehs-card">
            <b>#{{ Number(item.position).toLocaleString() }}</b>
            <span>{{ item.body }}</span>
          </div>
        </template>
      </HorizontalVirtualScroller>
    </div>

    <div class="d-row">
      <button class="d-btn primary" type="button" @click="example.jumpTo(499999)">
        jump to #500,000
      </button>
      <button class="d-btn" type="button" @click="example.jumpToEnd()">
        jump to the end
      </button>
      <button class="d-btn" type="button" @click="example.jumpTo(0)">
        back to the start
      </button>
      <button
        class="d-btn"
        :class="{ 'ehs-playing': example.isAutoPlaying }"
        type="button"
        @click="example.toggleAutoPlay()"
      >
        <span class="ehs-btn-icon">{{ example.playButtonIcon }}</span>
        {{ example.playButtonLabel }}
      </button>
      <label class="ehs-speed">
        speed
        <input
          v-model.number="speed"
          type="range"
          min="10"
          max="600"
          step="10"
        />
        <span class="ehs-speed-value">{{ example.speedLabel }}</span>
      </label>
    </div>
  </DemoBox>
</template>

<style scoped>
.ehs-stats {
  margin-bottom: 14px;
}
.ehs-frame {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
  margin-bottom: 14px;
}
.ehs-frame :deep(.virtual-scroller--x) {
  padding: 16px 16px 26px; /* main-axis 16px counts toward the extent;
                              the bottom band hosts the built-in track */
}
.ehs-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-right: 12px; /* the gap between cards IS card width — measured */
  padding: 18px 20px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.06);
  white-space: nowrap; /* natural width per caption — every card differs */
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.ehs-card :deep(b),
.ehs-card b {
  color: #7dd3fc;
  font-weight: 700;
  font-size: 15px;
}

.ehs-btn-icon {
  margin-right: 6px;
}
.d-btn.ehs-playing {
  border-color: rgba(52, 211, 153, 0.6);
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}
.ehs-speed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.ehs-speed input {
  width: 150px;
  accent-color: #6366f1;
}
.ehs-speed-value {
  min-width: 58px;
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
</style>
