<script setup lang="ts">
import { FilesPanel } from './FilesPanel';

const props = defineProps<FilesPanel.Props>();

const model = new ((props.kit?.namespace.Class as typeof FilesPanel.Class | undefined) ?? FilesPanel.Class)(props);
</script>

<template>
  <section class="ac-panel-pane ac-files">
    <header class="ac-pane-head">
      <strong>Files</strong>
      <span class="ac-muted">{{ model.countLabel }}</span>
      <span class="ac-muted ac-pane-note">{{ model.coverageLabel }}</span>
    </header>
    <p v-if="!model.hasFiles" class="ac-pane-empty">No file has been read, edited or written in the messages loaded so far. Scroll the thread and the list fills.</p>
    <ul v-else class="ac-file-list">
      <li v-for="file in model.files" :key="file.path" class="ac-file" :title="file.path" @click="model.open(file)">
        <span class="ac-file-name">{{ file.name }}</span>
        <span class="ac-file-dir">{{ file.dir }}</span>
        <span class="ac-file-touches">{{ model.touchesLabel(file) }}</span>
      </li>
    </ul>
  </section>
</template>
