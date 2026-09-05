<script setup lang="ts">
import { ProjectStore } from './ProjectStore';

// the SAME singleton the TaskBoard writes — no props, no provide/inject
const project = ProjectStore.Class.use();

// the state destructure
const {
  // state refs
  projectName,
} = project;
</script>

<template>
  <div class="stats">
    <div class="vals">
      <div>
        <div class="k">project</div>
        <div class="n">
          <input v-model="projectName" class="stats__name" />
        </div>
      </div>
      <div>
        <div class="k">done</div>
        <div class="n grad">
          {{ project.completedCount }}/{{ project.taskCount }}
        </div>
      </div>
      <div>
        <div class="k">progress</div>
        <div class="n">{{ project.progressPercent }}%</div>
      </div>
    </div>
    <div class="stats__bar">
      <div
        class="stats__fill"
        :style="project.progressBarStyle"
      />
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.stats__name {
  width: 100%;
  padding: 2px 0;
  border: none;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: inherit;
  font-size: 20px;
  font-weight: 700;
}
.stats__name:hover,
.stats__name:focus {
  border-bottom-color: rgba(148, 163, 184, 0.4);
  outline: none;
}
.stats__bar {
  height: 8px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.15);
  overflow: hidden;
}
.stats__fill {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(120deg, #6366f1, #34d399);
  transition: width 0.3s ease;
}
</style>
