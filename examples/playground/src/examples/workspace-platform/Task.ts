import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import type { Member } from './Member';
import type { Project } from './Project';
import {
  PRIORITY_META,
  STATUS_META,
  type ChecklistItem,
  type TaskComment,
  type TaskPriority,
  type TaskSeed,
  type TaskStatus,
} from './types';

class $Task {
  readonly id: string;
  readonly projectId: string;
  readonly workspace: Task.Owner;

  constructor(workspace: Task.Owner, seed: TaskSeed, dueDate: string) {
    this.workspace = workspace;
    this.id = seed.id;
    this.projectId = seed.projectId;
    this.title.value = seed.title;
    this.description.value = seed.description;
    this.status.value = seed.status;
    this.priority.value = seed.priority;
    this.assigneeId.value = seed.assigneeId;
    this.dueDate.value = dueDate;
    this.estimateHours.value = seed.estimateHours;
    this.tags.value = [...seed.tags];
    this.checklist.value = (seed.checklist ?? []).map((item) => ({ ...item }));
    this.comments.value = (seed.comments ?? []).map((comment) => ({
      ...comment,
    }));
  }

  get title() {
    return ref('');
  }

  get description() {
    return ref('');
  }

  get status() {
    return ref<TaskStatus>('backlog');
  }

  get priority() {
    return ref<TaskPriority>('normal');
  }

  get assigneeId() {
    return ref('');
  }

  get dueDate() {
    return ref('');
  }

  get estimateHours() {
    return ref(0);
  }

  get tags() {
    return shallowRef<string[]>([]);
  }

  get checklist() {
    return shallowRef<ChecklistItem[]>([]);
  }

  get comments() {
    return shallowRef<TaskComment[]>([]);
  }

  get assignee() {
    return this.workspace.memberById(this.assigneeId.value);
  }

  get project() {
    return this.workspace.projectById(this.projectId);
  }

  get completedChecklistCount() {
    return this.checklist.value.filter((item) => item.done).length;
  }

  get checklistProgress() {
    if (this.checklist.value.length === 0) return 0;
    return Math.round(
      (this.completedChecklistCount / this.checklist.value.length) * 100,
    );
  }

  get checklistBarStyle() {
    return { width: `${this.checklistProgress}%` };
  }

  get priorityColor() {
    return PRIORITY_META[this.priority.value].color;
  }

  get priorityTitle() {
    return `${PRIORITY_META[this.priority.value].label} priority`;
  }

  get dueDayOffset() {
    const due = new Date(`${this.dueDate.value}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / 86_400_000);
  }

  get isOverdue() {
    return this.status.value !== 'done' && this.dueDayOffset < 0;
  }

  get dueLabel() {
    if (this.status.value === 'done') return 'Complete';
    if (this.dueDayOffset === 0) return 'Today';
    if (this.dueDayOffset === 1) return 'Tomorrow';
    if (this.dueDayOffset === -1) return '1 day overdue';
    if (this.dueDayOffset < -1)
      return `${Math.abs(this.dueDayOffset)} days overdue`;
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${this.dueDate.value}T12:00:00`));
  }

  setStatus(status: TaskStatus) {
    if (status === this.status.value) return;
    this.status.value = status;
    this.workspace.recordActivity(
      'you',
      '→',
      `moved ${this.title.value} to ${STATUS_META[status].label}`,
    );
  }

  setPriority(priority: TaskPriority) {
    if (priority === this.priority.value) return;
    this.priority.value = priority;
    this.workspace.recordActivity(
      'you',
      '!',
      `set ${this.title.value} to ${PRIORITY_META[priority].label} priority`,
    );
  }

  setAssignee(memberId: string) {
    if (memberId === this.assigneeId.value) return;
    this.assigneeId.value = memberId;
    const member = this.workspace.memberById(memberId);
    this.workspace.recordActivity(
      'you',
      '@',
      `assigned ${this.title.value} to ${member?.name ?? 'Unassigned'}`,
    );
  }

  toggleChecklist(itemId: string) {
    this.checklist.value = this.checklist.value.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    this.workspace.recordActivity(
      'you',
      '✓',
      `updated the checklist on ${this.title.value}`,
    );
  }

  addComment(body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    this.comments.value = [
      ...this.comments.value,
      {
        id: `comment-${Date.now()}`,
        authorId: 'you',
        body: trimmed,
        createdAt: 'Just now',
      },
    ];
    this.workspace.recordActivity(
      'you',
      '+',
      `commented on ${this.title.value}`,
    );
  }
}

export namespace Task {
  export const $Class = $Task;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;

  /* Types */

  /** What a task needs from its owner — the workspace, seen narrowly. */
  export interface Owner {
    memberById(memberId: string): Member.Model | undefined;
    projectById(projectId: string): Project.Model | undefined;
    recordActivity(actorId: string, icon: string, text: string): void;
  }
}
