<script setup lang="ts">
import type { Kit } from '@kit/Kit';
import type { Snippet } from './Snippet';

// The shipped foot: a line count and a copy button. Markup only.
defineProps<{ kit: Kit.Entry; model: Snippet.Instance }>();
</script>

<template>
  <footer class="snip-foot">
    <span class="snip-lines">{{ model.linesLabel }}</span>
    <span class="snip-engine">{{ model.engineLabel }}</span>
    <button type="button" class="snip-copy" @click="model.copyAll()">{{ model.copyLabel }}</button>
  </footer>
</template>
