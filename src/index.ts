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
/** 
 * IVue core reactive instance type with an extended .toRefs() method added.
 */
export type IVue<T extends AnyClass> = InstanceType<T> & ExtendWithToRefs<T>;

/**
 * Extend with .toRefs() method, so that a reactive class can be converted to a composable definition.
 */
export interface ExtendWithToRefs<T extends AnyClass> {
  toRefs: IVueToRefsFn<T>;
}

/**
 * .toRefs() method type definition converts reactive class properties to composable .value properties.
 */
export type IVueToRefsFn<T extends AnyClass> = (
  props?: (keyof InstanceType<T>)[]
) => IVueToRefsFnReturn<InstanceType<T>>;

/**
 * Converts a class properties to a composable .value Refs using ToRef vue type,
 * also knows NOT to convert functions to .value Refs but to leave them as is.
 */
export type IVueToRefsFnReturn<T = any> = {
  [K in keyof T]: T[K] extends Function ? T[K] : ToRef<T[K]>;
};

/**
 * Unwraps the returned Refs of composable method T to a reactive type definition.
 */
export type UnwrapComposable<T extends (...args: any[]) => any> =
  UnwrapNestedRefs<ReturnType<T>>;

/**
 * Extracts object defined emit types by converting them to a plain interface
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
export type ExtractPropDefaultTypes<O> = RequiredProperties<O>;

/**
 * Extend slots interface T with prefixed 'before--' & 'after--' slots to create fully extensible flexible slots.
 */
export type ExtendSlots<T> = PrefixKeys<T, 'before--'> &
  T &
  PrefixKeys<T, 'after--'>;

/** Helper Types. */
export type AnyClass = abstract new (...args: any[]) => any;

/**
 * Descriptors map.
 */
export type Descriptors = Map<string, PropertyDescriptor>;

/**
 * Computeds hash map.
 */
export type Computeds = Record<string, ComputedRef>;

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
 * Get Interface's property's function arguments Parmeters<F> parameter by key K
 */
export type IFnParameter<
  T extends Record<any, any>,
  P extends keyof T,
  K extends number
> = FnParameter<ValueOf<T, P>, K>;

/**
 * Get function arguments Parmeters<F> parameter by key K
 */
export type FnParameter<
  F extends (...args: any[]) => any,
  K extends number
> = Parameters<F>[K];

/**
 * Convert Union Type to Intersection Type.
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Convert Record to Union Type.
 */
export type RecordToUnion<T extends Record<string, any>> = T[keyof T];

/** 
 * Required Properties converts an interface with possible 
 * optionally assigned properties like: { optional?: any; }
 * to a definitevely defined interface.
 */
export type RequiredProperties<O> = {
  [K in keyof O]: ValueOf<ExtractPropTypes<O>, K>;
};

/**
 * Gets object T property by key [K].
 */
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
export function ivue<T extends AnyClass>(
  className: T,
  ...args: InferredArgs<T>
): IVue<T> {
  const descriptors: Descriptors = getAllClassDescriptors(className);
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
 * @returns {ExtendWithToRefs<T>['toRefs']}
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
export function isClass(val: any): boolean {
  if (typeof val !== 'function') return false; // Not a function, so not a class function either

  if (!val.prototype) return false; // Arrow function, so not a class

  // Finally -> distinguish between a normal function and a class function
  if (Object.getOwnPropertyDescriptor(val, 'prototype')?.writable) { // Has writable prototype
    return false; // Normal function
  } else {
    return true; // Class -> Not a function
  }
}

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
export function createPropsWithDefaults<T extends VuePropsObject>(
  defaults: Record<string, any>,
  typedProps: T
): VuePropsWithDefaults<T> {
  for (const prop in typedProps) {
    if (typeof defaults?.[prop] === 'object' && defaults?.[prop] !== null) {
      /** Handle Arrays & Objects -> wrap them with an arrow function. */ 
      typedProps[prop].default = () => defaults?.[prop];
    } else {
      if (isClass(defaults?.[prop])) {
        /** Handle JavaScript Classes -> wrap them with an arrow function */
        typedProps[prop].default = () => defaults?.[prop];
      } else {
        /** Handle JavaScript Function And All primitive properties -> output directly */
        typedProps[prop].default = defaults?.[prop];
      }
    }
  }
  return typedProps as VuePropsWithDefaults<T>;
}
