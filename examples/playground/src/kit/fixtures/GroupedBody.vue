<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Card } from './Card';

// A swapped section that rearranges: it renders from the model, reversed,
// through the same Code seam the base body uses.
defineProps<{ kit: Kit.Entry; model: Card.Instance }>();
</script>

<template>
  <div class="grouped-body">
    <component
      :is="model.kit.Code.vue"
      v-for="item in model.reversedItems"
      :key="item"
      :kit="model.kit.Code"
      :code="item"
      @copy="model.onCopy($event)"
    />
  </div>
</template>
