<script lang="ts" setup>
import type { VirtualScroller } from './VirtualScroller';

// A markup-only leaf: the scrollbar's track and thumb. It exists so the
// one per-frame read in the scroller's template — the thumb's style,
// which follows the scroll position — re-renders THIS component alone
// and never the scroller with its mounted rows. The scroller owns every
// value and handler; this file is wiring against its instance.
defineProps<{
  scroller: VirtualScroller.Instance<VirtualScroller.BaseItem>;
}>();
</script>
<template>
  <div
    class="virtual-scroller__track"
    :class="scroller.scrollbarTrackClass"
    @pointerdown="scroller.onTrackPointerDown"
    @pointermove="scroller.onTrackPointerMove"
    @pointerup="scroller.onTrackPointerUp"
    @pointercancel="scroller.onTrackPointerUp"
    @touchstart="scroller.claimTouch"
    @touchmove="scroller.claimTouch"
  >
    <div
      class="virtual-scroller__thumb"
      :class="scroller.scrollbarThumbClass"
      :style="scroller.scrollbarThumbStyle"
    ></div>
  </div>
</template>
