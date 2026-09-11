<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Strip } from './Strip';

// The list section: every item through the Item seam, fed as the seam's
// item with the loop's key.
defineProps<{ kit: Kit.Entry; model: Strip.Instance }>();
</script>

<template>
  <div class="strip-body">
    <component
      v-for="(item, at) in model.items"
      :key="item"
      :is="model.kit.Item.view"
      v-bind="model.seamProps('Item', item, at)"
    />
  </div>
</template>
