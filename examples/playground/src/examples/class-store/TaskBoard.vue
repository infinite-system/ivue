<script setup lang="ts">
import { TaskBoard } from './TaskBoard';

// wiring only — the board model reaches for the shared store itself
const board = new TaskBoard.Class();
const project = board.project;

// the state destructure
const {
  // state refs
  newTaskTitle,
} = board;
</script>

<template>
  <div class="board">
    <div class="board__add">
      <input
        v-model="newTaskTitle"
        placeholder="add a task…"
        @keyup.enter="board.submitTask()"
      />
      <button class="btn primary" type="button" @click="board.submitTask()">add</button>
    </div>
    <div class="board__filters">
      <button
        v-for="option in board.filterOptions"
        :key="option"
        class="btn"
        :class="{ primary: board.isFilter(option) }"
        type="button"
        @click="project.setFilter(option)"
      >
        {{ option }}
      </button>
    </div>
    <ul class="board__list">
      <li v-for="task in project.visibleTasks" :key="task.id">
        <label :class="{ done: task.done }">
          <input
            type="checkbox"
            :checked="task.done"
            @change="project.toggleTask(task.id)"
          />
          {{ task.title }}
        </label>
      </li>
    </ul>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.board__add {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.board__add input {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font-size: 13px;
}
.board__filters {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.board__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
}
.board__list label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.board__list label.done {
  opacity: 0.5;
  text-decoration: line-through;
}
</style>
