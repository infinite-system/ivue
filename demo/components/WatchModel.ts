import { computed as $, ref } from 'vue';
import { Reactive, type ReactiveInstance } from '../../lib/Reactive';

/**
 * A small reactive class that demonstrates the v2 `$watch` + lazy effect scope
 * and `$stopEffects` teardown.
 *
 * State is declared the v2 way: getters return ref()/computed(). The instance
 * itself stays a plain object — no per-instance proxy.
 */
class $WatchModel {
  // --- reactive state ---
  get celsius() {
    return ref(20);
  }

  get label() {
    return ref('Living Room');
  }

  // --- two-way computed: editing °F updates °C ---
  get fahrenheit() {
    return $({
      get: () => Math.round((this.celsius.value * 9) / 5 + 32),
      set: (f: number) => {
        this.celsius.value = Math.round(((f - 32) * 5) / 9);
      },
    });
  }

  // --- derived classification (read-only computed) ---
  get status() {
    return $(() => {
      const c = this.celsius.value;
      if (c <= 0) return { text: 'Freezing', color: 'sky' };
      if (c < 18) return { text: 'Cold', color: 'blue' };
      if (c < 25) return { text: 'Comfortable', color: 'emerald' };
      if (c < 32) return { text: 'Warm', color: 'amber' };
      return { text: 'Hot', color: 'rose' };
    });
  }

  // --- watch bookkeeping (refs so the template can render them) ---
  get log() {
    return ref<{ id: number; text: string }[]>([]);
  }
  get fireCount() {
    return ref(0);
  }
  get watching() {
    return ref(false);
  }
  get scopeStarted() {
    return ref(false);
  }

  // private stop handle for the single watcher
  #stop?: () => void;

  get self() {
    // typed access to the engine-injected $watch / $stopEffects
    return this as unknown as ReactiveInstance<$WatchModel>;
  }

  startWatch() {
    if (this.watching.value) return;
    this.watching.value = true;
    this.scopeStarted.value = true; // the lazy effect scope is allocated now

    // $watch registers the watcher in this instance's lazily-created effect
    // scope and returns a stop handle.
    this.#stop = this.self.$watch(
      () => this.celsius.value,
      (val: number, old: number) => {
        this.fireCount.value++;
        this.log.value.unshift({
          id: this.fireCount.value,
          text: `${old}°C → ${val}°C`,
        });
        if (this.log.value.length > 7) this.log.value.pop();
      }
    );
  }

  stopWatch() {
    this.#stop?.();
    this.#stop = undefined;
    this.watching.value = false;
  }

  step(delta: number) {
    this.celsius.value = Math.max(-10, Math.min(40, this.celsius.value + delta));
  }

  clearLog() {
    this.log.value = [];
    this.fireCount.value = 0;
  }
}

export namespace WatchModel {
  export const $Class = $WatchModel;
  export const Class = Reactive($WatchModel);
  export type Instance = typeof Class.Instance;
}
