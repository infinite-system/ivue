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
const hasOwn = Object.hasOwn;
const getPrototypeOf = Object.getPrototypeOf;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const defineProperty = Object.defineProperty;
const objectPrototype = Object.prototype;

// Identity symbols are global so every bundled copy agrees with objects
// stamped by another copy of the engine.
const RAW = Symbol.for('ivue.raw'); // Per-instance back-pointer to the raw object
const SCOPE = Symbol.for('ivue.scope'); // Lazily-created per-instance effect scope
// Marks a prototype level as "Reactified"; its VALUE is the list of
// engine-created instance-cache symbols for that level, so teardown can
// remove exactly the engine's cells and nothing else.
const PROCESSED = Symbol.for('ivue.processed');

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
  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get(this: any) {
      const raw = resolveRaw(this);
      return raw[superKey] ?? (raw[superKey] = originalFn.bind(raw));
    },
    set(this: any, newFn: any) {
      resolveRaw(this)[superKey] = newFn;
    },
  });
}

/**
 * Convert a getter to a lazily-cached Ref cell.
 *
 * Only ever called when the descriptor has a getter, so `originalGetter` is
 * always defined here. A getter that returns any Ref — ref(), shallowRef(),
 * computed() (a ComputedRef IS a Ref) — is cached under the instance symbol
 * (stable reactive identity); a getter that returns a plain value
 * de-optimizes back to a native getter on the prototype, removing all
 * overhead for future instances.
 */
function convertToLazyRef(
  proto: any,
  key: string,
  superKey: symbol,
  originalGetter: (this: any) => any,
  originalSetter: ((this: any, v: any) => any) | undefined,
) {
  // Optimization: Properties starting with $ are assumed singletons.
  const cacheWhole = key[0] === '$';

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
 * Create a reactive class.
 * @param targetClass The class to make reactive.
 * @returns A reactive version of the class (the same class, transformed in place).
 */
export function Reactive<C extends new (...args: any) => any>(
  targetClass: C,
): ReactiveClass<C> & { Instance: ReactiveInstance<InstanceType<C>> } {
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
    if (hasOwn(prototype, PROCESSED)) continue;

    const names = Object.getOwnPropertyNames(prototype);
    const cacheKeys: symbol[] = [];

    for (const key of names) {
      if (key === 'constructor') continue;
      const desc = getOwnPropertyDescriptor(prototype, key)!;

      if (typeof desc.value === 'function') {
        // A fresh symbol per (prototype,key). Because each prototype level gets
        // its own symbol, a child override and its `super` counterpart cache
        // under different keys and never collide.
        const superKey = Symbol(key);
        cacheKeys.push(superKey);
        convertToLazyBoundMethod(prototype, key, superKey, desc.value);
      } else if (desc.get) {
        const superKey = Symbol(key);
        cacheKeys.push(superKey);
        convertToLazyRef(prototype, key, superKey, desc.get, desc.set);
      }
    }

    // Mark this prototype level as processed; the marker carries the
    // level's engine cache keys (see PROCESSED above).
    defineProperty(prototype, PROCESSED, {
      value: cacheKeys,
    });
  }

  // Inject the $watch/$watchEffect/$stopEffects helpers. The guard is an
  // IDEMPOTENCY SENTINEL only — one key stands for the whole trio, so a
  // repeated Reactive() call (diamond imports, duplicate bundled engine
  // copies) skips re-injection. It is NOT override protection: the $-helper
  // names are reserved engine API (richer cleanup is an ordinary method
  // that calls $stopEffects() itself — ivue never auto-calls user code).
  if (!hasOwn(targetClass.prototype, '$stopEffects')) {
    /**
     * Register a watcher in this instance's lazily-created effect scope.
     * The scope is allocated only on first use, so pure-data classes that
     * never watch pay nothing. Has the same signature as Vue's `watch`.
     */
    defineProperty(targetClass.prototype, '$watch', {
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
    defineProperty(targetClass.prototype, '$watchEffect', {
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
     * $watch) and drop all cached cells so refs/computeds become collectable.
     * No hooks — ivue never calls user code; compose richer cleanup as an
     * ordinary method that does its own work and then calls $stopEffects().
     */
    defineProperty(targetClass.prototype, '$stopEffects', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function (this: any) {
        const raw = resolveRaw(this);
        try {
          const scope = raw[SCOPE];
          if (scope) scope.stop();
        } finally {
          // SCOPE is ivue-owned but is not a method/getter cache key.
          delete raw[SCOPE];

          // Each processed prototype's PROCESSED marker carries the
          // symbols it may cache on an instance. Walk Child -> Base and
          // remove only those known keys.
          let prototype = getPrototypeOf(raw);
          while (prototype && prototype !== objectPrototype) {
            const cacheKeys = prototype[PROCESSED] as
              | readonly symbol[]
              | undefined;
            if (cacheKeys) {
              for (const cacheKey of cacheKeys) delete raw[cacheKey];
            }
            prototype = getPrototypeOf(prototype);
          }
        }
      },
    });
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
    /** Stop the instance's effect scope and drop cached cells. */
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