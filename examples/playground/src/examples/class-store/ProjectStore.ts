// ProjectStore.ts — a global store is just an ivue class published as a
// module singleton. No Pinia, no defineStore, no plugin: the class IS the
// store, and ProjectStore.use() hands every caller the same instance.
import { reactive, ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';

export interface ProjectTask {
  id: number;
  title: string;
  done: boolean;
}

export type TaskFilter = 'all' | 'active' | 'done';

const STORAGE_KEY = 'ivue-example-project-store';

class $ProjectStore {
  // Outliving instance: the store outlives every component, so watchers
  // registered here use $watch/$watchEffect (the instance's own scope).
  constructor() {
    this.hydrate();
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

  /** Restore a previous visit's state — reload the page and it holds. */
  hydrate() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (typeof state.projectName === 'string') {
        this.projectName.value = state.projectName;
      }
      if (Array.isArray(state.tasks)) this.tasks.value = state.tasks;
    } catch {
      /* corrupted storage — keep the seed state */
    }
  }

  /** The $watchEffect in the constructor re-runs this whenever the name or
   *  the task list changes — its reads ARE the subscription. */
  persist() {
    const state = {
      projectName: this.projectName.value,
      tasks: this.tasks.value,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — the store still works in memory */
    }
  }
}

export namespace ProjectStore {
  export const $Class = $ProjectStore; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  let singleton: Instance | null = null;

  /** The store singleton: every caller receives the SAME instance,
   *  constructed lazily on first touch — after the app exists, immune
   *  to module-load order. */
  export function use(): Instance {
    return (singleton ??= new Class());
  }

  /**
   * Optional `reactive()` view of the same singleton — refs auto-unwrap
   * on read AND write, so consumers drop every `.value`. `use()` already
   * returns the `Instance` type, which strips the readonly that TS puts
   * on get-only accessors, so writes typecheck as they behave.
   */
  export function useReactive() {
    return reactive(use());
  }
}
