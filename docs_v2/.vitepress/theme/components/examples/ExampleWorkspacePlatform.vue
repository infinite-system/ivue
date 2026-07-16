<script setup lang="ts">
import WorkspacePlatformExample from '@examples/workspace-platform/WorkspacePlatformExample.vue';
</script>

<template>
  <div class="workspace-embed">
    <WorkspacePlatformExample />
  </div>
</template>

<style>
.workspace-embed {
  margin: 22px 0;
  overflow: hidden;
}

@media (max-width: 640px) {
  .workspace-embed {
    margin-inline: -8px;
  }
}
</style>
