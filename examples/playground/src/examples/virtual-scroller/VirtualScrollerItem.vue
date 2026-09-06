<script lang="ts" setup>
import { VirtualScrollerItem } from './VirtualScrollerItem';

const props = defineProps(VirtualScrollerItem.Class.props);
const emit = defineEmits(VirtualScrollerItem.Class.emits) as VirtualScrollerItem.Emits;

// The constructor runs here, in setup — its mount / before-unmount hooks
// register against this component and capture the row's size once each.
const item = new VirtualScrollerItem.Class(props as VirtualScrollerItem.Props, emit);

// the state destructure
const {
  // element refs
  element
} = item;
</script>
<template>
  <div ref="element" class="virtual-scroller__item" :aria-rowindex="item.rowIndex">
    <slot />
  </div>
</template>
<style>
.virtual-scroller__item {
  /* flow-root contains child margins (as the old absolutely-positioned
     items did via their own block formatting context), so flow stacking
     reproduces the exact same geometry the measured `top` offsets had. */
  display: flow-root;
}
</style>
