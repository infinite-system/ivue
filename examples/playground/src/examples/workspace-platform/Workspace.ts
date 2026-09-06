import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Member } from './Member';
import { Project } from './Project';
import { Task } from './Task';
import { Seeds } from './Seeds';
import {
  STATUS_ORDER,
  type ActivityEntry,
  type TaskPriority,
  type TaskStatus,
  type WorkspaceView,
} from './types';

class $Workspace {

  /** The app-wide workspace singleton — a `$`-static: constructed on
   *  first use through the namespace slot, after the app exists. */
  protected static get $shared(): Workspace.Model {
    return new Workspace.Class();
  }

  /** The app-wide workspace singleton, created on first use. */
  static use(): Workspace.Model {
    return this.$shared;
  }

  protected static dateAtOffset(offset: number) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  }

  constructor() {
    this.reset();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Workspace;
  }

  get name() {
    return ref('Orbit Labs');
  }

  get projects() {
    return shallowRef<Project.Model[]>([]);
  }

  get members() {
    return shallowRef<Member.Model[]>([]);
  }

  get tasks() {
    return shallowRef<Task.Model[]>([]);
  }

  get activities() {
    return shallowRef<ActivityEntry[]>([]);
  }

  get selectedProjectId() {
    return ref<string | 'all'>('launch');
  }

  get selectedTaskId() {
    return ref<string | null>(null);
  }

  get view() {
    return ref<WorkspaceView>('list');
  }

  get search() {
    return ref('');
  }

  get priorityFilter() {
    return ref<TaskPriority | 'all'>('all');
  }

  get assigneeFilter() {
    return ref<string | 'all'>('all');
  }

  get nextTaskNumber() {
    return ref(500);
  }

  get selectedProject() {
    if (this.selectedProjectId.value === 'all') return undefined;
    return this.projectById(this.selectedProjectId.value);
  }

  get selectedTask() {
    return this.tasks.value.find(
      (task) => task.id === this.selectedTaskId.value,
    );
  }

  get isAllSelected() {
    return this.selectedProjectId.value === 'all';
  }

  get isListView() {
    return this.view.value === 'list';
  }

  get selectedProjectIcon() {
    return this.selectedProject?.icon ?? '◎';
  }

  get selectedProjectColor() {
    return this.selectedProject?.color ?? '#6366f1';
  }

  get title() {
    return this.selectedProject?.name.value ?? 'Everything';
  }

  get projectTasks() {
    if (this.selectedProjectId.value === 'all') return this.tasks.value;
    return this.tasks.value.filter(
      (task) => task.projectId === this.selectedProjectId.value,
    );
  }

  get filteredTasks() {
    const query = this.search.value.trim().toLowerCase();
    return this.projectTasks.filter((task) => {
      if (
        this.priorityFilter.value !== 'all' &&
        task.priority.value !== this.priorityFilter.value
      ) {
        return false;
      }
      if (
        this.assigneeFilter.value !== 'all' &&
        task.assigneeId.value !== this.assigneeFilter.value
      ) {
        return false;
      }
      if (!query) return true;
      return [
        task.id,
        task.title.value,
        task.assignee?.name ?? '',
        ...task.tags.value,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }

  get completedCount() {
    return this.projectTasks.filter((task) => task.status.value === 'done')
      .length;
  }

  get completionRate() {
    if (this.projectTasks.length === 0) return 0;
    return Math.round((this.completedCount / this.projectTasks.length) * 100);
  }

  get activeCount() {
    return this.projectTasks.filter(
      (task) => task.status.value === 'in-progress',
    ).length;
  }

  get overdueCount() {
    return this.projectTasks.filter((task) => task.isOverdue).length;
  }

  get completionWidth() {
    return `${this.completionRate}%`;
  }

  get hasOverdue() {
    return this.overdueCount > 0;
  }

  get hasNoTasks() {
    return this.filteredTasks.length === 0;
  }

  get filterCount() {
    return (
      Number(this.priorityFilter.value !== 'all') +
      Number(this.assigneeFilter.value !== 'all') +
      Number(Boolean(this.search.value.trim()))
    );
  }

  readonly statusOrder = STATUS_ORDER;

  memberById(memberId: string) {
    return this.members.value.find((member) => member.id === memberId);
  }

  projectById(projectId: string) {
    return this.projects.value.find((project) => project.id === projectId);
  }

  taskCountForProject(projectId: string) {
    return this.tasks.value.filter((task) => task.projectId === projectId)
      .length;
  }

  tasksByStatus(status: TaskStatus) {
    return this.filteredTasks.filter((task) => task.status.value === status);
  }

  workloadFor(memberId: string) {
    return this.tasks.value
      .filter(
        (task) =>
          task.assigneeId.value === memberId && task.status.value !== 'done',
      )
      .reduce((hours, task) => hours + task.estimateHours.value, 0);
  }

  workloadPercent(member: Member.Model) {
    return Math.min(
      100,
      Math.round((this.workloadFor(member.id) / member.capacity.value) * 100),
    );
  }

  /** Whether a project is the selected one (a per-item template condition). */
  isSelected(project: Project.Model) {
    return this.selectedProjectId.value === project.id;
  }

  workloadWidth(member: Member.Model) {
    return `${this.workloadPercent(member)}%`;
  }

  showList() {
    this.view.value = 'list';
  }

  showBoard() {
    this.view.value = 'board';
  }

  selectProject(projectId: string | 'all') {
    this.selectedProjectId.value = projectId;
    this.selectedTaskId.value = null;
  }

  openTask(taskId: string) {
    this.selectedTaskId.value = taskId;
  }

  closeTask() {
    this.selectedTaskId.value = null;
  }

  addTask(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const projectId =
      this.selectedProjectId.value === 'all'
        ? this.projects.value[0].id
        : this.selectedProjectId.value;
    const id = `OR-${++this.nextTaskNumber.value}`;
    const task = new Task.Class(
      this,
      {
        id,
        projectId,
        title: trimmed,
        description: 'Add the details and acceptance criteria for this task.',
        status: 'backlog',
        priority: 'normal',
        assigneeId: 'you',
        dueOffset: 7,
        estimateHours: 3,
        tags: ['new'],
      },
      this.self.dateAtOffset(7),
    );
    this.tasks.value = [task, ...this.tasks.value];
    this.recordActivity('you', '+', `created ${trimmed}`);
    this.openTask(id);
  }

  recordActivity(actorId: string, icon: string, text: string) {
    this.activities.value = [
      {
        id: Date.now() + Math.random(),
        actorId,
        icon,
        text,
        createdAt: 'Just now',
      },
      ...this.activities.value,
    ].slice(0, 12);
  }

  clearFilters() {
    this.search.value = '';
    this.priorityFilter.value = 'all';
    this.assigneeFilter.value = 'all';
  }

  reset() {
    this.projects.value = Seeds.Class.projects.map((seed) => new Project.Class(seed));
    this.members.value = Seeds.Class.members.map((seed) => new Member.Class(seed));
    this.tasks.value = Seeds.Class.tasks.map(
      (seed) => new Task.Class(this, seed, this.self.dateAtOffset(seed.dueOffset)),
    );
    this.activities.value = Seeds.Class.activities.map((entry, index) => ({
      ...entry,
      id: index + 1,
    }));
    this.selectedProjectId.value = 'launch';
    this.selectedTaskId.value = null;
    this.view.value = 'list';
    this.clearFilters();
    this.nextTaskNumber.value = 500;
  }
}

export namespace Workspace {
  export const $Class = Static($Workspace); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
