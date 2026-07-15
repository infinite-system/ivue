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
import { computed, isRef, ref } from 'vue';

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
    // Removed members TOMBSTONE (keep their last implementation): frozen
    // closures cached on live instances may still call them — deletion
    // would crash those closures before a remount converges.
    expect(live.old()).toBe('old');
  });

  it("unthinning a computed (method deleted + logic inlined) never strands live instances — the user's live crash", () => {
    class $T {
      get base() {
        return ref(2);
      }
      calcIt() {
        return this.base.value * 10;
      }
      get total() {
        return computed(() => this.calcIt());
      }
    }
    const T = Reactive($T, 'hmr.test.Unthin');
    const live = new T() as any;
    expect(live.total.value).toBe(20);
    const entry = registryEntry('hmr.test.Unthin');

    // UNTHIN: the method is deleted and its logic inlined into the computed.
    class $TV2 {
      get base() {
        return ref(2);
      }
      get total() {
        return computed(() => this.base.value * 30);
      }
    }
    Reactive($TV2 as any, 'hmr.test.Unthin');

    // The inlined-computed change escalates to remount…
    expect(entry.remountNeeded).toBe(true);
    // …and in the window BEFORE the remount lands, the live instance's OLD
    // cached closure still calls the (tombstoned) method — no TypeError,
    // old behavior, consistent.
    live.base.value = 3;
    expect(live.total.value).toBe(30); // old logic: calcIt → base × 10

    // A rebuilt instance (what the remount produces) runs the new inlined
    // logic.
    const fresh = new T() as any;
    expect(fresh.total.value).toBe(60); // new logic: base(2) × 30
  });

  it('method ↔ getter kind flips escalate and re-key the cache (no shape poisoning)', () => {
    class $K {
      a() {}
      b() {}
      m() {
        return 'fn';
      }
    }
    const K = Reactive($K, 'hmr.test.Kind');
    const live = new K() as any;
    expect(live.m()).toBe('fn'); // caches the bound wrapper

    class $KV2 {
      a() {}
      b() {}
      get m() {
        return ref('now-a-ref');
      }
    }
    Reactive($KV2 as any, 'hmr.test.Kind');

    const entry = registryEntry('hmr.test.Kind');
    expect(entry.remountNeeded).toBe(true);
    // Re-keyed cache: the live instance materializes the REF, not the
    // stale cached function.
    expect(isRef(live.m)).toBe(true);
    expect(live.m.value).toBe('now-a-ref');
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

  it('remounts native #private classes even when their source is unchanged', () => {
    class $Secret {
      #value = 7;
      read() {
        return this.#value;
      }
    }
    const Secret = Reactive($Secret, 'hmr.test.PrivateBrand');
    const live = new Secret();
    expect(live.read()).toBe(7);

    // Same declaration, same initializer, same public method source — but a
    // fresh evaluation still creates a distinct JavaScript private brand.
    class $SecretV2 {
      #value = 7;
      read() {
        return this.#value;
      }
    }
    Reactive($SecretV2 as any, 'hmr.test.PrivateBrand');
    const entry = registryEntry('hmr.test.PrivateBrand');
    expect(entry.remountNeeded).toBe(true);
    expect(entry.hasPrivateBrand).toBe(true);

    const hot = { invalidate: vi.fn() };
    ivueHotUpdate(hot, { Secret: { Class: Secret } });
    expect(hot.invalidate).toHaveBeenCalledOnce();
    expect(entry.remountNeeded).toBe(false);

    // The construct trap already points at the donor, so the instance made
    // by the owner remount carries the donor brand and runs donor methods.
    const rebuilt = new Secret();
    expect(rebuilt.read()).toBe(7);
  });

  it('does not mistake hashes in literals for native private declarations', () => {
    class $Hashes {
      pattern = /\\#[a-z/]/gi;
      label = '#private-looking';
      heading = `# also private-looking`;
      version() {
        return 1;
      }
    }
    Reactive($Hashes, 'hmr.test.HashLiterals');
    const entry = registryEntry('hmr.test.HashLiterals');

    class $HashesV2 {
      pattern = /\\#[a-z/]/gi;
      label = '#private-looking';
      heading = `# also private-looking`;
      version() {
        return 2;
      }
    }
    Reactive($HashesV2 as any, 'hmr.test.HashLiterals');

    expect(entry.hasPrivateBrand).toBe(false);
    expect(entry.remountNeeded).toBe(false);
  });

  it('signature normalization respects string literals (scanner, not regex)', () => {
    // `//` inside a constructor string is NOT a comment — the tail after it
    // must still count toward the signature.
    class $Urls {
      endpoint = 'https://v1.example';
      constructor() {
        this.endpoint = 'https://v1.example';
      }
    }
    Reactive($Urls, 'hmr.test.Urls');
    const entry = registryEntry('hmr.test.Urls');
    expect(entry.remountNeeded).toBe(false);

    class $UrlsV2 {
      endpoint = 'https://v2.example'; // change AFTER the // inside the string
      constructor() {
        this.endpoint = 'https://v2.example';
      }
    }
    Reactive($UrlsV2 as any, 'hmr.test.Urls');
    expect(entry.remountNeeded).toBe(true);
    entry.remountNeeded = false;

    // Whitespace INSIDE a string literal is a real change, not formatting.
    class $Spaced {
      label = 'a b';
      constructor() {
        this.label = 'a b';
      }
    }
    Reactive($Spaced, 'hmr.test.Spaced');
    const spacedEntry = registryEntry('hmr.test.Spaced');
    expect(spacedEntry.remountNeeded).toBe(false);

    class $SpacedV2 {
      label = 'ab';
      constructor() {
        this.label = 'ab';
      }
    }
    Reactive($SpacedV2 as any, 'hmr.test.Spaced');
    expect(spacedEntry.remountNeeded).toBe(true);
  });

  it('block comments are formatting; escaped quotes stay inside their string', () => {
    // Built from RAW SOURCE via new Function — the test transform strips
    // comments and rewrites escapes in ordinary class literals, so only
    // this route delivers real comment/escape text to the normalizer
    // (matching vite dev, where sources keep their comments).
    const build = (comment: string, tail: string) =>
      new Function(
        `return class { constructor() { /* ${comment} */ this.note = "it\\"s${tail}"; } }`,
      )();

    Reactive(build('wiring v1', ''), 'hmr.test.Commented');
    const entry = registryEntry('hmr.test.Commented');
    expect(entry.remountNeeded).toBe(false);

    // Block-comment-only edit — no wiring change, no remount.
    Reactive(build('reworded, same wiring', ''), 'hmr.test.Commented');
    expect(entry.remountNeeded).toBe(false);

    // Edit AFTER the escaped quote inside the string — real change, flagged.
    Reactive(build('reworded, same wiring', ' v3'), 'hmr.test.Commented');
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

  it('escalates frozen-cache members (inlined computeds, $-singletons) instead of going silently stale', () => {
    class $Frozen {
      get base() {
        return ref(2);
      }
      calc() {
        return this.base.value * 10;
      }
      // THIN computed — delegates to a method (the convention).
      get thin() {
        return computed(() => this.calc());
      }
      // INLINED computed — logic lives in the closure.
      get fat() {
        return computed(() => this.base.value * 100);
      }
    }
    const Frozen = Reactive($Frozen, 'hmr.test.Frozen');
    const live = new Frozen() as any;
    expect(live.thin.value).toBe(20);
    expect(live.fat.value).toBe(200);
    const entry = registryEntry('hmr.test.Frozen');

    // Edit ONLY the delegated method: grafts live, NO remount needed —
    // and the OLD cached computed picks up the new logic through the slot.
    class $FrozenV2 {
      get base() {
        return ref(2);
      }
      calc() {
        return this.base.value * 11;
      }
      get thin() {
        return computed(() => this.calc());
      }
      get fat() {
        return computed(() => this.base.value * 100);
      }
    }
    Reactive($FrozenV2 as any, 'hmr.test.Frozen');
    expect(entry.remountNeeded).toBe(false);
    live.base.value = 3; // invalidate the cached computeds
    expect(live.thin.value).toBe(33); // old closure → prototype → slot → v2
    expect(live.fat.value).toBe(300); // old closure, old inline logic — but unchanged, so correct

    // Edit the INLINED computed's body: the live cache cannot be grafted —
    // must escalate to remount rather than stay silently stale.
    class $FrozenV3 {
      get base() {
        return ref(2);
      }
      calc() {
        return this.base.value * 11;
      }
      get thin() {
        return computed(() => this.calc());
      }
      get fat() {
        return computed(() => this.base.value * 1000);
      }
    }
    Reactive($FrozenV3 as any, 'hmr.test.Frozen');
    expect(entry.remountNeeded).toBe(true);
    entry.remountNeeded = false;

    // $-singleton body change → same escalation.
    class $Single {
      get $service() {
        return { version: 1 };
      }
      m() {}
      n() {}
    }
    Reactive($Single, 'hmr.test.Single');
    class $SingleV2 {
      get $service() {
        return { version: 2 };
      }
      m() {}
      n() {}
    }
    Reactive($SingleV2 as any, 'hmr.test.Single');
    expect(registryEntry('hmr.test.Single').remountNeeded).toBe(true);
  });

  it('computed(this.method) — the thinnest form — grafts live with no escalation', () => {
    class $D {
      get base() {
        return ref(2);
      }
      calc() {
        return this.base.value * 10;
      }
      // No arrow at all: ivue methods are lazy-BOUND, so the reference
      // carries its instance — and in dev it reads the HMR slot at call
      // time, so grafts land through it.
      get total() {
        return computed(this.calc);
      }
    }
    const D = Reactive($D, 'hmr.test.DirectRef');
    const live = new D() as any;
    expect(live.total.value).toBe(20);

    class $DV2 {
      get base() {
        return ref(2);
      }
      calc() {
        return this.base.value * 50;
      }
      get total() {
        return computed(this.calc);
      }
    }
    Reactive($DV2 as any, 'hmr.test.DirectRef');

    // The getter's own source is unchanged → no frozen-cache escalation…
    expect(registryEntry('hmr.test.DirectRef').remountNeeded).toBe(false);
    // …and the LIVE cached computed runs the NEW method through the slot.
    live.base.value = 3;
    expect(live.total.value).toBe(150);
  });

  it('re-registering the SAME class returns the identical proxy (identity claim under HMR)', () => {
    class $Same {
      m() {
        return 1;
      }
    }
    const first = Reactive($Same, 'hmr.test.Same');
    const second = Reactive($Same, 'hmr.test.Same');
    expect(second).toBe(first);
  });

  it('grafts plain data prototype properties and statics', () => {
    class $S {
      m() {
        return 1;
      }
      n() {
        return 2;
      }
    }
    ($S as any).LIMIT = 10;
    const S = Reactive($S, 'hmr.test.Statics');
    const live = new S() as any;

    class $SV2 {
      m() {
        return 1;
      }
      n() {
        return 3;
      }
    }
    ($SV2 as any).LIMIT = 20;
    // A plain (non-function, non-getter) prototype data property exercises
    // the pass-through descriptor branch of the graft.
    Object.defineProperty($SV2.prototype, 'plainData', {
      value: 42,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    Reactive($SV2 as any, 'hmr.test.Statics');

    expect(live.n()).toBe(3);
    expect(live.plainData).toBe(42);
    expect((S as any).LIMIT).toBe(20); // statics copied for outside readers
  });

  it('grafts a getters-only class (no method slots ever created)', () => {
    class $G {
      get a() {
        return ref(1);
      }
      get b() {
        return this.a.value + 1;
      }
    }
    const G = Reactive($G, 'hmr.test.GettersOnly');
    const live = new G() as any;
    expect(live.b).toBe(2);
    class $GV2 {
      get a() {
        return ref(1);
      }
      get b() {
        return this.a.value + 10;
      }
    }
    Reactive($GV2 as any, 'hmr.test.GettersOnly');
    expect(live.b).toBe(11); // grafted derived getter, state kept
  });

  it('leaves a non-configurable static untouched instead of throwing', () => {
    class $F {
      m() {}
      n() {}
    }
    Object.defineProperty($F, 'FROZEN', { value: 1, configurable: false });
    const F = Reactive($F, 'hmr.test.FrozenStatic');
    class $FV2 {
      m() {}
      n() {}
    }
    ($FV2 as any).FROZEN = 2;
    expect(() => Reactive($FV2 as any, 'hmr.test.FrozenStatic')).not.toThrow();
    expect((F as any).FROZEN).toBe(1); // original kept, graft survived
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
