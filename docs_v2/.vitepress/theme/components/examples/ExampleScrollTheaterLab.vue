<script setup lang="ts">
/** The theater's bench: primitives exercised live as they land. Commit 1: ranges and the aperture. */
import DemoBox from '../DemoBox.vue';
import VirtualScroller from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import { ScrollTheaterLab } from '../../../../../examples/playground/src/examples/scroll-theater/ScrollTheaterLab';

const lab = new ScrollTheaterLab.Class();
const {
  // state refs
  items,
  apertureTop,
  apertureBottom,
  apertureFocus,
  // element refs
  scroller
} = lab;
</script>

<template>
  <DemoBox
    title="Scroll theater — the bench"
    note="Each primitive of the theater is exercised here as it lands. Ranges: three ranges over a plain list — one row, a chapter, the rows between two anchors — and the three derivations of each, read out on every frame the layer moves. The aperture is the region the text is seen through: narrow it with the sliders and watch presence follow the aperture, not the frame."
  >
    <div class="d-vals stl-stats">
      <div v-for="readout in lab.readouts" :key="readout.key" class="stl-readout" :data-bench="readout.key">
        <div class="d-k">{{ readout.label }}</div>
        <div class="stl-values">
          <span>progress <b>{{ readout.progress }}</b></span>
          <span>presence <b>{{ readout.presence }}</b></span>
          <span>step <b>{{ readout.step }}</b>/4</span>
          <span>focus <b>{{ readout.focus }}</b></span>
        </div>
      </div>
      <div>
        <div class="d-k">position</div>
        <div class="d-n">{{ lab.positionLabel }}</div>
      </div>
    </div>

    <div class="stl-frame">
      <VirtualScroller ref="scroller" class="stl-scroller" v-model="items" :assumed-size="56" :padding-quantity="6" scrollbar>
        <template #item="{ item, index }">
          <div class="stl-row" :data-bench="lab.benchOf(index)">{{ item.body }}</div>
        </template>
      </VirtualScroller>
      <!-- the aperture, drawn over the frame: its edges and the focus line -->
      <div class="stl-aperture" aria-hidden="true">
        <div class="stl-curtain" :style="lab.curtainTopStyle"></div>
        <div class="stl-curtain stl-curtain-bottom" :style="lab.curtainBottomStyle"></div>
        <div class="stl-focus" :style="lab.focusLineStyle"></div>
      </div>
    </div>

    <div class="d-row stl-controls">
      <label class="stl-slider">top <input v-model.number="apertureTop" type="range" min="0" max="80" /> {{ apertureTop }}%</label>
      <label class="stl-slider">bottom <input v-model.number="apertureBottom" type="range" min="20" max="100" /> {{ apertureBottom }}%</label>
      <label class="stl-slider">focus <input v-model.number="apertureFocus" type="range" min="0" max="100" /> {{ apertureFocus }}%</label>
    </div>
  </DemoBox>
</template>

<style scoped>
.stl-stats {
  margin-bottom: 12px;
}
.stl-readout .stl-values {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.stl-values b {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}
.stl-readout[data-bench='row'] .d-k { color: #67e8f9; }
.stl-readout[data-bench='chapter'] .d-k { color: #a5b4fc; }
.stl-readout[data-bench='anchors'] .d-k { color: #fbbf24; }
.stl-frame {
  position: relative;
  height: min(60vh, 560px);
  border-radius: 12px;
  overflow: hidden;
  background: #0b1020;
}
.stl-scroller {
  position: absolute;
  inset: 0;
}
.stl-row {
  margin: 0 40px 6px 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(226, 232, 240, 0.85);
  font-size: 14px;
}
.stl-row[data-bench='row'] { background: rgba(103, 232, 249, 0.28); }
.stl-row[data-bench='chapter'] { background: rgba(165, 180, 252, 0.22); }
.stl-row[data-bench='anchors'] { background: rgba(251, 191, 36, 0.22); }
.stl-aperture {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.stl-curtain {
  position: absolute;
  left: 0;
  right: 14px;
  top: 0;
  background: rgba(5, 10, 24, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
}
.stl-curtain-bottom {
  top: auto;
  bottom: 0;
  border-bottom: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.35);
}
.stl-focus {
  position: absolute;
  left: 0;
  right: 14px;
  height: 0;
  border-top: 1px dashed rgba(103, 232, 249, 0.8);
}
.stl-controls {
  margin-top: 12px;
}
.stl-slider {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
}
.stl-slider input {
  width: 120px;
  accent-color: #6366f1;
}
</style>
