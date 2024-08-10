/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComputedRef, ToRef, EffectScope, UnwrapNestedRefs } from 'vue';
import { computed, reactive, toRef, effectScope, getCurrentScope, onScopeDispose } from 'vue';

/** Types */
export type IVue<T extends AnyClass> = InstanceType<T> & IVueToRefs<T>;

export interface IVueToRefs<T extends AnyClass> {
  toRefs: IVueToRefsFn<T>
}

export type IVueToRefsFn<T> = (props?: (keyof T)[]) => IVueToRefsReturn<T>;

export type IVueToRefsReturn<T = any> = {
  [K in keyof T]: T[K] extends Function ? T[K] : ToRef<T[K]>;
};

export type AnyClass = abstract new (...args: any[]) => any;

export type Getters = Map<string, PropertyDescriptor>;

export type Computeds = Record<string, ComputedRef>;

export type InferredArgs<T> = T extends { new(...args: infer P): any } ? P : never[];

export type UnRef<T extends (...args: any[]) => any> = UnwrapNestedRefs<ReturnType<T>>;

/**
 * Store all getters for each class prototype processed by
 * @see {getAllClassGetters}
 */
export const gettersMap = new Map()

/**
 * Get getters of a class prototype chain as a Map.
 *
 * @param proto
 * @return {Getters}
 */
export function getAllClassGetters(className: AnyClass): Getters {
  let prototype = className.prototype;

  /* Retrieve getters from cache */
  if (gettersMap.has(className)) {
    return gettersMap.get(className)
  }

  const getters: Getters = new Map()

  while (prototype.constructor !== Object) {
    Object.entries(Object.getOwnPropertyDescriptors(prototype))
      .forEach((p) => {
        if (!getters.has(p[0]) && typeof p[1].get === 'function') {
          getters.set(p[0], p[1]);
        }
      });
    prototype = Object.getPrototypeOf(prototype);
  }

  /** Save getters in the getters map. */
  gettersMap.set(className, getters);

  return getters;
}

/**
 * Infinite Vue (ivue) class reactive initializer.
 * Converts class instance to a reactive object,
 * where getters are converted to computeds.
 * 
 * You can turn off computed behaviour by adding static 
 * ivue object and setting the getter props to false.
 * class ClassName {
 *    static ivue = {
 *      getter: false
 *    }
 *    // Will be a standard JS non-computed getter
 *    get getter () { return 'hello world'; }
 * }
 * 
 * @param className Any Class
 * @param args Class constructor arguments that you would pass to a `new AnyClass(args...)`
 * @returns {IVue<T>}
 */
export function init<T extends AnyClass>(className: T, ...args: InferredArgs<T>): IVue<T> {

  let
    currentScope: EffectScope | undefined | null = getCurrentScope(),
    activeScope: EffectScope | null = effectScope(!!currentScope),
    getters: Getters | null = getAllClassGetters(className),
    computeds: Computeds | any = getters?.size ? {} : null;

  // @ts-expect-error Abstract class initialization
  let vue = reactive(new className(...args));

  /** Setup getters as computeds. */
  for (const [prop, descriptor] of getters) {
    /* If prop exists on static getter className.ivue[prop]
     * We do not convert it to computed. Because sometimes 
     * we want a normal getter. */
    if ((className as any)?.ivue?.[prop] !== undefined) continue;
    /** Convert getter to computed. */
    Object.defineProperty(vue, prop, {
      get() {
        return prop in computeds
          /** Get the existing computed, because we are in reactive scope, .value will auto unwrap itself. */
          ? computeds[prop]
          /** Create the computed and return it, because we are in reactive scope, .value will auto unwrap itself. */
          : computeds[prop] = activeScope?.run(() => computed(descriptor.get?.bind(vue) as any))
      },
      set: descriptor.set?.bind(vue),
      enumerable: false
    });
  }

  Object.defineProperty(vue, 'toRefs', {
    get: () => ivueToRefs(vue, getters as Getters, computeds, activeScope as EffectScope),
    enumerable: false
  });

  /** Run ivue .init() initializer method, if it exists in the class. */
  if ('init' in vue) activeScope.run(() => vue.init());

  /** Advanced Garabage Collection and Disposal Mechanism. */
  currentScope ? onScopeDispose(() => {
    activeScope?.stop();

    let prop;
    for (prop in vue) delete vue[prop];
    for (prop in computeds) delete computeds[prop];

    currentScope = activeScope = getters = computeds = vue = prop = null;
  }) : null;

  return vue;
}

/**
 * Store all props for each class prototype processed by:
 * @see {getAllClassProperties}
 */
export const propsMap = new Map();

/**
 * Similar to Object.getOwnPropertyNames(obj) but including 
 * the properties of the entire prototype chain.
 */
export function getAllClassProperties(obj: object): Set<string> {

  /* Retrieve props from cache */
  if (propsMap.has(obj.constructor)) {
    return propsMap.get(obj.constructor)
  }

  const allProps: Set<string> = new Set();
  do {
    Object.getOwnPropertyNames(obj)
      /* 'caller', 'callee', 'arguments', 'constructor' are 
       * special object properties, so should be skipped. */
      .filter(prop => !['caller', 'callee', 'arguments', 'constructor'].includes(prop))
      .forEach(prop => allProps.add(prop));
    obj = Object.getPrototypeOf(obj);
  } while (obj.constructor !== Object);

  /** Save getters in the getters map. */
  propsMap.set(obj.constructor, allProps);

  return allProps;
}

/**
 * Convert reactive ivue class to Vue 3 refs.
 * 
 * @param vue @see IVue
 * @param getters @see Getters
 * @param computeds @see Computeds
 * @param activeScope @see EffectScope
 * @returns {IVueToRefs<T>['toRefs']}
 */
export function ivueToRefs<T extends AnyClass>(vue: IVue<T>, getters: Getters, computeds: Computeds, activeScope: EffectScope): IVueToRefs<T>['toRefs'] {

  return function (props?: (keyof InstanceType<T>)[]): IVueToRefsReturn<InstanceType<T>> {
    /** Resulting refs store. */
    const result: Record<string | number | symbol, any> = {}

    /** Output specific props only, if props are specified. */
    if (Array.isArray(props) && props.length) {

      for (let i = 0; i < props.length; i++) {

        const prop = props[i] as any;
        /** Handle getters. */
        if (getters.has(prop)) {
          if (prop in computeds) {
            /** Store whole vue computed with .value */
            result[prop] = computeds[prop];
          } else {
            /** Initialize & store vue computed. */
            activeScope.run(() => result[prop] = computeds[prop] = computed(getters.get(prop)?.get?.bind(vue) as any));
          }
        } else {
          /** Handle methods. */
          if (typeof vue[prop] === 'function') {
            /** Bind method to vue, makes method destructuring point to right instance. */
            result[prop] = vue[prop].bind(vue);
          } else {
            /** Convert simple reactive prop to a Ref. */
            result[prop] = toRef(vue, prop);
          }
        }
      }
    } else {
      /** Convert all props to refs and leave functions as is. */
      const allProps = getAllClassProperties(vue);

      /** Remove constructor and ivue specific props. */
      allProps.delete('constructor');
      allProps.delete('toRefs');
      allProps.delete('init');

      /** Convert getters (non enumerable by default in JS). */
      getters.forEach((getter, prop) => {
        if (prop in computeds) {
          /** Store whole vue computed with .value */
          result[prop] = computeds[prop];
        } else {
          /** Initialize vue computed ref & store it in result. */
          result[prop] = activeScope.run(() => computeds[prop] = computed(getter.get?.bind(vue) as any));
        }
        /** Delete getters from props as they were already processed. */
        allProps.delete(prop as string);
      });

      allProps.forEach(prop => {
        if (typeof vue[prop] === 'function') {
          /** Bind method to vue, makes method destructuring point to right instance. */
          result[prop] = vue[prop].bind(vue);
        } else {
          /** Convert simple reactive prop to a Ref. */
          result[prop] = toRef(vue, prop);
        }
      });
    }

    return result as IVueToRefsReturn<InstanceType<T>>;
  }
}