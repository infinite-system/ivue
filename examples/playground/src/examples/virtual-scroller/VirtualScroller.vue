<script lang="ts" setup generic="T extends VirtualScroller.BaseItem">
import { VirtualScroller } from './VirtualScroller';
import VirtualScrollerItem from './VirtualScrollerItem.vue';

// The namespace carries the whole contract (props types + defaults merged
// by propsWithDefaults, emits, slots, expose type) — the macros receive
// RUNTIME objects, so the compiler never resolves a cross-file type here;
// the casts recover the generic <T> precision the runtime maps cannot carry.
const props = defineProps(VirtualScroller.Class.props) as unknown as VirtualScroller.Props<T>;

const emit = defineEmits(VirtualScroller.Class.emits) as VirtualScroller.Emits;

defineSlots<VirtualScroller.Slots<T>>();

const virtualScroller = new VirtualScroller.Class<T>(props, emit);

// THE STATE DESTRUCTURE — every Ref/Computed the template touches, grouped.
// Methods and plain getters stay DOTTED on the instance.
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

defineExpose(virtualScroller as VirtualScroller.Instance<T>);
</script>
<template>
  <div
    ref="scrollElement"
    :style="{ touchAction: virtualScroller.frameTouchAction }"
    class="virtual-scroller"
    @scroll="virtualScroller.onScroll"
    @copy="virtualScroller.selection.onCopyEvent"
  >
    <!-- Content-sized on purpose — NO explicit size. The inner is the
         composited layer; sized to the full virtual content (~10M px on a
         100k-item list) it carried visible compositor heaviness. The lead
         spacer is render-rebased and the tail is capped, so the layer stays
         a few hundred k px regardless of list size; the scroll range comes
         from the COMPUTED size via lenis.virtualLimit, not from the DOM. -->
    <div ref="scrollElementInner" class="virtual-scroller-inner">
      <!-- The whole leading/trailing content, reduced to two empty divs.
           Rendered items flow normally between them at their real sizes. -->
      <div :style="{ height: virtualScroller.leadingSpacerPx }"></div>
      <div
        ref="itemsWrapperElement"
        :style="{ width: '100%' }"
        @mousedown="virtualScroller.selection.onMouseDown"
      >
        <VirtualScrollerItem
          v-for="element in visibleItems"
          :key="element.id"
          class="virtual-scroller__item"
          :index="element.index"
          @size-updated="(size) => virtualScroller.syncItemSize(element.index, size)"
        >
          <slot name="item" v-bind="element"></slot>
        </VirtualScrollerItem>
      </div>
      <div :style="{ height: virtualScroller.trailingSpacerPx }"></div>
    </div>
    <button
      v-if="virtualScroller.selection.showsCopyChip"
      type="button"
      class="virtual-scroller__copy"
      @click="virtualScroller.selection.copy()"
    >
      {{ virtualScroller.selection.copyChipLabel }}
    </button>
    <div
      v-if="virtualScroller.scrollbarVisible"
      class="virtual-scroller__track"
      @pointerdown="virtualScroller.onTrackPointerDown"
      @pointermove="virtualScroller.onTrackPointerMove"
      @pointerup="virtualScroller.onTrackPointerUp"
      @pointercancel="virtualScroller.onTrackPointerUp"
    >
      <div
        class="virtual-scroller__thumb"
        :class="{ dragging: scrollbarDragging }"
        :style="virtualScroller.scrollbarThumbStyle"
      ></div>
    </div>
  </div>
</template>
<style>
.virtual-scroller {
  height: 100%;
  overflow: auto;
  position: relative;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  /* Items are normal-flow: without this, native scroll anchoring adjusts
     scrollTop whenever the spacers change, fighting the Lenis-driven
     translateY (scroll is virtual; scrollTop must stay 0). */
  overflow-anchor: none;
  /* The long-press callout (Copy / Look Up) would race the selection's
     own long press; the copy chip is the affordance here. */
  -webkit-touch-callout: none;
}
/* A finger's drag paints through the CSS Custom Highlight API, styled as
   the native selection would be — see VirtualScrollerSelection.applyHighlight. */
::highlight(virtual-scroller-selection) {
  /* Explicit colors, never the Highlight/HighlightText system pair: inside
     ::highlight iOS paints HighlightText (white) without the Highlight
     background, and the selected rows read as blank. The text keeps its
     own color; only the ground changes. */
  background-color: rgba(59, 130, 246, 0.35);
}
.virtual-scroller__track {
  position: absolute;
  top: 10px;
  bottom: 10px;
  right: 6px;
  width: 12px;
  cursor: pointer;
  touch-action: none;
  z-index: 1;
}
.virtual-scroller__track::before {
  content: '';
  position: absolute;
  inset: 0 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
}
.virtual-scroller__thumb {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
  /* eased relocation: a fast flick or loop-wrap moves the thumb far in
     one frame — glide it instead of teleporting */
  transition:
    background 0.15s ease,
    top 0.2s ease-out,
    height 0.2s ease-out;
}
.virtual-scroller__thumb.dragging {
  /* while the finger owns it, the thumb must stick — no easing lag */
  transition: background 0.15s ease;
}
.virtual-scroller__track:hover .virtual-scroller__thumb,
.virtual-scroller__thumb.dragging {
  background: rgba(148, 163, 184, 0.75);
}
.virtual-scroller::-webkit-scrollbar {
  /* WebKit */
  width: 0;
  height: 0;
}

.virtual-scroller-inner {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  transform-style: preserve-3d;
  overscroll-behavior: contain;
}
/* The touch selection, drawn by VirtualScrollerSelectionTouchCustom: boxes
   over the selected text and two handles at its ends, laid inside the
   items wrapper so a scroll moves them with the rows. */
.virtual-scroller__touch-selection {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.virtual-scroller__touch-box {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 2px;
  background: rgba(59, 130, 246, 0.32);
}
.virtual-scroller__touch-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  pointer-events: auto;
  touch-action: none;
}
.virtual-scroller__touch-handle::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
  background: rgb(59, 130, 246);
  box-shadow: 0 0 0 2px #fff, 0 1px 4px rgba(0, 0, 0, 0.35);
}
.virtual-scroller__touch-handle--start::before {
  border-top-right-radius: 2px;
}
.virtual-scroller__touch-handle--end::before {
  border-top-left-radius: 2px;
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
