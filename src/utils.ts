import { markRaw, effectScope } from 'vue'
import { tryOnScopeDispose } from "@vueuse/core";

/**
 * Store all getters for each class prototype processed by getGetters.
 * @see getGetters
 */
const gettersMap = new Map()

/**
 * Get getters of a class instance and the total number of them.
 *
 * @param instance
 * @return { values: { [getter]: true }, length: number }
 */
export function getGetters (instance) {

  let proto = Object.getPrototypeOf(instance)

  if (gettersMap.has(proto)) {
    return gettersMap.get(proto)
  }
  const originalPrototype = proto

  const props: object[] | undefined = []
  while (proto && proto.constructor.name !== 'Object') {
    const protoProps = Object.entries(
      Object.getOwnPropertyDescriptors(proto)
    )
    // eslint-disable-next-line prefer-spread
    props.push.apply(props, protoProps)
    proto = Object.getPrototypeOf(proto.constructor.prototype)
  }

  const getters = { values: {}, length: 0 }

  for (let i = 0; i < props.length; i++) {
    if (props[i][0] !== '__proto__') {
      if (typeof props[i][1].get === 'function') {
        getters.values[props[i][0]] = true
        getters.length++
      }
    }
  }

  // Save getters in the gettersMap
  gettersMap.set(originalPrototype, getters)

  return getters
}

/**
 * Convert object back to Vue reactive.
 *
 * @param obj
 */
export function unraw (obj) {
  delete obj.__v_skip
}

/**
 * Alias for Vues' markRaw()
 * @param obj
 */
export function raw (obj) {
  return markRaw(obj)
}


/**
 * Stores all available intercept methods.
 */
const interceptsMap = {
  before: new Map(),
  after: new Map()
}

/**
 * Add callback to prototype or instance method.
 *
 * @param type
 * @param fn
 * @param callback
 * @param opts
 */
function addCallback (type, fn, callback, opts) {
  if (interceptsMap[type].has(fn)) {
    interceptsMap[type].get(fn)[opts.top ? 'unshift' : 'push'](callback)
  } else {
    interceptsMap[type].set(fn, [callback])
  }
}

type CallbackOptions = {
  top: boolean
}

type CallbackFn = (intercept: { return: any }, ...args:any[]) => void | false

/**
 * Function to run before an interceptable method in iVue.
 *
 * @param fn
 * @param callback
 * @param opts
 */
export function before (fn, callback: CallbackFn, opts: CallbackOptions = { top: false }) {
  addCallback('before', fn, callback, opts)
}

/**
 * Function to run after an interceptable method in iVue.
 *
 * @param fn
 * @param callback
 * @param opts
 */
export function after (fn, callback: CallbackFn, opts: CallbackOptions = { top: false }) {
  addCallback('after', fn, callback, opts)
}

/**
 * Run method intercepts.
 *
 * @param type
 * @param self
 * @param prop
 * @param args
 * @param intercept
 */
export function runIntercept (type, self, prop, args, intercept) {
  // Intercepts runner, processes multiple intercepts assigned to the method.
  const runFn = fn => {
    const fns = interceptsMap[type].get(fn)
    for (let i = 0; i < fns.length; i++) {
      if (fns[i](intercept, self, ...args) === false)
        return false // short circuit, if intercept returns false
    }
  }
  // Run intercepts attached to class prototype method
  if (interceptsMap[type].has(self.constructor.prototype[prop])) {
    if (runFn(self.constructor.prototype[prop]) === false)
      return false
  }
  // Run intercepts attached to an instance method
  if (interceptsMap[type].has(self[prop])) {
    if (runFn(self[prop]) === false)
      return false
  }
  // If there is no short circuit, we should return undefined like a function without a return
  return void (0)
}

/**
 * Behavior definitions:
 *
 *           SCOPED: Allows watch(), computed(), watchEffect() to be auto garbage collected.
 *
 * SCOPED_INTERCEPT: Allows scoping AND before & after method intercepts.
 *
 *        INTERCEPT: Allows before & after method intercepts only,
 *                   watch(), computed(), watchEffect() will NOT be garbage collected.
 *
 *         DISABLED: For objects -> makes them markRaw() non-reactive,
 *                   For getters -> makes them non-computed normal getters.
 */
export enum Behavior {
  SCOPED = 'SCOPED',
  SCOPED_INTERCEPT = 'SCOPED_INTERCEPT',
  INTERCEPT = 'INTERCEPT',
  DISABLED = 'DISABLED'
}

/**
 * Override function depending on behavior type.
 * @see Behavior
 *
 * @param type
 * @param func
 * @param self
 * @param prop
 */
export function overrideFunctionHandler (type, func, self, prop) {
  // Define a default void return
  let result = void (0)
  // Handle basic scoped most often scenario early
  // Usually the init() function
  if (type === Behavior.SCOPED) {
    // Inside scoped you can put watch(), computed(), watchEffect()
    // and it will be auto garbage collected on scope destruction
    return function (...args) {
      const scope = effectScope()
      scope.run(() => {
        result = func.bind(self)(...args)
      })
      tryOnScopeDispose(() => scope.stop())
      return result
    }
  }

  // Handle interceptable methods
  // Define the common intercept processor:
  const processIntercept = (...args) => {

    const intercept = { return: result }
    const before = runIntercept('before', self, prop, args, intercept)

    if (before === false) return intercept.return // short circuit, if intercept returns false

    result = func.bind(self)(...args)

    intercept.return = result
    const after = runIntercept('after', self, prop, args, intercept)
    if (after === false) return intercept.return

    return intercept.return
  }

  switch (type) {
    case Behavior.INTERCEPT:
      // Basic, fast, non-scoped intercepts
      return function (...args) {
        result = processIntercept(...args)
        return result
      }
    case Behavior.SCOPED_INTERCEPT:
      // Inside scoped you can put watch(), computed(), watchEffect()
      // and it will be auto garbage collected on scope destruction
      return function (...args) {
        const scope = effectScope()
        scope.run(() => {
          result = processIntercept(...args)
        })
        tryOnScopeDispose(() => scope.stop())
        return result
      }
  }
}