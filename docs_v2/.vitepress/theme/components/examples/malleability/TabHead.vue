<script setup lang="ts">
import type { Kit } from '@kit/Kit';
import type { Snippet } from './Snippet';

// A swapped head: an editor tab bar painted from the block's own palette,
// naming the theme and the engine the block below renders with.
defineProps<{ kit: Kit.Entry; model: Snippet.Instance }>();
</script>

<template>
  <header class="tab-head">
    <span class="tab-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="tab-tab">{{ model.name }}</span>
    <span class="tab-meta">
      <span class="tab-theme">{{ model.theme }}</span>
      <span class="tab-engine">{{ model.engineLabel }}</span>
    </span>
  </header>
</template>
