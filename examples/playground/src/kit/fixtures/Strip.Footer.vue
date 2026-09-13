<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Strip } from './Strip';

// A section: markup only, over the model it belongs to.
defineProps<{ kit: Kit.Entry; model: Strip.Instance }>();
</script>

<template>
  <footer v-if="model.hasItems" class="strip-foot">{{ model.items.length }}</footer>
</template>
