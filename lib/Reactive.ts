import {
  effectScope,
  isRef,
  toRaw,
  watch,
  watchEffect,
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
const RAW = Symbol('ivue_raw'); // Per-instance back-pointer to the raw object
const SCOPE = Symbol('ivue_scope'); // Lazily-created per-instance effect scope
const PROCESSED = Symbol('ivue_processed'); // Flag to mark a prototype as "Reactified"

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
    if (prototypeHasOwnProperty(prototype, PROCESSED)) continue;

    const names = getOwnPropertyNames(prototype);

    for (const key of names) {
      if (key === 'constructor') continue;
      const desc = getOwnPropertyDescriptor(prototype, key)!;

      // A fresh symbol per (prototype, key). Because each prototype level gets
      // its own symbol, a child override and its `super` counterpart cache
      // under different keys and never collide.
      const superKey = Symbol(key);

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
  for (const prop in typedProps) {
    const def = defaults?.[prop];
    const typed = typedProps[prop];

    if (typed.required || def === undefined) continue;

    if (typeof def === 'object' && def !== null) {
      typedProps[prop].default = () =>
        customCloner ? customCloner(def) : structuredClone(def);
    } else {
      if (isClass(def)) {
        typedProps[prop].default = () => def;
      } else {
        typedProps[prop].default = def;
      }
    }
  }
  return typedProps as VuePropsWithDefaults<T>;
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

