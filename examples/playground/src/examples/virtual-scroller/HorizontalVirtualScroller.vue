<script lang="ts" setup generic="T extends VirtualScroller.BaseItem">
import { HorizontalVirtualScroller } from './HorizontalVirtualScroller';
import type { VirtualScroller } from './VirtualScroller';
import VirtualScrollerItem from './VirtualScrollerItem.vue';

// Pure wiring — the CLASS carries the contract (static getters), with the
// horizontal default already fused in (assumedSize 300 re-tuned by the
// subclass's `propsDefaults` override).
const props = defineProps(
  HorizontalVirtualScroller.Class.props
) as unknown as HorizontalVirtualScroller.Props<T>;

const emit = defineEmits(HorizontalVirtualScroller.Class.emits) as HorizontalVirtualScroller.Emits;

defineSlots<HorizontalVirtualScroller.Slots<T>>();

const virtualScroller = new HorizontalVirtualScroller.Class<T>(props, emit);

// THE STATE DESTRUCTURE — every Ref/Computed the template touches, grouped.
const {
  // state refs
  scrollbarDragging,
  // computed refs
  visibleItems,
  // element refs
  scrollElement,
  scrollElementInner,
  itemsWrapperElement
} = virtualScroller;

defineExpose(virtualScroller as HorizontalVirtualScroller.Instance<T>);
</script>
<template>
  <div
    ref="scrollElement"
    :style="{ touchAction: virtualScroller.frameTouchAction }"
    class="virtual-scroller virtual-scroller--x"
    @scroll="virtualScroller.onScroll"
    @copy="virtualScroller.selection.onCopyEvent"
  >
    <!-- Same layer discipline as the vertical scroller (content-sized inner,
         rebased leading spacer, capped tail), rotated: spacers are widths
         and items flow in a row. -->
    <div ref="scrollElementInner" class="virtual-scroller-inner virtual-scroller-inner--x">
      <div :style="{ width: virtualScroller.leadingSpacerPx, flex: '0 0 auto' }"></div>
      <div
        ref="itemsWrapperElement"
        class="virtual-scroller__row"
        @mousedown="virtualScroller.selection.onMouseDown"
      >
        <VirtualScrollerItem
          v-for="element in visibleItems"
          :key="element.id"
          class="virtual-scroller__item virtual-scroller__item--x"
          :index="element.index"
          axis="x"
          @size-updated="(width) => virtualScroller.syncItemSize(element.index, width)"
        >
          <slot name="item" v-bind="element"></slot>
        </VirtualScrollerItem>
      </div>
      <div :style="{ width: virtualScroller.trailingSpacerPx, flex: '0 0 auto' }"></div>
    </div>
    <div
      v-if="virtualScroller.scrollbarVisible"
      class="virtual-scroller__track virtual-scroller__track--x"
      @pointerdown="virtualScroller.onTrackPointerDown"
      @pointermove="virtualScroller.onTrackPointerMove"
      @pointerup="virtualScroller.onTrackPointerUp"
      @pointercancel="virtualScroller.onTrackPointerUp"
    >
      <div
        class="virtual-scroller__thumb virtual-scroller__thumb--x"
        :class="{ dragging: scrollbarDragging }"
        :style="virtualScroller.scrollbarThumbStyle"
      ></div>
    </div>
    <button
      v-if="virtualScroller.selection.showsCopyChip"
      type="button"
      class="virtual-scroller__copy"
      @click="virtualScroller.selection.copy()"
    >
      {{ virtualScroller.selection.copyChipLabel }}
    </button>
  </div>
</template>
<style>
.virtual-scroller--x {
  height: auto;
  overflow: hidden;
  /* own positioning context — the absolute track must not depend on the
     vertical stylesheet's .virtual-scroller rules being loaded */
  position: relative;
  /* horizontal gestures belong to the strip; vertical stays the page's */
  touch-action: pan-y;
}
.virtual-scroller-inner--x {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: max-content;
}
.virtual-scroller__row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
.virtual-scroller__item--x {
  display: block;
  flex: 0 0 auto;
}
/* The built-in track, rotated: it hugs the bottom edge and the thumb
   travels left→right. SELF-CONTAINED on purpose — this component loads
   without the vertical scroller's stylesheet (the home strip) — and the
   selectors double up (.track.track--x) so they out-specify the vertical
   base rules when both stylesheets ARE on the page (the docs demos). */
.virtual-scroller__track.virtual-scroller__track--x {
  position: absolute;
  top: auto;
  left: 10px;
  right: 10px;
  bottom: 4px;
  width: auto;
  height: 12px;
  cursor: pointer;
  touch-action: none;
  z-index: 1;
}
.virtual-scroller__track.virtual-scroller__track--x::before {
  content: '';
  position: absolute;
  inset: 4px 0;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
}
.virtual-scroller__thumb.virtual-scroller__thumb--x {
  position: absolute;
  left: auto;
  right: auto;
  top: 2px;
  bottom: 2px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
  /* eased relocation, sideways: left/width glide instead of top/height */
  transition:
    background 0.15s ease,
    left 0.2s ease-out,
    width 0.2s ease-out;
}
.virtual-scroller__thumb.virtual-scroller__thumb--x.dragging {
  transition: background 0.15s ease;
}
.virtual-scroller__track--x:hover .virtual-scroller__thumb--x,
.virtual-scroller__thumb.virtual-scroller__thumb--x.dragging {
  background: rgba(148, 163, 184, 0.75);
}
.virtual-scroller__copy {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 3;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(99, 102, 241, 0.7);
  background: rgba(99, 102, 241, 0.92);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
</style>
