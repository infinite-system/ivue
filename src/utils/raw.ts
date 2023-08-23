import { markRaw } from 'vue';

/**
 * Convert object back to Vue reactive.
 *
 * @param obj
 */
export function unraw (obj: any) {
  delete obj.__v_skip
}

/**
 * Alias for Vue markRaw() function.
 *
 * @param obj
 */
export function raw (obj: any) {
  return markRaw(obj)
}
