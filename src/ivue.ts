import { computed, reactive, toRef, effectScope, type EffectScope, getCurrentScope, onScopeDispose } from 'vue';
import type { ToRefs } from 'vue';

import type { Null, IVue, IVueToRefsObj, AnyClass, InferredArgs, Getters, Computeds } from "./types/core";

import { IVUE } from "./behavior";

import { getPrototypeGetters, getInstanceGetters } from './utils/getters'

/**
 * Create ivue instance from class constructor.
 * 
 * @param className 
 * @param args 
 * @returns @see IVue<T>
 */
export function ivue<T extends AnyClass> (className: T, ...args: InferredArgs<T>): IVue<T> {
  /**
   * Define context variables.
   */
  let current: any = getCurrentScope(),
    scope: EffectScope = effectScope(!!current),
    getters = getPrototypeGetters(className.prototype),
    computeds: any = getters.size ? {} : null
  /**
   * Initialize ivue reactive.
   * 
   * This function is the same inside init(), ivue(), iobj() and ivueTransform() functions.
   * It is copied over for performance reasons.
   * 
   * The key idea is to keep this function as simple as possible.
   */
  // @ts-ignore
  let vue = new Proxy(reactive(new className(...args)), {
    get (target, prop): any {
      /**
       * Is the prop a getter?
       */
      if (
        getters.has(prop) // Prop is a getter
        && vue?.constructor?.behavior?.[prop] !== IVUE.OFF // Prop is not disabled
        && computeds
      ) {
        /**
         * Convert getters to computeds lazily.
         */
        if (prop in computeds) {
          /**
           * Computed defined? Return .value of the computed.
           */
          return computeds[prop].value
        } else {
          /*
           * Computed not defined? Define and run `.get` method inside computed while `.bind(vue)`.
           */
          scope?.run(() => computeds[prop] = computed(() => getters.get(prop).get!.bind(vue)()))
          /**
           * Return .value
           */
          return computeds[prop].value
        }
      }
      /**
       * toRefs() implementation.
       */
      if (prop === 'toRefs') {
        return ivueToRefs(vue, getters, computeds, scope)
      }
      /**
       * Return the default reactive vue prop.
       */
      return target?.[prop]
    }
  })
  /**
   * Functional way to perform the same as above, but less performant:
   * vue = ivueTransform(reactive(new className(...args)), getters, computeds, scope, ...args)
   */
  /**
   * Does vue.init() exist? Run it, reactive references can already be used inside .init()
   */
  if ('init' in vue) scope.run(() => vue.init())
  /**
   * Advanced garabage collection and disposal mechanism.
   */
  current ? onScopeDispose(() => {
    scope?.stop()
    let prop
    for (prop in vue) delete vue[prop]
    for (prop in computeds) delete computeds[prop]
    current = (scope as any) = getters = computeds = vue = prop = null
  }) : null
  /**
   * Return ivue instance.
   */
  return vue
}
/**
 * Create ivue instance from an object.
 * 
 * @param obj 
 * @returns 
 */
export function iobj<T extends object> (obj: T): T & IVueToRefsObj<T> {
  /**
   * Define context variables.
   */
  let current: Null<EffectScope | undefined> = getCurrentScope(),
    scope: Null<EffectScope> = effectScope(!!current),
    getters: Getters | null = getInstanceGetters(obj),
    computeds: Computeds | any = getters.size ? {} : null,
    vue = ivueTransform(reactive(obj), getters, computeds, scope)
  /**
   * Does vue.init() exist? Run it, reactive references can already be used inside .init()
   */
  if ('init' in vue) scope.run(() => vue.init())
  /**
   * Advanced garabage collection and disposal mechanism.
   */
  current ? onScopeDispose(() => {
    scope?.stop()
    let prop
    for (prop in vue) delete vue[prop]
    for (prop in computeds) delete computeds[prop]
    current = scope = getters = computeds = (obj as any) = vue = prop = null
  }) : null
  /**
   * Return ivue instance.
   */
  return vue
}
/**
 * Pure VueJS Reactive Observable Class-based Architecture System.
 *
 * @param vue
 * @param getters
 * @param args Arguments are available when used via ivue(obj, ...args)
 */
export function ivueTransform<T extends AnyClass>(vue: any, getters: Getters, computeds: Computeds, scope: EffectScope): IVue<T> {
  /**
   * Initialize ivue reactive.
   * 
   * This function is the same inside init(), ivue(), iobj() and ivueTransform() functions.
   * It is copied over for performance reasons.
   * 
   * The key idea is to keep this function as simple as possible.
   */
  return new Proxy(vue, {
    get (target, prop) {
      /**
       * Is the prop a getter?
       */
      if (
        getters.has(prop) // Prop is a getter
        && vue?.constructor?.behavior?.[prop] !== IVUE.OFF // Prop is not disabled
        && computeds
      ) {
        /**
         * Convert getters to computeds lazily.
         */
        if (prop in computeds) {
          /**
           * Computed defined? Return .value of the computed.
           */
          return computeds[prop].value
        } else {
          /*
           * Computed not defined? Define and run `.get` method inside computed while `.bind(vue)`.
           */
          scope?.run(() => computeds[prop] = computed(() => getters.get(prop)?.get!.bind(vue)()))
          /**
           * Return .value
           */
          return computeds[prop].value
        }
      }
      /**
       * toRefs() implementation.
       */
      if (prop === 'toRefs') {
        return ivueToRefs(vue, getters, computeds, scope)
      }
      /**
       * Return the default reactive vue prop.
       */
      return target?.[prop]
    }
  })
}
/**
 * Convert reactive to refs.
 * 
 * @param vue @see IVue
 * @param getters @see Getters
 * @param computeds @see Computeds
 * @param scope @see EffectScope
 * @returns 
 */
export function ivueToRefs<T extends AnyClass> (vue: IVue<T>, getters: Getters, computeds: Computeds, scope: EffectScope) {

  return function (props?: (keyof InstanceType<T>)[]): ToRefs<InstanceType<T>> {
    /**
     * Resulting refs store.
     */
    const result: Record<string | number | symbol, any> = {}
    /**
     * Output specific props only, if props are specified.
     */
    if (Array.isArray(props) && props.length) {
      for (let i = 0; i < props.length; i++) {
        const prop = props[i]
        /**
         * Handle getters.
         */
        if (getters.has(prop)) {
          if (prop in computeds) {
            /**
             * Store whole vue computed with .value
             */
            result[prop] = computeds[prop]
          } else {
            /**
             * Initialize & store vue computed.
             */
            scope.run(() => result[prop] = computeds[prop] = computed(() => getters.get(prop)?.get!.bind(vue)()))
          }
        } else {
          if (typeof vue[prop] === 'function') {
            /**
             * Bind method to vue, makes method destructuring point to right instance.
             */
            result[prop] = vue[prop].bind(vue)
          } else {
            /**
             * Convert simple reactive prop to a Ref.
             */
            result[prop] = toRef(vue, prop)
          }
        }
      }
    } else {
      /**
       * Convert simple enumerable props.
       */
      for (const prop in vue) {
        /**
         * Skip a getter, it might be a computed, accessing it will cause a computation.
         */
        if (getters.has(prop)) continue;

        if (typeof vue[prop] === 'function') {
          /**
           * Bind method to vue, makes method destructuring point to right instance.
           */
          result[prop] = vue[prop].bind(vue)
        } else {
          /**
           * Convert simple reactive prop to a Ref.
           */
          result[prop] = toRef(vue, prop)
        }
      }
      /**
       * Convert getters (non enumerable by default in JS).
       */
      getters.forEach((getter, prop) => {
        if (prop in computeds) {
          /**
           * Store whole vue computed with .value
           */
          result[prop] = computeds[prop]
        } else {
          /**
           * Initialize vue computed.
           */
          scope.run(() => result[prop] = computeds[prop] = computed(() => getter.get!.bind(vue)()))
        }
      })
    }
    /**
     * Return a Proxy to correctly forward the method calls to the vue object.
     */
    return new Proxy(vue, {
      get: (target, key): any => {
        if (key in result) {
          /**
           * Return a Ref.
           */
          return result[key]
        } else if (key in target) {
          /**
           * Return a bound to vue method property, makes destructuring point to right instance.
           */
          return target[key].bind(vue)
        }
      }
    })
  }
}