// ProjectStore.ts — a global store is just an ivue class with a singleton
// composable. No Pinia, no defineStore, no plugin: the class IS the store,
// and useProjectStore() hands every caller the same instance.
import { reactive, ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';

export interface ProjectTask {
  id: number;
  title: string;
  done: boolean;
}

export type TaskFilter = 'all' | 'active' | 'done';

class $ProjectStore {
  // Outliving instance: the store outlives every component, so watchers
  // registered here use $watch/$watchEffect (the instance's own scope).
  constructor() {
    this.$watchEffect(() => this.persist());
  }

  get projectName() {
    return ref('Apollo');
  }
  get tasks() {
    return shallowRef<ProjectTask[]>([
      { id: 1, title: 'Design the flight plan', done: true },
      { id: 2, title: 'Fuel the first stage', done: false },
      { id: 3, title: 'Run the countdown checklist', done: false },
    ]);
  }
  get filter() {
    return ref<TaskFilter>('all');
  }

  // DERIVED — plain getters: zero bytes per instance, and there is only
  // one instance anyway. Every consumer reads the same live values.
  get completedCount() {
    return this.tasks.value.filter((task) => task.done).length;
  }
  get progressPercent() {
    const total = this.tasks.value.length;
    return total === 0 ? 0 : Math.round((this.completedCount / total) * 100);
  }
  get visibleTasks(): ProjectTask[] {
    if (this.filter.value === 'active') {
      return this.tasks.value.filter((task) => !task.done);
    }
    if (this.filter.value === 'done') {
      return this.tasks.value.filter((task) => task.done);
    }
    return this.tasks.value;
  }

  addTask(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.tasks.value = [
      ...this.tasks.value,
      { id: Date.now(), title: trimmed, done: false },
    ];
  }

  toggleTask(id: number) {
    this.tasks.value = this.tasks.value.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task,
    );
  }

  setFilter(filter: TaskFilter) {
    this.filter.value = filter;
  }

  persist() {
    // stands in for an API call / localStorage write — the $watchEffect in
    // the constructor re-runs this whenever tasks or the name change
    void this.projectName.value;
    void this.tasks.value;
  }
}

export namespace ProjectStore {
  export const $Class = $ProjectStore; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

let store: InstanceType<typeof ProjectStore.Class> | undefined;

/** The store composable: every caller receives the SAME instance. */
export function useProjectStore() {
  return (store ??= new ProjectStore.Class());
}

/**
 * Optional `reactive()` view of the same singleton — refs auto-unwrap on
 * read AND write, so consumers drop every `.value`. The cast through
 * `ProjectStore.Instance` is load-bearing: it strips the readonly that TS
 * puts on get-only accessors, so writes typecheck as they behave.
 */
export function useProjectStoreReactive() {
  return reactive(useProjectStore() as ProjectStore.Instance);
}
