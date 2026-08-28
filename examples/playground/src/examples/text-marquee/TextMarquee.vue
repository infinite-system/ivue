<script lang="ts" setup>
import HorizontalVirtualScroller from '../virtual-scroller/HorizontalVirtualScroller.vue';
import { TextMarquee } from './TextMarquee';

// Pure wiring — the namespace carries the whole contract; the macro
// receives the RUNTIME props object, so nothing here resolves types
// across files, and the props type is inferred from it (no cast: only
// generic components need one, to graft <T> back on).
const props = defineProps(TextMarquee.props);

const marquee = new TextMarquee.Class(props);

// THE STATE DESTRUCTURE — every Ref/Computed the template touches, grouped.
const {
  // computed refs
  items,
  // element refs
  rootElement,
  scroller
} = marquee;

defineExpose(marquee as TextMarquee.Instance);
</script>
<template>
  <div ref="rootElement" class="text-marquee">
    <HorizontalVirtualScroller
      ref="scroller"
      :model-value="items"
      :assumed-size="marquee.assumedChunkSize"
      :creep-ms-per-px="marquee.creepMsPerPx"
      :padding-quantity="6"
      auto-play
      :auto-play-delay="600"
      scrollbar
    >
      <template #item="{ item }">
        <span class="text-marquee__chunk">{{ item.body }}</span>
      </template>
    </HorizontalVirtualScroller>
  </div>
</template>
<style>
.text-marquee {
  position: relative;
  overflow: hidden;
}
/* Chunks keep their exact spacing (each ends with its original space),
   so side by side they read as one unbroken line. */
.text-marquee__chunk {
  display: block;
  white-space: pre;
}
/* cross-axis room below the line for the built-in track — padding-bottom
   is off the scroll axis, so the extent math never sees it */
.text-marquee .virtual-scroller--x {
  padding-bottom: 18px;
}
.text-marquee .virtual-scroller__track--x {
  bottom: 0;
  /* the hosts fade the line out over the outer ~5% (mask-image) — the
     track ends rest inside the fully-opaque zone, not under the fade */
  left: 5%;
  right: 5%;
}
</style>
