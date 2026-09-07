/** Copy plain configuration containers; retain callbacks, constructors and
 *  opaque objects by reference. Container trees must be acyclic. */
export function clone<T>(value: T): T {
  if (Array.isArray(value)) {
    const copy = new Array(value.length);
    for (let index = 0; index < value.length; index++) {
      if (index in value) copy[index] = clone(value[index]);
    }
    return copy as T;
  }
  if (
    value === null ||
    typeof value !== 'object' ||
    (value.constructor !== Object && value.constructor !== undefined)
  ) return value;

  // Preserve null prototypes and literal __proto__ keys without entry arrays.
  const copy: Record<string, unknown> = { __proto__: Object.getPrototypeOf(value), ...value };
  for (const key in copy) copy[key] = clone(copy[key]);
  return copy as T;
}
