<script setup lang="ts">
import { ChatShell } from './ChatShell';

const props = defineProps<ChatShell.Props>();

const shell = new ChatShell.Class(props);

// the state destructure
const {
  // element refs
  view
} = shell;

defineExpose(shell as ChatShell.Instance);
</script>

<template>
  <component
    :is="shell.entry.view"
    ref="view"
    :key="shell.treeId"
    :kit="shell.entry"
    :dark="shell.dark"
  />
</template>
