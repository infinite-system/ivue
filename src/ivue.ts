/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ComputedRef,
  ExtractPropTypes,
  ToRef,
  UnwrapNestedRefs,
} from 'vue';
import { computed, reactive, toRef } from 'vue';

/** Types */

export type IVue<T extends AnyClass> = InstanceType<T> & ExtendWithToRefs<T>;

export interface ExtendWithToRefs<T extends AnyClass> {
  toRefs: IVueToRefsFn<T>;
}

export type IVueToRefsFn<T extends AnyClass> = (
  props?: (keyof InstanceType<T>)[]
) => IVueToRefsFnReturn<InstanceType<T>>;

export type IVueToRefsFnReturn<T = any> = {
  [K in keyof T]: T[K] extends Function ? T[K] : ToRef<T[K]>;
};

export type UnwrapComposable<T extends (...args: any[]) => any> =
  UnwrapNestedRefs<ReturnType<T>>;

export type ExtractEmitTypes<T extends Record<string, any>> =
  UnionToIntersection<
    RecordToUnion<{
      [K in keyof T]: (evt: K, ...args: Parameters<T[K]>) => void;
    }>
  >;

export type ExtractPropDefaultTypes<O> = {
  [K in keyof O]: ValueOf<ExtractPropTypes<O>, K>;
};

export type ExtendSlots<T> = PrefixKeys<T, 'before--'> &
  T &
  PrefixKeys<T, 'after--'>;

/** Helper Types. */

export type AnyClass = abstract new (...args: any[]) => any;

export type Descriptors = Map<string, PropertyDescriptor>;

export type Computeds = Record<string, ComputedRef>;

export type InferredArgs<T> = T extends { new (...args: infer P): any }
  ? P
  : never[];

export type PrefixKeys<T, P extends string | undefined = undefined> = {
  [K in Extract<keyof T, string> as P extends string ? `${P}${K}` : K]: T[K];
};

export type IFnParameter<
  T extends Record<any, any>,
  P extends keyof T,
  K extends number
> = FnParameter<ValueOf<T, P>, K>;

export type FnParameter<
  F extends (...args: any[]) => any,
  K extends number
> = Parameters<F>[K];

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type RecordToUnion<T extends Record<string, any>> = T[keyof T];

export type ValueOf<T extends Record<any, any>, K> = T[K];

/** Types End. */

/**
 * Store all descriptors for each class prototype processed by
 * @see {getAllClassDescriptors}
 */
export const descriptorsMap = new Map();

/**
 * Get descriptors of an entire class prototype chain as a Map.
 * Completely emulates JavaScript class inheritance chain for getters and setters.
 *
 * @param className
 * @return {Descriptors}
 */
export function getAllClassDescriptors(className: AnyClass): Descriptors {
  /* Retrieve descriptors from cache */
  if (descriptorsMap.has(className)) {
    return descriptorsMap.get(className);
  }

  const savedDescriptors: Descriptors = new Map();

  let prototype = className.prototype;
  while (prototype.constructor !== Object) {
    Object.entries(Object.getOwnPropertyDescriptors(prototype)).forEach(
      ([propertyName, currentDescriptor]) => {
        const savedDescriptor = savedDescriptors.get(propertyName);
        /** Emulate inheritance chain of getters and setters. */
        if (
          savedDescriptor !== currentDescriptor &&
          (currentDescriptor?.get || currentDescriptor?.set)
        ) {
          /** Overwrite descriptors if they were already set. */
          if (savedDescriptor?.get)
            currentDescriptor.get = savedDescriptor?.get;
          if (savedDescriptor?.set)
            currentDescriptor.set = savedDescriptor?.set;

          /** Store descriptors. */
          savedDescriptors.set(propertyName, currentDescriptor);
        }
      }
    );
    /** Walk up the prototype chain. */
    prototype = Object.getPrototypeOf(prototype);
  }

  /** Save descriptors in the descriptors map for each class. */
  descriptorsMap.set(className, savedDescriptors);

  return savedDescriptors;
}

/**
 * Infinite Vue (ivue) class reactive initializer.
 *
 * Converts class instance to a reactive object,
 * where descriptors are converted to computeds.
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
 * @param className Any Class
 * @param args Class constructor arguments that you would pass to a `new AnyClass(args...)`
 * @returns {IVue<T>}
 */
export default function ivue<T extends AnyClass>(
  className: T,
  ...args: InferredArgs<T>
): IVue<T> {
  const descriptors: Descriptors | null = getAllClassDescriptors(className);
  const computeds: Computeds | any = descriptors?.size ? {} : null;

  // @ts-expect-error Abstract class initialization
  const vue = reactive(new className(...args));

  /** Setup descriptors as computeds. */
  for (const [prop, descriptor] of descriptors) {
    /* If prop exists on static getter className.ivue[prop]
     * We do not convert it to computed. Because sometimes
     * we want a normal getter. */
    if ((className as any)?.ivue?.[prop] === false) continue;
    /** Convert descriptor to computed. */
    Object.defineProperty(vue, prop, {
      get: descriptor.get
        ? () =>
            prop in computeds
              ? /** Get the existing computed, because we are in reactive scope, .value will auto unwrap itself. */
                computeds[prop]
              : /** Create the computed and return it, because we are in reactive scope, .value will auto unwrap itself. */
                (computeds[prop] = computed({
                  get: descriptor.get?.bind(vue) as any,
                  set: descriptor.set?.bind(vue),
                } as any))
        : undefined,
      set: descriptor.set?.bind(vue),
      enumerable: false,
    });
  }

  Object.defineProperty(vue, 'toRefs', {
    get: () => ivueToRefs(vue, descriptors as Descriptors, computeds),
    enumerable: false,
  });

  /** Run ivue .init() initializer method, if it exists in the class. */
  if ('init' in vue) vue.init();

  return vue;
}

/**
 * Store all props for each class prototype processed by:
 * @see {getAllClassProperties}
 */
export const propsMap: Map<object, Set<string> | any> = new Map();

/**
 * Get properties of an entire class prototype chain as a Map.
 */
export function getAllClassProperties(obj: object): Set<string> {
  /* Retrieve props from cache */
  if (propsMap.has(obj.constructor)) {
    return propsMap.get(obj.constructor);
  }

  const originalConstructor = obj.constructor;

  const allProps: Set<string> = new Set();
  do {
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      /* 'caller', 'callee', 'arguments', 'constructor' are
       * special object properties, so should be skipped. */
      if (!['caller', 'callee', 'arguments', 'constructor'].includes(prop)) {
        allProps.add(prop);
      }
    });
    obj = Object.getPrototypeOf(obj);
  } while (obj.constructor !== Object);

  /** Save props in the props map. */
  propsMap.set(originalConstructor, allProps);

  return allProps;
}

/**
 * Convert reactive ivue class to Vue 3 refs.
 *
 * @param vue @see IVue
 * @param descriptors @see Descriptors
 * @param computeds @see Computeds
 * @returns {IVueToRefs<T>['toRefs']}
 */
export function ivueToRefs<T extends AnyClass>(
  vue: IVue<T>,
  descriptors: Descriptors,
  computeds: Computeds
): ExtendWithToRefs<T>['toRefs'] {
  return function (
    props?: (keyof InstanceType<T>)[]
  ): IVueToRefsFnReturn<InstanceType<T>> {
    /** Resulting refs store. */
    const result: Record<string | number | symbol, any> = {};

    /** Output specific props only, if props are specified. */
    if (Array.isArray(props) && props.length) {
      for (let i = 0; i < props.length; i++) {
        const prop = props[i] as any;
        /** Handle descriptors. */
        if (descriptors.has(prop)) {
          if (prop in computeds) {
            /** Return vue computed with .value from computeds store. */
            result[prop] = computeds[prop];
          } else {
            /** Initialize & store vue computed. */
            const descriptor = descriptors.get(prop);
            result[prop] = computeds[prop] = computed({
              get: descriptor?.get?.bind(vue) as any,
              set: descriptor?.set?.bind(vue),
            } as any);
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
      let allProps: null | Set<string> = new Set(getAllClassProperties(vue));

      /** Convert descriptors (non enumerable by default in JS). */
      descriptors.forEach((descriptor, prop) => {
        if (prop in computeds) {
          /** Return vue computed with .value from computeds store. */
          result[prop] = computeds[prop];
        } else {
          /** Initialize vue computed ref & store it in result. */
          result[prop] = computeds[prop] = computed({
            get: descriptor.get?.bind(vue) as any,
            set: descriptor.set?.bind(vue),
          } as any);
        }
        /** Delete descriptor from props as it was already processed. */
        allProps?.delete(prop as string);
      });

      allProps.forEach((prop) => {
        if (typeof vue[prop] === 'function') {
          /** Bind method to vue, makes method destructuring point to right instance. */
          result[prop] = vue[prop].bind(vue);
        } else {
          /** Convert simple reactive prop to a Ref. */
          result[prop] = toRef(vue, prop);
        }
        /** Delete prop from props as it was already processed. */
        allProps?.delete(prop as string);
      });

      /** Memory optimization. */
      allProps = null;
    }

    return result as IVueToRefsFnReturn<InstanceType<T>>;
  };
}
