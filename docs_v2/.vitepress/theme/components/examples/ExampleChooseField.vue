<script setup lang="ts">
import { ExampleFieldEmbed } from './ExampleFieldEmbed';

const embed = new ExampleFieldEmbed.Class(
  () => import('@examples/fields/choose-field/ChooseFieldExample.vue'),
);

// the state destructure
const {
  // state refs
  example,
  failure,
} = embed;
</script>

<template>
  <div class="field-embed">
    <component :is="example" v-if="example" />
    <p v-else-if="failure" class="field-embed__error">{{ failure }}</p>
    <p v-else class="field-embed__loading">loading the live example…</p>
  </div>
</template>

<style src="./field-embed.css"></style>
