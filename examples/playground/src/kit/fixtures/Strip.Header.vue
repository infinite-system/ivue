<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Strip } from './Strip';

// A section: markup only, over the model it belongs to.
defineProps<{ kit: Kit.Entry; model: Strip.Instance }>();
</script>

<template>
  <header class="strip-head">{{ model.title }}</header>
</template>
