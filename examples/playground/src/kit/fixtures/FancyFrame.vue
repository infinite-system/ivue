<script setup lang="ts">
import type { Kit } from '../Kit';
import type { Card } from './Card';

defineProps<{ kit: Kit.Entry; model: Card.Instance }>();
</script>

<template>
  <section class="fancy-frame"><slot /></section>
</template>
