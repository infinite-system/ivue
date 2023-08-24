import { isObject, isPromise } from "./is";

/**
 * Advanced deep merge of two or more objects.
 * Merges sources into target iterating from left to right.
 * Supports circular references and promises.
 * Merges and modifies the target object.
 * Only simple objects can extend the target, yet the
 * target can be anything, even a class object.
 * 
 * @param target object
 * @param sources array
 */
export function extend (target: any, ...sources: any[]) {
  let parents: any = new Map() // parents object to detect circular references
  const result = _extend(target, [...sources], parents);
  // parents = undefined // flush the parents map upon completion
  return result
}

/**
 * Deep merge two objects inner function.
 *
 * @param target   Target  - object to merge into.
 * @param sources  Sources - object to merge from.
 * @param parents  Parents - for circular reference checks.
 * @return {*}
 * 
 * @internal
 */
function _extend<K, V> (target: any, sources: any[], parents: Map<K, V> | null | any = null) {

  if (!sources.length) return target;
  // save target object in Map as a key
  parents.set(target, true)

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {

    for (const key in source) {
      if (isObject(source[key]) && source[key].constructor.name === 'Object') {
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
              if (!isObject(target[key])) {
                target[key] = source[key]
              } else {
                // Only simple objects can extend the target
                if (target[key].constructor.name !== 'Object') {
                  target[key] = source[key]
                } else {
                  _extend(target[key], [source[key]], parents)
                }
              }
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