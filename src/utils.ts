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
 * @param proto
 * @return { values: { [getter]: true }, length: number }
 */
export function getGetters (proto) {

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
 * Alias for Vue markRaw() function.
 *
 * @param obj
 */
export function raw (obj) {
  return markRaw(obj)
}

/**
 * Intercepts store type definition.
 * Map key is a function that maps to an array of callback functions.
 */
type InterceptsMap = {
  before: Map<Function, Function[]>,
  after: Map<Function, Function[]>
}

/**
 * Stores all available intercept methods.
 */
const interceptsMap: InterceptsMap = {
  before: new Map(),
  after: new Map()
}

/**
 * Add intercept to prototype or instance method.
 *
 * @param type
 * @param fn
 * @param callback
 * @param opts
 */
function addIntercept (type, fn, callback, opts) {
  if (interceptsMap[type].has(fn)) {
    interceptsMap[type].get(fn)[opts.top ? 'unshift' : 'push'](callback)
  } else {
    interceptsMap[type].set(fn, [callback])
  }
}

export type InterceptOptions = {
  top: boolean
}

export type InterceptFn = (intercept: { return: any }, self: Object) => void | false

/**
 * Function to run before an interceptable method in iVue.
 *
 * @param fn
 * @param callback
 * @param opts
 */
export function before (fn: Function, callback: InterceptFn, opts: InterceptOptions = { top: false }) {
  addIntercept('before', fn, callback, opts)
}

/**
 * Function to run after an interceptable method in iVue.
 *
 * @param fn
 * @param callback
 * @param opts
 */
export function after (fn: Function, callback: InterceptFn, opts: InterceptOptions = { top: false }) {
  addIntercept('after', fn, callback, opts)
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
      if (false === fns[i](intercept, self, ...args))
        return false // return false, to short circuit the execution chain
    }
  }
  // Run intercepts attached to class prototype method
  if (interceptsMap[type].has(self.constructor.prototype[prop])) {
    if (false === runFn(self.constructor.prototype[prop])) {
      return false // short circuit, if intercept returns false
    }
  }
  // Run intercepts attached to an instance method
  if (interceptsMap[type].has(self[prop])) {
    if (false === runFn(self[prop])) {
      return false // short circuit, if intercept returns false
    }
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
    return Object.defineProperty(self, prop, {
      value: function (...args) {
        const scope = effectScope()
        scope.run(() => {
          result = func.bind(self)(...args)
        })
        tryOnScopeDispose(() => scope.stop())
        return result
      },
      enumerable: false
    })
  }

  // Handle interceptable methods
  // Define the common intercept processor:
  const processIntercept = (...args) => {

    const intercept = { return: result }

    const before = runIntercept('before', self, prop, args, intercept)
    if (false === before) return intercept.return // short circuit, if intercept returns false

    result = func.bind(self)(...args)
    intercept.return = result

    const after = runIntercept('after', self, prop, args, intercept)
    if (false === after) return intercept.return // short circuit, if intercept returns false

    return intercept.return
  }

  switch (type) {
    case Behavior.INTERCEPT:
      // Basic, fast, non-scoped intercepts
      return Object.defineProperty(self, prop, {
        value: function (...args) {
          return processIntercept(...args)
        },
        enumerable: false
      })
    case Behavior.SCOPED_INTERCEPT:
      // Inside scoped you can put watch(), computed(), watchEffect()
      // and it will be auto garbage collected on scope destruction
      return Object.defineProperty(self, prop, {
          value: function (...args) {
            const scope = effectScope()
            scope.run(() => {
              result = processIntercept(...args)
            })
            tryOnScopeDispose(() => scope.stop())
            return result
          },
          enumerable: false
        })
  }
}

/**
 * Generic Class type, matches any type of JS class.
 */
type Class = { new (...args: any[]): any; };

/**
 * Apply traits to the derived class, methods and properties are supported.
 *
 * @param derivedCtor
 * @param constructors
 */
export function mix (derivedCtor: Class, constructors: Class[]): void {
  constructors.forEach((baseCtor) => {
    const obj = new baseCtor()
    for (const prop in obj) {
      Object.defineProperty(
        derivedCtor.prototype,
        prop,
        {
          value: obj[prop],
          writable: true
        }
      );
    }
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (!(name in derivedCtor.prototype)) {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
          Object.create(null)
        );
      }
    });
  });
}
