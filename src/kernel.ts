import { reactive, markRaw } from 'vue'

import type { MappingScope, IVue, AnyClass, ConstructorArgs, Intercept } from './types/core';

import { ivueTransform } from './ivue';

import { getPrototypeGetters } from './utils/getters'

import { runConstructorIntercept, intercepts, behaviorMethodHandler, Behavior } from './behavior'

import { safeClassName } from './utils/safe-class-name';

/**
 * IOC Mapping declaration.
 */
export class Mapping<T extends AnyClass> {

  constructor (public from: T) { this.to = from }

  to: T

  scope: MappingScope = 'singleton'

  type = 'generic'

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
 * ivue Kernel IOC Container.
 */
export class Kernel {

  private transients = new Map()

  private singletons = new Map()

  private instances = new Map()

  private current!: Mapping<ObjectConstructor>

  bind (from: any) {
    this.current = new Mapping(from)
    return this
  }

  to (to: any) {
    this.current.to = to
    return this
  }

  singleton () {
    this.current.scope = 'singleton'
    // @ts-ignore
    this[this.current.scope + 's'].set(this.current.from, this.current)
    return this
  }

  transient () {
    this.current.scope = 'transient'
    // @ts-ignore
    this[this.current.scope + 's'].set(this.current.from, this.current)
    return this
  }

  type (value: any) {
    this.current.type = value
    return this
  }

  ivue () {
    this.current.type = 'ivue'
    this.current.onInit = ivueOnInit
    return this
  }

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
  get<T extends AnyClass> (className: T, ...args: ConstructorArgs<T>): any {

    // Instance exists? return it
    if (this.instances.has(className)) return this.instances.get(className)

    // Find mapping
    let mapping = this.singletons.get(className)
    
    if (!mapping) {
      // Automatically bind a singleton
      this.bind(className).singleton()
      // Get the new transient mapping
      mapping = this.transients.get(className)
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
  make<T extends AnyClass> (className: T, ...args: ConstructorArgs<T>): any {

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
  use<T extends AnyClass> (className: T, ...args: ConstructorArgs<T>): IVue<T> {

    // Instance exists? return it
    if (this.instances.has(className)) return this.instances.get(className)

    // Find mapping
    let mapping = this.singletons.get(className)

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

    // Create instance
    const instance = mapping.onInit(mapping, ...args)

    // Save instance
    this.instances.set(className, instance)

    return instance
  }

  /**
   * Initialize ivue reactive singleton returned from the Kernel container,
   * or a self-bound transient that is created on the fly.
   */
  init<T extends AnyClass> (className: T, ...args: ConstructorArgs<T>): IVue<T> {

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

    return mapping.onInit(mapping, ...args)
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
export function onInit<T extends AnyClass> (mapping: Mapping<T>, ...args: ConstructorArgs<T>): any {

  // Before constructor intercepts
  if (intercepts.before.has(mapping.to)) {
    const intercept = { mapping: mapping, self: null, return: null,  args } as Intercept
    if (true === runConstructorIntercept('before', mapping.to, intercept))
      return intercept.return
  }

  // @ts-ignore
  const obj = new mapping.to(...args)

  const getters = getPrototypeGetters(mapping.to.prototype)
  if (typeof obj.constructor.behavior === 'object') {
    for (const prop in obj.constructor.behavior) {
      if (prop in getters.values) continue // skip getters to not cause a computation
      if (typeof obj[prop] === 'function') {
        if (obj.constructor.behavior[prop] === Behavior.DISABLED) continue // skip DISABLED
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
export function ivueOnInit<T extends AnyClass> (mapping: Mapping<T>, ...args: ConstructorArgs<T>): any {

  if (intercepts.before.has(mapping.to)) {
    const intercept = { mapping: mapping, self: null, return: null, name: mapping.to.constructor.name, args }
    if (true === runConstructorIntercept('before', mapping.to, intercept))
      return intercept.return
  }

  const getters = getPrototypeGetters(mapping.to.prototype)
  const vue = ivueTransform(reactive(Reflect.construct(mapping.to, args)), getters, ...args)

  if (typeof vue.constructor.behavior === 'object') {
    for (const prop in vue.constructor.behavior) {
      if (prop in getters.values) continue // skip getters to not cause a computation
      if (typeof vue[prop] === 'function') {
        if (vue.constructor.behavior[prop] === Behavior.DISABLED) continue // skip DISABLED
        const func = vue[prop] // This re-assignment is important to copy the function
        behaviorMethodHandler(mapping, vue.constructor.behavior[prop], func, vue, prop)
      } else {
        if (vue.constructor.behavior[prop] === Behavior.DISABLED && vue?.[prop] && typeof vue[prop] === 'object') {
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
  if (typeof vue.init === 'function') vue.init()

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
  const vue = ivueTransform(reactive(Object.create(obj)), getPrototypeGetters(Reflect.getPrototypeOf(obj)), ...args)
  if (typeof vue.init === 'function') vue.init()
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
