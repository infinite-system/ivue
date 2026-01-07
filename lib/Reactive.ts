import { toRaw, isRef, type Ref } from 'vue';

/**
 * Constants & Helpers
 */
const prototypeHasOwnProperty = Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
const getPrototypeOf = Object.getPrototypeOf;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const defineProperty = Object.defineProperty;
const getOwnPropertyNames = Object.getOwnPropertyNames;
const objectPrototype = Object.prototype;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;

const $stopEffects = '$stopEffects';
const fn = 'function';
const RAW = Symbol('ivue_raw');
const SK_MAP = '__ivue_sk'; // Store for cache keys
const PROCESSED = Symbol('ivue_processed'); // Flag to mark prototype as "Reactified"

/**
 * Get unique symbol key for super method/property.
 */
function getSuperKey(proto: any, key: string): symbol {
  // Ensure the map exists on this specific prototype (shadowing parents)
  if (!prototypeHasOwnProperty(proto, SK_MAP)) {
    defineProperty(proto, SK_MAP, {
      value: {},
      configurable: true,
      enumerable: false,
      writable: true,
    });
  }
  const map = proto[SK_MAP];
  return map[key] || (map[key] = Symbol(key));
}

/**
 * Convert method to a lazy-bound prototype method.
 */
function convertToLazyBoundMethod(proto: any, key: string, superKey: symbol) {
  const desc = getOwnPropertyDescriptor(proto, key);
  if (!desc || typeof desc.value !== fn) return;

  const originalFn = desc.value;

  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get(this: any) {
      const raw = this[RAW] ?? (this[RAW] = toRaw(this));
      return raw[superKey] ?? (raw[superKey] = originalFn.bind(raw));
    },
    set(this: any, newFn: any) {
      toRaw(this)[superKey] = newFn;
    },
  });
}

/**
 * Convert a property to a lazy-computed property.
 */
function convertToLazyComputed<T extends object>(
  proto: T,
  key: string,
  superKey: symbol
) {
  const desc = getOwnPropertyDescriptor(proto, key);
  const originalGetter = desc?.get;
  const originalSetter = desc?.set;

  // Optimization: Properties starting with $ are assumed singletons
  const cacheWhole = key[0] === '$';

  // DEV WARNING: Setter/Getter mismatch
  if (import.meta.env.DEV && originalGetter && originalSetter) {
    try {
      const testVal = originalGetter.call({});
      if (isRef(testVal)) {
        console.warn(
          `[ivue] API conflict on "${key}": Getter returns Ref but Setter is standard.`
        );
      }
    } catch (e) {}
  }

  const newGetter = function (this: any) {
    const raw = toRaw(this);

    // 1. Check Cache
    if (superKey in raw) return raw[superKey];

    // 2. Execute Original
    const result = originalGetter!.call(raw);

    // 3. Handle Result
    if (cacheWhole) {
      // Cache result forever (Singleton pattern)
      raw[superKey] = result;
      return result;
    }

    if (isRef(result)) {
      // Cache Ref instance (Reactivity pattern)
      raw[superKey] = result;
    } else {
      // DE-OPTIMIZATION: It's just a value. Restore original getter on prototype.
      // This removes overhead for all future calls on this prototype.
      defineProperty(proto, key, {
        configurable: true,
        enumerable: false,
        get: originalGetter
          ? function (this: any) {
              return originalGetter.call(toRaw(this));
            }
          : undefined,
        set: originalSetter
          ? function (this: any, v: any) {
              return originalSetter.call(toRaw(this), v);
            }
          : undefined,
      });
    }

    return result;
  };

  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get: originalGetter ? newGetter : undefined,
    set: originalSetter
      ? function (this: any, v: any) {
          return originalSetter.call(toRaw(this), v);
        }
      : undefined,
  });
}

/**
 * Create a reactive class.
 * @param targetClass The class to make reactive.
 * @returns A reactive version of the class.
 */
export function Reactive<C extends new (...args: any) => any>(
  targetClass: C
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
    // OPTIMIZATION: Skip if this prototype layer is already "Reactified"
    // This handles diamond inheritance and multiple Reactive children safely.
    if (prototypeHasOwnProperty(prototype, PROCESSED)) continue;

    const names = getOwnPropertyNames(prototype);

    for (const key of names) {
      if (key === 'constructor') continue;
      const desc = getOwnPropertyDescriptor(prototype, key);
      if (!desc) continue;

      const superKey = getSuperKey(prototype, key);

      if (typeof desc.value === fn) {
        convertToLazyBoundMethod(prototype, key, superKey);
      } else if (desc.get) {
        convertToLazyComputed(prototype, key, superKey);
      }
    }

    // Mark this specific prototype level as processed
    defineProperty(prototype, PROCESSED, {
      configurable: false,
      enumerable: false,
      value: true,
    });
  }

  // Inject cleanup
  if (!prototypeHasOwnProperty(targetClass.prototype, $stopEffects)) {
    defineProperty(targetClass.prototype, $stopEffects, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function (this: any) {
        const raw = toRaw(this);
        if (typeof raw.stopEffects === fn) raw.stopEffects();

        const symbols = getOwnPropertySymbols(raw);
        for (const symbol of symbols) {
          if (symbol === RAW) continue;
          const cached = raw[symbol];
          // Stop computed/effect if present
          if (cached && cached.effect && typeof cached.effect.stop === fn) {
            cached.effect.stop();
          }
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
 * @param defaults Regular object of default key -> values
 * @param typedProps Props declared in defineComponent() style with type and possibly required declared, but without default
 * @returns Props declared in defineComponent() style with all properties having default property declared.
 */
export const propsWithDefaults = <T extends VuePropsObject>(
  defaults: Record<string, any>,
  typedProps: T,
  // Optional: Allows user to pass a custom cloner if structuredClone isn't enough
  customCloner?: (val: any) => any
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
type IsWritableGetter<R> = R extends Ref<any>
  ? true
  : R extends WritableComputedLike
  ? true
  : false;

type WritableGetters<T> = {
  [K in GetterKeys<T> as IsWritableGetter<GetterReturn<T, K>> extends true
    ? K
    : never]-?: T[K];
};

export type ReactiveInstance<T> = T &
  WritableGetters<T> & { $stopEffects: () => void };

export type ReactiveClass<C extends new (...args: any) => any> = new (
  ...args: ConstructorParameters<C>
) => ReactiveInstance<InstanceType<C>>;
