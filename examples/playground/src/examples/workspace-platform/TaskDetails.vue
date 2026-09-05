<script setup lang="ts">
import MemberAvatar from './MemberAvatar.vue';
import type { Task } from './Task';
import { TaskDetails as TaskDetailsModel } from './TaskDetails';
import { PRIORITY_META, STATUS_META, STATUS_ORDER } from './types';

const props = defineProps<{ task: Task.Model }>();
const details = new TaskDetailsModel.Class(props);
const { comment } = details;
</script>

<template>
  <div class="ow-detail-scrim" @click.self="details.close()">
    <aside class="ow-detail" aria-label="Task details">
      <header class="ow-detail__top">
        <span>
          <i :style="{ background: details.task.project?.color }"></i>
          {{ details.task.project?.name.value }} / {{ details.task.id }}
        </span>
        <div>
          <button type="button" title="Copy link">
            <span class="ow-symbol">↗</span>
          </button>
          <button type="button" aria-label="Close" @click="details.close()">
            <span class="ow-symbol">×</span>
          </button>
        </div>
      </header>

      <div class="ow-detail__body">
        <input
          class="ow-detail__title"
          :value="details.task.title.value"
          aria-label="Task title"
          @input="details.updateTitle($event)"
        />

        <div class="ow-detail__fields">
          <label>
            <span>Status</span>
            <select
              :value="details.task.status.value"
              @change="details.updateStatus($event)"
            >
              <option
                v-for="status in STATUS_ORDER"
                :key="status"
                :value="status"
              >
                {{ STATUS_META[status].label }}
              </option>
            </select>
          </label>
          <label>
            <span>Assignee</span>
            <select
              :value="details.task.assigneeId.value"
              @change="details.updateAssignee($event)"
            >
              <option
                v-for="member in details.members"
                :key="member.id"
                :value="member.id"
              >
                {{ member.name }}
              </option>
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select
              :value="details.task.priority.value"
              @change="details.updatePriority($event)"
            >
              <option
                v-for="(meta, priority) in PRIORITY_META"
                :key="priority"
                :value="priority"
              >
                {{ meta.label }}
              </option>
            </select>
          </label>
          <label>
            <span>Due date</span>
            <input v-model="details.task.dueDate.value" type="date" />
          </label>
        </div>

        <section class="ow-detail-section">
          <h3>Description</h3>
          <textarea
            :value="details.task.description.value"
            rows="4"
            @input="details.updateDescription($event)"
          ></textarea>
        </section>

        <section
          v-if="details.task.checklist.value.length"
          class="ow-detail-section"
        >
          <header>
            <h3>Checklist</h3>
            <span>{{ details.task.checklistProgress }}%</span>
          </header>
          <div class="ow-checklist-bar">
            <i :style="details.task.checklistBarStyle"></i>
          </div>
          <label
            v-for="item in details.task.checklist.value"
            :key="item.id"
            class="ow-checklist-item"
            :class="{ done: item.done }"
          >
            <input
              type="checkbox"
              :checked="item.done"
              @change="details.task.toggleChecklist(item.id)"
            />
            <span>{{ item.label }}</span>
          </label>
        </section>

        <section class="ow-detail-section ow-comments">
          <h3>
            Comments <span>{{ details.task.comments.value.length }}</span>
          </h3>
          <article v-for="entry in details.task.comments.value" :key="entry.id">
            <MemberAvatar
              :member="details.memberById(entry.authorId)"
              size="small"
            />
            <div>
              <strong>{{ details.memberById(entry.authorId)?.name }}</strong>
              <small>{{ entry.createdAt }}</small>
              <p>{{ entry.body }}</p>
            </div>
          </article>
          <form
            class="ow-comment-form"
            @submit.prevent="details.submitComment()"
          >
            <MemberAvatar :member="details.memberById('you')" size="small" />
            <input v-model="comment" placeholder="Write a comment…" />
            <button type="submit" :disabled="details.isCommentSubmitDisabled">
              Send
            </button>
          </form>
        </section>
      </div>
    </aside>
  </div>
</template>
