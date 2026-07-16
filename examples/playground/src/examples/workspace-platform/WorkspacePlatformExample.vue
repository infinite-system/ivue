<script setup lang="ts">
import ActivityPanel from './ActivityPanel.vue';
import MemberAvatar from './MemberAvatar.vue';
import TaskBoard from './TaskBoard.vue';
import TaskDetails from './TaskDetails.vue';
import TaskList from './TaskList.vue';
import { PRIORITY_META } from './types';
import { WorkspacePlatformExample as WorkspacePlatformExampleModel } from './WorkspacePlatformExample';
import './workspace.css';

const example = new WorkspacePlatformExampleModel.Class();
const workspace = example.workspace;
const { assigneeFilter, priorityFilter, search, selectedProjectId, view } =
  workspace;
const { creatingTask, newTaskTitle } = example;
</script>

<template>
  <div class="ow-example">
    <div class="ow-app">
      <aside class="ow-sidebar">
        <header class="ow-brand">
          <span>O</span>
          <strong>Orbit</strong>
          <button type="button" aria-label="Workspace menu">
            <span class="ow-symbol">⌄</span>
          </button>
        </header>

        <label class="ow-global-search">
          <span>⌕</span>
          <input v-model="search" placeholder="Search workspace" />
          <kbd>⌘ K</kbd>
        </label>

        <nav class="ow-primary-nav">
          <button type="button"><span class="ow-symbol">⌂</span>Home</button>
          <button type="button" class="active">
            <span class="ow-symbol">✓</span>My work<i>5</i>
          </button>
          <button type="button">
            <span class="ow-symbol">◷</span>Inbox<i
              class="alert"
              aria-label="3 unread notifications"
            ></i>
          </button>
          <button type="button">
            <span class="ow-symbol">▦</span>Dashboards
          </button>
        </nav>

        <section class="ow-project-nav">
          <header>
            <span>Projects</span
            ><button type="button" aria-label="Add project">
              <span class="ow-symbol">＋</span>
            </button>
          </header>
          <button
            type="button"
            :class="{ active: selectedProjectId === 'all' }"
            @click="workspace.selectProject('all')"
          >
            <i class="ow-everything ow-symbol">◎</i>
            <span>Everything</span>
            <small>{{ workspace.tasks.value.length }}</small>
          </button>
          <button
            v-for="project in workspace.projects.value"
            :key="project.id"
            type="button"
            :class="{ active: selectedProjectId === project.id }"
            @click="workspace.selectProject(project.id)"
          >
            <i class="ow-symbol" :style="{ color: project.color }">{{
              project.icon
            }}</i>
            <span>{{ project.name.value }}</span>
            <small>{{ workspace.taskCountForProject(project.id) }}</small>
          </button>
        </section>

        <section class="ow-workload">
          <header><span>Team workload</span><small>This week</small></header>
          <div
            v-for="member in workspace.members.value.slice(0, 4)"
            :key="member.id"
          >
            <MemberAvatar :member="member" size="small" />
            <i
              ><b
                :style="{ width: `${workspace.workloadPercent(member)}%` }"
              ></b
            ></i>
            <small>{{ workspace.workloadFor(member.id) }}h</small>
          </div>
        </section>

        <footer class="ow-sidebar-user">
          <MemberAvatar :member="workspace.memberById('you')" />
          <span class="ow-sidebar-user__copy"
            ><strong>Alex Morgan</strong><small>Workspace lead</small></span
          >
          <button type="button" aria-label="User menu">
            <span class="ow-symbol">•••</span>
          </button>
        </footer>
      </aside>

      <main class="ow-main">
        <header class="ow-topbar">
          <div>
            <span>Orbit Labs</span><i>/</i
            ><strong>{{ workspace.title }}</strong>
          </div>
          <div class="ow-topbar__people">
            <MemberAvatar
              v-for="member in workspace.members.value.slice(0, 4)"
              :key="member.id"
              :member="member"
              size="small"
            />
            <button
              type="button"
              title="Reset example"
              @click="workspace.reset()"
            >
              <span class="ow-symbol">↻</span>
            </button>
            <button type="button" class="ow-share">Share</button>
          </div>
        </header>

        <div class="ow-page-head">
          <div class="ow-page-title">
            <span
              class="ow-page-icon"
              :style="{
                background: workspace.selectedProject?.color ?? '#6366f1',
              }"
            >
              {{ workspace.selectedProject?.icon ?? '◎' }}
            </span>
            <div>
              <small>PROJECT</small>
              <h2>{{ workspace.title }}</h2>
              <p>Plan the work, see ownership, and keep the team moving.</p>
            </div>
          </div>

          <div class="ow-metrics">
            <article>
              <span>Progress</span>
              <strong>{{ workspace.completionRate }}%</strong>
              <i><b :style="{ width: `${workspace.completionRate}%` }"></b></i>
            </article>
            <article>
              <span>Active</span><strong>{{ workspace.activeCount }}</strong
              ><small>in flight</small>
            </article>
            <article :class="{ danger: workspace.overdueCount > 0 }">
              <span>Overdue</span><strong>{{ workspace.overdueCount }}</strong
              ><small>needs attention</small>
            </article>
          </div>
        </div>

        <div class="ow-viewbar">
          <div class="ow-view-tabs">
            <button
              type="button"
              :class="{ active: view === 'list' }"
              @click="view = 'list'"
            >
              <span class="ow-symbol">☷</span> List
            </button>
            <button
              type="button"
              :class="{ active: view === 'board' }"
              @click="view = 'board'"
            >
              <span class="ow-symbol">▦</span> Board
            </button>
          </div>
          <div class="ow-view-actions">
            <select v-model="assigneeFilter" aria-label="Filter by assignee">
              <option value="all">All assignees</option>
              <option
                v-for="member in workspace.members.value"
                :key="member.id"
                :value="member.id"
              >
                {{ member.name }}
              </option>
            </select>
            <select v-model="priorityFilter" aria-label="Filter by priority">
              <option value="all">All priorities</option>
              <option
                v-for="(meta, priority) in PRIORITY_META"
                :key="priority"
                :value="priority"
              >
                {{ meta.label }} priority
              </option>
            </select>
            <button
              v-if="workspace.filterCount"
              type="button"
              @click="workspace.clearFilters()"
            >
              Clear {{ workspace.filterCount }}
            </button>
            <button
              type="button"
              class="ow-new-task"
              @click="example.toggleTaskCreation()"
            >
              <span class="ow-symbol">＋</span> New task
            </button>
          </div>
        </div>

        <form
          v-if="creatingTask"
          class="ow-quick-add"
          @submit.prevent="example.submitTask()"
        >
          <span>＋</span>
          <input
            v-model="newTaskTitle"
            autofocus
            placeholder="What needs to be done?"
          />
          <small>Backlog · Assigned to you</small>
          <button type="button" @click="example.cancelTaskCreation()">
            Cancel
          </button>
          <button type="submit" :disabled="example.isTaskSubmitDisabled">
            Create task
          </button>
        </form>

        <div class="ow-content">
          <div class="ow-work-surface">
            <TaskList v-if="view === 'list'" />
            <TaskBoard v-else />
            <div
              v-if="workspace.filteredTasks.length === 0"
              class="ow-no-results"
            >
              <span>⌕</span>
              <strong>No tasks match these filters</strong>
              <button type="button" @click="workspace.clearFilters()">
                Clear filters
              </button>
            </div>
          </div>
          <ActivityPanel />
        </div>
      </main>

      <TaskDetails
        v-if="workspace.selectedTask"
        :task="workspace.selectedTask"
      />
    </div>
  </div>
</template>
