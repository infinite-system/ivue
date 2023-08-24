import { reactive, markRaw, effectScope, type EffectScope } from 'vue'

import type { MappingScope, MappingType, IVue, AnyClass, InferredArgs, Intercept, Null } from './types/core';

import { ivueTransform } from './ivue';

import { getPrototypeGetters } from './utils/getters'

import { runConstructorIntercept, intercepts, behaviorMethodHandler, IVUE } from './behavior'

import { safeClassName } from './utils/safe-class-name';

import { tryOnScopeDispose } from '@vueuse/core';

/**
 * Kernel Mapping
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
   * EffectScope for ivue type
   */
  effectScope: Null<EffectScope> = null
  /**
   * Mapping initializer method.
   */
  onInit = onInit
}

const __Kernel__ = ($ = Kernel.prototype) => ([
  // Binding methods
  $.bind,
  $.to,
  $.singleton,
  $.transient,
  $.type,
  $.onInit,
  $.ivue,

  // Getters and initializers:
  $.get,  // Any singleton
  $.make, // Any transient

  $.use,  // ivue singleton
  $.init, // ivue transient
])

/**
 * Kernel - ivue IOC Container.
 *
 * [IOC] Inversion of Control
 */
export class Kernel {

  /**
   * Transiet mappings storage.
   */
  private transients = new Map()

  /**
   * Singleton mappings storage.
   */
  private singletons = new Map()

  /**
   * Singleton instances storage.
   */
  private instances = new Map()

  /**
   * Subscribers
   */
  subscribers: Map<AnyClass, number> = new Map()

  /**
   * Vue EffectScopes for garbage collection.
   */
  effectScopes: Map<AnyClass, EffectScope> = new Map()

  /**
   * Current mapping being set.
   */
  private current!: Mapping

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
    this.current.onInit = ivueOnInit
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

    // Instance exists? return it
    if (this.instances.has(className)) return this.instances.get(className)

    // Find mapping
    let mapping = this.singletons.get(className)

    if (!mapping) {
      // Automatically bind a singleton
      this.bind(className).singleton()
      // Get the new transient mapping
      mapping = this.singletons.get(className)
    }

    // Create instance
    const instance = mapping.onInit(mapping, ...args)

    // Save instance
    this.instances.set(className, instance)

    return instance
  }

  /**
   * Make a transient instance based on container definition.
   *
   * @param className
   * @param args
   */
  make<T extends AnyClass> (className: T, ...args: InferredArgs<T>): InstanceType<T> {

    let mapping = this.transients.get(className)

    if (!mapping) {
      // Automatically bind a transient
      this.bind(className).transient()
      // Get the new transient mapping
      mapping = this.transients.get(className)
    }
    // Create instance
    return mapping.onInit(mapping, ...args)
  }

  /**
   * ivue reactive singleton returned from the Kernel container,
   * or a self-bound singleton that is created on the fly.
   *
   * @param className
   * @param args
   */
  use<T extends AnyClass> (className: T, ...args: InferredArgs<T>): IVue<T> {

    let instance, mapping: Mapping, scope: Null<EffectScope>

    const dispose = () => {

      const subscribersLowered = (this.subscribers.get(className) || 0) - 1
      this.subscribers.set(className, subscribersLowered)

      if (this.effectScopes.has(className) && subscribersLowered <= 0) {
        this.effectScopes.get(className)?.stop()
        instance = scope = null
        if (mapping) mapping.effectScope = null

        this.effectScopes.delete(className)
        this.instances.delete(className)
      }
    }


    this.subscribers.set(className, (this.subscribers.get(className) || 0) + 1)

    // Instance exists? return it
    if (!this.instances.has(className)) {

      // Find mapping
      mapping = this.singletons.get(className)

      if (!mapping) {
        // Automatically bind a singleton and convert to ivue reactive
        this.bind(className).singleton().ivue()
        // Get the new singleton mapping
        mapping = this.singletons.get(className)

      } else if (mapping.type !== 'ivue') {
        throw new Error(
          "ivue.kernel: use(" + safeClassName(className) + ") method "
          + "should be used only with 'ivue' type singleton mappings, "
          + "use get(" + safeClassName(className) + ") method for "
          + "standard JavaScript singleton Kernel mappings."
        )
      }

      scope = mapping.effectScope = effectScope(true)

      this.effectScopes.set(className, scope)

      // Create instance
      instance = scope.run(() => mapping.onInit(mapping, ...args))

      // Save instance
      this.instances.set(className, instance)

      tryOnScopeDispose(dispose)

      return instance

    } else {

      tryOnScopeDispose(dispose)

      return this.instances.get(className)
    }

  }

  /**
   * Initialize ivue reactive singleton returned from the Kernel container,
   * or a self-bound transient that is created on the fly.
   */
  init<T extends AnyClass> (className: T, ...args: InferredArgs<T>): IVue<T> {

    // Find mapping
    let mapping = this.transients.get(className)

    if (!mapping) {
      // Automatically bind a transient and convert to ivue reactive
      this.bind(className).transient().ivue()
      // Get the new transient mapping
      mapping = this.transients.get(className)

    } else if (mapping.type !== 'ivue') {
      throw new Error(
        "ivue.kernel: init(" + safeClassName(className) + ") method "
        + "should be used only with 'ivue' type transient mappings, "
        + "use make(" + safeClassName(className) + ") method for "
        + "standard JavaScript transient Kernel mappings."
      )
    }

    let scope: Null<EffectScope> = mapping.effectScope = effectScope(true)

    let vue = scope.run(() => mapping.onInit(mapping, ...args))

    tryOnScopeDispose(() => {
      scope?.stop()
      scope = vue = mapping.effectScope = null
    })

    return vue

  }
}

__Kernel__()

/**
 * Any class initializer callback for Kernel Mapping.
 * 
 * @param mapping @see Mapping
 * @param args 
 * @returns 
 */
export function onInit<T extends AnyClass> (mapping: Mapping, ...args: InferredArgs<T>): any {

  // Before constructor intercepts
  if (intercepts.before.has(mapping.to)) {
    const intercept = { mapping: mapping, self: null, return: null, args } as Intercept
    if (true === runConstructorIntercept('before', mapping.to, intercept))
      return intercept.return
  }

  // @ts-ignore
  const obj = new mapping.to(...args)

  // IVUE handling
  const getters = getPrototypeGetters(mapping.to.prototype)
  if (typeof obj.constructor.behavior === 'object') {
    for (const prop in obj.constructor.behavior) {
      if (prop in getters.values) continue // skip getters to not cause a computation
      if (typeof obj[prop] === 'function') {
        if (obj.constructor.behavior[prop] === IVUE.OFF) continue // skip OFF
        const func = obj[prop] // This re-assignment is important to copy the function
        behaviorMethodHandler(mapping, obj.constructor.behavior[prop], func, obj, prop)
      }
    }
  }

  // After constructor intercepts
  if (intercepts.after.has(mapping.to)) {
    const intercept = { mapping: mapping, return: obj, self: obj, args } as Intercept
    if (true === runConstructorIntercept('after', mapping.to, intercept))
      return intercept.return
  }

  return obj
}

/**
 * ivue class initializer callback for Kernel Mapping.
 *
 * @param mapping @see Mapping
 * @param args
 */
export function ivueOnInit<T extends AnyClass> (mapping: Mapping, ...args: InferredArgs<T>): any {

  if (intercepts.before.has(mapping.to)) {
    const intercept = { mapping: mapping, self: null, return: null, name: mapping.to.constructor.name, args }
    if (true === runConstructorIntercept('before', mapping.to, intercept))
      return intercept.return
  }

  const getters = getPrototypeGetters(mapping.to.prototype)
  const vue = mapping.effectScope?.run(() => ivueTransform(reactive(Reflect.construct(mapping.to, args)), getters, mapping.effectScope as EffectScope, ...args))

  // Behavior hanlding
  if (typeof vue.constructor.behavior === 'object') {
    for (const prop in vue.constructor.behavior) {
      if (prop in getters.values) continue // skip getters to not cause a computation
      if (typeof vue[prop] === 'function') {
        if (vue.constructor.behavior[prop] === IVUE.OFF) continue // skip OFF
        const func = vue[prop] // This re-assignment is important to copy the function
        behaviorMethodHandler(mapping, vue.constructor.behavior[prop], func, vue, prop)
      } else {
        if (vue.constructor.behavior[prop] === IVUE.OFF && vue?.[prop] && typeof vue[prop] === 'object') {
          vue[prop] = markRaw(vue[prop])
        }
      }
    }
  }

  // After constructor intercepts
  if (intercepts.after.has(mapping.to)) {
    const intercept = { mapping: mapping, self: vue, name: mapping.to.constructor.name, return: vue, args }
    if (true === runConstructorIntercept('after', mapping.to, intercept))
      return intercept.return
  }

  // .init() exists? Run it, reactive references can already be used inside .init()
  if (typeof vue.init === 'function') mapping.effectScope?.run(async () => await vue.init())

  return vue
}

/**
 * Activation method to use with Inversify IOC library.
 *
 * @param ctx
 * @param obj
 * @param args
 */
export function ivueInversify (ctx: any, obj: any, ...args: any) {

  let scope: Null<EffectScope> = effectScope(true)

  let vue = ivueTransform(reactive(Object.create(obj)), getPrototypeGetters(Reflect.getPrototypeOf(obj)), scope, ...args)

  if (typeof vue.init === 'function') scope.run(async () => await vue.init())

  tryOnScopeDispose(() => {
    scope?.stop()
    scope = vue = null
  })

  return vue
}

/**
 * Kernel Shortcuts
 */

// Kernel instance & .bind method 
export const kernel = new Kernel()
export const bind = kernel.bind.bind(kernel)

// Kernel container getters for plain JS classes
export const get = kernel.get.bind(kernel)   // for singletons
export const make = kernel.make.bind(kernel) // for transients

// Kernel container getters for reactive ivue JS classes
export const use = kernel.use.bind(kernel)
export const init = kernel.init.bind(kernel)
