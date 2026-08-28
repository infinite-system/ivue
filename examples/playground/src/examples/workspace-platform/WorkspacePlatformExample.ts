import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { Workspace } from './Workspace';

class $WorkspacePlatformExample {
  get creatingTask() {
    return ref(false);
  }

  get newTaskTitle() {
    return ref('');
  }

  private get $workspace() {
    return Workspace.use();
  }

  get workspace() {
    return this.$workspace;
  }

  get isTaskSubmitDisabled() {
    return !this.newTaskTitle.value.trim();
  }

  toggleTaskCreation() {
    this.creatingTask.value = !this.creatingTask.value;
  }

  cancelTaskCreation() {
    this.creatingTask.value = false;
  }

  submitTask() {
    this.workspace.addTask(this.newTaskTitle.value);
    this.newTaskTitle.value = '';
    this.creatingTask.value = false;
  }
}

export namespace WorkspacePlatformExample {
  export const $Class = $WorkspacePlatformExample;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
