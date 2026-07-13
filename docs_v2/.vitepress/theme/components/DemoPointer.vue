<script setup lang="ts">
import { computed, ref } from 'vue';
import { useElementBounding, useWindowScroll } from '@vueuse/core';
import DemoBox from './DemoBox.vue';
import { Pointer } from '@examples/pointer/Pointer';

// the state destructure — materializes $mouse inside the component's scope,
// so its listeners are cleaned up on unmount
const pointer = new Pointer.Class();
const { x, y } = pointer;

// presentation only: map the class's page coordinates into the pad
const padEl = ref<HTMLElement | null>(null);
const bounds = useElementBounding(padEl);
const scroll = useWindowScroll();

const localX = computed(() => x.value - (bounds.left.value + scroll.x.value));
const localY = computed(() => y.value - (bounds.top.value + scroll.y.value));
const inside = computed(
  () =>
    bounds.width.value > 0 &&
    localX.value >= 0 &&
    localX.value <= bounds.width.value &&
    localY.value >= 0 &&
    localY.value <= bounds.height.value,
);
</script>

<template>
  <DemoBox
    title="A composable, encapsulated"
    note="The component destructures { x, y } from a Pointer instance. useMouse lives inside the class — private, created once on the first read. Consumers see two refs and nothing else."
  >
    <div ref="padEl" class="pad" :class="{ live: inside }">
      <template v-if="inside">
        <div class="hair v" :style="{ left: localX + 'px' }" />
        <div class="hair h" :style="{ top: localY + 'px' }" />
        <div class="dot" :style="{ left: localX + 'px', top: localY + 'px' }" />
      </template>
      <div v-else class="hint">move the pointer across this pad</div>
    </div>
    <div class="d-vals">
      <div>
        <div class="d-k">x &middot; page</div>
        <div class="d-n">{{ pointer.pageX }}</div>
      </div>
      <div>
        <div class="d-k">y &middot; page</div>
        <div class="d-n">{{ pointer.pageY }}</div>
      </div>
    </div>
  </DemoBox>
</template>

<style scoped>
.pad {
  position: relative;
  height: 170px;
  margin-bottom: 16px;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background:
    linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    rgba(255, 255, 255, 0.02);
  background-size:
    24px 24px,
    24px 24px,
    auto;
  transition: border-color 0.25s ease;
}
.pad.live {
  border-color: rgba(99, 102, 241, 0.45);
}
.hair {
  position: absolute;
  background: rgba(99, 102, 241, 0.35);
  pointer-events: none;
}
.hair.v {
  top: 0;
  bottom: 0;
  width: 1px;
}
.hair.h {
  left: 0;
  right: 0;
  height: 1px;
}
.dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, #34d399 0%, #6366f1 80%);
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.8);
  pointer-events: none;
}
.hint {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 13px;
  color: #64748b;
}
</style>
