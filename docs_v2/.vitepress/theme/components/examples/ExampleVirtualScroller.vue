<script setup lang="ts">
/**
 * The VirtualScroller example, live in the docs. The scroller, its class,
 * and the customized Lenis in this folder are the production files —
 * extracted from an app where they drive 100k-item feeds. Only this
 * wrapper (the chrome) is docs code, and even its logic is the
 * playground example's own class.
 */
import DemoBox from '../DemoBox.vue';
import VirtualScroller from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import { VirtualScrollerExample } from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScrollerExample';

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
  <DemoBox
    title="Virtual scroller — 1,000,000 rows, Lenis-driven"
    note="The list is virtual: two spacer divs stand in for everything off-screen, rendered rows flow at their real heights, and a customized Lenis drives the scroll over translateY — the DOM never holds more than the window plus padding. Wheel, drag the touch way, or jump — landings converge as real heights measure in."
  >
    <div class="d-vals evs-stats">
      <div>
        <div class="d-k">items in the list</div>
        <div class="d-n">{{ example.itemCountLabel }}</div>
      </div>
      <div>
        <div class="d-k">rows in the DOM</div>
        <div class="d-n grad">{{ example.renderedCount }}</div>
      </div>
    </div>

    <div class="evs-frame">
      <VirtualScroller
        ref="scroller"
        scrollbar
        v-model="items"
        :assumed-size="56"
        :padding-quantity="10"
        :creep-ms-per-px="example.creepMsPerPx"
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
      <button class="d-btn primary" type="button" @click="example.jumpTo(499999)">
        jump to #500,000
      </button>
      <button class="d-btn" type="button" @click="example.jumpToEnd()">
        jump to the end
      </button>
      <button class="d-btn" type="button" @click="example.jumpTo(0)">
        back to the top
      </button>
      <button
        class="d-btn evs-play"
        :class="{ 'evs-playing': example.isAutoPlaying }"
        type="button"
        @click="example.toggleAutoPlay()"
      >
        <span class="evs-btn-icon">{{ example.playButtonIcon }}</span>
        {{ example.playButtonLabel }}
      </button>
      <label class="evs-speed">
        speed
        <input
          v-model.number="speed"
          type="range"
          min="1"
          max="60"
          step="0.1"
        />
        <span class="evs-speed-value">{{ example.speedLabel }}</span>
      </label>
    </div>
    <p class="d-mono evs-hint">{{ example.autoPlayHint }}</p>
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
.evs-speed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.evs-speed input {
  width: 140px;
  accent-color: #6366f1;
}
.evs-speed-value {
  min-width: 58px;
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
.evs-hint {
  margin: 8px 0 0;
  min-height: 1.6em;
}
.evs-play {
  min-width: 124px;
  justify-content: center;
}
</style>
