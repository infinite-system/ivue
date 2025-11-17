import { isRef, toRaw, type Ref } from 'vue';

const prototypeHasOwnProperty = Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
const getPrototypeOf = Object.getPrototypeOf;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const defineProperty = Object.defineProperty;
const getOwnPropertyNames = Object.getOwnPropertyNames;
const objectPrototype = Object.prototype;

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
  if (!desc || typeof desc.value !== 'function') return;

  const originalFn = desc.value;

  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,

    get(this: any) {
      const raw =
        (this as any).__ivue_raw || ((this as any).__ivue_raw = toRaw(this));
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
  if (!desc || typeof desc.get !== 'function') return;

  const originalGetter = desc.get;
  const originalSetter = desc.set;

  const cacheWhole = key[0] === '$'; // <── FAST test

  const get = cacheWhole
    ? function (this: any) {
        const instance = toRaw(this);
        if (superKey in instance) {
          return instance[superKey];
        }
        const cacheResult = originalGetter.call(instance);
        instance[superKey] = cacheResult;
        return cacheResult;
      }
    : function (this: any) {
        const instance = toRaw(this);
        if (superKey in instance) {
          return instance[superKey];
        }

        const maybeRef = originalGetter.call(instance);
        if (isRef(maybeRef)) {
          instance[superKey] = maybeRef;
        }
        return maybeRef;
      };

  defineProperty(proto, key, {
    configurable: true,
    enumerable: false,

    get,
    set: originalSetter || undefined,
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

      if (typeof desc.value === 'function') {
        convertToLazyBoundMethod(prototype, key, superKey);
      } else if (desc.get) {
        convertToLazyComputed(prototype, key, superKey);
      }
    }
  }
  return targetClass as any;
}

// ----------------------------
// Writable getters only
// ----------------------------

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

/** The real logic */
type WritableGetters<T> = {
  [K in GetterKeys<T> as IsWritableGetter<GetterReturn<T, K>> extends true
    ? K
    : never]-?: T[K];
};

// ----------------------------
// ReactiveInstance type
// ----------------------------
export type ReactiveInstance<T> = T & WritableGetters<T>;

// ----------------------------
// Constructor type
// ----------------------------
export type ReactiveClass<C extends new (...args: any) => any> = new (
  ...args: ConstructorParameters<C>
) => ReactiveInstance<InstanceType<C>>;
