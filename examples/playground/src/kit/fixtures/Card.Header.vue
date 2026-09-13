<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Card } from './Card';

// A section: markup only, over the model it belongs to.
defineProps<{ kit: Kit.Entry; model: Card.Instance }>();
</script>

<template>
  <header class="card-head">{{ model.title }}</header>
</template>
