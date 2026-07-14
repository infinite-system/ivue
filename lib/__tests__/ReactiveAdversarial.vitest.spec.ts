import { reactive, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { Reactive } from '../Reactive';
import { Kernel } from '../kernel';

describe('Reactive adversarial boundaries', () => {
  it('finishes teardown when the user cleanup hook throws', () => {
    const observed: number[] = [];

    class $Store {
      get count() {
        return ref(0);
      }

      stopEffects() {
        throw new Error('socket cleanup failed');
      }
    }

    const Store = Reactive($Store);
    const store: any = new Store();
    const originalCount = store.count;
    store.$watch(
      () => store.count.value,
      (count: number) => observed.push(count),
      { flush: 'sync' },
    );

    originalCount.value = 1;
    expect(observed).toEqual([1]);
    expect(() => store.$stopEffects()).toThrow('socket cleanup failed');

    originalCount.value = 2;
    expect(observed).toEqual([1]);
    expect(store.count).not.toBe(originalCount);
  });

  it('can allocate a fresh watcher scope after teardown', () => {
    class $Store {
      get count() {
        return ref(0);
      }
    }

    const Store = Reactive($Store);
    const store: any = new Store();
    const firstObserved = vi.fn();
    store.$watch(() => store.count.value, firstObserved, { flush: 'sync' });
    store.count.value = 1;
    store.$stopEffects();

    const secondObserved = vi.fn();
    store.$watch(() => store.count.value, secondObserved, { flush: 'sync' });
    store.count.value = 2;

    expect(firstObserved).toHaveBeenCalledTimes(1);
    expect(secondObserved).toHaveBeenCalledTimes(1);
  });

  it('does not poison a lazy ref cache when its factory throws once', () => {
    let attempts = 0;

    class $Store {
      get state() {
        attempts++;
        if (attempts === 1) throw new Error('dependency is not ready');
        return ref(7);
      }
    }

    const Store = Reactive($Store);
    const store = new Store();

    expect(() => store.state).toThrow('dependency is not ready');
    const recovered = store.state;
    expect(recovered.value).toBe(7);
    expect(store.state).toBe(recovered);
    expect(attempts).toBe(2);
  });

  it('caches an undefined $-singleton result instead of rerunning it', () => {
    const factory = vi.fn(() => undefined);

    class $Store {
      get $optionalService() {
        return factory();
      }
    }

    const Store = Reactive($Store);
    const store = new Store();

    expect(store.$optionalService).toBeUndefined();
    expect(store.$optionalService).toBeUndefined();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('tears down the raw instance when invoked through a Vue proxy', () => {
    const observed = vi.fn();

    class $Store {
      get count() {
        return ref(0);
      }
    }

    const Store = Reactive($Store);
    const rawStore: any = new Store();
    const proxiedStore: any = reactive(rawStore);
    const originalCount = rawStore.count;
    proxiedStore.$watch(() => rawStore.count.value, observed, { flush: 'sync' });

    originalCount.value = 1;
    proxiedStore.$stopEffects();
    originalCount.value = 2;

    expect(observed).toHaveBeenCalledTimes(1);
    expect(rawStore.count).not.toBe(originalCount);
  });
});

describe('Kernel adversarial values', () => {
  it('preserves stored falsy values instead of taking the fallback', () => {
    const kernel = new Kernel();
    kernel.set('zero', 0);
    kernel.set('false', false);
    kernel.set('empty', '');

    expect(kernel.get('zero', 1)).toBe(0);
    expect(kernel.get('false', true)).toBe(false);
    expect(kernel.get('empty', 'fallback')).toBe('');
  });
});
