
export function isObject (item: any) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function isPromise (p: any) {
  return p !== null &&
    typeof p === 'object' &&
    typeof p.then === 'function' &&
    typeof p.catch === 'function';
}
