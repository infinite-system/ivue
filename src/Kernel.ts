import { iVue, type IVue } from './iVue';

/**
 * IOC Mapping declaration.
 */
export class Mapping<T extends abstract new (...args: any) => any> {
  constructor (public from: T) { this.to = from }
  to: T
  scope = 'singleton'
  type = 'generic'
  onActivation: (mapping: Mapping<T>, ...args) => IVue<T | any> & {}
}

/**
 * Kernel Developer Map.
 */
const __Kernel__ = ($ = Kernel.prototype) => ([
  // Bind to Container
  $.bind,
  $.to,
  $.singleton,
  $.transient,
  $.type,
  $.onActivation,
  // Getters:
  $.get,  // Any singleton
  $.make, // Any transient
  $.use,  // iVue singleton
  $.init, // iVue transient
])

/**
 * iVue Kernel IOC Container.
 */
export class Kernel {

  private transients = new Map()

  private singletons = new Map()

  private instances = new Map()

  private active: Mapping<ObjectConstructor>

  private newInstance (mapping, ...args) {
    // Make new instance
    return mapping.onActivation
      ? mapping.onActivation(mapping, ...args)
      : new mapping.to(...args)
  }

  private newOrSavedInstance (className, mapping, ...args) {
    // Instance exists? return it
    if (this.instances.has(className))
      return this.instances.get(className)

    // Instance does not exist? Create it.
    const instance = this.newInstance(mapping, ...args)

    // Save instance.
    this.instances.set(className, instance)

    return instance
  }

  private constructorName (className) {
    let name = ''
    try {
      name = className?.name || String(className)
    } catch (e) {
      name = 'Unknown'
    }
    return name
  }

  bind (from) {
    this.active = new Mapping(from)
    return this
  }

  to (to) {
    this.active.to = to
    return this
  }

  singleton () {
    this.active.scope = 'singleton'
    this[this.active.scope + 's'].set(this.active.from, this.active)
    return this
  }

  transient () {
    this.active.scope = 'transient'
    this[this.active.scope + 's'].set(this.active.from, this.active)
    return this
  }

  type (value) {
    this.active.type = value
    return this
  }

  iVue () {
    this.active.type = 'iVue'
    this.active.onActivation = iVueKernel
    return this
  }

  onActivation (callback) {
    this.active.onActivation = callback
    return this
  }

  /**
   * Get a singleton instance declared in the container.
   *
   * @param className
   * @param args
   */
  get<T extends abstract new (...args: any) => any> (
    className: T,
    ...args: T extends { new (...args: infer P): any } ? P : never[]
  ): any {

    const mapping = this.singletons.get(className)
    if (!mapping) {
      throw new Error("iVue.Kernel: Singleton mapping for '" + this.constructorName(className) + "' not found.")
    }

    return this.newOrSavedInstance(className, mapping, ...args)
  }

  /**
   * Make a transient instance based on container definition.
   *
   * @param className
   * @param args
   */
  make<T extends abstract new (...args: any) => any> (
    className: T,
    ...args: T extends { new (...args: infer P): any } ? P : never[]
  ): any {

    const mapping = this.transients.get(className)
    if (!mapping) {
      throw new Error("iVue.Kernel: Transient mapping for '" + this.constructorName(className) + "' not found.")
    }

    return this.newInstance(mapping, ...args)
  }

  /**
   * iVue reactive singleton returned from the Kernel container,
   * or a self-bound singleton that is created on the fly.
   *
   * @param className
   * @param args
   */
  use<T extends abstract new (...args: any) => any> (
    className: T,
    ...args: T extends { new (...args: infer P): any } ? P : never[]
  ): IVue<T> {

    let mapping = this.singletons.get(className)

    if (!mapping) {
      // Automatically bind a singleton and convert to iVue reactive
      this.bind(className).singleton().iVue()
      // Get the new singleton mapping
      mapping = this.singletons.get(className)

    } else {
      if (mapping.type !== 'iVue') {
        throw new Error("iVue.Kernel: use(" + this.constructorName(className) + ") method should be used only with 'iVue' type singleton mappings, "
          + "use get(" + this.constructorName(className) + ") method for standard JavaScript singleton Kernel mappings.")
      }
    }

    return this.newOrSavedInstance(className, mapping, ...args)
  }

  /**
   * Initialize iVue reactive singleton returned from the Kernel container,
   * or a self-bound transient that is created on the fly.
   */
  init<T extends abstract new (...args: any) => any> (
    className: T,
    ...args: T extends { new (...args: infer P): any } ? P : never[]
  ): IVue<T> {

    let mapping = this.transients.get(className)

    if (!mapping) {
      // Automatically bind a transient and convert to iVue reactive
      this.bind(className).transient().iVue()
      // Get the new transient mapping
      mapping = this.transients.get(className)

    } else {
      if (mapping.type !== 'iVue') {
        throw new Error("iVue.Kernel: init(" + this.constructorName(className) + ") method should be used only with 'iVue' type transient mappings, "
          + "use make(" + this.constructorName(className) + ") method for standard JavaScript transient Kernel mappings.")
      }
    }

    return this.newInstance(mapping, ...args)
  }
}

__Kernel__()

/**
 * iVue Kernel activation callback.
 *
 * @param mapping
 * @param args
 */
export function iVueKernel (mapping, ...args) {
  return iVue(mapping.to, ...args)
}

/**
 * Export the Kernel instance.
 */
export const kernel = new Kernel()

export const get = kernel.get.bind(kernel)
export const make = kernel.make.bind(kernel)

export const use = kernel.use.bind(kernel)
export const init = kernel.init.bind(kernel)

