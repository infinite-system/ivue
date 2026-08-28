<script setup lang="ts">
/**
 * The TextMarquee example, live in the docs — the same files the page's
 * code blocks show. The marquee composes the horizontal virtual scroller
 * (items, sizes, pixels) with the pure TextChunker (text) and rides the
 * scroller's autoplay creep for its glide; only this wrapper is docs code,
 * and even its logic is the playground example's own class.
 */
import DemoBox from '../DemoBox.vue';
import TextMarquee from '../../../../../examples/playground/src/examples/text-marquee/TextMarquee.vue';
import {
  TextMarqueeExample,
  BOOK_TEXT,
} from '../../../../../examples/playground/src/examples/text-marquee/TextMarqueeExample';

const example = new TextMarqueeExample.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  speed,
  // element refs
  marquee,
} = example;
</script>

<template>
  <DemoBox
    title="Text marquee — a book as one scrolling line"
    note="A ~400k-character text as ONE line: the pure TextChunker cuts it at spaces into ~400-character chunks, the horizontal virtual scroller glides them as items, and the DOM never holds more than the visible strip. Shift+wheel or swipe scrubs the line; a plain vertical wheel still scrolls this page; the slider changes speed mid-glide."
  >
    <div class="d-vals etm-stats">
      <div>
        <div class="d-k">characters</div>
        <div class="d-n">{{ BOOK_TEXT.length.toLocaleString() }}</div>
      </div>
      <div>
        <div class="d-k">chunks</div>
        <div class="d-n">{{ example.chunkCount.toLocaleString() }}</div>
      </div>
      <div>
        <div class="d-k">chunks in the DOM</div>
        <div class="d-n grad">{{ example.renderedCount }}</div>
      </div>
    </div>

    <div class="etm-frame">
      <TextMarquee ref="marquee" :text="BOOK_TEXT" :px-per-second="speed" />
    </div>

    <div class="d-row">
      <button
        class="d-btn"
        :class="{ 'etm-playing': example.isPlaying }"
        type="button"
        @click="example.togglePlay()"
      >
        <span class="etm-btn-icon">{{ example.playButtonIcon }}</span>
        {{ example.isPlaying ? 'pause the glide' : 'glide' }}
      </button>
      <label class="etm-speed">
        speed
        <input
          v-model.number="speed"
          type="range"
          min="20"
          max="600"
          step="10"
        />
        <span class="etm-speed-value">{{ example.speedLabel }}</span>
      </label>
    </div>
  </DemoBox>
</template>

<style scoped>
.etm-stats {
  margin-bottom: 14px;
}
.etm-frame {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
  margin-bottom: 14px;
}
.etm-frame :deep(.text-marquee) {
  padding: 20px 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  /* the line enters and leaves through a soft edge, not a hard clip */
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent,
    black 5%,
    black 95%,
    transparent
  );
  mask-image: linear-gradient(
    90deg,
    transparent,
    black 5%,
    black 95%,
    transparent
  );
}

.etm-btn-icon {
  margin-right: 6px;
}
.d-btn.etm-playing {
  border-color: rgba(52, 211, 153, 0.6);
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}
.etm-speed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.etm-speed input {
  width: 180px;
  accent-color: #6366f1;
}
.etm-speed-value {
  min-width: 64px;
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
</style>
