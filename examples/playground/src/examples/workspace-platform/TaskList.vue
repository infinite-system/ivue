<script setup lang="ts">
import MemberAvatar from './MemberAvatar.vue';
import { TaskList as TaskListModel } from './TaskList';
import { PRIORITY_META, STATUS_META, STATUS_ORDER } from './types';

const list = new TaskListModel.Class();
</script>

<template>
  <div class="ow-list">
    <section v-for="status in STATUS_ORDER" :key="status" class="ow-list-group">
      <header class="ow-list-group__head">
        <span
          class="ow-status-dot"
          :style="{ background: STATUS_META[status].color }"
        ></span>
        <strong>{{ STATUS_META[status].label }}</strong>
        <span>{{ list.tasksByStatus(status).length }}</span>
        <i></i>
      </header>

      <button
        v-for="task in list.tasksByStatus(status)"
        :key="task.id"
        type="button"
        class="ow-task-row"
        @click="list.openTask(task)"
      >
        <span
          class="ow-task-row__check"
          :class="{ done: list.isComplete(status) }"
        >
          <span v-if="list.isComplete(status)" class="ow-symbol">✓</span>
        </span>
        <span class="ow-task-row__main">
          <strong>{{ task.title.value }}</strong>
          <small>{{ task.id }} · {{ task.project?.name.value }}</small>
        </span>
        <span class="ow-task-row__tags">
          <em
            v-for="tag in task.tags.value.slice(0, 2)"
            :key="tag"
            :data-tag="tag"
          >
            {{ tag }}
          </em>
        </span>
        <span
          class="ow-priority"
          :style="{ '--priority': PRIORITY_META[task.priority.value].color }"
        >
          <i></i>{{ PRIORITY_META[task.priority.value].label }}
        </span>
        <span class="ow-task-row__due" :class="{ overdue: task.isOverdue }">
          {{ task.dueLabel }}
        </span>
        <MemberAvatar :member="task.assignee" size="small" />
        <select
          :value="task.status.value"
          :style="{ '--status': STATUS_META[task.status.value].color }"
          aria-label="Change status"
          @click.stop
          @change="list.changeStatus(task, $event)"
        >
          <option v-for="option in STATUS_ORDER" :key="option" :value="option">
            {{ STATUS_META[option].label }}
          </option>
        </select>
      </button>

      <p v-if="!list.hasTasks(status)" class="ow-empty-row">
        No matching tasks
      </p>
    </section>
  </div>
</template>
