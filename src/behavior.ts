import { effectScope } from 'vue'
import { Mapping } from './kernel'
import { tryOnScopeDispose } from "@vueuse/core";
import type { AnyClass, Class } from './types/core'
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
export function runConstructorIntercept(
  type: keyof InterceptsMap, obj: any, intercept: Intercept
) {
  const fns = intercepts[type].get(obj) as InterceptsFns
  const fnsLength = fns.length
  for (let i = 0; i < fnsLength; i++)
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
 *      methodName: Behavior.SCOPED_INTERCEPT,
 *      methodName2: Behavior.INTERCEPT
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
function autoBindIntercept (to: Function | [Class, Function], scoped: boolean): InterceptFn {

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
          funcName: scoped ? Behavior.SCOPED_INTERCEPT : Behavior.INTERCEPT
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
  addIntercept('before', autoBindIntercept(to, opts.scoped), callback, opts)
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
  addIntercept('after', autoBindIntercept(to, opts.scoped), callback, opts)
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
export function runIntercept (type: keyof InterceptsMap, self: Class, prop: string, args: any[], intercept: Intercept) {
  // Intercepts runner, processes multiple intercepts assigned to the method.
  let fns: InterceptsFns = intercepts[type].get(self.constructor.prototype[prop])
  let fnsLength = fns?.length
  for (let i = 0; i < fnsLength; i++) {
    if (true === fns[i](intercept, ...args))
      return true // return true, to short circuit the execution chain
  }

  fns = intercepts[type].get(self[prop])
  fnsLength = fns?.length
  for (let i = 0; i < fnsLength; i++) {
    if (true === fns[i](intercept, ...args))
      return true // return true, to short circuit the execution chain
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
export function behaviorMethodHandler<T extends AnyClass> (mapping: Mapping<T>, type: Behavior, func: Function, self: Class, prop: string) {
  // Define a default void return
  let result = void (0)
  // Handle basic scoped most often scenario early
  // Usually the init() function
  if (type === Behavior.SCOPED) {
    // Inside scoped you can put watch(), computed(), watchEffect()
    // and it will be auto garbage collected on scope destruction
    return Object.defineProperty(self, prop, {
      value: function (...args: any) {
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
  const processIntercept = (...args: any) => {

    const intercept: Intercept = { mapping, self, return: result, name: prop, args,  }

    if (true === runIntercept('before', self, prop, args, intercept)) 
      return intercept.return // short circuit, if intercept returns false

    result = func.bind(self)(...args)
    intercept.return = result

    if (true === runIntercept('after', self, prop, args, intercept)) 
      return intercept.return // short circuit, if intercept returns false

    return intercept.return
  }

  switch (type) {
    case Behavior.INTERCEPT:
      // Basic, fast, non-scoped intercepts
      return Object.defineProperty(self, prop, {
        value: function (...args: any) {
          return processIntercept(...args)
        },
        enumerable: false
      })
    case Behavior.SCOPED_INTERCEPT:
      // Inside scoped you can put watch(), computed(), watchEffect()
      // and it will be auto garbage collected on scope destruction
      return Object.defineProperty(self, prop, {
        value: function (...args: any) {
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
