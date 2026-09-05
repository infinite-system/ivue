<script setup lang="ts">
import TaskBoard from './TaskBoard.vue';
import ProjectStats from './ProjectStats.vue';
import ReactiveViewPanel from './ReactiveViewPanel.vue';
</script>

<template>
  <div class="pane pane-wide">
    <p class="note">
      Three independent components, ZERO props between them — each calls
      ProjectStore.Class.use() and receives the same singleton class instance.
    </p>
    <div class="store-grid">
      <section>
        <h3>TaskBoard.vue — writes the store</h3>
        <TaskBoard />
      </section>
      <section>
        <h3>ProjectStats.vue — reads the store</h3>
        <ProjectStats />
      </section>
      <section>
        <h3>ReactiveViewPanel.vue — writes name and filter</h3>
        <ReactiveViewPanel />
      </section>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.pane-wide {
  max-width: 980px;
}
.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: 24px 26px;
  align-items: start;
}
.store-grid h3 {
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f1f5ff;
}
</style>
