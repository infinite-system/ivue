/**
 * HMR graft tests — "hot reload for classes".
 *
 * These exercise the runtime half of ivue HMR directly (no Vite needed):
 * registering a second class under the same hmrId is exactly what a
 * re-executed self-accepting module does, so Reactive() must graft the
 * donor onto the canonical identity. The contract under test:
 *
 *  - identity is preserved (same constructor object returned forever);
 *  - live instances KEEP their state (cached refs survive the graft);
 *  - live instances RUN the new behavior immediately — including through
 *    bound method references handed out before the edit (the event-listener
 *    case Vue itself cannot cover);
 *  - NEW instances are built by the latest constructor (field initializers
 *    included);
 *  - added/removed members appear/disappear on live instances;
 *  - unsafe grafts (name collisions, inheritance) are refused, never
 *    corrupting — the donor simply stays un-HMR'd.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { ivueHotUpdate, Reactive } from '../Reactive';

const registryEntry = (id: string) =>
  (
    (globalThis as any)[Symbol.for('ivue.hmr.registry')] as Map<string, any>
  ).get(id);

describe('Reactive HMR graft', () => {
  // The HMR machinery arms only where hot updates exist (`import.meta.hot`,
  // i.e. Vite dev serve). Force it on for these tests; every other spec file
  // runs with it off and sees the classic contract.
  beforeAll(() => {
    (globalThis as any)[Symbol.for('ivue.hmr.force')] = true;
  });
  afterAll(() => {
    delete (globalThis as any)[Symbol.for('ivue.hmr.force')];
  });

  it('preserves identity, state and updates behavior on live instances', () => {
    class $Counter {
      tag = 'v1';
      get count() {
        return ref(0);
      }
      get double() {
        return this.count.value * 2;
      }
      increment() {
        this.count.value += 1;
      }
      label() {
        return 'v1:' + this.count.value;
      }
    }
    const Counter = Reactive($Counter, 'hmr.test.Counter');
    const live = new Counter();
    live.increment();
    expect(live.count.value).toBe(1);
    expect(live.double).toBe(2);
    expect(live.label()).toBe('v1:1');

    // A bound reference handed out BEFORE the edit — the listener analog.
    const grabbedBefore = live.label;

    // "Edited module re-executes": same id, new class object, new behavior.
    class $CounterV2 {
      tag = 'v2';
      get count() {
        return ref(100); // changed initializer — must NOT reset live state
      }
      get double() {
        return this.count.value * 3; // changed derived logic
      }
      increment() {
        this.count.value += 2; // changed method
      }
      label() {
        return 'v2:' + this.count.value;
      }
    }
    const Regrafted = Reactive($CounterV2 as any, 'hmr.test.Counter');

    // Identity: the page only ever holds ONE constructor for this id.
    expect(Regrafted).toBe(Counter);

    // State preserved: the cached ref survived; the new initializer did not run.
    expect(live.count.value).toBe(1);

    // New behavior active on the live instance…
    live.increment();
    expect(live.count.value).toBe(3);
    expect(live.double).toBe(9);
    expect(live.label()).toBe('v2:3');

    // …including through the bound reference captured before the edit.
    expect(grabbedBefore()).toBe('v2:3');

    // New instances: latest constructor builds them (fields + initializers).
    const fresh = new Counter() as any;
    expect(fresh.tag).toBe('v2');
    expect(fresh.count.value).toBe(100);
  });

  it('adds and removes members on live instances', () => {
    class $Shape {
      get kind() {
        return 'v1';
      }
      old() {
        return 'old';
      }
    }
    const Shape = Reactive($Shape, 'hmr.test.Shape');
    const live = new Shape() as any;
    expect(live.old()).toBe('old');

    class $ShapeV2 {
      get kind() {
        return 'v2';
      }
      fresh() {
        return 'fresh';
      }
    }
    Reactive($ShapeV2 as any, 'hmr.test.Shape');

    expect(live.kind).toBe('v2');
    expect(live.fresh()).toBe('fresh');
    expect(live.old).toBeUndefined();
  });

  it('refuses to graft an unrelated class sharing the id (collision guard)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class $RealThing {
      a() {}
      b() {}
      c() {}
      d() {}
      e() {}
    }
    const Real = Reactive($RealThing, 'hmr.test.Collision');

    class $Impostor {
      x() {}
      y() {}
      z() {}
    }
    const impostor = Reactive($Impostor as any, 'hmr.test.Collision');

    // The impostor is NOT grafted and does NOT steal the identity.
    expect(impostor).not.toBe(Real);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('class-name collision'),
    );
    warn.mockRestore();
  });

  it('refuses to graft when inheritance is involved', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class $Base {
      base() {}
    }
    class $Child extends $Base {
      childA() {}
      childB() {}
    }
    const Child = Reactive($Child, 'hmr.test.Inherit');
    class $ChildV2 extends $Base {
      childA() {}
      childB() {}
    }
    const again = Reactive($ChildV2 as any, 'hmr.test.Inherit');
    expect(again).not.toBe(Child);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('inheritance'));
    warn.mockRestore();
  });

  it('flags constructor-level changes for remount — but not behavior edits', () => {
    class $Wired {
      x = 1;
      constructor() {
        this.x = 1;
      }
      m() {
        return 'v1';
      }
    }
    Reactive($Wired, 'hmr.test.Wired');
    const entry = registryEntry('hmr.test.Wired');
    expect(entry.remountNeeded).toBe(false);

    // Behavior-only edit: method body changed, ctor/fields identical.
    class $WiredV2 {
      x = 1;
      constructor() {
        this.x = 1;
      }
      m() {
        return 'v2';
      }
    }
    Reactive($WiredV2 as any, 'hmr.test.Wired');
    expect(entry.remountNeeded).toBe(false);

    // Constructor-body edit → flagged.
    class $WiredV3 {
      x = 1;
      constructor() {
        this.x = 2;
      }
      m() {
        return 'v2';
      }
    }
    Reactive($WiredV3 as any, 'hmr.test.Wired');
    expect(entry.remountNeeded).toBe(true);
    entry.remountNeeded = false;

    // Field-initializer edit → flagged (fields are constructor territory).
    class $WiredV4 {
      x = 5;
      constructor() {
        this.x = 2;
      }
      m() {
        return 'v2';
      }
    }
    Reactive($WiredV4 as any, 'hmr.test.Wired');
    expect(entry.remountNeeded).toBe(true);
  });

  it('ivueHotUpdate escalates flagged modules to hot.invalidate exactly once', () => {
    class $Esc {
      wired = 0;
      constructor() {
        this.wired = 1;
      }
      m() {
        return 1;
      }
    }
    const Esc = Reactive($Esc, 'hmr.test.Esc');
    class $EscV2 {
      wired = 0;
      constructor() {
        this.wired = 2;
      }
      m() {
        return 1;
      }
    }
    Reactive($EscV2 as any, 'hmr.test.Esc');
    const entry = registryEntry('hmr.test.Esc');
    expect(entry.remountNeeded).toBe(true);

    // Namespace-convention module shape: { Esc: { $Class, Class } }.
    const hot = { invalidate: vi.fn(), accept: vi.fn() };
    ivueHotUpdate(hot, { Esc: { $Class: $EscV2, Class: Esc } });
    expect(hot.invalidate).toHaveBeenCalledTimes(1);
    expect(entry.remountNeeded).toBe(false);

    // Idempotent: nothing pending → no second invalidate.
    ivueHotUpdate(hot, { Esc: { $Class: $EscV2, Class: Esc } });
    expect(hot.invalidate).toHaveBeenCalledTimes(1);

    // An unrelated module's callback must not consume other flags.
    entry.remountNeeded = true;
    ivueHotUpdate(hot, { Other: { Class: class {} } });
    expect(hot.invalidate).toHaveBeenCalledTimes(1);
    expect(entry.remountNeeded).toBe(true);
    entry.remountNeeded = false;
  });

  it('keeps $watch/$stopEffects working across a graft', () => {
    class $Watched {
      get value() {
        return ref(0);
      }
      bump() {
        this.value.value++;
      }
    }
    const Watched = Reactive($Watched, 'hmr.test.Watched');
    const live = new Watched() as any;
    let seen = 0;
    live.$watch(
      () => live.value.value,
      () => {
        seen++;
      },
      { flush: 'sync' },
    );
    live.bump();
    expect(seen).toBe(1);

    class $WatchedV2 {
      get value() {
        return ref(0);
      }
      bump() {
        this.value.value += 10;
      }
    }
    Reactive($WatchedV2 as any, 'hmr.test.Watched');

    // The watcher (instance-scoped effect) survives and sees v2 mutations.
    live.bump();
    expect(seen).toBe(2);
    expect(live.value.value).toBe(11);
    live.$stopEffects();
    live.bump();
    expect(seen).toBe(2);
  });
});
