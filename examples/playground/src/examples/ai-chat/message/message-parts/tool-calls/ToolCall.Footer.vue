<script setup lang="ts">
import type { ToolCall } from './ToolCall';

// The expanded card's tail: the images a result carried and the cap control — markup only.
defineProps<ToolCall.SectionProps>();
</script>

<template>
  <div v-if="model.isExpanded" class="ac-tool-tail">
    <div v-if="model.hasImages" class="ac-tool-images">
      <img v-for="(image, at) in model.images" :key="at" :src="image" alt="" loading="lazy" />
    </div>
    <div v-if="model.showsCapControl" class="ac-tool-foot">
      <button type="button" class="ac-link" @click="model.toggleAll()">
        {{ model.showAllLabel }}
      </button>
    </div>
  </div>
</template>
