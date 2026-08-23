/**
 * ============================================================
 *  DEPRECATED — ivue v1 (the reactive-proxy engine)
 * ============================================================
 *
 * This file is the ORIGINAL v1 implementation: `ivue(Class, ...args)`
 * wraps instances in `reactive()` and converts accessors to computeds.
 * It is kept in-tree for reference and migration only.
 *
 * v2 is `Reactive()` in ./Reactive.ts (the package's main entry) — a
 * one-time prototype transform: instances stay plain objects, plain
 * getters cost zero bytes, creation measures 55-253x faster. New code
 * must never import from this file.
 *
 * Migration guide: https://ivue.dev/guide/standard
 */

import type { ComputedRef, ExtractPropTypes, Ref, ToRef } from 'vue';
import { computed, markRaw, reactive, ref, shallowRef, toRef } from 'vue';
import type { Ref as DemiRef } from 'vue-demi';

/** Cached global methods. */
const isArray = Array.isArray;
const createObject = Object.create;
const defineProperty = Object.defineProperty;
const getPrototypeOf = Object.getPrototypeOf;
const getOwnPropertyNames = Object.getOwnPropertyNames;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;


/** Types */
/**
 * IVue core reactive instance type with an extended .toRefs() method added.
 */
export type IVue<T extends AnyClass> = InstanceType<T> & {
  toRefs: IVueToRefsFn<T>;
  clone: IVueClone<T>;
};

/**
 * Type definition for `.clone()` method creates a deep clone of the ivue instance.
 */
export type IVueClone<T extends AnyClass> = (
  ...cloneArgs: CloneArgsFor<InstanceType<T>>
) => IVue<T>;

/**
 * Type definition for `.toRefs()` method converts reactive class properties to composable .value properties.
 * But if props = true OR unwrap = true is specified, the refs will be unwrapped refs to be able to be merged with the the root class properties without losing reactivity.
 */
/** Extract only non-method keys from a type */
type NonMethodKeys<T> = {
  [K in keyof T]: T[K] extends AnyFn ? never : K;
}[keyof T];

/** Create a type with only data properties and accessors */
type DataProperties<T> = Pick<T, NonMethodKeys<T>>;

/**
 * Simplified IVueToRefsFn that only works with data properties
 */
interface IVueToRefsFn<T extends AnyClass> {
  <P extends keyof IVueRefs<InstanceType<T>>>(props: P[]): Pick<
    IVueRefs<InstanceType<T>>,
    P
  >;

  <P extends keyof IVueRefs<InstanceType<T>>>(props: P[], unwrap: false): Pick<
    IVueRefs<InstanceType<T>>,
    P
  >;

  <P extends keyof DataProperties<InstanceType<T>>>(
    props: P[],
    unwrap: true
  ): Pick<DataProperties<InstanceType<T>>, P>;

  (props: true): DataProperties<InstanceType<T>>;
  (props: false): IVueRefs<InstanceType<T>>;
  (): IVueRefs<InstanceType<T>>;
}

/**
 * Converts a class properties to a composable .value Refs using ToRef vue type,
 * also knows NOT to convert functions to .value Refs but to leave them as is.
 */
export type IVueRefs<T> = {
  [K in keyof T as T[K] extends AnyFn ? never : K]: ToRef<T[K]>;
};

/**
 * Unwraps Ref Recursively, helps resolve fully the bare value types of any type T
 * because sometimes the Refs are returned as they are with `.value` from computeds,
 * thus inferring nested ComputedRef<ComputedRef<ComputedRef<Ref>>> types, which
 * are difficult to fully resolve to bare values without this utility.
 * Also support Vue 3 Demi for vue-use library support.
 */
type UnwrapRefRecursively<T = any> = T extends Ref | DemiRef
  ? UnwrapRefRecursively<T['value']>
  : T;

/**
 * Helper type for Use type, unwraps any type of Vue 3 composable return object down to its bare types.
 */
type UnwrapComposableRefs<T> = T extends Ref | DemiRef
  ? UnwrapRefRecursively<T>
  : {
      [K in keyof T]: T[K] extends Ref | DemiRef
        ? UnwrapRefRecursively<T[K]>
        : T[K];
    };

/**
 * Fully unwraps to bare value types any Vue 3 composable return definition type.
 */
export type Use<T = any> = T extends Ref | DemiRef
  ? UnwrapRefRecursively<T>
  : UnwrapComposableRefs<T extends AnyFn ? ReturnType<T> : T>;

/**
 * Extracts object defined emit types by converting them to a plain interface.
 */
export type ExtractEmitTypes<T extends Record<string, any>> =
  UnionToIntersection<
    RecordToUnion<{
      [K in keyof T]: (evt: K, ...args: Parameters<T[K]>) => void;
    }>
  >;

/**
 * Extract properties as all assigned properties because they have defaults.
 */
export type ExtractPropDefaultTypes<O> = {
  [K in keyof O]: ValueOf<ExtractPropTypes<O>, K>;
};

/**
 * Extend slots interface T with prefixed 'before--' & 'after--' slots to create fully extensible flexible slots.
 */
export type ExtendSlots<T> = PrefixKeys<T, 'before--'> &
  T &
  PrefixKeys<T, 'after--'>;

/** Helper Types. */
/**
 * Any JavaScript function of any type.
 */
export type AnyFn = (...args: any[]) => any;

/**
 * Any JavaScript class of any type.
 */
export type AnyClass = new (...args: any[]) => any;

/**
 * Accessors map type.
 */
type Accessors = Map<string, PropertyDescriptor>;

/**
 * Computeds hash map type.
 */
type Computeds = Record<string, ComputedRef>;

/**
 * Infer paramaters of a constructor function of a Class.
 */
export type InferredArgs<T> = T extends { new (...args: infer P): any }
  ? P
  : never[];

/**
 * Prefix keys of an interface T with a prefix P.
 */
export type PrefixKeys<T, P extends string | undefined = undefined> = {
  [K in Extract<keyof T, string> as P extends string ? `${P}${K}` : K]: T[K];
};

/**
 * Get function arguments Parmeters<F> parameter by key K
 */
export type FnParameter<F extends AnyFn, K extends number> = Parameters<F>[K];

/**
 * Convert Union Type to Intersection Type.
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * Convert Record to Union Type.
 */
type RecordToUnion<T extends Record<string, any>> = T[keyof T];

/**
 * Gets object T property by key [K].
 */
type ValueOf<T extends Record<any, any>, K> = T[K];

/**
 * Props Map Value type.
 */
type PropsMapValue = {
  allProps: Map<string, PropKind>;
  onlyProps: Set<string>;
};

/**
 * Accessors and Methods map type.
 */
type AccessorsMethodsMap = {
  accessors: Accessors;
  methods: Set<string>;
};

export type IVueInstanceBase = {
  init?: (...args: any[]) => void;
};

/**
 * IVue static configuration interface.
 */
export interface IVueStaticConfig<T> {
  ivueGlobalStore?: boolean;
  ivueCloneByReference?: Set<keyof T>;
  ivueDisableReactivity?: Set<keyof T>;
}

/**
 * IVue constructor type.
 */
export type IVueConstructor<T> = new (...args: any[]) => T;

/**
 * IVue class type with static configuration.
 */
export type IVueClass<T> = IVueConstructor<T> & IVueStaticConfig<T>;

/**
 * Get IVue init() method arguments IVueInitArgs<T>
 */
export type IVueInitArgs<T extends IVueInstanceBase> = T['init'] extends (
  ...args: any[]
) => any
  ? Parameters<T['init']>
  : never;

/**
 * Get Interface's method keys MethodKeys<T>
 */
type MethodKeys<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any ? P : never;
}[keyof T];

/**
 * Get Interface's property's function arguments Parameters<F>
 */
export type IFnParameters<
  T extends Record<any, any> | InstanceType<AnyClass>,
  K extends MethodKeys<T>
> = Parameters<Extract<Required<Pick<T, K>>[K], AnyFn>>;

/**
 * Get Interface's [T] property's [P] function arguments Parmeters<F> parameter by key [K]
 */
export type IFnParameter<
  T extends Record<any, any>,
  P extends keyof T,
  K extends number
> = FnParameter<ValueOf<T, P>, K>;

export type IVueDeepCloneArgsMap = Map<AnyClass, any[]>;

type CloneArgsFor<T> = T extends {
  init: (isClone: boolean, ...rest: infer A) => any;
}
  ? A
  : [];
/** Types End. */

export const IVUE_INSTANCE_SYMBOL = Symbol('IVUE_INSTANCE');

/**
 * Stores accessors for each class prototype processed by
 * @see {getClassAccessorsMethodsMap}. Uses WeakMap to allow garbage collection
 * of unused class accessors, ensuring memory efficiency in long-running applications.
 */
export let accessorsMethodsMaps = new WeakMap<object, AccessorsMethodsMap>();

/**
 * Get accessors of an entire class prototype ancestors chain as a Map.
 * Completely emulates JavaScript class inheritance chain for getters and setters.
 *
 * @param className
 * @return {AccessorsMethodsMap}
 */
const getClassAccessorsMethodsMap = (
  className: AnyClass
): AccessorsMethodsMap => {
  if (accessorsMethodsMaps.has(className)) {
    return accessorsMethodsMaps.get(className) as AccessorsMethodsMap;
  }

  const savedAccessors: Accessors = new Map();
  const savedMethods: Set<string> = new Set();

  let prototype = className.prototype;
  while (prototype && prototype !== Object.prototype) {
    const accessors = getOwnPropertyDescriptors(prototype);
    for (const propertyName in accessors) {
      if (propertyName === 'constructor') continue;
      const descriptor = accessors[propertyName];
      if (descriptor.get || descriptor.set) {
        // Only add if it hasn't been defined yet (i.e. subclass overrides win)
        if (!savedAccessors.has(propertyName)) {
          savedAccessors.set(propertyName, descriptor);
        }
      } else if (typeof descriptor.value === 'function') {
        savedMethods.add(propertyName);
      }
    }
    prototype = getPrototypeOf(prototype);
  }

  const propertyMap = {
    accessors: savedAccessors,
    methods: savedMethods,
  };
  accessorsMethodsMaps.set(className, propertyMap);

  return propertyMap;
};

/**
 * Property kind enum for distinguishing between data properties and accessors.
 */
const enum PropKind {
  Data = 0,
  Accessor = 2,
}

/**
 * Stores properties for each class prototype processed by
 * @see {getClassPropertiesAccessorsMap}. Uses WeakMap to allow garbage collection
 * of unused class properties, ensuring memory efficiency in long-running applications.
 */
export let propertiesAccessorsMaps: WeakMap<object, PropsMapValue> =
  new WeakMap();

/**
 * 'caller', 'callee', 'arguments', 'constructor' are
 * special object properties, so should be skipped.
 * Also skip 'toRefs' as it's added by ivue and not part of the class itself.
 */
const skipProps = new Set(['caller', 'callee', 'arguments', 'constructor']);

/**
 * Get properties of an entire class prototype ancestors chain as a Map.
 */
const getClassPropertiesAccessorsMap = (obj: object): PropsMapValue => {
  const constructor = obj.constructor;
  /* Retrieve props from cache. */
  if (propertiesAccessorsMaps.has(constructor)) {
    return propertiesAccessorsMaps.get(constructor) as PropsMapValue;
  }

  const { accessors, methods } =
    accessorsMethodsMaps.get(constructor) ??
    getClassAccessorsMethodsMap(constructor as AnyClass);

  const onlyProps = new Set<string>();
  const allProps: Map<string, PropKind> = new Map();

  do {
    const propertyNames = getOwnPropertyNames(obj);
    for (let i = 0, j = propertyNames.length; i < j; i++) {
      const property = propertyNames[i];

      if (skipProps.has(property)) continue; // Skip special properties
      if (allProps.has(property)) continue; // Already defined in subclass, skip it

      if (accessors.has(property)) {
        allProps.set(property, PropKind.Accessor);
      } else if (!methods.has(property)) {
        onlyProps.add(property);
        allProps.set(property, PropKind.Data);
      }
    }

    obj = getPrototypeOf(obj);
  } while (obj && obj.constructor !== Object);

  const result = { allProps, onlyProps };
  propertiesAccessorsMaps.set(constructor, result);

  return result;
};

/**
 * Infinite Vue (ivue) class reactive initializer.
 *
 * Converts class instance to a reactive object,
 * where accessors are converted to computeds.
 *
 * You can turn off computed behaviour by adding static
 * ivue object and setting the getter props to false.
 * class ClassName {
 *    static ivue = {
 *      getter: false
 *    }
 *    // .getter -> will be a standard JS non-computed getter
 *    get getter () { return 'hello world'; }
 * }
 *
 * @deprecated v1 engine — use `Reactive()` from the main `ivue` entry
 * instead; see https://ivue.dev/guide/standard for the migration.
 * @param className Any Class
 * @param args Class constructor arguments that you would pass to a `new AnyClass(args...)`
 * @returns {IVue<T>}
 */
export const ivue = <T extends AnyClass>(
  className: T,
  ...args: InferredArgs<T>
): IVue<T> => {
  const { accessors, methods } = getClassAccessorsMethodsMap(className);
  const computeds: Computeds | any = accessors?.size
    ? createObject(null)
    : null;

  /** Create a reactive instance of the class. */
  const vue = reactive(new className(...args));

  /** Setup accessors as computeds. */
  for (const [prop, descriptor] of accessors) {
    /** Convert descriptor to computed. */
    defineProperty(vue, prop, {
      get: () =>
        computeds[prop] ??
        (computeds[prop] = computed({
          get: descriptor.get?.bind(vue) as unknown,
          set: descriptor.set?.bind(vue),
        } as any)) /** Create the computed and return it, because we are in reactive scope, .value will auto unwrap itself. */,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
    });
  }

  /** Disable reactivity for specified properties. */
  const nonReactiveProps = (className as any)?.ivueDisableReactivity;
  if (nonReactiveProps) {
    for (const prop of nonReactiveProps) {
      const descriptor = accessors.get(prop);
      if (descriptor) {
        defineProperty(vue, prop, {
          get: descriptor.get?.bind(vue),
          set: descriptor.set?.bind(vue),
          enumerable: descriptor.enumerable,
          configurable: descriptor.configurable,
        });
      } else {
        console.log('des  criptor', prop, descriptor);
        vue[prop] = markRaw(vue[prop]);
      }
    }
  }

  // In ivue(), for method binding:
  const methodDescriptor: PropertyDescriptor = {
    writable: true,
    configurable: true,
    enumerable: false,
  };
  /** Bind all methods to the vue instance. */
  for (const methodName of methods) {
    methodDescriptor.value = vue[methodName].bind(vue);
    defineProperty(vue, methodName, methodDescriptor);
  }

  /** Define .toRefs() method on the vue instance. */
  defineProperty(vue, 'toRefs', {
    get: (() => {
      /** Lazy loaded toRefs function cache. */
      let toRefsFn: IVueToRefsFn<T> | null = null;
      return () =>
        toRefsFn ?? (toRefsFn = ivueToRefs(vue, accessors, computeds));
    })(),
    enumerable: false,
  });

  /** Define .clone() method on the vue instance. */
  defineProperty(vue, 'clone', {
    value: (...cloneArgs: CloneArgsFor<InstanceType<T>>) =>
      ivueClone(className, args, vue, accessors, methods, cloneArgs),
    enumerable: false,
  });

  /** Mark as ivue instance */
  defineProperty(vue, IVUE_INSTANCE_SYMBOL, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  /** Run ivue .init() initializer method, if it exists in the class. */
  vue?.init?.(false);

  return vue;
};

const ivueClone = <T extends AnyClass>(
  className: T,
  args: InferredArgs<T>,
  vueSrc: IVue<T>,
  accessors: Accessors,
  methods: Set<string>,
  cloneArgs: CloneArgsFor<InstanceType<T>> = [] as CloneArgsFor<InstanceType<T>>
): IVue<T> => {
  const computeds: Computeds | any = accessors?.size
    ? createObject(null)
    : null;

  /** Create a reactive instance of the class. */
  const vue = reactive(new className(...args));
  const { onlyProps } = getClassPropertiesAccessorsMap(vue);

  /** Clone properties. */
  const cloneByRef = (className as any).ivueCloneByReference;
  const deepCloneArgs = activeDeepCloneArgsMap.get(className);

  if (cloneByRef) {
    for (const prop of onlyProps) {
      vue[prop] = cloneByRef.has(prop)
        ? vueSrc[prop]
        : deepClone(vueSrc[prop], deepCloneArgs);
    }
  } else {
    for (const prop of onlyProps) {
      vue[prop] = deepClone(vueSrc[prop], deepCloneArgs);
    }
  }

  /** Setup accessors as computeds. */
  for (const [prop, descriptor] of accessors) {
    /** Convert descriptor to computed. */
    defineProperty(vue, prop, {
      get: () =>
        computeds[prop] ??
        (computeds[prop] = computed({
          get: descriptor.get?.bind(vue) as unknown,
          set: descriptor.set?.bind(vue),
        } as any)) /** Create the computed and return it, because we are in reactive scope, .value will auto unwrap itself. */,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
    });
  }

  /** Disable reactivity for specified properties. */
  const nonReactiveProps = (className as any)?.ivueDisableReactivity;
  if (nonReactiveProps) {
    for (const prop of nonReactiveProps) {
      const descriptor = accessors.get(prop);
      if (descriptor) {
        defineProperty(vue, prop, {
          get: descriptor.get?.bind(vue),
          set: descriptor.set?.bind(vue),
          enumerable: descriptor.enumerable,
          configurable: descriptor.configurable,
        });
      } else {
        vue[prop] = markRaw(vue[prop]);
      }
    }
  }

  /** Bind all methods to the vue instance. */
  const methodDescriptor: PropertyDescriptor = {
    writable: true,
    configurable: true,
    enumerable: false,
  };
  for (const methodName of methods) {
    methodDescriptor.value = vue[methodName].bind(vue);
    defineProperty(vue, methodName, methodDescriptor);
  }

  /** Define .toRefs() method on the vue instance. */
  defineProperty(vue, 'toRefs', {
    get: (() => {
      /** Lazy loaded toRefs function cache. */
      let toRefsFn: IVueToRefsFn<T> | null = null;
      return () =>
        toRefsFn ?? (toRefsFn = ivueToRefs(vue, accessors, computeds));
    })(),
    enumerable: false,
  });

  /** Define .clone() method on the vue instance. */
  defineProperty(vue, 'clone', {
    value: (...cloneArgs: CloneArgsFor<InstanceType<T>>) =>
      ivueClone(className, args, vue, accessors, methods, cloneArgs),
    enumerable: false,
  });

  /** Mark as ivue instance */
  defineProperty(vue, IVUE_INSTANCE_SYMBOL, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  /** Run ivue .init() initializer method, if it exists in the class. */
  vue?.init?.(true, ...cloneArgs);

  return vue;
};

/**
 * `iref()` is an alias for Vue ref() function but returns an unwrapped type without the .value
 * `iref()` does not alter the behavior of ref(), but simply transforms the type to an unwrapped raw value.
 * @param val T
 * @returns {T} Ref but with type unwrapped
 */
export const iref = ref as <T = any>(value?: T) => T;

/**
 * `ishallowRef()` is an alias for Vue shallowRef() function but returns an unwrapped type without the .value
 * `ishallowRef()` does not alter the behavior of shallowRef(), but simply transforms the type to an unwrapped raw value.
 * @param val T
 * @returns {T} ShallowRef but with type unwrapped
 */
export const ishallowRef = shallowRef as <T = any>(value?: T) => T;

/**
 * `iuse()` is a helper function that unwraps any Vue 3 composable return type down to its bare types.
 *
 * It does not alter the behavior of the composable, but simply transforms the type to an unwrapped raw value.
 *
 * @param obj Any Vue 3 composable return type or any object or any type
 * @returns {Use<T>} Composable with types unwrapped
 */
export const iuse = <T extends object>(obj: T): Use<T> =>
  obj as unknown as Use<T>; /** Unwrap any other Object or any type down to its bare types. */

/**
 * Convert reactive ivue class to Vue 3 refs.
 *
 * @param vue @see IVue
 * @param accessors @see Accessors
 * @param computeds @see Computeds
 * @returns {ExtendWithToRefs<T>['toRefs']}
 */
const ivueToRefs = <T extends AnyClass>(
  vue: IVue<T>,
  accessors: Accessors,
  computeds: Computeds
): IVueToRefsFn<T> => {
  /** Caches for toRefs function */
  /** Cached accessor function */
  const getAccessor = accessors.get.bind(accessors);
  /** Get all class properties */
  const { allProps } = getClassPropertiesAccessorsMap(vue);
  /** The actual toRefs function returned. */
  return function (
    props: (string & keyof InstanceType<T>)[] | boolean = false,
    unwrap?: boolean /** This property helps with TypeScript function definition overloading of return types and is not being used inside the function itself. */
  ): any /** @see {ReturnType<IVueToRefsFn<T>>} */ {
    /** Resulting refs store. */
    const result: Record<string, any> = {};

    /** Convert all props to refs and leave functions as is. */
    if (isArray(props)) {
      for (const prop of props) {
        const kind = allProps.get(prop);
        resolveIvueToRefs(result, prop, kind, vue, getAccessor, computeds);
      }
    } else {
      for (const [prop, kind] of allProps.entries()) {
        resolveIvueToRefs(result, prop, kind, vue, getAccessor, computeds);
      }
    }

    return result as any; /** @see {ReturnType<IVueToRefsFn<T>>} */
  };
};

/**
 * Resolve property to ref, method or computed and assign it to result.
 * @private
 */
const resolveIvueToRefs = (
  result: Record<string, any>,
  prop: string,
  kind: PropKind | undefined,
  vue: IVue<any>,
  getAccessor: Accessors['get'],
  computeds: Record<string, ComputedRef<any>>
): void => {
  if (kind === PropKind.Accessor) {
    const descriptor = getAccessor(prop) as PropertyDescriptor;
    result[prop] =
      computeds[prop] ??
      (computeds[prop] = computed({
        get: descriptor.get?.bind(vue) as unknown,
        set: descriptor.set?.bind(vue),
      } as any));
  } else if (kind === PropKind.Data) {
    result[prop] = toRef(vue, prop);
  }
};

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
  deepCloneArgs: IVueDeepCloneArgsMap | undefined = undefined
): VuePropsWithDefaults<T> => {
  for (const prop in typedProps) {
    const def = defaults?.[prop];
    const typed = typedProps[prop];

    /** Skip if prop is required — Vue will enforce it at runtime */
    if (typed.required) continue;

    /** Skip if default is undefined */
    if (def === undefined) continue;

    if (typeof def === 'object' && def !== null) {
      /** Handle Arrays & Objects -> wrap them with an arrow function. */
      typedProps[prop].default = () => deepClone(def, deepCloneArgs);
    } else {
      if (isClass(def)) {
        /** Handle JavaScript Classes -> wrap them with an arrow function */
        typedProps[prop].default = () => def;
      } else {
        /** Handle JavaScript Function And All primitive properties -> output directly */
        typedProps[prop].default = def;
      }
    }
  }
  return typedProps as VuePropsWithDefaults<T>;
};

/**
 * Copies own properties (including symbols and non-enumerable) from source to target.
 * Recursively deep clones values, but preserves getters/setters as-is.
 */
export const copyOwnProps = (
  source: any,
  target: any,
  deepCloneArgs: IVueDeepCloneArgsMap | undefined,
  seen: WeakMap<object, any>
) => {
  // 1. Get all descriptors (String keys AND Symbol keys)
  const descriptors = Object.getOwnPropertyDescriptors(source);

  // 2. Iterate over all keys returned by Reflect (safety for Proxies/Environments)
  for (const key of Reflect.ownKeys(descriptors)) {
    const desc = descriptors[key as any];

    // 3. If it is a data descriptor (has a value), we must deep clone the value.
    //    We do NOT clone getters/setters (we copy the function reference).
    if ('value' in desc) {
      desc.value = deepClone(desc.value, deepCloneArgs, seen);
    }

    // 4. Define on target
    Object.defineProperty(target, key, desc);
  }
};

export let activeDeepCloneArgsMap = new WeakMap<
  AnyClass,
  IVueDeepCloneArgsMap
>();

export const deepClone = (
  source: any,
  deepCloneArgs?: IVueDeepCloneArgsMap,
  seen: WeakMap<object, any> = new WeakMap()
): any => {
  // --- TIER 1: The "Every Call" Checks (Fastest) ---
  if (source == null || typeof source !== 'object') return source;
  if (seen.has(source)) return seen.get(source);

  // --- TIER 2: The "Hottest" Collection (Arrays) ---
  if (isArray(source)) {
    const len = source.length;
    const out = new Array(len);
    seen.set(source, out);
    for (let i = 0; i < len; i++) {
      out[i] = deepClone(source[i], deepCloneArgs, seen);
    }
    return out;
  }

  // --- TIER 3: The "Hottest" Objects (Plain Objects) ---
  const prototype = getPrototypeOf(source);
  if (prototype === Object.prototype || prototype === null) {
    const out = createObject(prototype);
    seen.set(source, out);
    copyOwnProps(source, out, deepCloneArgs, seen);
    return out;
  }

  // --- TIER 4: IVue Special Logic (Your Framework) ---
  // Checked here because it's specific to your domain
  if (source[IVUE_INSTANCE_SYMBOL]) {
    const srcClass = source.constructor as IVueClass<any>;
    if (srcClass.ivueGlobalStore) {
      seen.set(source, source);
      return source;
    }
    let out;
    if (deepCloneArgs?.has(srcClass)) {
      activeDeepCloneArgsMap.set(srcClass, deepCloneArgs);
      try {
        out = source.clone(...(deepCloneArgs.get(srcClass) ?? []));
      } finally {
        activeDeepCloneArgsMap.delete(srcClass);
      }
    } else {
      out = source.clone();
    }
    seen.set(source, out);
    return out;
  }

  // --- TIER 5: Common Built-ins (Sorted by Likelihood) ---
  // instanceof is fast, but order matters slightly for CPU branch prediction
  if (source instanceof Date) {
    return new Date(source.getTime());
  }
  if (source instanceof Map) {
    const out = new (source.constructor as any)();
    seen.set(source, out);
    for (const [k, v] of source) {
      out.set(
        deepClone(k, deepCloneArgs, seen),
        deepClone(v, deepCloneArgs, seen)
      );
    }
    return out;
  }
  if (source instanceof Set) {
    const out = new (source.constructor as any)();
    seen.set(source, out);
    for (const v of source) {
      out.add(deepClone(v, deepCloneArgs, seen));
    }
    return out;
  }

  // --- TIER 6: Rare / Heavy Objects (The "Slow" Tail) ---
  if (source instanceof RegExp) {
    const out = new RegExp(source.source, source.flags);
    out.lastIndex = source.lastIndex;
    return out;
  }
  if (source instanceof Error) {
    const out = new (source.constructor as any)(source.message);
    seen.set(source, out);
    copyOwnProps(source, out, deepCloneArgs, seen);
    return out;
  }
  if (
    source instanceof Promise ||
    source instanceof WeakMap ||
    source instanceof WeakSet
  ) {
    seen.set(source, source);
    return source;
  }
  if (source instanceof DataView) {
    // Clone the underlying buffer to ensure deep copy
    const out = new DataView(
      source.buffer.slice(0),
      source.byteOffset,
      source.byteLength
    );
    seen.set(source, out);
    return out;
  }
  // Binary data (less common in UI state, but supported)
  if (ArrayBuffer.isView(source) && !(source instanceof DataView)) {
    const out = new (source.constructor as any)(source);
    seen.set(source, out);
    return out;
  }
  if (source instanceof ArrayBuffer) {
    const out = source.slice(0);
    seen.set(source, out);
    return out;
  }

  // --- TIER 7: Final Fallback (Custom User Classes) ---
  // If it's a class instance not handled above
  const out = createObject(prototype);
  seen.set(source, out);
  copyOwnProps(source, out, deepCloneArgs, seen);
  return out;
};

/**
 * Clears the accessorsMethodsMaps, and propertiesAccessorsMaps WeakMaps.
 * Useful for SSR scenarios where you want to reset the cache between requests.
 * Also useful for testing purposes to ensure a clean state.
 */
export const clearCache = () => {
  accessorsMethodsMaps = new WeakMap();
  propertiesAccessorsMaps = new WeakMap();
  activeDeepCloneArgsMap = new WeakMap();
};

/** Exported for testing purposes. */
export const __test__ = {
  copyOwnProps,
  getClassAccessorsMethodsMap,
  getClassPropertiesAccessorsMap,
};

/** Necessary ivue.ts to be treated as a module. */
export {};
