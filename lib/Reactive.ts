import {
  effectScope,
  isRef,
  toRaw,
  watch,
  watchEffect,
  type ExtractPropTypes,
  type Ref,
} from 'vue';

/**
 * Constants & Helpers
 */
const prototypeHasOwnProperty = Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty,
);
const getPrototypeOf = Object.getPrototypeOf;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const defineProperty = Object.defineProperty;
const getOwnPropertyNames = Object.getOwnPropertyNames;
const objectPrototype = Object.prototype;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;

const $stopEffects = '$stopEffects';
const $watch = '$watch';
const $watchEffect = '$watchEffect';
const fn = 'function';
// Identity symbols are GLOBAL (`Symbol.for`): any partial re-execution of
// this module (a Vite HMR cascade, a second copy in an odd bundling setup)
// must agree with objects stamped by a previous execution. Private
// `Symbol()` identities made old stamps unreadable to new code — the
// post-hot-update wedge ("Cannot set properties of undefined (setting
// 'value')") was exactly that disagreement.
const RAW = Symbol.for('ivue.raw'); // Per-instance back-pointer to the raw object
const SCOPE = Symbol.for('ivue.scope'); // Lazily-created per-instance effect scope
const PROCESSED = Symbol.for('ivue.processed'); // Flag to mark a prototype as "Reactified"

/* -------------------------------------------------------------------------
 * HMR (dev-only) — hot reload for classes.
 *
 * The runtime contract mirrors Vue's own component HMR (stable identity +
 * self-accepting modules + an upgrade procedure for live instances), applied
 * at class granularity — and it can go further than Vue: because ivue
 * separates STATE (ref-getters → per-instance cached refs, own properties)
 * from BEHAVIOR (methods/getters on the prototype) syntactically, a behavior
 * edit can be applied to LIVE instances with all state preserved. Vue must
 * reset component state on any script edit; ivue only needs a remount for
 * constructor-level changes.
 *
 * How it works:
 *  1. `Reactive()` registers each class in a global registry keyed by class
 *     name (opt-in override via the `hmrId` param). The first registration
 *     becomes the CANONICAL identity — the only class object the page ever
 *     holds. What Reactive returns is a construct-trap proxy over it.
 *  2. A class module that self-accepts (`import.meta.hot.accept()`)
 *     re-executes on edit; its fresh class hits the registry and is treated
 *     as a DONOR: its raw prototype members are re-processed onto the
 *     canonical prototype (hmrGraft). Instance caches survive because the
 *     per-(prototype,key) symbols are reused; method calls route through
 *     per-key SLOTS, so even bound references handed out long ago (event
 *     listeners, timer callbacks) run the new implementation immediately.
 *  3. NEW instances are built by the LATEST donor constructor (the construct
 *     trap), so constructor edits apply to anything created after the edit —
 *     a component remount is enough; a full page reload never is required.
 *
 * Modules that do NOT self-accept still benefit: when their importing SFC
 * boundary reloads, the re-executed `Reactive()` call grafts instead of
 * minting a second identity — stale-class ghosts are impossible either way.
 * ---------------------------------------------------------------------- */

const HMR_REGISTRY = Symbol.for('ivue.hmr.registry'); // globalThis → Map<id, HmrEntry>
const HMR_KEYS = Symbol.for('ivue.hmr.keys'); // prototype → Map<key, superKey>
const HMR_SLOTS = Symbol.for('ivue.hmr.slots'); // prototype → Map<key, {fn}>

type HmrSlot = { fn: (...args: any[]) => any };

interface HmrEntry {
  /** First-registered class — the ONE identity the page ever references. */
  canonical: any;
  /** Most recent donor — its constructor builds all NEW instances. */
  latest: any;
  /** What Reactive() returns: a construct-trap proxy over `canonical`. */
  proxy: any;
  /** Constructor-level signature of `latest` (see hmrCtorSignature). */
  ctorSig: string;
  /** Frozen-cache member signature of `latest` (see hmrFrozenSignature). */
  frozenSig: string;
  /** Set by a graft whose constructor-level code changed: live instances
   *  keep v1 wiring, so the module's accept callback should escalate to
   *  `hot.invalidate()` → the owning components remount → the construct
   *  trap builds replacements with the latest constructor. Consumed by
   *  ivueHotUpdate(). */
  remountNeeded: boolean;
}

const hmrRegistry = (): Map<string, HmrEntry> =>
  ((globalThis as any)[HMR_REGISTRY] ??= new Map());

/**
 * HMR machinery arms only where hot updates can actually happen: Vite dev
 * serve provides `import.meta.hot` to every served module. Vitest ALSO
 * provides a full hot object (it runs modules through Vite), so tests are
 * excluded explicitly via `import.meta.env.TEST` — in test/SSR/prod
 * environments Reactive() keeps its classic contract: the SAME class is
 * returned, no proxy, no registry, no slot indirection. Tests exercising
 * the graft force it on via `globalThis[Symbol.for('ivue.hmr.force')]`;
 * benchmarks that must measure PRODUCTION semantics inside a dev server
 * opt out via `globalThis[Symbol.for('ivue.hmr.disable')]` (the dev-only
 * construct-trap proxy costs ~11× on bare instantiation — measured 0.6ms
 * → 6.7ms per 100k — which prod never pays; set the flag BEFORE any
 * Reactive() call).
 */
// TEST is read via bracket access so the test runner cannot statically
// inline it. DEV stays a static read on purpose — it is what lets bundlers
// dead-code-eliminate every HMR call site from production builds. The
// `import.meta.hot` check sits BEFORE the test-env check: pure conjunction
// reorder (same result), but it keeps every operand executable under the
// test runner, which provides a hot object of its own.
const envIsTest = (): boolean =>
  !!(import.meta.env as Record<string, unknown>)['TEST'];
const hmrActive = (): boolean =>
  (!(globalThis as any)[Symbol.for('ivue.hmr.disable')] &&
    import.meta.env.DEV &&
    !!import.meta.hot &&
    !envIsTest()) ||
  !!(globalThis as any)[Symbol.for('ivue.hmr.force')];

/**
 * Normalize source text for signature comparison: strip comments and
 * collapse whitespace so comment-only and formatting-only edits never flag
 * a remount (they cannot change wiring). A small state-tracking scan, not
 * regexes: string and template literals are copied VERBATIM (escapes
 * included), so `//` inside a string is never mistaken for a comment and
 * whitespace inside a string still counts as a real change. Remaining
 * imprecision (regex literals containing quotes; a backtick nested inside
 * a template interpolation) errs toward flagging a remount — never toward
 * silently equating two different texts. Dev-only path.
 */
function hmrNormalize(text: string): string {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '/' && next === '/') {
      while (i < n && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      out += ch;
      i++;
      while (i < n) {
        const c = text[i];
        out += c;
        i++;
        if (c === '\\') {
          if (i < n) {
            out += text[i];
            i++;
          }
          continue;
        }
        if (c === ch) break;
      }
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Constructor-level signature: the class source text with every PROTOTYPE
 * member's exact source stripped out. `String(class)` alone would flag any
 * method edit; member sources are verbatim substrings of the class text, so
 * what remains after removal is precisely constructor body + class-field
 * initializers + statics + syntax glue — the parts a graft CANNOT apply to
 * live instances. Must be computed from RAW (unprocessed) descriptors:
 * donors always qualify; the first registration computes it before the
 * prototype is transformed.
 */
function hmrCtorSignature(klass: any): string {
  let text = String(klass);
  const proto = klass.prototype;
  for (const key of getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const desc = getOwnPropertyDescriptor(proto, key)!;
    if (typeof desc.value === fn)
      text = text.split(String(desc.value)).join('');
    if (desc.get) text = text.split(String(desc.get)).join('');
    if (desc.set) text = text.split(String(desc.set)).join('');
  }
  // The class NAME is part of the header text but not constructor-level
  // code: donors legitimately carry different names (renames, test donors
  // registered under an explicit hmrId) without their wiring changing.
  if (klass.name) text = text.split(klass.name).join('');
  return hmrNormalize(text);
}

/**
 * Frozen-cache member signature: the concatenated sources of every getter
 * whose per-instance cache a graft CANNOT refresh — `$`-prefixed singletons
 * (cached whole, forever) and getters that create a `computed(...)` (the
 * computed object is cached on the instance and its CLOSURE keeps the old
 * module's logic; see the HMR docs' "closures freeze, prototype lookups
 * stay live" rule). When one of these changes, grafting would leave live
 * instances SILENTLY stale — the worst outcome — so the graft escalates to
 * a component remount instead. Ref-getters are deliberately excluded:
 * keeping their live cache IS state preservation. Getters that delegate to
 * methods don't trip this (the method grafts), which is the convention to
 * prefer for hot paths.
 */
function hmrFrozenSignature(klass: any): string {
  let text = '';
  const proto = klass.prototype;
  for (const key of getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const desc = getOwnPropertyDescriptor(proto, key)!;
    if (!desc.get) continue;
    const src = String(desc.get);
    if (key[0] === '$' || /\bcomputed\s*\(/.test(src)) {
      text += key + ':' + hmrNormalize(src) + '\n';
    }
  }
  return text;
}

/**
 * Module-side half of constructor-edit escalation. Wire the self-accept as
 *
 *   import.meta.hot.accept((mod) => ivueHotUpdate(import.meta.hot, mod));
 *
 * (the hmr-plugin injects exactly this). After the re-executed module has
 * grafted its classes, this checks whether any of the module's Reactive
 * classes had a CONSTRUCTOR-level change — grafting covers behavior, but
 * live instances keep their v1 constructor wiring (watchers, listeners,
 * field values created at construction). If so, `hot.invalidate()` bubbles
 * the update to the importing component boundaries: Vue remounts JUST those
 * components, and the construct trap builds the replacements with the
 * latest constructor. The page itself never reloads. A bare
 * `hot.accept()` (no callback) still grafts — constructor edits then need a
 * manual remount, exactly Vue-minus semantics.
 */
export function ivueHotUpdate(hot: any, mod: any): void {
  if (!import.meta.env.DEV || !hot) return;
  const registry = hmrRegistry();
  // Collect the module's exported values, one nesting level deep (the ivue
  // namespace convention exports { $Class, Class } objects).
  const candidates = new Set<any>();
  if (mod && typeof mod === 'object') {
    for (const key of Object.keys(mod)) {
      const value = (mod as any)[key];
      candidates.add(value);
      if (value && typeof value === 'object') {
        for (const inner of Object.keys(value)) candidates.add(value[inner]);
      }
    }
  }
  let remount = false;
  for (const entry of registry.values()) {
    if (!entry.remountNeeded) continue;
    // Match precisely when the module namespace is inspectable; if Vite
    // handed us no namespace (failed re-evaluation edge), escalate any
    // pending flag rather than strand a stale instance.
    if (candidates.size === 0 || candidates.has(entry.proxy)) {
      entry.remountNeeded = false;
      remount = true;
    }
  }
  if (remount && typeof hot.invalidate === fn) {
    console.info(
      '[ivue] HMR: constructor-level change — remounting owner components (instances rebuilt with the new constructor).',
    );
    hot.invalidate();
  }
}

/**
 * Own-scoped per-prototype bookkeeping map. A plain `proto[symbol] ??=`
 * READS THROUGH THE PROTOTYPE CHAIN, which would hand a CHILD level its
 * PARENT's map — child methods would overwrite parent slots (infinite
 * recursion on `super` calls) and reuse parent superKeys (the shadow
 * collisions the per-level symbols exist to prevent).
 */
function ownHmrMap(proto: any, symbol: symbol): Map<string, any> {
  if (!prototypeHasOwnProperty(proto, symbol)) {
    defineProperty(proto, symbol, {
      configurable: true,
      enumerable: false,
      value: new Map(),
    });
  }
  return proto[symbol];
}

/**
 * Resolve the TRUE raw instance from whatever `this` the engine was entered
 * with — the raw object itself, a Vue `reactive()` proxy, or a foreign proxy
 * chain such as Vue's component expose proxy.
 *
 * Neither primitive is sufficient alone:
 *
 * - `toRaw(this)` cannot unwrap a foreign (non-Vue-reactive) proxy — e.g.
 *   Vue's component expose proxy — so it can return the proxy unchanged.
 * - The RAW back-pointer read through a Vue reactive proxy comes back
 *   DEEP-WRAPPED: a reactive proxy wraps symbol-keyed object reads in
 *   `reactive(raw)`. Binding a method (or computed closure) to that wrapped
 *   value poisons the per-instance cache with ref-unwrapping `this`
 *   semantics — `this.x.value` then crashes, because `this.x` auto-unwraps
 *   to the plain value.
 *
 * So: try `toRaw()` first (one step for the common reactive-proxy path —
 * consulting the pointer first costs a wrap+unwrap round-trip per access),
 * and fall back to the pointer, normalized with `toRaw()`, for everything
 * `toRaw()` cannot see through.
 */
function resolveRaw(self: any) {
  const unwrapped = toRaw(self);
  if (unwrapped !== self) {
    // Genuine Vue reactive proxy. Stamp the back-pointer (once, directly on
    // the raw — no proxy set traps) so foreign proxy chains can still
    // resolve the true raw through it.
    return unwrapped[RAW] ?? (unwrapped[RAW] = unwrapped);
  }
  // `self` is the raw object itself, or a foreign proxy over it.
  const viaPointer = self[RAW];
  if (viaPointer) {
    // A pointer read through a proxy chain may come back deep-wrapped —
    // normalize; on the raw object it is already the raw itself.
    return viaPointer === self ? viaPointer : toRaw(viaPointer);
  }
  // First-ever engine access on a plain raw instance (direct `new Class()`).
  return (self[RAW] = self);
}

/**
 * Convert a method to a lazy-bound prototype method.
 *
 * The bound function is created once, on first access, and cached on the raw
 * object under a unique per-(prototype,key) symbol — giving referentially
 * stable, correctly-bound methods with zero per-instance construction cost.
 */
function convertToLazyBoundMethod(
  proto: any,
  key: string,
  superKey: symbol,
  originalFn: (...args: any[]) => any,
) {
  let makeBound: (raw: any) => (...args: any[]) => any = (raw) =>
    originalFn.bind(raw);
  if (import.meta.env.DEV && hmrActive()) {
    // HMR: route calls through a per-(prototype, key) SLOT holding the
    // latest implementation. The cached per-instance "bound method" is a
    // stable wrapper reading the slot, so references handed out long ago
    // (event listeners, timer callbacks, debounced fns) stay valid for
    // removeEventListener AND run grafted code immediately. Dev-serve only:
    // everywhere else keeps the zero-indirection direct bind.
    const slots: Map<string, HmrSlot> = ownHmrMap(proto, HMR_SLOTS);
    let slot = slots.get(key);
    if (slot) slot.fn = originalFn;
    else slots.set(key, (slot = { fn: originalFn }));
    const live = slot;
    makeBound = (raw) =>
      function (this: any, ...args: any[]) {
        return live.fn.apply(raw, args);
      };
  }
  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get(this: any) {
      const raw = resolveRaw(this);
      return raw[superKey] ?? (raw[superKey] = makeBound(raw));
    },
    set(this: any, newFn: any) {
      resolveRaw(this)[superKey] = newFn;
    },
  });
}

/**
 * Convert a getter to a lazy-computed property.
 *
 * Only ever called when the descriptor has a getter, so `originalGetter` is
 * always defined here. A getter that returns a Ref/computed is cached (stable
 * reactive identity); a getter that returns a plain value de-optimizes back to
 * a native getter on the prototype, removing all overhead for future instances.
 */
function convertToLazyComputed(
  proto: any,
  key: string,
  superKey: symbol,
  originalGetter: (this: any) => any,
  originalSetter: ((this: any, v: any) => any) | undefined,
) {
  // Optimization: Properties starting with $ are assumed singletons.
  const cacheWhole = key[0] === '$';

  // DEV WARNING: Getter returns a Ref but the setter is a standard value setter.
  if (import.meta.env.DEV && originalSetter) {
    try {
      if (isRef(originalGetter.call({}))) {
        console.warn(
          `[ivue] API conflict on "${key}": Getter returns Ref but Setter is standard.`,
        );
      }
    } catch (e) {}
  }

  const newGetter = function (this: any) {
    const raw = resolveRaw(this);

    // 1. Check cache
    if (superKey in raw) return raw[superKey];

    // 2. Execute original
    const result = originalGetter.call(raw);

    // 3. Handle result
    if (cacheWhole) {
      // Cache result forever (Singleton pattern)
      raw[superKey] = result;
      return result;
    }

    if (isRef(result)) {
      // Cache Ref instance (Reactivity pattern)
      raw[superKey] = result;
    } else {
      // DE-OPTIMIZATION: It's just a value. Restore a native getter on the
      // prototype, removing the wrapper overhead for all future instances.
      defineProperty(proto, key, {
        configurable: true,
        enumerable: false,
        get(this: any) {
          return originalGetter.call(resolveRaw(this));
        },
        set: originalSetter
          ? function (this: any, v: any) {
              return originalSetter.call(resolveRaw(this), v);
            }
          : undefined,
      });
    }

    return result;
  };

  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get: newGetter,
    set: originalSetter
      ? function (this: any, v: any) {
          return originalSetter.call(resolveRaw(this), v);
        }
      : undefined,
  });
}

/**
 * HMR graft (dev-only): re-apply a re-executed module's class ("donor") onto
 * the canonical identity, member by member. superKeys are REUSED so
 * per-instance caches survive: cached state refs are kept (a changed
 * ref-getter initializer intentionally does NOT reset live state), and
 * cached bound-method wrappers keep working through their slot with the new
 * implementation active immediately. Returns false when grafting would be
 * unsafe — the donor then stays un-HMR'd (reload-needed behavior, never
 * corruption).
 */
function hmrGraft(entry: HmrEntry, donor: any): boolean {
  const canonical = entry.canonical;
  const cProto = canonical.prototype;
  const dProto = donor.prototype;

  if (
    getPrototypeOf(cProto) !== objectPrototype ||
    getPrototypeOf(dProto) !== objectPrototype
  ) {
    console.warn(
      `[ivue] HMR: "${canonical.name}" uses inheritance — hot update not applied; reload the page.`,
    );
    return false;
  }

  const skip = new Set(['constructor', $stopEffects, $watch, $watchEffect]);
  const donorNames = getOwnPropertyNames(dProto);
  const canonicalNames = getOwnPropertyNames(cProto).filter(
    (k) => !skip.has(k),
  );

  // Name-collision guard: the registry keys by class name (unless an
  // explicit hmrId was given); two unrelated classes sharing one would
  // otherwise graft into each other. Unrelated classes share almost no
  // member names — refuse instead. (A legitimate near-total rewrite also
  // lands here and simply degrades to reload-needed.)
  if (canonicalNames.length > 3) {
    let shared = 0;
    for (const k of canonicalNames) if (donorNames.includes(k)) shared++;
    if (shared / canonicalNames.length < 0.3) {
      console.warn(
        `[ivue] HMR: "${canonical.name}" re-registered with mostly different members — assuming a class-name collision; hot update not applied. Pass an explicit hmrId to Reactive() to disambiguate.`,
      );
      return false;
    }
  }

  const hmrKeys: Map<string, symbol> = ownHmrMap(cProto, HMR_KEYS);
  const slots: Map<string, HmrSlot> | undefined = prototypeHasOwnProperty(
    cProto,
    HMR_SLOTS,
  )
    ? cProto[HMR_SLOTS]
    : undefined;

  // Removed members are TOMBSTONED, not deleted: frozen closures cached on
  // live instances (inlined computeds, $-singletons) may still call them —
  // deleting the prototype property crashes those closures in the window
  // before an escalation remount lands (or forever under a bare accept()):
  // "this.someMethod is not a function". The tombstone keeps the LAST
  // implementation reachable; closures created after the edit never
  // reference it, so behavior converges once instances are rebuilt.
  // Dev-only residue. A re-added member reuses its superKey, so instance
  // caches survive remove→re-add round trips.

  // Added / changed members: re-run the engine's per-member processing on
  // the canonical prototype with the donor's RAW descriptors (the donor is
  // never processed itself — its descriptors are the source of originals).
  for (const key of donorNames) {
    if (skip.has(key)) continue;
    const desc = getOwnPropertyDescriptor(dProto, key)!;
    const isMethod = typeof desc.value === fn;
    let superKey = hmrKeys.get(key);
    // Kind flip (method ↔ getter): the per-instance cache under the old
    // superKey holds the WRONG SHAPE for the new kind — a cached bound
    // wrapper is not a ref, and vice versa. Re-key so live lookups
    // materialize fresh, and escalate (stale closures may still use the
    // old shape).
    if (
      superKey &&
      (slots?.has(key) ?? false) !== isMethod &&
      (isMethod || desc.get)
    ) {
      superKey = undefined;
      entry.remountNeeded = true;
    }
    if (!superKey) {
      superKey = Symbol(key);
      hmrKeys.set(key, superKey);
    }
    if (isMethod) {
      convertToLazyBoundMethod(cProto, key, superKey, desc.value);
    } else if (desc.get) {
      convertToLazyComputed(cProto, key, superKey, desc.get, desc.set);
    } else {
      defineProperty(cProto, key, desc);
    }
  }

  // Statics: keep external `Canonical.STATIC` readers current. (New method
  // bodies close over the donor module's scope and read donor statics
  // directly, so this is for outside readers only.)
  for (const key of getOwnPropertyNames(donor)) {
    if (key === 'prototype' || key === 'name' || key === 'length') continue;
    // key comes from getOwnPropertyNames of this same object — the
    // descriptor always exists
    const desc = getOwnPropertyDescriptor(donor, key)!;
    try {
      defineProperty(canonical, key, desc);
    } catch (e) {
      /* non-configurable static — leave the original */
    }
  }

  // Constructor-level diff: the graft above covers behavior, but live
  // instances keep their v1 constructor wiring (watchers, listeners, field
  // values created at construction). Flag for escalation — consumed by
  // ivueHotUpdate() in the module's accept callback, which invalidates the
  // module so the owning components remount and rebuild instances through
  // the construct trap (latest constructor).
  const donorSig = hmrCtorSignature(donor);
  if (donorSig !== entry.ctorSig) {
    entry.remountNeeded = true;
  }
  entry.ctorSig = donorSig;

  // Frozen-cache members (cached computeds, $-singletons): a graft cannot
  // reach the closures already cached on live instances — escalate instead
  // of leaving the edit silently stale.
  const donorFrozenSig = hmrFrozenSignature(donor);
  if (donorFrozenSig !== entry.frozenSig) {
    entry.remountNeeded = true;
  }
  entry.frozenSig = donorFrozenSig;

  entry.latest = donor;
  console.info(
    `[ivue] HMR: grafted "${canonical.name}" — live instances keep their state and run the new code.`,
  );
  return true;
}

/**
 * Create a reactive class.
 * @param targetClass The class to make reactive.
 * @param hmrId Optional stable identity for dev HMR (defaults to the class
 * name). Only needed when two Reactive classes share a name.
 * @returns A reactive version of the class (the same class, transformed in place).
 */
export function Reactive<C extends new (...args: any) => any>(
  targetClass: C,
  hmrId?: string,
): ReactiveClass<C> & { Instance: ReactiveInstance<InstanceType<C>> } {
  // HMR: a re-executing class module registers a NEW class object under an
  // id we have seen — graft it onto the canonical identity instead of
  // letting a second identity loose (see hmrGraft).
  let hmrSig = '';
  let hmrFrozen = '';
  if (import.meta.env.DEV && hmrActive()) {
    let registryKey = targetClass.name;
    if (hmrId !== undefined) registryKey = hmrId;
    const entry = hmrRegistry().get(registryKey);
    if (
      entry &&
      entry.canonical !== targetClass &&
      hmrGraft(entry, targetClass)
    ) {
      return entry.proxy;
    }
    // First registration (or a refused donor): capture the signatures
    // BEFORE processing wraps the prototype descriptors.
    hmrSig = hmrCtorSignature(targetClass);
    hmrFrozen = hmrFrozenSignature(targetClass);
  }

  const chain: any[] = [];

  let targetPrototype = targetClass.prototype;
  while (targetPrototype && targetPrototype !== objectPrototype) {
    chain.push(targetPrototype);
    targetPrototype = getPrototypeOf(targetPrototype);
  }

  // Process Base -> Child
  chain.reverse();

  for (const prototype of chain) {
    // OPTIMIZATION: Skip if this prototype layer is already "Reactified".
    // This handles diamond inheritance and multiple Reactive children safely.
    if (prototypeHasOwnProperty(prototype, PROCESSED)) continue;

    const names = getOwnPropertyNames(prototype);

    // HMR: remember key→superKey per prototype so a later graft reuses them
    // and per-instance caches survive the swap. OWN-scoped per level — see
    // ownHmrMap.
    const hmrKeys: Map<string, symbol> | null =
      import.meta.env.DEV && hmrActive()
        ? ownHmrMap(prototype, HMR_KEYS)
        : null;

    for (const key of names) {
      if (key === 'constructor') continue;
      const desc = getOwnPropertyDescriptor(prototype, key)!;

      // A fresh symbol per (prototype, key). Because each prototype level gets
      // its own symbol, a child override and its `super` counterpart cache
      // under different keys and never collide.
      let superKey = hmrKeys?.get(key);
      if (!superKey) {
        superKey = Symbol(key);
        hmrKeys?.set(key, superKey);
      }

      if (typeof desc.value === fn) {
        convertToLazyBoundMethod(prototype, key, superKey, desc.value);
      } else if (desc.get) {
        convertToLazyComputed(prototype, key, superKey, desc.get, desc.set);
      }
    }

    // Mark this specific prototype level as processed
    defineProperty(prototype, PROCESSED, {
      configurable: false,
      enumerable: false,
      value: true,
    });
  }

  // Inject teardown + watch helpers (once per class)
  if (!prototypeHasOwnProperty(targetClass.prototype, $stopEffects)) {
    /**
     * Register a watcher in this instance's lazily-created effect scope.
     * The scope is allocated only on first use, so pure-data classes that
     * never watch pay nothing. Has the same signature as Vue's `watch`.
     */
    defineProperty(targetClass.prototype, $watch, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function (this: any, ...args: any[]) {
        const raw = resolveRaw(this);
        const scope =
          raw[SCOPE] ?? (raw[SCOPE] = effectScope(true /* detached */));
        return scope.run(() => (watch as any)(...args));
      },
    });

    /**
     * Register a watchEffect in the same lazy per-instance scope.
     */
    defineProperty(targetClass.prototype, $watchEffect, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function (this: any, ...args: any[]) {
        const raw = resolveRaw(this);
        const scope =
          raw[SCOPE] ?? (raw[SCOPE] = effectScope(true /* detached */));
        return scope.run(() => (watchEffect as any)(...args));
      },
    });

    /**
     * Tear down the instance: stop its effect scope (any watchers created via
     * $watch), run a user `stopEffects()` hook if present, and drop all cached
     * cells so refs/computeds become collectable.
     */
    defineProperty(targetClass.prototype, $stopEffects, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function (this: any) {
        const raw = resolveRaw(this);
        if (typeof raw.stopEffects === fn) raw.stopEffects();

        const scope = raw[SCOPE];
        if (scope) scope.stop();

        const symbols = getOwnPropertySymbols(raw);
        for (const symbol of symbols) {
          if (symbol === RAW) continue;
          delete raw[symbol];
        }
      },
    });
  }

  // HMR: hand out a construct-trap proxy as the ONE public identity. New
  // instances must always be built by the LATEST donor constructor —
  // without this, even a component remount after an edit would run the
  // original constructor (v1 wiring under v2 methods). `new.target` stays
  // the proxy, so instances get the CANONICAL (grafted) prototype while the
  // latest constructor body + field initializers run.
  if (import.meta.env.DEV && hmrActive()) {
    const registry = hmrRegistry();
    let id = targetClass.name;
    if (hmrId !== undefined) id = hmrId;
    const existing = registry.get(id);
    if (existing) {
      // Same class re-Reactive()d → its proxy; a graft-refused donor
      // (collision/inheritance) → hand it back bare, un-HMR'd.
      return existing.canonical === targetClass
        ? existing.proxy
        : (targetClass as any);
    }
    const entry: HmrEntry = {
      canonical: targetClass,
      latest: targetClass,
      proxy: null,
      ctorSig: hmrSig,
      frozenSig: hmrFrozen,
      remountNeeded: false,
    };
    entry.proxy = new Proxy(targetClass as any, {
      construct: (_target, args, newTarget) =>
        Reflect.construct(entry.latest, args, newTarget),
    });
    registry.set(id, entry);
    return entry.proxy;
  }

  return targetClass as any;
}

/**
 * Vue props interface in defineComponent() style.
 */
export type VuePropsObject = Record<
  string,
  { type: any; default?: any; required?: boolean }
>;

/**
 * Vue Props with default properties declared as existing and having values.
 */
export type VuePropsWithDefaults<T extends VuePropsObject> = {
  [K in keyof T]: {
    type: T[K]['type'];
    default: T[K]['default'];
    required?: boolean;
  };
};

/**
 * Determines if the value is a JavaScript Class.
 * Note that class is a class function in JavaScript.
 *
 * @param val Any value
 * @returns boolean If it's a JavaScript Class returns true
 */
export const isClass = (val: any): boolean => {
  if (typeof val !== 'function') return false; // Not a function, so not a class function either

  if (!val.prototype) return false; // Arrow function, so not a class

  // Finally -> distinguish between a normal function and a class function
  if (getOwnPropertyDescriptor(val, 'prototype')?.writable) {
    // Has writable prototype
    return false; // Normal function
  } else {
    return true; // Class -> Not a function
  }
};
/**
 * Creates props with defaults in defineComponent() style.
 *
 * Merge defaults regular object with Vue types object
 * declared in defineComponent() style.
 *
 * This is made so that the defaults can be declared "as they are"
 * without requiring objects to be function callbacks returning an object.
 *
 * // You don't need to wrap objects in () => ({ nest: { nest :{} } })
 * // You can just delcare them normally.
 * const defaults = {
 *    nest: {
 *      nest
 *    }
 * }
 *
 * This function will create the Vue expected callbacks for Objects, Arrays & Classes
 * but leave primitive properties and functions intact so that
 * the final object is fully defineComponent() style compatible.
 *
 * The default cloner is the native `structuredClone` (zero-dependency, handles
 * plain data, Map/Set/Date/typed arrays, circular refs). For defaults that
 * contain class instances or functions — which `structuredClone` cannot clone —
 * pass a `customCloner` such as lodash `cloneDeep`.
 *
 * @param defaults Regular object of default key -> values
 * @param typedProps Props declared in defineComponent() style with type and possibly required declared, but without default
 * @param customCloner Optional cloner used for object/array defaults (defaults to structuredClone)
 * @returns Props declared in defineComponent() style with all properties having default property declared.
 */
export const propsWithDefaults = <T extends VuePropsObject>(
  defaults: Record<string, any>,
  typedProps: T,
  // Optional: Allows user to pass a custom cloner if structuredClone isn't enough
  customCloner?: (val: any) => any,
): VuePropsWithDefaults<T> => {
  // NON-MUTATING: descriptor objects are routinely SHARED between props
  // maps (`{ ...baseParamsTypes, extra }` — the spread copies the outer
  // object but every inner `{ type }` descriptor stays the same reference).
  // Writing `.default` in place would silently rewrite the base component's
  // defaults; each descriptor is copied instead.
  const result: Record<string, any> = {};
  for (const prop in typedProps) {
    const def = defaults?.[prop];
    const typed = typedProps[prop];
    result[prop] = { ...typed };

    if (typed.required || def === undefined) continue;

    if (typeof def === 'object' && def !== null) {
      result[prop].default = () =>
        customCloner ? customCloner(def) : structuredClone(def);
    } else {
      if (isClass(def)) {
        result[prop].default = () => def;
      } else {
        result[prop].default = def;
      }
    }
  }
  return result as VuePropsWithDefaults<T>;
};

/**
 * Type Utilities
 */
type GetterKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? never
    : T[K] extends undefined
      ? never
      : K;
}[keyof T];

type GetterReturn<T, K extends keyof T> = T[K] extends (...args: any[]) => any
  ? never
  : T[K];
type WritableComputedLike = Ref<any> & { set: (...args: any[]) => any };
type IsWritableGetter<R> =
  R extends Ref<any> ? true : R extends WritableComputedLike ? true : false;

type WritableGetters<T> = {
  [
    K in GetterKeys<T> as IsWritableGetter<GetterReturn<T, K>> extends true
      ? K
      : never
  ]-?: T[K];
};

export type ReactiveInstance<T> = T &
  WritableGetters<T> & {
    /** Register a watcher in the instance's lazy effect scope (same signature as Vue `watch`). */
    $watch: typeof watch;
    /** Register a watchEffect in the instance's lazy effect scope (same signature as Vue `watchEffect`). */
    $watchEffect: typeof watchEffect;
    /** Stop the instance's effect scope, run user `stopEffects()`, and drop cached cells. */
    $stopEffects: () => void;
  };

export type ReactiveClass<C extends new (...args: any) => any> = new (
  ...args: ConstructorParameters<C>
) => ReactiveInstance<InstanceType<C>>;

/**
 * Component-authoring type utilities (types only — erased at build time).
 * These complement `propsWithDefaults` for the params/defaults component
 * architecture: object-declared emits, extensible slots, and precise
 * handler-parameter extraction.
 */

/** Any JavaScript function of any type. */
export type AnyFn = (...args: any[]) => any;

/** Convert Record to Union Type. */
export type RecordToUnion<T extends Record<string, any>> = T[keyof T];

/** Gets object T property by key K. */
export type ValueOf<T extends Record<any, any>, K extends keyof T> = T[K];

/** Convert Union Type to Intersection Type. */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/** Prefix keys of an interface T with a prefix P. */
export type PrefixKeys<T, P extends string | undefined = undefined> = {
  [K in Extract<keyof T, string> as P extends string ? `${P}${K}` : K]: T[K];
};

/** Extracts object-declared emit validators into the emit-function interface. */
export type ExtractEmitTypes<T extends Record<string, any>> =
  UnionToIntersection<
    RecordToUnion<{
      [K in keyof T]: (evt: K, ...args: Parameters<T[K]>) => void;
    }>
  >;

/**
 * Extract properties as all-assigned (non-optional) because every one of
 * them carries a default.
 */
export type ExtractPropDefaultTypes<O> = {
  [K in keyof O]: K extends keyof ExtractPropTypes<O>
    ? ExtractPropTypes<O>[K]
    : never;
};

/**
 * Extend a slots interface T with prefixed 'before--' & 'after--' slots to
 * create fully extensible wrapped components.
 */
export type ExtendSlots<T> = PrefixKeys<T, 'before--'> &
  T &
  PrefixKeys<T, 'after--'>;

/** Get function arguments Parameters<F> parameter by index K. */
export type FnParameter<F extends AnyFn, K extends number> = Parameters<F>[K];

/** Get interface T property K's function arguments as Parameters. */
export type IFnParameters<
  T extends Record<any, any>,
  K extends string,
> = Parameters<Required<Pick<T, K>>[K]>;

/** Get interface T property P's function parameter by index K. */
export type IFnParameter<
  T extends Record<any, any>,
  P extends keyof T,
  K extends number,
> = FnParameter<NonNullable<T[P]> extends AnyFn ? NonNullable<T[P]> : never, K>;
