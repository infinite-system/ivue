import { ref } from 'vue';
import { Reactive } from '../../ivue';
import type { Task } from './Task';
import type { TaskStatus } from './types';
import { useWorkspace } from './Workspace';

class $TaskBoard {
  get draggingTaskId() {
    return ref<string | null>(null);
  }

  get dropTarget() {
    return ref<TaskStatus | null>(null);
  }

  private get $workspace() {
    return useWorkspace();
  }

  tasksByStatus(status: TaskStatus) {
    return this.$workspace.tasksByStatus(status);
  }

  hasTasks(status: TaskStatus) {
    return this.tasksByStatus(status).length > 0;
  }

  isDropTarget(status: TaskStatus) {
    return this.dropTarget.value === status;
  }

  isDragging(task: Task.Model) {
    return this.draggingTaskId.value === task.id;
  }

  openTask(task: Task.Model) {
    this.$workspace.openTask(task.id);
  }

  startDrag(task: Task.Model) {
    this.draggingTaskId.value = task.id;
  }

  endDrag() {
    this.draggingTaskId.value = null;
    this.dropTarget.value = null;
  }

  enterDropTarget(status: TaskStatus) {
    this.dropTarget.value = status;
  }

  leaveDropTarget() {
    this.dropTarget.value = null;
  }

  drop(status: TaskStatus) {
    const task = this.$workspace.tasks.value.find(
      (candidate) => candidate.id === this.draggingTaskId.value,
    );
    task?.setStatus(status);
    this.endDrag();
  }
}

export namespace TaskBoard {
  export const $Class = $TaskBoard;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
