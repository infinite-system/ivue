/**
 * Determine if the value is a true Object.
 * 
 * @param v any value
 * @returns boolean
 */
export function isObject (v: any) {
  return (v && typeof v === 'object' && !Array.isArray(v));
}

/**
 * Determine if the value is a Promise.
 * 
 * @param v any value
 * @returns boolean
 */
export function isPromise (v: any) {
  return v !== null &&
    typeof v === 'object' &&
    typeof v.then === 'function' &&
    typeof v.catch === 'function';
}
