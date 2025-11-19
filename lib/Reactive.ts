import { toRaw, isReadonly, isRef, type Ref } from 'vue';

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

function getSuperKey(proto: any, key: string): symbol {
  // Force prototype shadowing, never let it inherit
  if (!prototypeHasOwnProperty(proto, '__ivue_sk')) {
    proto.__ivue_sk = {};
  }
  const map = proto.__ivue_sk;
  return map[key] || (map[key] = Symbol(key));
}

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

function convertToLazyComputed<T extends object>(
  proto: T,
  key: string,
  superKey: symbol
) {
  const desc = getOwnPropertyDescriptor(proto, key);

  const originalGetter = desc?.get;
  const originalSetter = desc?.set;

  const cacheWhole = key[0] === '$'; // <── FAST test

  if (import.meta.env.DEV && originalGetter && originalSetter) {
    let warned = false;
    try {
      const testVal = originalGetter.call({});
      if (isRef(testVal) && !warned) {
        const isReadOnly = isReadonly(testVal);
        warned = true;
        console.warn(
          `[ivue] API conflict on property "${key}":\n` +
            `Getter returns a ${
              isReadOnly ? 'ComputedRef/ReadonlyRef' : 'Ref'
            }, but a setter is also defined.\n` +
            `This creates two write paths:\n` +
            `  • a.${key}.value = x\n` +
            `  • a.${key} = x\n\n` +
            `Recommended fix: return computed({ get, set }) to have a setter.`
        );
      }
    } finally {
      // ignore failures from calling getter on dummy object
    }
  }

  let get;
  if (originalGetter) {
    get = cacheWhole
      ? function (this: any) {
          const raw = toRaw(this);
          if (superKey in raw) {
            return raw[superKey];
          }
          const cacheResult = originalGetter.call(raw);
          raw[superKey] = cacheResult;
          return cacheResult;
        }
      : function (this: any) {
          const raw = toRaw(this);
          if (superKey in raw) {
            return raw[superKey];
          }

          const getterResult = originalGetter.call(raw);
          if (isRef(getterResult)) {
            raw[superKey] = getterResult;
          } else {
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
          return getterResult;
        };
  }

  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,

    get: originalGetter ? get : undefined,
    set: originalSetter
      ? function (this: any, v: any) {
          return originalSetter.call(toRaw(this), v);
        }
      : undefined,
  });
}

export function Reactive<C extends new (...args: any) => any>(
  targetClass: C
): ReactiveClass<C> & { Instance: ReactiveInstance<InstanceType<C>> } {
  const chain: any[] = [];

  let targetPrototype = targetClass.prototype;
  while (targetPrototype && targetPrototype !== objectPrototype) {
    chain.push(targetPrototype);
    targetPrototype = getPrototypeOf(targetPrototype);
  }

  chain.reverse();

  for (const prototype of chain) {
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
  }
  if (!($stopEffects in targetClass.prototype)) {
    defineProperty(targetClass.prototype, $stopEffects, {
      enumerable: false,
      configurable: true, // ← allow redefinition instead of throwing
      writable: true, // ← allow overwriting if something does redefine
      value: function (this: any) {
        const raw = toRaw(this);

        if (typeof raw.stopEffects === fn) {
          raw.stopEffects();
        }

        for (const symbol of getOwnPropertySymbols(raw)) {
          if (symbol === RAW) continue; // ★ Do NOT delete RAW
          const cached = raw[symbol];
          // Stop computed effects if present
          if (cached && cached.effect && typeof cached.effect.stop === fn) {
            cached.effect.stop();
          }
          // Drop cached value from instance
          delete raw[symbol];
        }
      },
    });
  }

  return targetClass as any;
}

// ----------------------------
// Keys that are getters (exclude methods)
// ----------------------------
type GetterKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? never
    : T[K] extends undefined
    ? never
    : K;
}[keyof T];

/** Extract getter return */
type GetterReturn<T, K extends keyof T> = T[K] extends (...args: any[]) => any
  ? never
  : T[K];

/** A computed with a setter has a `set` method on the ref */
type WritableComputedLike = Ref<any> & { set: (...args: any[]) => any };

/** Determine if a getter should be writable */
type IsWritableGetter<R> = R extends Ref<any>
  ? true
  : R extends WritableComputedLike
  ? true
  : false;

// ----------------------------
// Writable getters
// ----------------------------
type WritableGetters<T> = {
  [K in GetterKeys<T> as IsWritableGetter<GetterReturn<T, K>> extends true
    ? K
    : never]-?: T[K];
};

// ----------------------------
// ReactiveInstance type
// ----------------------------
export type ReactiveInstance<T> = T &
  WritableGetters<T> & { $stopEffects: () => void };

// ----------------------------
// Constructor type
// ----------------------------
export type ReactiveClass<C extends new (...args: any) => any> = new (
  ...args: ConstructorParameters<C>
) => ReactiveInstance<InstanceType<C>>;
