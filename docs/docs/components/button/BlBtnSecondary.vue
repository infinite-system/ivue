<template>
  <q-btn
    data-vi="bl-btn-secondary"
    unelevated
    outline
    :color="color"
    class="bl-secondary-btn"
    no-caps
  >
    <slot></slot>
  </q-btn>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
const props = withDefaults(
  defineProps<{
    color?: string;
    borderOpacity?: number;
  }>(),
  { color: 'primary', borderOpacity: 0.6 }
);
const borderStyle = computed(() => `1px solid var(--q-${props.color})`);
</script>

<style lang="scss">
.bl-secondary-btn {
  &:before {
    border: v-bind(borderStyle);
    opacity: v-bind(borderOpacity);
  }

  &.delete {
    &:before {
      border: 1px solid var(--q-negative);
    }
  }
}
</style>
[p]
