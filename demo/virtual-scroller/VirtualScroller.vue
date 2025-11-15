  <!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts">
import type { UnwrapNestedRefs } from 'vue';
import vuedraggable from 'vuedraggable';

import {
  onMounted,
  onBeforeUnmount,
  ref,
  nextTick,
  computed,
  watch,
} from 'vue';
import { Lenis } from '../lenis/lenis';

import type { VirtualScrollerReturn } from './VirtualScroller';
import { useVirtualScroller } from './VirtualScroller';
import type { BaseItem } from './VirtualScroller.types';
import VirtualScrollerItem from './VirtualScrollerItem.vue';
import { useQuasar } from 'quasar';
import { vi } from 'vitest';

export type VirtualScrollerExposed<T extends BaseItem> =
  VirtualScrollerReturn<T>;
export type VirtualScrollerExposedUnwrapped<T extends BaseItem> =
  UnwrapNestedRefs<VirtualScrollerExposed<T>>;

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
  position: number;
}

export type Scroller = HTMLDivElement | null;

export interface VirtualScrollerProps<T extends BaseItem> {
  modelValue: T[];
  autoPlay?: boolean;
  autoPlayDelay?: number;
  autoRepeat?: boolean;
  assumedHeight: number;
  paddingQuantity: number;
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
  dragChosenClass: 'sortable-chosen',
});

const emit = defineEmits<VirtualScrollerEmits>();

defineSlots<VirtualScrollerSlots<T>>();

const virtualScroller = useVirtualScroller<T>(props, emit);
const $q = useQuasar();
const {
  /* Ref */
  scrollDirection,
  scrollElement,
  scrollElementInner,
  scrollPosition,
  scrollByDeltaY,
  scrollHeightPx,
  setScrollPosition,
  onScroll,
  disableScrollEvent,
  /* Data */
  visibleItems,
  scrollHeight,
  /* Callbacks */
  touchmove,
  touchstart,
  touchend,
  syncItemHeight,
  /* Drag and Drop */
  onStart,
  onDrop,
  onMove,
} = virtualScroller;

defineExpose<VirtualScrollerExposed<T>>(virtualScroller);
</script>
<template>
  <div
    ref="scrollElement"
    class="virtual-scroller"
    @scroll="onScroll"
  >
    <div
      ref="scrollElementInner"
      class="virtual-scroller-inner"
      :style="{ height: scrollHeightPx }"
    >
      <!-- <div
        class="virtual-scroller__spacer"
      /> -->
      <div :style="{ width: '100%' }">
        <vuedraggable
          v-if="draggable"
          tag="div"
          :list="visibleItems"
          item-key="id"
          :handle="dragHandleSelector"
          :ghost-class="dragGhostClass"
          :chosen-class="dragChosenClass"
          :drag-class="dragClass"
          @move="onMove"
          @start="onStart"
          @drop="onDrop"
        >
          <template #item="{ element }">
            <VirtualScrollerItem
              :key="element.id"
              :position="element.position"
              :index="element.index"
              @size-updated="(height) => syncItemHeight(element.index, height)"
            >
              <slot name="item" v-bind="element"></slot>
            </VirtualScrollerItem>
          </template>
        </vuedraggable>
        <VirtualScrollerItem
          v-for="element in visibleItems"
          v-else
          :key="element.id"
          class="virtual-scroller__item"
          :position="element.position"
          :index="element.index"
          @size-updated="(height) => syncItemHeight(element.index, height)"
        >
          <slot name="item" v-bind="element"></slot>
        </VirtualScrollerItem>
      </div>
    </div>
  </div>
</template>
<style>
.virtual-scroller {
  height: 100%;
  overflow: auto;
  position: relative;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
}
.virtual-scroller::-webkit-scrollbar { /* WebKit */
    width: 0;
    height: 0;
}
.virtual-scroller__spacer {
  visibility: hidden;
  will-change: height;
  width: 1px;
}

.virtual-scroller-inner {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  transform-style: preserve-3d;
  overscroll-behavior: contain;
}

.virtual-scroll__inner-transition-0s {
  transition-duration: 0s;
}
</style>
