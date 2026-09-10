<script setup lang="ts">
import type { Kit } from '@kit/Kit';
import type { Snippet } from './Snippet';

// The shipped head: the file's name and its language. Markup only.
defineProps<{ kit: Kit.Entry; model: Snippet.Instance }>();
</script>

<template>
  <header class="snip-head">
    <span class="snip-name">{{ model.name }}</span>
    <span class="snip-lang">{{ model.lang }}</span>
  </header>
</template>
