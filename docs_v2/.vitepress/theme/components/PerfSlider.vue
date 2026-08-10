<script setup lang="ts">
import { ref, computed, useSlots } from 'vue';

/**
 * A dependency-free slide carousel. Each direct child element of the default
 * slot becomes one slide; dots navigate, arrows step, swipe works on touch —
 * EXCEPT on narrow screens, where slides often contain horizontally
 * scrollable tables: there a horizontal pan must scroll the table, never
 * flick the slide, so swipe is disabled and the arrows move under the slide
 * beside the dots. No autoplay — numbers are for reading, not for racing.
 */
const slots = useSlots();
const activeIndex = ref(0);

const slideCount = computed(() => {
  const children = slots.default?.() ?? [];
  return children.filter((node) => typeof node.type !== 'symbol').length;
});

function goTo(index: number) {
  const count = slideCount.value;
  activeIndex.value = ((index % count) + count) % count;
}

function isNarrowScreen(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 719px)').matches
  );
}

let touchStartX = 0;
function onTouchStart(event: TouchEvent) {
  touchStartX = event.touches[0]?.clientX ?? 0;
}
function onTouchEnd(event: TouchEvent) {
  // On narrow screens a horizontal pan belongs to the slide's own
  // scrollable content (tables) — never steal it for slide navigation.
  if (isNarrowScreen()) return;
  const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
  if (Math.abs(deltaX) > 40) goTo(activeIndex.value + (deltaX < 0 ? 1 : -1));
}
</script>

<template>
  <div
    class="perf-slider"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div class="perf-slider-viewport">
      <div
        class="perf-slider-track"
        :style="{ transform: `translateX(-${activeIndex * 100}%)` }"
      >
        <slot />
      </div>
    </div>

    <div class="perf-slider-controls">
      <button
        class="perf-slider-arrow prev"
        aria-label="Previous slide"
        @click="goTo(activeIndex - 1)"
      >
        ‹
      </button>
      <div class="perf-slider-dots" role="tablist">
        <button
          v-for="index in slideCount"
          :key="index"
          class="perf-slider-dot"
          :class="{ active: index - 1 === activeIndex }"
          role="tab"
          :aria-selected="index - 1 === activeIndex"
          :aria-label="`Slide ${index}`"
          @click="goTo(index - 1)"
        />
      </div>
      <button
        class="perf-slider-arrow next"
        aria-label="Next slide"
        @click="goTo(activeIndex + 1)"
      >
        ›
      </button>
    </div>
  </div>
</template>

<style scoped>
.perf-slider {
  position: relative;
  margin: 24px 0 8px;
}
.perf-slider-viewport {
  overflow: hidden;
}
.perf-slider-track {
  display: flex;
  transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.35, 1);
}
.perf-slider-track > :deep(*) {
  flex: 0 0 100%;
  min-width: 100%;
  box-sizing: border-box;
  padding: 0 44px;
}
.perf-slider-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}
.perf-slider-arrow {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
  transition: color 0.2s, border-color 0.2s;
  flex: none;
}
.perf-slider-arrow:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.perf-slider-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.perf-slider-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: var(--vp-c-divider);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.perf-slider-dot.active {
  background: var(--vp-c-brand-1);
  transform: scale(1.25);
}

/* Wide screens: arrows float at the slide's sides, dots stay centered. */
@media (min-width: 720px) {
  .perf-slider-arrow.prev,
  .perf-slider-arrow.next {
    position: absolute;
    top: 42%;
    transform: translateY(-50%);
  }
  .perf-slider-arrow.prev {
    left: 0;
  }
  .perf-slider-arrow.next {
    right: 0;
  }
}

/* Narrow screens: no side padding (arrows are below), tables own the pan. */
@media (max-width: 719px) {
  .perf-slider-track > :deep(*) {
    padding: 0 4px;
  }
}
</style>
