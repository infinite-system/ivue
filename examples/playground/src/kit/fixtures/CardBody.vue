<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Card } from './Card';

// The collection section: it renders the items through the Code seam and
// listens at the seam, so a swap of the Code view or class keeps the listener.
defineProps<{ kit: Kit.Entry; model: Card.Instance }>();
</script>

<template>
  <div class="card-body">
    <component
      :is="model.kit.Code.vue"
      v-for="item in model.items"
      :key="item"
      :kit="model.kit.Code"
      :code="item"
      :cap="4"
      @copy="model.onCopy($event)"
    />
  </div>
</template>
