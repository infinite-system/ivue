// ProjectStore.ts — a global store is just an ivue class published as a
// module singleton. No Pinia, no defineStore, no plugin: the class IS the
// store, and ProjectStore.Class.use() hands every caller the same instance.
import { reactive, ref, shallowRef } from 'vue';
import { Reactive, type ReactiveHelpers } from '../../ivue';
import { Static } from '../../Static';


class $ProjectStore {
  /** The ONE store instance — a `$`-static, so it constructs on first
   *  read (after the app exists, immune to module-load order) and is
   *  cached on the receiver. It constructs through the namespace slot, so
   *  a test double swapped into `Class` is what gets built. */
  protected static get $shared(): ProjectStore.Instance {
    return new ProjectStore.Class();
  }

  /** The store singleton: every caller receives the SAME instance. */
  static use(): ProjectStore.Instance {
    return this.$shared;
  }

  /**
   * Optional `reactive()` view of the same singleton — refs auto-unwrap
   * on read AND write, so consumers drop every `.value`. Built once, as a
   * `$`-static, over the one instance. `use()` already returns the
   * `Instance` type, which strips the readonly that TS puts on get-only
   * accessors, so writes typecheck as they behave.
   */
  protected static get $sharedReactive() {
    return reactive(this.use());
  }

  static useReactive() {
    return this.$sharedReactive;
  }

  static get STORAGE_KEY() {
    return 'ivue-example-project-store';
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ProjectStore;
  }

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
    return shallowRef<ProjectStore.ProjectTask[]>([
      { id: 1, title: 'Design the flight plan', done: true },
      { id: 2, title: 'Fuel the first stage', done: false },
      { id: 3, title: 'Run the countdown checklist', done: false },
    ]);
  }
  get filter() {
    return ref<ProjectStore.TaskFilter>('all');
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
  get progressBarStyle() {
    return { width: `${this.progressPercent}%` };
  }
  get visibleTasks(): ProjectStore.ProjectTask[] {
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

  setFilter(filter: ProjectStore.TaskFilter) {
    this.filter.value = filter;
  }

  /** The "done" filter as a switch — a second press returns to all. */
  toggleDoneFilter() {
    this.setFilter(this.filter.value === 'done' ? 'all' : 'done');
  }

  /** Restore a previous visit's state — reload the page and it holds. */
  hydrate() {
    try {
      const saved = localStorage.getItem(this.self.STORAGE_KEY);
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
      localStorage.setItem(this.self.STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — the store still works in memory */
    }
  }
}

interface $ProjectStore extends ReactiveHelpers {}

export namespace ProjectStore {
  export const $Class = Static($ProjectStore); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this (use() does, once)
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Types */

  export interface ProjectTask {
    id: number;
    title: string;
    done: boolean;
  }

  export type TaskFilter = 'all' | 'active' | 'done';

}
