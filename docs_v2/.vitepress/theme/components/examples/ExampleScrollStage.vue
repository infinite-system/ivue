<script setup lang="ts">
/**
 * The scroll stage, live in the docs: a pinned scene of 5 scenery layers, a
 * sun and a progress bar, every one a track of the virtual scroller's own
 * sequence. The class is the playground's; this wrapper is the chrome.
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
  // element refs
  scroller,
  stage: stageElement
} = stage;
</script>

<template>
  <DemoBox
    title="Scroll stage — 5 layers of scenery, a sun and a progress bar, all tracks of the scroll"
    note="Nothing on the stage listens to the scroll position. Every layer is a formatter over the same number the text moves by: when a flick or the reading creep hands the compositor a sequence, the stage composes each track over the same values alongside the same animation; when a drag or a wheel writes the scroll from a callback, the tracks are written in that callback. One clock per frame, so the scenery can never drift against the text."
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
      <!-- the pinned stage: its [data-track] children are the layers the class drives -->
      <div ref="stageElement" class="ess-stage" aria-hidden="true">
        <div class="ess-layer ess-sky" data-track="sky"></div>
        <div class="ess-sun-pivot" data-track="sun">
          <div class="ess-sun"></div>
        </div>
        <div class="ess-layer ess-far" data-track="far"></div>
        <div class="ess-layer ess-mid" data-track="mid"></div>
        <div class="ess-layer ess-near" data-track="near"></div>
        <div class="ess-layer ess-ground" data-track="ground"></div>
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
        scrollbar
        @sequence="stage.onSequence($event)"
      >
        <template #item="{ item }">
          <div class="ess-row" :class="{ heading: item.heading }">{{ item.body }}</div>
        </template>
      </VirtualScroller>
    </div>
  </DemoBox>
</template>

<style scoped>
.ess-stats {
  margin-bottom: 12px;
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
.ess-layer {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  will-change: transform;
  background-repeat: repeat-y;
  background-position: 0 0;
}
/* each layer is its period tall plus the frame, so the wrap is never on screen */
.ess-sky {
  height: calc(100% + 900px);
  background-color: #0a1230;
  background-image:
    radial-gradient(1.5px 1.5px at 20% 12%, rgba(255, 255, 255, 0.9), transparent 60%),
    radial-gradient(1px 1px at 68% 31%, rgba(255, 255, 255, 0.8), transparent 60%),
    radial-gradient(1.2px 1.2px at 42% 57%, rgba(255, 255, 255, 0.7), transparent 60%),
    radial-gradient(1px 1px at 85% 74%, rgba(255, 255, 255, 0.85), transparent 60%),
    radial-gradient(1.5px 1.5px at 9% 88%, rgba(255, 255, 255, 0.6), transparent 60%),
    linear-gradient(180deg, #060c22 0%, #0f1a44 55%, #1e2a5e 100%);
  background-size:
    100% 900px,
    100% 900px,
    100% 900px,
    100% 900px,
    100% 900px,
    100% 900px;
}
.ess-far {
  height: calc(100% + 720px);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='720' viewBox='0 0 1200 720'><path fill='%231c2b5a' d='M0 680 L120 560 L260 640 L400 500 L540 620 L700 460 L860 600 L1000 520 L1200 630 L1200 720 L0 720 Z'/></svg>");
  background-size: 1200px 720px;
  background-position: center 0;
}
.ess-mid {
  height: calc(100% + 600px);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'><path fill='%23223a6e' d='M0 580 L90 520 L200 560 L330 440 L470 550 L600 460 L760 570 L900 490 L1050 560 L1200 520 L1200 600 L0 600 Z'/></svg>");
  background-size: 1200px 600px;
  background-position: center 0;
}
.ess-near {
  height: calc(100% + 480px);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='480' viewBox='0 0 1200 480'><path fill='%232e4d86' d='M0 470 L140 420 L260 460 L420 380 L560 450 L720 400 L880 462 L1040 410 L1200 456 L1200 480 L0 480 Z'/></svg>");
  background-size: 1200px 480px;
  background-position: center 0;
}
.ess-ground {
  height: calc(100% + 360px);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='360' viewBox='0 0 1200 360'><path fill='%2334609c' d='M0 300 L200 280 L400 305 L600 275 L800 300 L1000 282 L1200 298 L1200 360 L0 360 Z'/><path fill='%233f6fb0' d='M0 330 L300 318 L600 336 L900 320 L1200 332 L1200 360 L0 360 Z'/></svg>");
  background-size: 1200px 360px;
  background-position: center 0;
}
/* the sun turns about a pivot at the bottom centre: it rises, crosses, sets */
/* the sun starts under the horizon at the left edge; its track carries it
   across the stage on an arc, in the stage's own units */
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
  left: -22px;
  top: -22px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #fff7d6, #ffcf5c 55%, #ff9d3d 100%);
  box-shadow:
    0 0 40px 12px rgba(255, 190, 90, 0.35),
    0 0 120px 40px rgba(255, 160, 70, 0.12);
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
/* the list sits over the stage, its rows glass so the scenery shows through */
.ess-scroller {
  position: absolute;
  inset: 0;
}
/* the rows keep to the left half; the sun crosses the open half */
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
@media (max-width: 640px) {
  .ess-frame {
    height: 78svh;
    border-radius: 0;
  }
  .ess-row {
    margin-right: 12px;
    margin-left: 12px;
  }
}
</style>
