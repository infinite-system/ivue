import { reactive, markRaw, effectScope, type EffectScope, getCurrentScope, computed, getCurrentInstance, onScopeDispose } from 'vue';

import type { MappingScope, MappingType, IVue, AnyClass, InferredArgs, Intercept, Null, Getters, Computeds } from './types/core';

import { ivueToRefs, ivueTransform } from './ivue';

import { getPrototypeGetters } from './utils/getters'

import { interceptConstructor, intercepts, changeMethodBehavior, IVUE } from './behavior'

import { safeClassName } from './utils/safe-class-name';

import { tryOnScopeDispose } from '@vueuse/core';

import { disposeGarbage } from './utils/dispose-garbage';

import { config } from './config';

import { isObject } from './utils/is';

/**
 * Kernel Mapping.
 */
export class Mapping {
  /**
   * Construct mapping, by default set 'to' 
   * to equal 'from' binding, to 
   * support auto-binding.
   * 
   * @param from mapping pointer
   */
  constructor (public from: any) {
    this.to = from
  }
  /**
   * Resolves mapping to this value.
   */
  to: any
  /**
   * Scope: singleton | transient
   */
  scope: MappingScope = 'singleton'
  /**
   * Mapping type: generic | ivue | ...
   */
  type: MappingType = 'generic'
  /**
   * Mapping initializer method.
   */
  onInit = onInit
}
/**
 * Kernel developer API.
 * 
 * @param $ @see Kernel
 * @returns API
 */
const __Kernel__ = ($ = Kernel.prototype) => ([
  /**
   * Binding methods.
   */
  $.bind,
  $.to,
  $.singleton,
  $.transient,
  $.type,
  $.onInit,
  $.ivue,
  /**
   * Getters and initializers:
   */
  /**
   * Standard JavaScript.
   */
  $.get,  // Any singleton
  $.make, // Any transient
  /**
   * ivue reactive JavaScript.
   */
  $.use,  // ivue singleton
  $.init, // ivue transient
])
/**
 * Kernel - ivue IOC Container.
 *
 * [IOC] Inversion of Control.
 * Enables memory and object instance state management.
 * 
 * Allows creation and storage of singletons and trasients.
 * Allows for interceptable class architecture.
 * 
 * Converts clases to ivue reactive instances automatically.
 * 
 * Smart garbage disposal mechanism allows to keep 
 * the App memory low making it more effiecient.
 */
export class Kernel {
  /**
   * Transiet mappings storage.
   */
  transients = new WeakMap()
  /**
   * Singleton mappings storage.
   */
  singletons = new WeakMap()
  /**
   * Singleton instances storage.
   */
  instances = new WeakMap()
  /**
   * Subscribers
   */
  subscribers: WeakMap<AnyClass, number> = new WeakMap()
  /**
   * Vue EffectScopes for garbage collection.
   */
  effectScopes: WeakMap<AnyClass, EffectScope> = new WeakMap()
  /**
   * Current mapping being set.
   */
  current!: Mapping
  /**
   * Set mapping to bind from this value.
   * 
   * @param from mapping pointer
   * @returns this
   */
  bind (from: any) {
    this.current = new Mapping(from)
    return this
  }
  /**
   * Set mapping to resolve the binding to the value of to param.
   * 
   * @param to resolve mapping to this value
   * @returns this
   */
  to (to: any) {
    this.current.to = to
    return this
  }
  /**
   * Set binding to singleton scope.
   * 
   * @returns this
   */
  singleton () {
    this.current.scope = 'singleton'
    // @ts-ignore
    this[this.current.scope + 's'].set(this.current.from, this.current)
    return this
  }
  /**
   * Set binding to transient scope.
   * 
   * @returns this
   */
  transient () {
    this.current.scope = 'transient'
    // @ts-ignore
    this[this.current.scope + 's'].set(this.current.from, this.current)
    return this
  }
  /**
   * Set mapping type.
   * 
   * @param value type of mapping
   * @returns this
   */
  type (value: any) {
    this.current.type = value
    return this
  }
  /**
   * Set preset ivue initializer callback.
   * 
   * @returns this
   */
  ivue () {
    this.current.type = 'ivue'
    this.current.onInit = () => {}
    return this
  }
  /**
   * Set mapping initializer callback method.
   * 
   * @param callback Initializer callback method
   * @returns this
   */
  onInit (callback: any) {
    this.current.onInit = callback
    return this
  }
  /**
   * Get a singleton instance declared in the container.
   *
   * @param className
   * @param args
   */
  get<T extends AnyClass> (className: T, ...args: InferredArgs<T>): InstanceType<T> {
    /**
     * Instance exists? return it.
     */
    if (this.instances.has(className)) return this.instances.get(className)
    /**
     * Find mapping.
     */
    let mapping = this.singletons.get(className)
    /**
     * Mapping doesn't exist?
     */
    if (!mapping) {
      /**
       * Automatically bind to itself as singleton.
       */
      this.bind(className).singleton()
      /**
       * Get the new mapping.
       */
      mapping = this.singletons.get(className)
    }
    /**
     * Create & save instance.
     */
    const instance = mapping.onInit(mapping, ...args)
    this.instances.set(className, instance)
    /**
     * Return.
     */
    return instance
  }
  /**
   * Make a transient instance based on container definition.
   *
   * @param className
   * @param args
   */
  make<T extends AnyClass> (className: T, ...args: InferredArgs<T>): InstanceType<T> {
    /**
     * Find mapping.
     */
    let mapping = this.transients.get(className)
    /**
     * Mapping doesn't exist?
     */
    if (!mapping) {
      // Automatically bind a transient
      this.bind(className).transient()
      // Get the new transient mapping
      mapping = this.transients.get(className)
    }
    /**
     * Create instance.
     */
    return mapping.onInit(mapping, ...args)
  }
  /**
   * Initialize ivue singleton instance.
   * 
   * @param className Class constructor
   * @param args Class constructor arguments
   * @returns @see IVue
   */
  use<T extends AnyClass> (className: T, ...args: InferredArgs<T>): IVue<T> {
    /**
     * Define context variables.
     */
    let current: Null<EffectScope | undefined> = getCurrentScope(),
      scope: Null<EffectScope>,
      mapping: Mapping | any,
      vue: IVue<T> | any,
      getters: Getters | any,
      computeds: Computeds | any,
      intercept: Intercept | any,
      fns: any
      console.log('className', className.name)
    /**
     * Advanced garabage collection and disposal mechanism.
     */
    const dispose = () => {
      /**
       * Remove subscriber.
       */
      const subscribers = (this.subscribers.get(className) || 0) - 1
      /**
       * Save subscriber count.
       */
      this.subscribers.set(className, subscribers)
      /**
       * If subscribers count reached 0 or below, run garbage disposal.
       */
      if (this.effectScopes.has(className) && subscribers <= 0) {
        /**
         * Stop reactive effects, watchers, computeds, watchEffects in the scope.
         */
        this.effectScopes.get(className)?.stop()
        /**
         * Dispose object props by setting to null.
         */
        let prop
        if (vue) for (prop in vue) delete vue[prop]
        if (computeds) for (prop in computeds) delete computeds[prop]
        if (intercept) for (prop in intercept) delete intercept[prop]
        if (fns) for (prop in fns) delete fns[prop]

        if (vue) disposeGarbage(vue)
        /**
         * Dispose objects to null for gc to be able to collect and dispose.
         */
        current = scope = mapping = vue = computeds = intercept = fns = prop = null
        /**
         * Delete data from WeakMaps.
         */
        this.effectScopes.delete(className)
        this.instances.delete(className)
        this.subscribers.delete(className)
        /**
         * Debug report.
         */
        if (config.debug) console.log('ivue.kernel: instance deleted:', className.name)
      }
    }
    /**
     * Add subscriber.
     */
    this.subscribers.set(className, (this.subscribers.get(className) || 0) + 1)
    /**
     * Add garbage disposal mechanism.
     */
    current ? onScopeDispose(dispose) : null
    /**
     * Instance exists? Return it.
     */
    if (this.instances.has(className)) {
      return this.instances.get(className)
    } else {
      /**
       * Find singleton mapping.
       */
      mapping = this.singletons.get(className)
      /**
       * Mapping doesn't exist?
       */
      if (!mapping) {
        /**
         * Automatically bind className to itself as singleton with an ivue type.
         */
        this.bind(className).singleton().ivue()
        /**
         * Get the new singleton mapping.
         */
        mapping = this.singletons.get(className)
      } else if (mapping.type !== 'ivue') {
        throw new Error(
          "ivue.kernel: use(" + safeClassName(className) + ") method "
          + "should be used only with 'ivue' mappings, "
          + "use get(" + safeClassName(className) + ") method for "
          + "standard JavaScript singleton Kernel mappings."
        )
      }
      /**
       * Create & save effect scope.
       */
      scope = effectScope(!!current)
      this.effectScopes.set(className, scope)
      /**
       * Run before constructor() intercept functions.
       * 
       * Occurs before the class instance has been constructed,
       * and its constructor() function has been run.
       */
      if (intercepts.before.has(mapping.to)) {
        intercept = { mapping: mapping, self: null, return: null, name: mapping.to.constructor.name, args }
        if (true === interceptConstructor('before', mapping.to, intercept)) {
          this.instances.set(className, intercept.return)
          return intercept.return as IVue<T>
        }
      }
      /**
       * Class getters list and computeds store.
       */
      getters = getPrototypeGetters(mapping.to.prototype)
      computeds = getters.size ? {} : null
      /**
       * Initialize ivue reactive.
       * 
       * This function is the same inside init(), ivue(), 
       * iobj() and ivueTransform() functions.
       * 
       * It is copied over for performance reasons.
       */
      // @ts-ignore
      let vue = new Proxy(reactive(new className(...args)), {
        get (target, prop): any {
          /**
           * Is the prop a getter?
           */
          if (
            getters.has(prop) // Prop is a getter
            && vue.constructor?.behavior?.[prop] !== IVUE.OFF // Prop is not disabled
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
            return ivueToRefs(vue, getters, computeds, scope as EffectScope)
          }
          /**
           * Return the default reactive vue prop.
           */
          return target[prop]
        }
      })
      /**
       * Functional way to perform the same as above, but less performant:
       * vue = ivueTransform(reactive(new mapping.to(...args)), getters, computeds, scope, ...args)
       */
      /**
       * Behavior handling.
       */
      if ('behavior' in vue.constructor) {
        /**
         * Loop through behavior assigned properties
         */
        for (const prop in vue.constructor.behavior) {
          if (getters.has(prop)) continue // Skip getters to not cause a computation
          /**
           * Is prop a function?
           */
          if (typeof vue[prop] === 'function') {
            if (vue.constructor.behavior[prop] === IVUE.OFF) continue // Skip because, it is turned OFF
            /**
             * Create fns (functions) store if it doesn't exist.
             */
            if (!isObject(fns)) fns = {}
            /**
             * This re-assignment is important to copy the function into `fns`.
             */
            fns[prop] = vue[prop]
            /**
             * Change behavior of the method.
             */
            changeMethodBehavior(mapping, vue.constructor.behavior[prop], fns[prop], vue, prop, scope, intercept)
          } else {
            if (
              vue.constructor.behavior[prop] === IVUE.OFF // Prop is turned off
              && vue?.[prop] // Prop is not falsy or null
              && typeof vue[prop] === 'object'  // Prop is an object
            ) {
              /**
               * markRaw() objects that are IVUE.OFF 
               */
              vue[prop] = markRaw(vue[prop])
            }
          }
        }
      }
      /**
       * Run after constructor() intercept functions.
       * 
       * Occurs after the class instance has been constructed,
       * and its constructor() function has been run.
       */
      if (intercepts.after.has(mapping.to)) {
        intercept = { mapping: mapping, self: vue, name: mapping.to.constructor.name, return: vue, args }
        if (true === interceptConstructor('after', mapping.to, intercept)) {
          this.instances.set(className, intercept.return)
          return intercept.return as IVue<T>
        }
      }
      /**
       * Does vue.init() exist? Run it, reactive references can already be used inside .init()
       */
      if ('init' in vue) scope.run(() => vue.init())
      /**
       * Save instance.
       */
      this.instances.set(className, vue)
      /**
       * Debug report.
       */
      if (config.debug) console.log('ivue.kernel: instance created:', className.name, 'current scope', getCurrentScope(), 'current instance', getCurrentInstance())
      /**
       * Return instance.
       */
      return vue as IVue<T>
    }
  }
  /**
   * Initialize ivue transient instance.
   * 
   * @param className Class constructor
   * @param args Class constructor arguments
   * @returns @see IVue
   */
  init<T extends AnyClass> (className: T, ...args: InferredArgs<T>): IVue<T> {
    /**
     * Find mapping.
     */
    let mapping = this.transients.get(className)
    if (!mapping) {
      /**
       * Automatically bind a transient and convert to ivue reactive.
       */
      this.bind(className).transient().ivue()
      /**
       * Get the new transient mapping.
       */
      mapping = this.transients.get(className)
    } else if (mapping.type !== 'ivue') {
      throw new Error(
        "ivue.kernel: init(" + safeClassName(className) + ") method "
        + "should be used only with 'ivue' mappings, "
        + "use make(" + safeClassName(className) + ") method for "
        + "standard JavaScript transient Kernel mappings."
      )
    }
    /**
     * Define context variables.
     */
    let current: Null<EffectScope | undefined> = getCurrentScope(),
      scope: Null<EffectScope> = effectScope(!!current),
      intercept: Intercept | any,
      computeds: Computeds | any,
      fns: any
    /**
     * Run before constructor() intercept functions.
     * 
     * Occurs before the class instance has been constructed,
     * and its constructor() function has been run.
     */
    if (intercepts.before.has(mapping.to)) {
      intercept = { mapping: mapping, self: null, return: null, name: mapping.to.constructor.name, args }
      if (true === interceptConstructor('before', mapping.to, intercept)) {
        return intercept.return as IVue<T> /* return true shortcircuits the return */
      }
    }
    /**
     * Class getters list and computeds store.
     */
    let getters = getPrototypeGetters(mapping.to.prototype)
    computeds = getters.size ? {} : null
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
      get (target, prop) {
        /**
         * Convert getters to computeds lazily.
         */
        if (
          getters.has(prop) // Prop is a getter
          && vue.constructor?.behavior?.[prop] !== IVUE.OFF // Prop is not disabled
        ) {
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
          return ivueToRefs(vue, getters, computeds, scope as EffectScope)
        }
        /**
         * Return default reactive vue prop.
         */
        return target[prop]
      }
    })
    /**
     * Functional way to perform the same as above, but less performant.
     * vue = ivueTransform(reactive(new mapping.to(...args)), getters, computeds, scope, ...args)
     */
    /**
     * Behavior handling
     */
    if ('behavior' in vue.constructor) {
      /**
       * Loop through behavior assigned properties.
       */
      for (const prop in vue.constructor.behavior) {
        if (getters.has(prop)) continue // Skip getters to not cause a computation
        /**
         * Is prop a function?
         */
        if (typeof vue[prop] === 'function') {
          if (vue.constructor.behavior[prop] === IVUE.OFF) continue // Skip because, it is turned OFF
          /**
           * Create fns (functions) store if it doesn't exist
           */
          if (!isObject(fns)) fns = {}
          /**
           * This re-assignment is important to copy the function into `fns`.
           */
          fns[prop] = vue[prop]
          /**
           * Change behavior of the method.
           */
          changeMethodBehavior(mapping, vue.constructor.behavior[prop], fns[prop], vue, prop, scope, intercept)
        } else {
          if (
            vue.constructor.behavior[prop] === IVUE.OFF // Prop is turned off
            && vue?.[prop] // Prop is not falsy or null
            && typeof vue[prop] === 'object'  // Prop is an object
          ) {
            /**
             * markRaw() objects that are IVUE.OFF 
             */
            vue[prop] = markRaw(vue[prop])
          }
        }
      }
    }
    /**
     * Run after constructor() intercept functions.
     * 
     * Occurs after the class instance has been constructed,
     * and its constructor() function has been run.
     */
    if (intercepts.after.has(mapping.to)) {
      // Setup intercept config
      intercept = { mapping: mapping, self: vue, return: vue, name: mapping.to.constructor.name, args }
      if (true === interceptConstructor('after', mapping.to, intercept)) {
        return intercept.return as IVue<T>
      }
    }
    /**
     * Does vue.init() exist? Run it, reactive references can already be used inside .init()
     */
    if ('init' in vue) scope.run(() => vue.init())
    /**
     * Advanced garabage collection and disposal mechanism.
     */
    current ? onScopeDispose(() => {
      scope?.stop();
      let prop
      // Dispose object props of object under the vue reactive proxy
      disposeGarbage(vue)
      // Dispose object props of utility objects properties
      if (intercept) for (prop in intercept) delete intercept[prop]
      if (computeds) for (prop in computeds) delete computeds[prop]
      if (fns) for (prop in fns) delete fns[prop]
      // Dispose all used objects to null
      current = scope = vue = mapping = computeds = intercept = fns = prop = null
    }) : null
    /**
     * Return instance.
     */
    return vue
  }
}
/**
 * Kernel mapping pointer.
 */
__Kernel__
/**
 * Any class initializer callback for Kernel Mapping.
 * 
 * @param mapping @see Mapping
 * @param args 
 * @returns 
 */
export function onInit<T extends AnyClass> (mapping: Mapping, ...args: InferredArgs<T>): any {
  /**
   * Run before constructor() intercept functions.
   * 
   * Occurs after the class instance has been constructed,
   * and its constructor() function has been run.
   */
  if (intercepts.before.has(mapping.to)) {
    const intercept = { mapping: mapping, self: null, return: null, name: mapping.to.constructor.name, args } as Intercept
    if (true === interceptConstructor('before', mapping.to, intercept))
      return intercept.return
  }
  let intercept: Intercept | any,
    fns: any
  /**
   * Create instance.
   */
  // @ts-ignore
  let obj = new mapping.to(...args)
  /**
   * Behavior handling
   */
  const getters = getPrototypeGetters(mapping.to.prototype)
  if ('behavior' in obj.constructor && typeof obj.constructor.behavior === 'object') {
    /**
     * Loop through behavior assigned properties.
     */
    for (const prop in obj.constructor.behavior) {
      if (getters.has(prop)) continue // Skip getters to not cause a computation
      /**
       * Is prop a function?
       */
      if (typeof obj[prop] === 'function') {
        if (obj.constructor.behavior[prop] === IVUE.OFF) continue // Skip OFF
        /**
         * Create fns (functions) store if it doesn't exist.
         */
        if (!isObject(fns)) fns = {}
        /**
         * This re-assignment is important to copy the function
         */
        fns[prop] = obj[prop]
        /**
         * Change behavior of the method.
         */
        changeMethodBehavior(mapping, obj.constructor.behavior[prop], fns[prop], obj, prop, effectScope(!!getCurrentScope()), intercept)
      }
    }
  }
  /**
   * Run after constructor() intercept functions.
   * 
   * Occurs after the class instance has been constructed,
   * and its constructor() function has been run.
   */
  if (intercepts.after.has(mapping.to)) {
    const intercept = { mapping: mapping, self: obj, return: obj, name: mapping.to.constructor.name, args } as Intercept
    if (true === interceptConstructor('after', mapping.to, intercept))
      return intercept.return
  }
  /**
   * Return instance.
   */
  return obj
}
/**
 * Activation method to use with Inversify IOC library.
 *
 * @param ctx
 * @param obj
 * @param args
 */
export function ivueInversify (ctx: any, obj: any, ...args: any) {

  let scope: Null<EffectScope> = effectScope(!!getCurrentScope())

  let getters = getPrototypeGetters(Reflect.getPrototypeOf(obj))

  let computeds: Computeds | any = getters.value ? {} : null

  let vue = ivueTransform(reactive(Object.create(obj)), getters, computeds, scope)

  if (typeof vue.init === 'function') scope.run(() => vue.init())

  tryOnScopeDispose(() => {
    scope?.stop()
    disposeGarbage(vue)
    scope = vue = null
  })

  return vue
}

/**
 * Kernel API exported procedural shortcuts.
 */

/**
 * Kernel instance kernel & .bind method 
 */
export const kernel = new Kernel()
export const bind = kernel.bind.bind(kernel)
/**
 * Kernel container getters for plain JavaScript classes.
 */
export  const get: <T extends AnyClass> (className: T, ...args: InferredArgs<T>) => InstanceType<T> = kernel.get.bind(kernel)
export  const make: <T extends AnyClass> (className: T, ...args: InferredArgs<T>) => InstanceType<T> = kernel.make.bind(kernel)

/**
 * Kernel container getters for ivue reactive JavaScript classes.
 */
export  const use: <T extends AnyClass>(className: T, ...args: InferredArgs<T>) => IVue<T> = kernel.use.bind(kernel);
export  const init: <T extends AnyClass>(className: T, ...args: InferredArgs<T>) => IVue<T> = kernel.init.bind(kernel);