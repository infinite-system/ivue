import { isObject, isPromise } from "./is";
/**
 * Deep merge two objects.
 * Merges and modifies the target object.
 * Merges sources into target from left to right.
 * Supports circular references and promises.
 * @param target object
 * @param sources array
 */
export function extend (target: { [x: string]: any; }, ...sources: any[]) {
  let parents: any = new Map() // parents object to detect circular references
  const result = _extend(target, [...sources], parents);
  parents = undefined // flush the parents map upon completion
  return result
}

/**
 * Deep merge two objects inner function.
 * Merges and modifies the target object.
 * Merge sources into target from left to right.
 * Supports circular references and promises
 *
 * @param target Target object to merge into
 * @param sources Sources object to merge from
 * @param parents Store parents for circular reference checks
 * @returns {*}
 * @private
 */
function _extend<K, V> (target: { [x: string]: any; }, sources: any[], parents: Map<K, V> | null | any = null) {

  if (!sources.length) return target;

  // save target object in Map as a key
  parents.set(target, true)

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        // detect circular references using Map parents object
        if (parents.has(source[key])) {
          // console.log('detected circular reference key:', key,
          // 'value:', source[key],
          // 'parents:', [...parents])
          target[key] = source[key]
        } else {
          if (isPromise(source[key])) {
            // promise objects should not be assigned
            // via _extend
            target[key] = source[key]
          } else {
            // the following lines
            // integrate Proxy support
            // if the target key does not exist
            if (typeof target[key] === 'undefined') {
              // assign directly the proxy or any other object
              target[key] = source[key]
            } else {
              // if target[key] is not an object
              // convert it to an object to be able to extend
              if (typeof target[key] !== 'object') {
                target[key] = {}
              }
              _extend(target[key], [source[key]], parents)
            }
          }
        }

      } else {
        target[key] = source[key]
      }
    }
  }

  return _extend(target, sources, parents);
}