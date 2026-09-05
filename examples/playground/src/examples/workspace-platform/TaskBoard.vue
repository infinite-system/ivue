<script setup lang="ts">
import MemberAvatar from './MemberAvatar.vue';
import { TaskBoard as TaskBoardModel } from './TaskBoard';
import { STATUS_META, STATUS_ORDER } from './types';

const board = new TaskBoardModel.Class();
</script>

<template>
  <div class="ow-board">
    <section
      v-for="status in STATUS_ORDER"
      :key="status"
      class="ow-board-column"
      :class="{ 'ow-board-column--target': board.isDropTarget(status) }"
      @dragover.prevent="board.enterDropTarget(status)"
      @dragleave="board.leaveDropTarget()"
      @drop.prevent="board.drop(status)"
    >
      <header>
        <span
          class="ow-status-dot"
          :style="{ background: STATUS_META[status].color }"
        ></span>
        <strong>{{ STATUS_META[status].label }}</strong>
        <span>{{ board.tasksByStatus(status).length }}</span>
        <button type="button" aria-label="Column menu">
          <span class="ow-symbol">•••</span>
        </button>
      </header>

      <button
        v-for="task in board.tasksByStatus(status)"
        :key="task.id"
        type="button"
        class="ow-board-card"
        draggable="true"
        :class="{ 'ow-board-card--dragging': board.isDragging(task) }"
        @dragstart="board.startDrag(task)"
        @dragend="board.endDrag()"
        @click="board.openTask(task)"
      >
        <span class="ow-board-card__project">
          <i :style="{ background: task.project?.color }"></i>
          {{ task.project?.name.value }}
        </span>
        <strong>{{ task.title.value }}</strong>
        <span class="ow-board-card__tags">
          <em
            v-for="tag in task.tags.value.slice(0, 2)"
            :key="tag"
            :data-tag="tag"
            >{{ tag }}</em
          >
        </span>
        <span
          v-if="task.checklist.value.length"
          class="ow-board-card__progress"
        >
          <i><b :style="task.checklistBarStyle"></b></i>
          {{ task.completedChecklistCount }}/{{ task.checklist.value.length }}
        </span>
        <footer>
          <span
            class="ow-priority-flag"
            :style="{ color: task.priorityColor }"
            :title="task.priorityTitle"
          >
            ⚑
          </span>
          <span :class="{ overdue: task.isOverdue }">{{ task.dueLabel }}</span>
          <MemberAvatar :member="task.assignee" size="small" />
        </footer>
      </button>

      <div v-if="!board.hasTasks(status)" class="ow-board-empty">
        Drop a task here
      </div>
    </section>
  </div>
</template>
