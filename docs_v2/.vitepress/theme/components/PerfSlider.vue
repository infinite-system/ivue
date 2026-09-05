<script setup lang="ts">
import { PerfSlider } from './PerfSlider';

const slider = new PerfSlider.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // element refs
  trackElement,
} = slider;
</script>

<template>
  <div
    class="perf-slider"
    @touchstart.passive="slider.onTouchStart"
    @touchend.passive="slider.onTouchEnd"
  >
    <div
      class="perf-slider-viewport"
      :style="slider.viewportStyle"
    >
      <div
        ref="trackElement"
        class="perf-slider-track"
        :style="slider.trackStyle"
      >
        <slot />
      </div>
    </div>

    <div class="perf-slider-controls">
      <button
        class="perf-slider-arrow prev"
        aria-label="Previous slide"
        @click="slider.previous()"
      >
        ‹
      </button>
      <div class="perf-slider-dots" role="tablist">
        <button
          v-for="index in slider.slideCount"
          :key="index"
          class="perf-slider-dot"
          :class="{ active: slider.isActiveSlide(index) }"
          role="tab"
          :aria-selected="slider.isActiveSlide(index)"
          :aria-label="slider.slideLabel(index)"
          @click="slider.goToSlide(index)"
        />
      </div>
      <button
        class="perf-slider-arrow next"
        aria-label="Next slide"
        @click="slider.next()"
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
  transition: height 0.3s cubic-bezier(0.25, 0.8, 0.35, 1);
}
.perf-slider-track {
  align-items: flex-start;
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
