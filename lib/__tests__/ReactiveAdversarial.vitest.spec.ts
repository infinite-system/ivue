import { reactive, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { Reactive } from '../Reactive';
import { Kernel } from '../kernel';

describe('Reactive adversarial boundaries', () => {
  it('richer cleanup composes as an ordinary method calling $stopEffects', () => {
    const observed: number[] = [];
    let closed = 0;

    class $Store {
      get count() {
        return ref(0);
      }

      // the composition pattern: no reserved names, no auto-calls —
      // the class's own dispose() does its work, then resets the engine
      dispose() {
        this.closeSocket();
        (this as any).$stopEffects();
      }

      closeSocket() {
        closed++;
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

    store.dispose();

    expect(closed).toBe(1);
    originalCount.value = 2;
    expect(observed).toEqual([1]); // watcher dead
    expect(store.count).not.toBe(originalCount); // cells reset
  });

  it('teardown clears only engine cache keys — consumer symbols survive', () => {
    const consumerSymbol = Symbol('consumer-metadata');

    class $Parent {
      get inherited() {
        return ref('parent');
      }
    }

    class $Child extends $Parent {
      get own() {
        return ref('child');
      }

      grow() {
        return this.own.value;
      }
    }

    const Child = Reactive($Child);
    const child: any = new Child();

    // materialize cells on BOTH prototype layers + a bound method
    const inheritedCell = child.inherited;
    const ownCell = child.own;
    const boundGrow = child.grow;
    // a symbol the engine did NOT create — foreign metadata on the instance
    child[consumerSymbol] = 'must survive';

    child.$stopEffects();

    // engine cells across the whole chain are gone: fresh identities
    expect(child.inherited).not.toBe(inheritedCell);
    expect(child.own).not.toBe(ownCell);
    expect(child.grow).not.toBe(boundGrow);
    // the consumer's symbol is untouched
    expect(child[consumerSymbol]).toBe('must survive');
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
