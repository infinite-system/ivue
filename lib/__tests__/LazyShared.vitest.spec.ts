import { describe, expect, it } from 'vitest';
import { LazyShared } from '../LazyShared';
import { Static } from '../Static';

describe('LazyShared', () => {
  it('evaluates nothing at definition, constructs once, shares the result', () => {
    let constructionCount = 0;
    const cell = new LazyShared(() => {
      constructionCount += 1;
      return { count: constructionCount };
    });
    expect(constructionCount).toBe(0); // load-safe: the thunk is inert
    expect(cell.value).toBe(cell.value);
    expect(constructionCount).toBe(1);
  });

  it('every receiver converges on the ONE singleton — forking the access path is harmless', () => {
    let constructionCount = 0;
    class $Owner {
      protected static readonly sharedStore = new LazyShared(() => {
        constructionCount += 1;
        return new Map<string, number>();
      });
      static store(): Map<string, number> {
        return this.sharedStore.value;
      }
    }
    class $SubReceiver extends $Owner {}
    $Owner.store().set('planted', 7);
    expect($SubReceiver.store().get('planted')).toBe(7);
    expect($SubReceiver.store()).toBe($Owner.store());
    expect(constructionCount).toBe(1);
  });

  it('even a per-receiver $-cache over the cell returns the same singleton', () => {
    // The registry-fork trap: Static()'s $-getters cache per receiver,
    // so parent and subclass each run the getter body once. With the
    // body reading a LazyShared cell, both receivers cache the SAME
    // constructed value — the fork exists only in the access path.
    let constructionCount = 0;
    class $Registry {
      protected static readonly sharedEntries = new LazyShared(() => {
        constructionCount += 1;
        return new Map<string, number>();
      });
      static get $entries(): Map<string, number> {
        return this.sharedEntries.value;
      }
    }
    const Registry = Static($Registry);
    class $SubRegistry extends Registry {}
    const SubRegistry = Static($SubRegistry);
    Registry.$entries.set('planted', 7);
    expect(SubRegistry.$entries).toBe(Registry.$entries);
    expect(SubRegistry.$entries.get('planted')).toBe(7);
    expect(constructionCount).toBe(1);
  });

  it('reset drops the value and the next read constructs again', () => {
    let constructionCount = 0;
    const cell = new LazyShared(() => (constructionCount += 1));
    expect(cell.value).toBe(1);
    cell.reset();
    expect(cell.value).toBe(2);
  });

  it('a thunk cycle throws a named error and leaves the cell retryable', () => {
    const cellA = new LazyShared((): number => cellB.value + 1);
    const cellB = new LazyShared((): number => cellA.value + 1);
    expect(() => cellA.value).toThrow('LazyShared thunk cycle');
    // not poisoned: break the cycle and the same cell constructs fine
    let repaired = 0;
    const cellC = new LazyShared((): number => (repaired += 1));
    expect(cellC.value).toBe(1);
    // the failed cell itself retries once its dependency resolves
    expect(() => cellB.value).toThrow('LazyShared thunk cycle');
  });

  it('a throwing thunk does not poison the cell — the next read retries', () => {
    let attempts = 0;
    const cell = new LazyShared(() => {
      attempts += 1;
      if (attempts === 1) throw new Error('backend not ready');
      return 'ready';
    });
    expect(() => cell.value).toThrow('backend not ready');
    expect(cell.value).toBe('ready');
    expect(attempts).toBe(2);
  });
});
