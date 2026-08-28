<script lang="ts" setup generic="T extends any">
import { onBeforeUnmount, onMounted, ref } from 'vue';

export interface VirtualScrollerItem {
  index: number;
  /** Main axis the parent scroller virtualizes ('y' default). */
  axis?: 'y' | 'x';
}

export interface VirtualScrollItemEmits {
  (e: 'sizeUpdated', size: number): void;
}

const props = withDefaults(defineProps<VirtualScrollerItem>(), { axis: 'y' });

const emit = defineEmits<VirtualScrollItemEmits>();

const item = ref<HTMLElement | null>(null);

/**
 * ONE-SHOT size capture — deliberately not a ResizeObserver. Items render
 * in normal flow, so the browser positions them at their real size with no
 * bookkeeping; the parent only needs sizes for its spacer/estimate math.
 * Capture once on mount (seeds the estimate the moment the item enters the
 * window — keeps window-local index→position math as accurate as the old
 * always-observed map) and once right before unmount (the final size — the
 * only one that matters once the item leaves the window). Continuous
 * observation is what caused measurable jitter at 100k items: bursts of
 * resize callbacks during scroll, each invalidating geometry.
 */
const capture = () => {
  const el = item.value;
  if (!el) return;
  // Heights are recorded in LAYOUT px: an ancestor transform scale (the
  // post card scales to fit the window) shrinks every rect readout, and a
  // size map built from scaled values diverges from the real flow by the
  // scale factor — landing every index-targeted jump short. Derive the
  // current scale from the parent stack's rect-to-layout ratio and divide
  // it out.
  const parent = el.parentElement;
  const horizontal = props.axis === 'x';
  const parentLayout = horizontal
    ? (parent?.offsetWidth ?? 0)
    : (parent?.offsetHeight ?? 0);
  const parentRect = parent
    ? horizontal
      ? parent.getBoundingClientRect().width
      : parent.getBoundingClientRect().height
    : 0;
  const scale = parent && parentLayout > 0 ? parentRect / parentLayout : 1;
  const rect = el.getBoundingClientRect();
  const size = horizontal ? rect.width : rect.height;
  emit('sizeUpdated', scale > 0 ? size / scale : size);
};

onMounted(capture);
onBeforeUnmount(capture);
</script>
<template>
  <div ref="item" class="virtual-scroller__item" :aria-rowindex="index + 1">
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
