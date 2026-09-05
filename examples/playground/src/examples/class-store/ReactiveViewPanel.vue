<script setup lang="ts">
// The OPTIONAL consumption style: the same singleton wrapped in reactive().
// Refs auto-unwrap on read AND write — no .value anywhere in this file.
// The Instance type returned by use() is what makes the
// writes typecheck (it strips TS's readonly on get-only accessors).
import { ProjectStore } from './ProjectStore';

const project = ProjectStore.Class.useReactive();
</script>

<template>
  <div class="reactive-view">
    <p class="mono">
      project.projectName · project.filter — reads and writes, no .value:
    </p>
    <input v-model="project.projectName" class="reactive-view__input" />
    <div class="row" style="margin-top: 10px">
      <button
        class="btn"
        type="button"
        @click="project.filter = project.filter === 'done' ? 'all' : 'done'"
      >
        filter: {{ project.filter }}
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
