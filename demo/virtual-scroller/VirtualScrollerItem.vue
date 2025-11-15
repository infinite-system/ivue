<script lang="ts" setup generic="T extends any">
import { useResizeObserver } from '@vueuse/core';
import { ref } from 'vue';

export interface VirtualScrollerItem {
  position: number;
  index: number;
}

export interface VirtualScrollItemEmits {
  (e: 'sizeUpdated', height: number): void;
}

defineProps<VirtualScrollerItem>();

const emit = defineEmits<VirtualScrollItemEmits>();

const item = ref<HTMLElement | null>(null);

useResizeObserver(item, ([entry]: any) => {
  if (!entry) return;
  emit('sizeUpdated', entry.contentRect.height);
});
</script>
<template>
  <div
    ref="item"
    class="virtual-scroller__item"
    :style="{ top: position + 'px' }"
    :aria-rowindex="index + 1"
  >
    <slot />
  </div>
</template>
<style>
.virtual-scroller__item {
  position: absolute;
  left: 0;
  right: 0;
}
</style>
