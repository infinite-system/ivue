<script setup lang="ts">
import { ProjectStore } from './ProjectStore';

// the SAME singleton the other two panels use
const project = ProjectStore.Class.use();

// the state destructure
const {
  // state refs
  projectName,
  filter,
} = project;
</script>

<template>
  <div class="reactive-view">
    <p class="mono">projectName · filter — state bindings write the store's cells:</p>
    <input v-model="projectName" class="reactive-view__input" />
    <div class="row" style="margin-top: 10px">
      <button class="btn" type="button" @click="project.toggleDoneFilter()">
        filter: {{ filter }}
      </button>
      <span class="mono">
        {{ project.completedCount }} done · {{ project.progressPercent }}%
      </span>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.reactive-view__input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font-size: 13px;
}
</style>
