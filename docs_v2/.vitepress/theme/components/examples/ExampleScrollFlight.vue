<script setup lang="ts">
/**
 * A flight over the range, live in the docs: the scroll stage extended with
 * smooth ridges under haze, a time of day per chapter, drifting clouds, a
 * plane crossing in perspective and a flock on the GPU — every scroll-linked
 * layer a track of the scroller's own sequence, the wingbeat on its own
 * clock. Tap the sky to startle the birds. The class is the playground's;
 * this wrapper is the chrome.
 */
import DemoBox from '../DemoBox.vue';
import VirtualScroller from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import { ScrollFlight } from '../../../../../examples/playground/src/examples/scroll-flight/ScrollFlight';

const flight = new ScrollFlight.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  items,
  onCompositor,
  speed,
  // element refs
  scroller,
  stage: stageElement,
  flockCanvas
} = flight;
</script>

<template>
  <DemoBox
    title="Scroll flight — a range, a plane, a flock, composed on the scroll"
    note="The scroll stage extended: each chapter has a time of day, a smooth skyline under haze, clouds that drift, and a crossing — a flock, a plane in perspective, or both. Every one of them is a transform over the same number the text moves by, composed alongside the scroll's own sequence when the compositor draws it. The wingbeat is the one thing that does not move with the scroll, so it runs on the GPU's own clock. Tap or click the sky to startle the birds."
  >
    <div class="d-vals esf-stats">
      <div>
        <div class="d-k">tracks on the stage</div>
        <div class="d-n">{{ flight.trackCountLabel }}</div>
      </div>
      <div>
        <div class="d-k">who draws them</div>
        <div class="d-n grad" :class="{ live: onCompositor }">{{ flight.modeLabel }}</div>
      </div>
      <div>
        <div class="d-k">this chapter crosses</div>
        <div class="d-n">{{ flight.kindLabel }}</div>
      </div>
      <div>
        <div class="d-k">{{ flight.chapterLabel }}</div>
        <div class="d-n">{{ flight.chapterTitle }}</div>
      </div>
    </div>

    <div class="esf-frame" @pointerdown="flight.onFramePointerDown($event)">
      <!-- the pinned stage: two scene slots, then the crossings the chapters share -->
      <div ref="stageElement" class="esf-stage" aria-hidden="true">
        <div v-for="slot in [0, 1]" :key="slot" class="esf-scene" :data-slot="slot">
          <div class="esf-haze"></div>
          <div class="esf-sun-pivot" data-track="sun">
            <div class="esf-sun"></div>
          </div>
          <div class="esf-cloud esf-cloud-a" data-track="cloud-a"></div>
          <div class="esf-cloud esf-cloud-b" data-track="cloud-b"></div>
          <svg class="esf-ridge" data-track="far" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d="" /></svg>
          <svg class="esf-ridge" data-track="mid" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d="" /></svg>
          <svg class="esf-ridge" data-track="near" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d="" /></svg>
          <svg class="esf-ridge" data-track="ground" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d="" /></svg>
        </div>

        <!-- the flock: its place in the sky is a track; its wings are the GPU's -->
        <div class="esf-flock" data-track="flock">
          <canvas ref="flockCanvas" class="esf-flock-canvas"></canvas>
        </div>

        <!-- the plane: one transform in perspective, one opacity -->
        <div class="esf-plane" data-track="plane">
          <svg viewBox="0 0 200 64" class="esf-plane-svg">
            <defs>
              <linearGradient id="esf-body" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#f4f7fc" />
                <stop offset="1" stop-color="#b9c4d8" />
              </linearGradient>
            </defs>
            <path d="M76 26 L54 6 L74 6 L114 26 Z" fill="#9aa8c0" />
            <path d="M12 36 Q22 24 62 24 L152 24 Q188 24 196 32 Q188 42 152 42 L62 42 Q22 42 12 36 Z" fill="url(#esf-body)" />
            <path d="M150 24 L166 4 L184 4 L174 24 Z" fill="#67e8f9" />
            <path d="M40 40 L20 52 L34 54 L64 40 Z" fill="#c6d0e2" />
            <path d="M72 32 L42 56 L64 58 L116 34 Z" fill="#dfe6f2" />
            <circle cx="92" cy="31" r="2.4" fill="#2b3550" />
            <circle cx="104" cy="31" r="2.4" fill="#2b3550" />
            <circle cx="116" cy="31" r="2.4" fill="#2b3550" />
            <circle cx="128" cy="31" r="2.4" fill="#2b3550" />
            <path d="M170 28 Q182 26 190 30 Q182 34 170 34 Z" fill="#2b3550" />
          </svg>
        </div>

        <div class="esf-progress">
          <div class="esf-progress-bar" data-track="progress"></div>
        </div>
      </div>

      <VirtualScroller
        ref="scroller"
        class="esf-scroller"
        v-model="items"
        :assumed-size="150"
        :padding-quantity="flight.paddingQuantity"
        :creep-ms-per-px="flight.creepMsPerPx"
        scrollbar
        @sequence="flight.onSequence($event)"
      >
        <template #item="{ item }">
          <article class="esf-row" :class="{ heading: item.heading }">
            <template v-if="item.heading">
              <div class="esf-row-eyebrow">{{ item.body }}</div>
              <h3 class="esf-row-title">{{ item.title }}</h3>
            </template>
            <p v-else class="esf-row-text">{{ item.body }}</p>
          </article>
        </template>
      </VirtualScroller>
    </div>

    <div class="d-row esf-controls">
      <button
        class="d-btn esf-play"
        :class="{ 'esf-playing': flight.isAutoPlaying }"
        type="button"
        @click="flight.toggleAutoPlay()"
      >
        <span class="esf-play-icon">{{ flight.playButtonIcon }}</span>
        {{ flight.playButtonLabel }}
      </button>
      <label class="esf-speed">
        speed
        <input v-model.number="speed" type="range" min="1" max="80" step="1" />
        <span class="esf-speed-value">{{ flight.speedLabel }}</span>
      </label>
    </div>
  </DemoBox>
</template>

<style scoped>
.esf-stats {
  margin-bottom: 12px;
}
/* the strip's values are one line each, whatever the label: a wrapping value
   changes the row's height as the reader scrolls and moves the frame under
   the finger */
.esf-stats > div {
  min-width: 0;
}
.esf-stats .d-n {
  font-size: 1.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.esf-stats .d-n.live {
  color: #67e8f9;
}
.esf-frame {
  position: relative;
  height: min(80vh, 840px);
  overflow: hidden;
  border-radius: 14px;
  background: #050a18;
  isolation: isolate;
}
/* the stage is pinned to the frame and gives the plane its perspective */
.esf-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  container-type: size;
  perspective: 1100px;
  perspective-origin: 50% 45%;
}
/* a scene slot: the sky, its opacity a track — the fade between chapters */
.esf-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0;
  will-change: opacity;
  background: linear-gradient(180deg, var(--sky-top, #060c22) 0%, var(--sky-bottom, #1e2a5e) 100%);
}
/* the haze: the sky's warm light pooled at the horizon, over the far ridges */
.esf-haze {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 72%, var(--haze, transparent) 0%, transparent 70%);
}
.esf-ridge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -40%;
  width: 100%;
  height: 140%;
  will-change: transform;
}
.esf-scene[data-time='night'] .esf-ridge {
  filter: saturate(0.6);
}
.esf-sun-pivot {
  position: absolute;
  left: 0;
  bottom: -40px;
  width: 0;
  height: 0;
  will-change: transform;
}
.esf-sun {
  position: absolute;
  left: -40px;
  top: -40px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--sun, radial-gradient(circle at 40% 40%, #fff7d6, #ffcf5c 55%, #ff9d3d 100%));
  box-shadow:
    0 0 70px 22px rgba(255, 200, 120, 0.32),
    0 0 200px 80px rgba(255, 170, 90, 0.14);
}
.esf-scene[data-time='night'] .esf-sun {
  box-shadow:
    0 0 60px 16px rgba(200, 214, 255, 0.28),
    0 0 160px 60px rgba(170, 190, 255, 0.1);
}
/* clouds: soft bodies of the sky's light, each drifting by its own track */
.esf-cloud {
  position: absolute;
  height: 18%;
  border-radius: 50%;
  will-change: transform;
  background: radial-gradient(60% 70% at 50% 60%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.18) 45%, transparent 72%);
  filter: blur(6px);
}
.esf-cloud-a {
  left: 8%;
  top: 14%;
  width: 34%;
}
.esf-cloud-b {
  left: 52%;
  top: 26%;
  width: 42%;
  height: 14%;
  opacity: 0.75;
}
.esf-scene[data-time='night'] .esf-cloud {
  opacity: 0.25;
}
/* the flock's canvas: a window of the sky the birds fly in; where the window is, is a track */
.esf-flock {
  position: absolute;
  left: 0;
  top: 0;
  width: 44cqw;
  height: 34cqh;
  will-change: transform, opacity;
  opacity: 0;
}
.esf-flock-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
/* the plane: a 3D transform against the stage's perspective */
.esf-plane {
  position: absolute;
  left: 0;
  top: 0;
  width: 280px;
  height: 90px;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
  opacity: 0;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35));
}
.esf-plane-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.esf-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
}
.esf-progress-bar {
  position: absolute;
  inset: 0;
  transform-origin: 0 50%;
  transform: scaleX(0);
  background: linear-gradient(90deg, #67e8f9, #818cf8);
  will-change: transform;
}
/* the list over the stage: one centered reading column */
.esf-scroller {
  position: absolute;
  inset: 0;
}
.esf-row {
  max-width: min(560px, 62%);
  margin: 0 auto 28px;
  padding: 18px 26px;
  border-radius: 14px;
  background: rgba(5, 10, 24, 0.38);
  backdrop-filter: blur(2px);
  color: rgba(236, 241, 250, 0.96);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.esf-row-text {
  margin: 0;
  font-size: 19px;
  line-height: 1.65;
}
.esf-row.heading {
  margin-top: 140px;
  margin-bottom: 30px;
  max-width: 90%;
  background: transparent;
  backdrop-filter: none;
  text-align: center;
}
.esf-row-eyebrow {
  font: 600 12px / 1 var(--vp-font-family-base, sans-serif);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.7;
}
.esf-row-title {
  margin: 10px 0 0;
  border: 0;
  padding: 0;
  font: 700 clamp(28px, 4vw, 44px) / 1.05 var(--vp-font-family-base, sans-serif);
  letter-spacing: -0.02em;
  color: #eaf2ff;
  text-shadow: 0 2px 26px rgba(0, 0, 0, 0.55);
}
/* the controls: the play button and the creep's speed */
.esf-controls {
  margin-top: 12px;
}
.dbx .d-btn.esf-play {
  min-width: 124px;
  justify-content: center;
}
.esf-play-icon {
  margin-right: 6px;
}
.d-btn.esf-playing {
  border-color: rgba(52, 211, 153, 0.6);
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}
.esf-speed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.esf-speed input {
  width: 140px;
  accent-color: #6366f1;
}
.esf-speed-value {
  min-width: 52px;
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) {
  /* one stat per line, the value beside its key: nothing wraps, nothing
     is cut short, and the strip's height never changes under the finger */
  .dbx :deep(.d-vals).esf-stats,
  .d-vals.esf-stats {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .esf-stats > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .esf-stats .d-n {
    margin-top: 0;
    font-size: 1.05rem;
  }
  .esf-frame {
    height: 84svh;
    border-radius: 0;
  }
  .esf-row {
    max-width: none;
    margin-left: 14px;
    margin-right: 14px;
    padding: 14px 18px;
  }
  .esf-row-text {
    font-size: 17px;
  }
  .esf-flock {
    width: 70cqw;
  }
  .esf-plane {
    width: 190px;
    height: 61px;
  }
}
</style>
