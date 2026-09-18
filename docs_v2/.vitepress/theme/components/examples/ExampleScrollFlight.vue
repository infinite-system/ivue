<script setup lang="ts">
/**
 * A flight through three worlds, live in the docs: the scroll stage extended
 * with a theme per chapter — mountains with snow, a beach with palms and a
 * sea, a rain forest with rain — a time of day, two planes built in real 3D
 * from CSS planes (a jet flying into the screen, a seaplane coming out of it)
 * and a flock on the GPU. Every scroll-linked layer is a track of the
 * scroller's own sequence; the wingbeat, the rain and the propeller are
 * clocks of their own. Tap the sky to startle the birds. The class is the
 * playground's; this wrapper is the chrome.
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
    title="Scroll flight — three worlds, two planes, a flock, composed on the scroll"
    note="The scroll stage extended: each chapter is a world — mountains under snow, a beach with palms, a rain forest in the rain — at its own time of day, with a crossing: a jet flying into the screen, a seaplane coming out of it, a flock. Every one of them is a transform over the same number the text moves by, composed alongside the scroll's own sequence when the compositor draws it. The wingbeat, the rain and the propeller are the only things that do not move with the scroll, so they run on their own clocks. Tap or click the sky to startle the birds."
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
        <div class="d-k">{{ flight.themeLabel }}</div>
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
          <div class="esf-stars"></div>
          <div class="esf-haze"></div>
          <div class="esf-sun-pivot" data-track="sun">
            <div class="esf-sun"></div>
          </div>
          <div class="esf-cloud esf-cloud-a" data-track="cloud-a"></div>
          <div class="esf-cloud esf-cloud-b" data-track="cloud-b"></div>

          <!-- the mountains: four ridges, the far two under snow -->
          <svg class="esf-ridge esf-mountains" data-track="far" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /><path class="snow" d="" /></svg>
          <svg class="esf-ridge esf-mountains" data-track="mid" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /><path class="snow" d="" /></svg>
          <svg class="esf-ridge esf-mountains" data-track="near" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /><path class="snow" d="" /></svg>
          <svg class="esf-ridge esf-mountains" data-track="ground" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /><path class="snow" d="" /></svg>

          <!-- the beach: an island, the sea, the sand, the palms -->
          <svg class="esf-ridge esf-beach esf-island" data-track="island" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /></svg>
          <div class="esf-beach esf-sea">
            <div class="esf-waves"></div>
          </div>
          <div class="esf-beach esf-sand"></div>
          <svg class="esf-beach esf-palms" data-track="palms" viewBox="0 0 1000 400" preserveAspectRatio="xMaxYMax meet">
            <g class="esf-palm" transform="translate(760 400) scale(1.15)">
              <path d="M0 0 C 14 -90, 8 -180, 22 -260" stroke="#2b1d12" stroke-width="14" fill="none" stroke-linecap="round" />
              <g transform="translate(22 -262)">
                <path d="M0 0 C -60 -50, -140 -40, -190 10 C -120 -10, -60 0, 0 0 Z" fill="#1f5a34" />
                <path d="M0 0 C 60 -50, 140 -40, 190 10 C 120 -10, 60 0, 0 0 Z" fill="#256a3d" />
                <path d="M0 0 C -30 -80, -90 -120, -150 -110 C -90 -80, -40 -40, 0 0 Z" fill="#2c7a46" />
                <path d="M0 0 C 30 -80, 90 -120, 150 -110 C 90 -80, 40 -40, 0 0 Z" fill="#1f5a34" />
                <path d="M0 0 C -10 -90, 10 -140, 40 -160 C 20 -110, 10 -60, 0 0 Z" fill="#2c7a46" />
                <path d="M0 0 C -50 30, -120 60, -170 110 C -110 50, -50 30, 0 0 Z" fill="#1a4d2c" />
                <path d="M0 0 C 50 30, 120 60, 170 110 C 110 50, 50 30, 0 0 Z" fill="#1f5a34" />
                <circle cx="-8" cy="6" r="9" fill="#5a3a1a" /><circle cx="8" cy="8" r="9" fill="#5a3a1a" />
              </g>
            </g>
            <g class="esf-palm" transform="translate(900 400) scale(0.8)">
              <path d="M0 0 C -10 -80, -4 -160, -18 -230" stroke="#2b1d12" stroke-width="13" fill="none" stroke-linecap="round" />
              <g transform="translate(-18 -232)">
                <path d="M0 0 C -60 -50, -140 -40, -190 10 C -120 -10, -60 0, 0 0 Z" fill="#1f5a34" />
                <path d="M0 0 C 60 -50, 140 -40, 190 10 C 120 -10, 60 0, 0 0 Z" fill="#256a3d" />
                <path d="M0 0 C -30 -80, -90 -120, -150 -110 C -90 -80, -40 -40, 0 0 Z" fill="#2c7a46" />
                <path d="M0 0 C 30 -80, 90 -120, 150 -110 C 90 -80, 40 -40, 0 0 Z" fill="#1f5a34" />
                <path d="M0 0 C -50 30, -120 60, -170 110 C -110 50, -50 30, 0 0 Z" fill="#1a4d2c" />
                <path d="M0 0 C 50 30, 120 60, 170 110 C 110 50, 50 30, 0 0 Z" fill="#1f5a34" />
              </g>
            </g>
            <g class="esf-palm" transform="translate(120 400) scale(0.95)">
              <path d="M0 0 C 16 -90, 30 -170, 50 -240" stroke="#2b1d12" stroke-width="13" fill="none" stroke-linecap="round" />
              <g transform="translate(50 -242)">
                <path d="M0 0 C -60 -50, -140 -40, -190 10 C -120 -10, -60 0, 0 0 Z" fill="#1f5a34" />
                <path d="M0 0 C 60 -50, 140 -40, 190 10 C 120 -10, 60 0, 0 0 Z" fill="#256a3d" />
                <path d="M0 0 C -30 -80, -90 -120, -150 -110 C -90 -80, -40 -40, 0 0 Z" fill="#2c7a46" />
                <path d="M0 0 C 30 -80, 90 -120, 150 -110 C 90 -80, 40 -40, 0 0 Z" fill="#1f5a34" />
                <path d="M0 0 C -50 30, -120 60, -170 110 C -110 50, -50 30, 0 0 Z" fill="#1a4d2c" />
                <path d="M0 0 C 50 30, 120 60, 170 110 C 110 50, 50 30, 0 0 Z" fill="#1f5a34" />
              </g>
            </g>
          </svg>

          <!-- the rain forest: three canopies with their trunks, mist, rain -->
          <svg class="esf-ridge esf-forest" data-track="canopy-far" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /></svg>
          <div class="esf-forest esf-mist"></div>
          <svg class="esf-ridge esf-forest" data-track="canopy-mid" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /></svg>
          <svg class="esf-ridge esf-forest" data-track="canopy-near" viewBox="0 0 2000 1000" preserveAspectRatio="xMidYMax slice"><path d="" /></svg>
          <div class="esf-forest esf-rain"></div>
        </div>

        <!-- the flock: its place in the sky is a track; its wings are the GPU's -->
        <div class="esf-flock" data-track="flock">
          <canvas ref="flockCanvas" class="esf-flock-canvas"></canvas>
        </div>

        <!-- the jet: a 3D model of CSS planes; one transform in perspective, one opacity -->
        <div class="esf-plane esf-jet" data-track="jet">
          <div class="esf-model">
            <div class="jet-fuselage"></div>
            <div class="jet-nose"></div>
            <div class="jet-cabin"></div>
            <div class="jet-wing left"></div>
            <div class="jet-wing right"></div>
            <div class="jet-engine left"></div>
            <div class="jet-engine right"></div>
            <div class="jet-tailplane left"></div>
            <div class="jet-tailplane right"></div>
            <div class="jet-fin"></div>
          </div>
        </div>

        <!-- the seaplane: high wing, floats, a propeller on its own clock -->
        <div class="esf-plane esf-seaplane" data-track="seaplane">
          <div class="esf-model">
            <div class="sea-fuselage"></div>
            <div class="sea-nose"></div>
            <div class="sea-cabin"></div>
            <div class="sea-wing"></div>
            <div class="sea-strut left"></div>
            <div class="sea-strut right"></div>
            <div class="sea-float left"></div>
            <div class="sea-float right"></div>
            <div class="sea-tailplane"></div>
            <div class="sea-fin"></div>
            <div class="sea-prop"></div>
          </div>
        </div>

        <!-- the interludes: two media slots the list makes room for; a picture, or a video on its own clock -->
        <figure v-for="slot in [0, 1]" :key="slot" class="esf-media" :data-media="slot">
          <img class="esf-media-image" alt="" decoding="async" />
          <video class="esf-media-video" muted loop playsinline preload="metadata"></video>
          <figcaption class="esf-media-caption" data-caption></figcaption>
        </figure>

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
        auto-play
        :auto-play-delay="800"
        @sequence="flight.onSequence($event)"
        @sequence-rate="flight.onSequenceRate($event)"
      >
        <template #item="{ item }">
          <!-- an interlude row is an empty span of the list: the stage shows its media behind it -->
          <div v-if="item.interlude" class="esf-interlude" :aria-label="item.interlude.caption"></div>
          <article v-else class="esf-row" :class="{ heading: item.heading }">
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
.esf-stats .d-n.live {
  color: #67e8f9;
}
/* the strip's values are one line each, whatever the label */
.esf-stats > div {
  min-width: 0;
}
.esf-stats .d-n {
  font-size: 1.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.esf-frame {
  position: relative;
  height: min(82vh, 900px);
  margin-inline: -18px; /* through the demo box's own padding: the reading frame takes the whole width */
  overflow: hidden;
  background: #050a18;
  isolation: isolate;
}
/* the stage is pinned to the frame and gives the planes their perspective */
.esf-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  container-type: size;
  perspective: 1000px;
  perspective-origin: 50% 40%;
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
/* a world shows its own layers only */
.esf-scene .esf-mountains,
.esf-scene .esf-beach,
.esf-scene .esf-forest {
  display: none;
}
.esf-scene[data-theme='mountains'] .esf-mountains,
.esf-scene[data-theme='beach'] .esf-beach,
.esf-scene[data-theme='rainforest'] .esf-forest {
  display: block;
}
/* stars, at night */
.esf-stars {
  position: absolute;
  inset: 0;
  opacity: 0;
  background-image:
    radial-gradient(1.2px 1.2px at 12% 18%, #fff 60%, transparent 62%),
    radial-gradient(1px 1px at 28% 8%, #dfe6ff 60%, transparent 62%),
    radial-gradient(1.4px 1.4px at 41% 24%, #fff 60%, transparent 62%),
    radial-gradient(1px 1px at 55% 12%, #fff 60%, transparent 62%),
    radial-gradient(1.6px 1.6px at 66% 30%, #fff5d6 60%, transparent 62%),
    radial-gradient(1px 1px at 74% 6%, #fff 60%, transparent 62%),
    radial-gradient(1.2px 1.2px at 83% 20%, #dfe6ff 60%, transparent 62%),
    radial-gradient(1px 1px at 92% 34%, #fff 60%, transparent 62%),
    radial-gradient(1.4px 1.4px at 20% 40%, #fff 60%, transparent 62%),
    radial-gradient(1px 1px at 48% 44%, #fff 60%, transparent 62%),
    radial-gradient(1.2px 1.2px at 7% 30%, #fff 60%, transparent 62%),
    radial-gradient(1px 1px at 60% 3%, #fff 60%, transparent 62%),
    radial-gradient(1.4px 1.4px at 35% 50%, #fff 60%, transparent 62%),
    radial-gradient(1px 1px at 88% 48%, #fff 60%, transparent 62%);
}
.esf-scene[data-time='night'] .esf-stars {
  opacity: 0.9;
}
/* the haze: the sky's warm light pooled at the horizon, over the far layers */
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
.esf-scene[data-theme='rainforest'] .esf-cloud {
  opacity: 0.55;
  filter: blur(14px);
}

/* THE BEACH */
.esf-island {
  bottom: 0;
  height: 100%;
}
.esf-sea {
  position: absolute;
  left: 0;
  right: 0;
  top: 60%;
  height: 26%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--sea, #1e5f8a) 0%, color-mix(in srgb, var(--sea, #1e5f8a) 70%, #000) 100%);
}
/* the waves: a shimmer of light lines sliding over the sea on the compositor's own clock */
.esf-waves {
  position: absolute;
  left: -20%;
  right: -20%;
  top: 0;
  height: 200%;
  background: repeating-linear-gradient(
    176deg,
    transparent 0 22px,
    rgba(255, 255, 255, 0.08) 22px 24px,
    transparent 24px 41px,
    rgba(255, 255, 255, 0.05) 41px 42px
  );
  animation: esf-waves 6s linear infinite;
  will-change: transform;
}
@keyframes esf-waves {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-4%, -50%, 0);
  }
}
.esf-sand {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 16%;
  background: linear-gradient(180deg, var(--sand, #c9a66b) 0%, color-mix(in srgb, var(--sand, #c9a66b) 80%, #000) 100%);
  border-top-left-radius: 50% 40%;
}
.esf-palms {
  position: absolute;
  right: 0;
  bottom: 4%;
  width: 62%;
  height: 46%;
  will-change: transform;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
}
.esf-scene[data-time='night'] .esf-palms,
.esf-scene[data-time='dusk'] .esf-palms {
  filter: brightness(0.35) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
}

/* THE RAIN FOREST */
.esf-mist {
  position: absolute;
  left: 0;
  right: 0;
  top: 46%;
  height: 24%;
  background: linear-gradient(180deg, transparent 0%, rgba(230, 240, 236, 0.34) 45%, transparent 100%);
  filter: blur(4px);
}
/* the rain: a streaked tile falling on the compositor's own clock, nothing to do with the scroll */
.esf-rain {
  position: absolute;
  left: 0;
  right: 0;
  top: -100%;
  height: 200%;
  background: repeating-linear-gradient(
    100deg,
    transparent 0 17px,
    rgba(220, 235, 245, 0.16) 17px 18px,
    transparent 18px 31px,
    rgba(220, 235, 245, 0.1) 31px 32px
  );
  background-size: 100% 260px;
  animation: esf-rain 0.55s linear infinite;
  will-change: transform;
  opacity: 0.9;
}
@keyframes esf-rain {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-2%, 260px, 0);
  }
}

/* THE FLOCK */
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

/* THE PLANES — real 3D: a group of CSS planes under the stage's perspective.
   The model's nose points along +x; a yaw turns it into or out of the screen. */
.esf-plane {
  position: absolute;
  left: 0;
  top: 0;
  width: 260px;
  height: 60px;
  transform-style: preserve-3d;
  will-change: transform, opacity;
  opacity: 0;
}
.esf-model {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.esf-model > div {
  position: absolute;
  backface-visibility: visible;
}
/* the jet */
.jet-fuselage {
  left: 20px;
  top: 22px;
  width: 220px;
  height: 22px;
  border-radius: 12px 40px 40px 12px / 11px 11px 11px 11px;
  background: linear-gradient(180deg, #f6f8fc 0%, #c9d2e2 55%, #8d9ab3 100%);
}
.jet-nose {
  left: 236px;
  top: 25px;
  width: 22px;
  height: 16px;
  border-radius: 0 16px 16px 0 / 0 8px 8px 0;
  background: linear-gradient(180deg, #e8edf5, #97a3ba);
}
.jet-cabin {
  left: 214px;
  top: 25px;
  width: 22px;
  height: 6px;
  border-radius: 3px;
  background: #1f2a44;
}
.jet-wing {
  left: 108px;
  top: 32px;
  width: 92px;
  height: 78px;
  transform-origin: 0 0;
  background: linear-gradient(90deg, #d5dceb, #a9b4ca);
  clip-path: polygon(0 0, 100% 0, 60% 100%, 22% 100%);
}
.jet-wing.left {
  transform: rotateX(90deg);
}
.jet-wing.right {
  transform: rotateX(-90deg);
}
.jet-engine {
  left: 138px;
  top: 30px;
  width: 30px;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(180deg, #b7c1d4, #5f6b85);
}
.jet-engine.left {
  transform: translate3d(0, 4px, 34px);
}
.jet-engine.right {
  transform: translate3d(0, 4px, -34px);
}
.jet-tailplane {
  left: 28px;
  top: 30px;
  width: 40px;
  height: 30px;
  transform-origin: 0 0;
  background: #b9c3d6;
  clip-path: polygon(0 0, 100% 0, 70% 100%, 30% 100%);
}
.jet-tailplane.left {
  transform: rotateX(90deg);
}
.jet-tailplane.right {
  transform: rotateX(-90deg);
}
.jet-fin {
  left: 22px;
  top: -6px;
  width: 46px;
  height: 30px;
  background: linear-gradient(180deg, #67e8f9, #4f9cf0);
  clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%);
}
/* the seaplane */
.sea-fuselage {
  left: 60px;
  top: 24px;
  width: 150px;
  height: 20px;
  border-radius: 10px 30px 30px 10px / 10px 10px 10px 10px;
  background: linear-gradient(180deg, #fff3d6 0%, #f2c14e 55%, #c98a1e 100%);
}
.sea-nose {
  left: 206px;
  top: 26px;
  width: 16px;
  height: 16px;
  border-radius: 0 8px 8px 0;
  background: #b8781a;
}
.sea-cabin {
  left: 150px;
  top: 18px;
  width: 40px;
  height: 10px;
  border-radius: 5px 8px 0 0;
  background: #24314f;
}
.sea-wing {
  left: 96px;
  top: 14px;
  width: 80px;
  height: 200px;
  transform-origin: 50% 50%;
  transform: translate3d(0, -100px, 0) rotateX(90deg);
  border-radius: 40px / 12px;
  background: linear-gradient(90deg, #e63946, #f4a261);
}
.sea-strut {
  left: 128px;
  top: 16px;
  width: 3px;
  height: 12px;
  background: #3a3f52;
}
.sea-strut.left {
  transform: translate3d(0, 0, 40px) rotateX(20deg);
}
.sea-strut.right {
  transform: translate3d(0, 0, -40px) rotateX(-20deg);
}
.sea-float {
  left: 70px;
  top: 52px;
  width: 120px;
  height: 10px;
  border-radius: 5px 12px 12px 5px;
  background: linear-gradient(180deg, #e8edf5, #7f8aa3);
}
.sea-float.left {
  transform: translate3d(0, 0, 22px);
}
.sea-float.right {
  transform: translate3d(0, 0, -22px);
}
.sea-tailplane {
  left: 62px;
  top: 30px;
  width: 36px;
  height: 60px;
  transform: translate3d(0, -30px, 0) rotateX(90deg);
  border-radius: 18px / 8px;
  background: #e63946;
}
.sea-fin {
  left: 62px;
  top: 2px;
  width: 34px;
  height: 24px;
  background: linear-gradient(180deg, #e63946, #c1121f);
  clip-path: polygon(40% 0, 100% 0, 100% 100%, 0 100%);
}
/* the propeller: a disc in the plane's own yz plane, spinning on its own clock */
.sea-prop {
  left: 222px;
  top: 6px;
  width: 4px;
  height: 56px;
  border-radius: 2px;
  background: rgba(40, 44, 60, 0.85);
  transform-origin: 50% 50%;
  animation: esf-prop 0.09s linear infinite;
}
@keyframes esf-prop {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(360deg);
  }
}
/* THE INTERLUDES — media pinned in the frame while its row's span crosses it */
.esf-media {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(72%, 900px);
  height: min(64%, 560px);
  margin: 0;
  /* centered by the individual translate property, so the track's transform composes over it */
  translate: -50% -50%;
  opacity: 0;
  will-change: transform, opacity;
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 30px 80px -20px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.08);
  background: #0b1020;
}
.esf-media-image,
.esf-media-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: none;
}
.esf-media[data-kind='image'] .esf-media-image,
.esf-media[data-kind='video'] .esf-media-video {
  display: block;
}
.esf-media-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px 18px;
  font: 600 13px / 1.3 var(--vp-font-family-base, sans-serif);
  letter-spacing: 0.04em;
  color: rgba(240, 244, 255, 0.92);
  background: linear-gradient(180deg, transparent, rgba(5, 10, 24, 0.75));
}
.esf-interlude {
  /* taller than the frame: the media holds at the centre while the extra scrolls through */
  height: calc(min(82vh, 900px) + 28vh);
  min-height: 480px;
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
  text-align: center;
  text-wrap: pretty;
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
@media (prefers-reduced-motion: reduce) {
  .esf-waves,
  .esf-rain,
  .sea-prop {
    animation: none;
  }
}
@media (max-width: 640px) {
  /* one stat per line, the value beside its key */
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
  }
  .esf-media {
    width: 92%;
    height: 48%;
  }
  .esf-interlude {
    height: 112svh;
    min-height: 420px;
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
    height: 44px;
    transform-origin: 0 0;
  }
  .esf-model {
    transform: scale(0.73);
    transform-origin: 0 0;
  }
  .esf-palms {
    width: 90%;
  }
}
</style>
