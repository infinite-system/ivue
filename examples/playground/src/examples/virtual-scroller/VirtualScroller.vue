<script lang="ts">
import type { ShallowUnwrapRef } from 'vue';

import type { VirtualScrollerReturn } from './VirtualScroller';
import { VirtualScroller } from './VirtualScroller';
import { ref } from 'vue';
import type { BaseItem } from './VirtualScroller.types';
import VirtualScrollerItem from './VirtualScrollerItem.vue';

export type VirtualScrollerExposed<T extends BaseItem> =
  VirtualScroller.Instance<T>;
/**
 * What consumers hold through a template ref: Vue's expose surface unwraps
 * refs on read and redirects ref writes into .value (proxyRefs semantics).
 * Instance (ReactiveInstance) is load-bearing here: it strips the readonly
 * that TS puts on get-only accessors, so writes like
 * `scroller.scrollDirection = 'down'` typecheck as they behave.
 */
export type VirtualScrollerExposedUnwrapped<T extends BaseItem> =
  ShallowUnwrapRef<VirtualScroller.Instance<T>>;

export interface VirtualScrollerEmits {
  (e: 'itemsChanged', args: ItemsChangeEmitArgs): void;
  (e: 'drop', startIndex: number, dropIndex: number): void;
  (e: 'move', evt: any): void;
}

export interface ItemsChangeEmitArgs {
  start: number;
  end: number;
}

export interface VirtualScrollerSlots<T extends BaseItem> {
  item: (scope: ItemContext<T>) => any;
}

export interface ItemContext<T extends BaseItem> {
  item: T;
  id: string;
  index: number;
}

export interface VirtualScrollerProps<T extends BaseItem> {
  modelValue: T[];
  /** Render the built-in draggable scrollbar over the VIRTUAL position. */
  scrollbar?: boolean;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  autoRepeat?: boolean;
  /** Step mode: after any input settles, snap to the nearest item
   *  boundary — scroll, stop; scroll, stop. */
  snapToItems?: boolean;
  assumedSize: number;
  paddingQuantity: number;
  /** Accepted for API compatibility; the docs build renders the plain branch. */
  draggable?: boolean;
  dragHandleSelector?: string;
  dragClass?: string;
  dragGhostClass?: string;
  dragChosenClass?: string;
}
</script>
<script lang="ts" setup generic="T extends BaseItem">
const props = withDefaults(defineProps<VirtualScrollerProps<T>>(), {
  scrollbar: false,
  autoPlay: false,
  autoPlayDelay: 500,
  autoRepeat: true,
  snapToItems: false,
  assumedSize: 30,
  paddingQuantity: 6,
  draggable: false,
  dragHandleSelector: '.sortable-drag-handle',
  dragClass: 'sortable-drag',
  dragGhostClass: 'sortable-ghost',
  dragChosenClass: 'sortable-chosen'
});

const emit = defineEmits<VirtualScrollerEmits>();

defineSlots<VirtualScrollerSlots<T>>();

const virtualScroller = new VirtualScroller.Class<T>(props, emit);

// THE STATE DESTRUCTURE — every Ref/Computed the template touches, grouped.
// Methods and plain getters stay DOTTED on the instance.
const {
  // computed refs
  visibleItems,
  // element refs
  scrollElement,
  scrollElementInner,
  itemsWrapperElement
} = virtualScroller;

defineExpose(virtualScroller as VirtualScroller.Instance<T>);

// Scrollbar drag: local gesture state only — geometry and seeking live on
// the class (scrollbarThumbFraction / scrollbarProgress / seekToFraction).
const scrollbarDragging = ref(false);

function seekToPointer(event: PointerEvent) {
  const track = (event.currentTarget as HTMLElement).closest(
    '.virtual-scroller__track'
  ) as HTMLElement;
  if (!track) return;
  const rect = track.getBoundingClientRect();
  virtualScroller.seekToFraction((event.clientY - rect.top) / rect.height);
}

function onTrackPointerDown(event: PointerEvent) {
  virtualScroller.stopAutoPlay();
  scrollbarDragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  seekToPointer(event);
}

function onTrackPointerMove(event: PointerEvent) {
  if (scrollbarDragging.value) seekToPointer(event);
}

function onTrackPointerUp() {
  scrollbarDragging.value = false;
}
</script>
<template>
  <div ref="scrollElement" class="virtual-scroller" @scroll="virtualScroller.onScroll">
    <!-- Content-sized on purpose — NO explicit size. The inner is the
         composited layer; sized to the full virtual content (~10M px on a
         100k-item list) it carried visible compositor heaviness. The lead
         spacer is render-rebased and the tail is capped, so the layer stays
         a few hundred k px regardless of list size; the scroll range comes
         from the COMPUTED size via lenis.virtualLimit, not from the DOM. -->
    <div ref="scrollElementInner" class="virtual-scroller-inner">
      <!-- The whole leading/trailing content, reduced to two empty divs.
           Rendered items flow normally between them at their real sizes. -->
      <div :style="{ size: virtualScroller.leadingSpacerPx }"></div>
      <div ref="itemsWrapperElement" :style="{ width: '100%' }">
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
      <div :style="{ size: virtualScroller.trailingSpacerPx }"></div>
    </div>
    <div
      v-if="props.scrollbar && virtualScroller.scrollbarThumbFraction > 0"
      class="virtual-scroller__track"
      @pointerdown="onTrackPointerDown"
      @pointermove="onTrackPointerMove"
      @pointerup="onTrackPointerUp"
      @pointercancel="onTrackPointerUp"
    >
      <div
        class="virtual-scroller__thumb"
        :class="{ dragging: scrollbarDragging }"
        :style="{
          size: virtualScroller.scrollbarThumbFraction * 100 + '%',
          top:
            virtualScroller.scrollbarProgress *
              (1 - virtualScroller.scrollbarThumbFraction) *
              100 +
            '%'
        }"
      ></div>
    </div>
  </div>
</template>
<style>
.virtual-scroller {
  size: 100%;
  overflow: auto;
  position: relative;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  /* Items are normal-flow: without this, native scroll anchoring adjusts
     scrollTop whenever the spacers change, fighting the Lenis-driven
     translateY (scroll is virtual; scrollTop must stay 0). */
  overflow-anchor: none;
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
  transition: background 0.15s ease, top 0.2s ease-out, size 0.2s ease-out;
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
  size: 0;
}

.virtual-scroller-inner {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  transform-style: preserve-3d;
  overscroll-behavior: contain;
}
</style>
