// TaskBoard.ts — the board panel's view model: it reaches for the shared
// ProjectStore through a `$`-getter (cached per instance, resolved on
// first touch) and owns the one piece of state that is the panel's alone,
// the draft title of the task being added.
import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { ProjectStore, type TaskFilter } from './ProjectStore';

class $TaskBoard {
  // STORE — injected by `$`-getter; every consumer gets the one instance
  protected get $project() {
    return ProjectStore.Class.use();
  }

  /** The store, exposed for the template's dotted reads. */
  get project() {
    return this.$project;
  }

  // MUTABLE STATE — the panel's own
  get newTaskTitle() {
    return ref('');
  }

  // DERIVED — plain getters
  get filterOptions() {
    return ['all', 'active', 'done'] as const;
  }

  /** Whether a filter button is the active one (a per-item template condition). */
  isFilter(option: TaskFilter) {
    return this.$project.filter.value === option;
  }

  submitTask() {
    this.$project.addTask(this.newTaskTitle.value);
    this.newTaskTitle.value = '';
  }
}

export namespace TaskBoard {
  export const $Class = $TaskBoard; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
