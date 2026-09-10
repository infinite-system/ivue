<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Card } from './Card';

// A section that renders the slot its parent fills at the seam.
defineProps<{ kit: Kit.Entry; model: Card.Instance }>();
</script>

<template>
  <div class="frame"><slot /></div>
</template>
