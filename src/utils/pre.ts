/**
 * Pretty print an object that can contain circular references.
 * 
 * @param v      object to print
 * @param spaces number of spaces for tabs
 * @returns      pretty string
 * @source       https://stackoverflow.com/a/48254637
 */
export function pre (v: any, spaces = 2) {
  const cache = new Set();
  return JSON.stringify(v, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found
        try {
          // If this value does not reference a parent it can be deduped
         return JSON.parse(JSON.stringify(value))
        }
        catch (err) {
          // discard key if value cannot be deduped
         return '[**circular**]';
        }
      }
      // Store value in our set
      cache.add(value)
    }
    return value;
  }, spaces)
}
