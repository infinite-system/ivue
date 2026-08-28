<script lang="ts" setup generic="T extends BaseItem">
import { HorizontalVirtualScroller } from './HorizontalVirtualScroller';
import type { BaseItem } from './VirtualScroller.types';
import VirtualScrollerItem from './VirtualScrollerItem.vue';

// Pure wiring — the namespace carries the whole contract, with the
// horizontal defaults already merged (assumedSize 300 overridden by
// spread in HorizontalVirtualScroller.propsDefaults).
const props = defineProps(
  HorizontalVirtualScroller.props
) as unknown as HorizontalVirtualScroller.Props<T>;

const emit = defineEmits(
  HorizontalVirtualScroller.emits
) as HorizontalVirtualScroller.Emits;

defineSlots<HorizontalVirtualScroller.Slots<T>>();

const virtualScroller = new HorizontalVirtualScroller.Class<T>(props, emit);

// THE STATE DESTRUCTURE — every Ref/Computed the template touches, grouped.
const {
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
  <div ref="scrollElement" class="virtual-scroller virtual-scroller--x" @scroll="virtualScroller.onScroll">
    <!-- Same layer discipline as the vertical scroller (content-sized inner,
         rebased leading spacer, capped tail), rotated: spacers are widths
         and items flow in a row. -->
    <div ref="scrollElementInner" class="virtual-scroller-inner virtual-scroller-inner--x">
      <div :style="{ width: virtualScroller.leadingSpacerPx, flex: '0 0 auto' }"></div>
      <div ref="itemsWrapperElement" class="virtual-scroller__row">
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
  </div>
</template>
<style>
.virtual-scroller--x {
  size: auto;
  overflow: hidden;
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
</style>
