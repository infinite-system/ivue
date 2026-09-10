<script setup lang="ts">
import { ChatShell } from './ChatShell';

const props = defineProps<ChatShell.Props>();

const shell = new ChatShell.Class(props);
</script>

<template>
  <component :is="shell.entry.vue" :key="shell.treeId" :kit="shell.entry" :dark="shell.dark" />
</template>
