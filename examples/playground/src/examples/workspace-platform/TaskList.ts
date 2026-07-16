import { Reactive } from '../../ivue';
import type { Task } from './Task';
import type { TaskStatus } from './types';
import { useWorkspace } from './Workspace';

class $TaskList {
  private get $workspace() {
    return useWorkspace();
  }

  tasksByStatus(status: TaskStatus) {
    return this.$workspace.tasksByStatus(status);
  }

  hasTasks(status: TaskStatus) {
    return this.tasksByStatus(status).length > 0;
  }

  isComplete(status: TaskStatus) {
    return status === 'done';
  }

  openTask(task: Task.Model) {
    this.$workspace.openTask(task.id);
  }

  changeStatus(task: Task.Model, event: Event) {
    task.setStatus((event.target as HTMLSelectElement).value as TaskStatus);
  }
}

export namespace TaskList {
  export const $Class = $TaskList;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
