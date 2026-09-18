<script setup lang="ts">
/**
 * The scroll stage, live in the docs: a scene per chapter — its own sky and
 * skyline, four ridges at their fractions of the chapter's travel, a sun
 * crossing once — fading into the next chapter's scene, every one of them a
 * track of the virtual scroller's own sequence. Two slots alternate. The
 * class is the playground's; this wrapper is the chrome.
 */
import DemoBox from '../DemoBox.vue';
import VirtualScroller from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import { ScrollStage } from '../../../../../examples/playground/src/examples/scroll-stage/ScrollStage';

const stage = new ScrollStage.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  items,
  onCompositor,
  speed,
  // element refs
  scroller,
  stage: stageElement
} = stage;
</script>

<template>
  <DemoBox
    title="Scroll stage — a scene per chapter, composed on the scroll"
    note="Each chapter of the list owns a scene: its own sky and skyline, 4 ridges moving at their fractions of the chapter's travel, a sun crossing once. As a chapter ends, its scene fades into the next chapter's. Nothing on the stage listens to the scroll position: every layer is a formatter over the same number the text moves by, composed alongside the scroll's own sequence when the compositor draws it, written in the same callback when a drag or a wheel does. One clock per frame, so the scenery can never drift against the text."
  >
    <div class="d-vals ess-stats">
      <div>
        <div class="d-k">tracks on the stage</div>
        <div class="d-n">{{ stage.trackCountLabel }}</div>
      </div>
      <div>
        <div class="d-k">who draws them</div>
        <div class="d-n grad" :class="{ live: onCompositor }">{{ stage.modeLabel }}</div>
      </div>
      <div>
        <div class="d-k">scroll position</div>
        <div class="d-n">{{ stage.positionLabel }}</div>
      </div>
      <div>
        <div class="d-k">rows</div>
        <div class="d-n">{{ stage.itemCountLabel }}</div>
      </div>
    </div>

    <div class="ess-frame">
      <!-- the pinned stage: two scene slots the class draws into and drives -->
      <div ref="stageElement" class="ess-stage" aria-hidden="true">
        <div v-for="slot in [0, 1]" :key="slot" class="ess-scene" :data-slot="slot">
          <div class="ess-sun-pivot" data-track="sun">
            <div class="ess-sun"></div>
          </div>
          <svg class="ess-ridge" data-track="far" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path d="" />
          </svg>
          <svg class="ess-ridge" data-track="mid" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path d="" />
          </svg>
          <svg class="ess-ridge" data-track="near" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path d="" />
          </svg>
          <svg class="ess-ridge" data-track="ground" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path d="" />
          </svg>
        </div>
        <div class="ess-headline">{{ stage.chapterLabel }}</div>
        <div class="ess-progress">
          <div class="ess-progress-bar" data-track="progress"></div>
        </div>
      </div>

      <VirtualScroller
        ref="scroller"
        class="ess-scroller"
        v-model="items"
        :assumed-size="64"
        :padding-quantity="stage.paddingQuantity"
        :creep-ms-per-px="stage.creepMsPerPx"
        scrollbar
        @sequence="stage.onSequence($event)"
      >
        <template #item="{ item }">
          <div class="ess-row" :class="{ heading: item.heading }">{{ item.body }}</div>
        </template>
      </VirtualScroller>
    </div>

    <div class="d-row ess-controls">
      <button
        class="d-btn ess-play"
        :class="{ 'ess-playing': stage.isAutoPlaying }"
        type="button"
        @click="stage.toggleAutoPlay()"
      >
        <span class="ess-play-icon">{{ stage.playButtonIcon }}</span>
        {{ stage.playButtonLabel }}
      </button>
      <label class="ess-speed">
        speed
        <input v-model.number="speed" type="range" min="1" max="80" step="1" />
        <span class="ess-speed-value">{{ stage.speedLabel }}</span>
      </label>
    </div>
  </DemoBox>
</template>

<style scoped>
.ess-stats {
  margin-bottom: 12px;
}
/* the strip's values are one line each, whatever the label: a wrapping value
   changes the row's height as the reader scrolls and moves the frame under
   the finger */
.ess-stats > div {
  min-width: 0;
}
.ess-stats .d-n {
  font-size: 1.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ess-stats .d-n.live {
  color: #67e8f9;
}
.ess-frame {
  position: relative;
  height: min(72vh, 720px);
  overflow: hidden;
  border-radius: 12px;
  background: #050a18;
  isolation: isolate;
}
/* the stage is pinned to the frame; the list scrolls over it */
.ess-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  /* the sun's arc is in the stage's own units (cqw, cqh) */
  container-type: size;
}
/* a scene slot: the whole sky, its opacity a track — the fade between chapters */
.ess-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0;
  will-change: opacity;
  background: linear-gradient(180deg, var(--sky-top, #060c22) 0%, var(--sky-bottom, #1e2a5e) 100%);
}
/* a ridge is a tile taller than the frame by the most it can travel in a
   chapter, anchored to the bottom, so a chapter's travel never shows its edge */
.ess-ridge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -40%;
  width: 100%;
  height: 140%;
  will-change: transform;
}
/* the sun starts under the horizon; its track carries it across the open half */
.ess-sun-pivot {
  position: absolute;
  left: 0;
  bottom: -40px;
  width: 0;
  height: 0;
  will-change: transform;
}
.ess-sun {
  position: absolute;
  left: -34px;
  top: -34px;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #fff7d6, #ffcf5c 55%, #ff9d3d 100%);
  box-shadow:
    0 0 60px 18px rgba(255, 190, 90, 0.35),
    0 0 160px 60px rgba(255, 160, 70, 0.14);
}
.ess-headline {
  position: absolute;
  right: 18px;
  top: 14px;
  font: 700 clamp(22px, 4vw, 40px) / 1 var(--vp-font-family-base, sans-serif);
  letter-spacing: -0.02em;
  color: rgba(234, 242, 255, 0.92);
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.5);
}
.ess-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
}
.ess-progress-bar {
  position: absolute;
  inset: 0;
  transform-origin: 0 50%;
  transform: scaleX(0);
  background: linear-gradient(90deg, #67e8f9, #818cf8);
  will-change: transform;
}
/* the list sits over the stage; the rows keep to the left half so the scene breathes */
.ess-scroller {
  position: absolute;
  inset: 0;
}
.ess-row {
  margin: 0 52% 8px 24px;
  max-width: 560px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(5, 10, 24, 0.55);
  backdrop-filter: blur(2px);
  color: rgba(226, 232, 240, 0.9);
  font-size: 14px;
  line-height: 1.45;
}
.ess-row.heading {
  margin-top: 26px;
  background: rgba(103, 232, 249, 0.14);
  color: #eaf2ff;
  font-weight: 700;
  font-size: 18px;
}
/* the controls: the play button and the creep's speed */
.ess-controls {
  margin-top: 12px;
}
.dbx .d-btn.ess-play {
  min-width: 124px;
  justify-content: center;
}
.ess-play-icon {
  margin-right: 6px;
}
.d-btn.ess-playing {
  border-color: rgba(52, 211, 153, 0.6);
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}
.ess-speed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.ess-speed input {
  width: 140px;
  accent-color: #6366f1;
}
.ess-speed-value {
  min-width: 52px;
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) {
  /* one stat per line, the value beside its key: nothing wraps, nothing
     is cut short, and the strip's height never changes under the finger */
  .dbx :deep(.d-vals).ess-stats,
  .d-vals.ess-stats {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .ess-stats > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .ess-stats .d-n {
    margin-top: 0;
    font-size: 1.05rem;
  }
  .ess-frame {
    height: 78svh;
    border-radius: 0;
  }
  .ess-row {
    margin-right: 30%;
    margin-left: 12px;
  }
}
</style>
