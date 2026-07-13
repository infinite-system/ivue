<script lang="ts">
import type { ShallowUnwrapRef } from 'vue';

import type { VirtualScrollerReturn } from './VirtualScroller';
import { VirtualScroller } from './VirtualScroller';
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
  autoPlay?: boolean;
  autoPlayDelay?: number;
  autoRepeat?: boolean;
  assumedHeight: number;
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
  autoPlay: false,
  autoPlayDelay: 500,
  autoRepeat: true,
  assumedHeight: 30,
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
</script>
<template>
  <div ref="scrollElement" class="virtual-scroller" @scroll="virtualScroller.onScroll">
    <!-- Content-sized on purpose — NO explicit height. The inner is the
         composited layer; sized to the full virtual content (~10M px on a
         100k-item list) it carried visible compositor heaviness. The lead
         spacer is render-rebased and the tail is capped, so the layer stays
         a few hundred k px regardless of list size; the scroll range comes
         from the COMPUTED height via lenis.virtualLimit, not from the DOM. -->
    <div ref="scrollElementInner" class="virtual-scroller-inner">
      <!-- The whole leading/trailing content, reduced to two empty divs.
           Rendered items flow normally between them at their real heights. -->
      <div :style="{ height: virtualScroller.leadingSpacerPx }"></div>
      <div ref="itemsWrapperElement" :style="{ width: '100%' }">
        <VirtualScrollerItem
          v-for="element in visibleItems"
          :key="element.id"
          class="virtual-scroller__item"
          :index="element.index"
          @size-updated="(height) => virtualScroller.syncItemHeight(element.index, height)"
        >
          <slot name="item" v-bind="element"></slot>
        </VirtualScrollerItem>
      </div>
      <div :style="{ height: virtualScroller.trailingSpacerPx }"></div>
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
</style>
