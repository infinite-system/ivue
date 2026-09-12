<script setup lang="ts">
import type { ToolCall } from './ToolCall';

// The expanded card's foot: the cap control and the images a result
// carried — markup only.
defineProps<{ model: ToolCall.Instance }>();
</script>

<template>
  <div v-if="model.hasImages" class="ac-tool-images">
    <img v-for="(image, at) in model.images" :key="at" :src="image" alt="" loading="lazy" />
  </div>
  <div v-if="model.showsCapControl" class="ac-tool-foot">
    <button type="button" class="ac-link" @click="model.toggleAll()">
      {{ model.showAllLabel }}
    </button>
  </div>
</template>
