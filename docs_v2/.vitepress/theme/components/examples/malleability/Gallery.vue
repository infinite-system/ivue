<script setup lang="ts">
import { Gallery } from './Gallery';

const props = defineProps(Gallery.Class.props);

const model = new (props.kit?.namespace.Class ?? Gallery.Class)(props);

defineExpose(model as Gallery.Instance);
</script>

<template>
  <div class="gallery">
    <component
      :is="model.kit.Snippet.vue"
      v-for="snippet in model.snippets"
      :key="snippet.name"
      :kit="model.kit.Snippet"
      :snippet="snippet"
    />
  </div>
</template>
