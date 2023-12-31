import { effectScope, type EffectScope } from 'vue'
import { Mapping } from './kernel'
import { tryOnScopeDispose } from "@vueuse/core";
import type { AnyClass, Class, Null } from './types/core'
import type { InterceptsFns, Intercept, InterceptsMap, InterceptFn, InterceptOptions, InterceptAttachTo } from './types/core';

/**
 * Hash maps for all available intercept methods.
 */
export const intercepts: InterceptsMap = {
  before: new Map(),
  after: new Map()
}

/**
 * Run intercept attached to the Class constructor.
 * 
 * @param type 
 * @param mapping 
 * @param intercept 
 * @return
 */
export function interceptConstructor (
  type: keyof InterceptsMap, obj: any, intercept: Intercept
) {
  const fns = intercepts[type].get(obj) as InterceptsFns
  for (let i = 0; i < fns?.length; i++)
    if (true === fns[i](intercept, ...intercept.args))
      return intercept.return
}

/**
 * Add intercept to prototype or instance method.
 *
 * @param type
 * @param fn
 * @param callback
 * @param opts
 */
function addIntercept (type: keyof InterceptsMap, fn: InterceptFn, callback: any, opts: InterceptOptions) {
  if (intercepts[type].has(fn)) {
    intercepts[type].get(fn)?.[opts.top ? 'unshift' : 'push'](callback)
  } else {
    intercepts[type].set(fn, [callback])
  }
}

/**
 * Autobinds intercept to the class method automatically or directly.
 * This way there is no need to specify an intercept via behavior prop 
 * 
 * ```ts
 * class Example {
 *    behavior: {
 *      methodName: IVUE.SCOPED_INTERCEPT,
 *      methodName2: IVUE.INTERCEPT
 *    }
 * }
 * ```
 * You can just do:
 * class Example {} without the behavior prop and attach the event like this:
 * 
 * ```
 * before([Example, Examplpe.prototype.methodName], function (intercept) {
 *   intercept.return = 100
 *   return true
 * })
 * ```
 * @param to      Attach to this Function or [Class, Function].
 * @param scoped  Whether we want to enable scope disposal for memory leak control.
 * @returns       Function or Class to attach the intercept event function to.
 */
function autobindIntercept (to: Function | [Class, Function], scoped: boolean): InterceptFn {

  if (Array.isArray(to)) {

    if (typeof to[0] !== 'function') {
      throw new Error('ivue.kernel.behavior: Cannot autobind intercept to ' + to[0] + '. Supply a valid Class to autobind behavior.')
    }

    if (typeof to[1] === 'function') {

      // Analyze function definition
      const fnString = to[1].toString()
      const isClass = fnString.substring(0, 5) === 'class'

      if (!isClass) {
        // Determine function name
        const firstBrace = fnString.indexOf('(')
        let [maybeAsync, funcName] = fnString.substring(0, firstBrace).split(' ')
        funcName = maybeAsync === 'async' ? funcName : maybeAsync

        // Attach behavior
        to[0].behavior = {
          ...(typeof to[0].behavior === 'object' ? to[0].behavior : {}),
          funcName: scoped ? IVUE.SCOPED_INTERCEPT : IVUE.INTERCEPT
        }
      }

      // resolved function
      return to[1] as InterceptFn
    } else {
      throw new Error('ivue.kernel.behavior: Cannot autobind intercept "' + to[1] + '"  to ' + (to[0]?.name ?? to[0]))
    }
  }

  return to as InterceptFn
}

/**
 * Function to run before an interceptable method in ivue.
 *
 * @param fn
 * @param callback
 * @param opts
 */
export function before (
  to: InterceptAttachTo,
  callback: InterceptFn,
  opts: InterceptOptions = {
    top: false,
    scoped: false
  }
) {
  addIntercept('before', autobindIntercept(to, opts.scoped), callback, opts)
}

/**
 * Function to run after an interceptable method in ivue.
 *
 * @param fn
 * @param callback
 * @param opts
 */
export function after (
  to: InterceptAttachTo,
  callback: InterceptFn,
  opts: InterceptOptions = {
    top: false,
    scoped: false
  }
) {
  addIntercept('after', autobindIntercept(to, opts.scoped), callback, opts)
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
export function interceptMethod (type: keyof InterceptsMap, self: Class, prop: string, args: any[], intercept: Intercept) {
  
  // Run intercepts that are attached to the prototype of the self object
  let fns: InterceptsFns = intercepts[type].get(self.constructor.prototype[prop])
  for (let i = 0; i < fns?.length; i++) {
    if (true === fns[i](intercept, ...args))
      return true // return true -> to short circuit the execution chain
  }

  // Run intercepts that are attached to the instance of self itself
  fns = intercepts[type].get(self[prop])
  for (let i = 0; i < fns?.length; i++) {
    if (true === fns[i](intercept, ...args))
      return true // return true -> to short circuit the execution chain
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
 *         OFF: For objects -> makes them markRaw() non-reactive,
 *                   For getters -> makes them non-computed normal getters.
 */
export enum IVUE {
  SCOPED = 'SCOPED',
  SCOPED_INTERCEPT = 'SCOPED_INTERCEPT',
  INTERCEPT = 'INTERCEPT',
  OFF = 'OFF'
}

/**
 * Override function depending on behavior type.
 * @see IVUE
 *
 * @param type
 * @param func
 * @param self
 * @param prop
 */
export function changeMethodBehavior<T extends AnyClass> (mapping: Mapping, type: IVUE, func: Function, self: Class, prop: string, scope: EffectScope, intercept: Intercept) {
  // Define a default void return
  let result = void (0)
  // Handle basic scoped most often scenario early
  // Usually the init() function
  if (type === IVUE.SCOPED) {
    // Inside scoped you can put watch(), computed(), watchEffect()
    // and it will be auto garbage collected on scope destruction
    return Object.defineProperty(self, prop, {
      value: function (...args: any) {
        scope.run(() => result = func.bind(self)(...args))
        return result
      },
      writable: true,
      configurable: true,
      enumerable: false
    })
  }

  /**
   * Process the interceptable methods.
   * 
   * @param args 
   * @returns 
   */
  const processMethodIntercept = (...args: any) => {

    intercept = { mapping, self, return: result, name: prop, args }

    if (true === interceptMethod('before', self, prop, args, intercept))
      return intercept.return // short circuit, if intercept returns true

    result = func.bind(self)(...args)
    intercept.return = result

    if (true === interceptMethod('after', self, prop, args, intercept))
      return intercept.return // short circuit, if intercept returns true

    return intercept.return
  }

  switch (type) {
    case IVUE.INTERCEPT:
      // Basic, fast, non-scoped intercepts
      return Object.defineProperty(self, prop, {
        value: function (...args: any) {
          return processMethodIntercept(...args)
        },
        writable: true,
        configurable: true,
        enumerable: false
      })
    case IVUE.SCOPED_INTERCEPT:
      // Inside scoped you can put watch(), computed(), watchEffect()
      // and it will be auto garbage collected on scope destruction
      return Object.defineProperty(self, prop, {
        value: function (...args: any) {
          scope.run(() => result = processMethodIntercept(...args))
          return result
        },
        writable: true,
        configurable: true,
        enumerable: false
      })
  }
}
