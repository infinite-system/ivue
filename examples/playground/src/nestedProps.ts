// Vendored from ivue lib/nestedProps.ts — the playground is self-contained on
// purpose (StackBlitz imports this folder straight from GitHub).
/**
 * `nestedProps(props, defaults)` — fill a nested object prop from its
 * defaults, in place, so the class reads complete props at every depth.
 *
 * Vue resolves a prop's default only when the prop is ABSENT: pass
 * `{ wheel: { gain: 2 } }` for a prop whose default is
 * `{ wheel: { gain: 1, follow: 0.1 }, touch: { … } }` and the component
 * receives exactly the object it was passed — `follow` and `touch` are
 * gone. `propsWithDefaults` decides what the default IS and clones it per
 * instance; it cannot reach inside a supplied object. The fill is possible
 * at all because the defaults are a value the class owns — a compiler-only
 * default has nothing to fill from.
 *
 * The semantics are lodash's `defaultsDeep` with arrays taken whole: for
 * every prop whose value and default are both plain objects, each leaf the
 * supplied object lacks is written into it from the default, recursively;
 * a leaf it has is kept. Arrays, class instances, functions and primitives
 * are never merged — whichever side supplies one, it is taken whole. Vue's
 * props proxy is shallow, so the nested objects are the parent's own and
 * are written directly; the props object itself is untouched and returned.
 *
 * Call it once, at the seam where props enter the class:
 *
 *   constructor(props: Scroller.Props, public emit: Scroller.Emits) {
 *     this.props = nestedProps(props, this.self.propsDefaults);
 *   }
 *
 * The parent passes a stable object: a constant inline literal (Vue hoists
 * it), a `ref`'s value, a store field. An object built anew on every
 * parent render is a new, unfilled object each time.
 *
 * `NestedPartial<T>` is the matching declaration for the prop's type — the
 * shape an author may pass — and `NestedProps<P, D>` the type of the
 * filled props, where every key both sides carry as an object is complete.
 *
 * Ships from `ivue/extras` (not the reactive core) so the primary `ivue`
 * entry stays minimal.
 */

/** Every key optional at every plain-object depth; arrays stay whole. */
export type NestedPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: NestedPartial<T[K]> }
    : T;

/** The filled props' type: a key both sides carry as a plain object is complete. */
export type NestedProps<P, D> = {
  [K in keyof P as K extends keyof D ? K : never]-?: NestedLeaf<
    NonNullable<P[K]>,
    D[K & keyof D]
  >;
} & {
  [K in keyof P as K extends keyof D ? never : K]: P[K];
};

type NestedLeaf<V, D> = V extends readonly unknown[]
  ? V
  : V extends object
    ? D extends readonly unknown[]
      ? V
      : D extends object
        ? NestedProps<V, D>
        : V
    : V;

type PlainObject = Record<PropertyKey, unknown>;

/** A plain object — an object literal, `Object.create(null)`, or a reactive
 *  proxy over either; not an array, a class instance or a function. A
 *  `constructor` check, no prototype walk. */
function isPlain(value: unknown): value is PlainObject {
  return (
    value !== null &&
    typeof value === 'object' &&
    ((value as PlainObject).constructor === Object ||
      (value as PlainObject).constructor === undefined)
  );
}

/** Write every leaf `target` lacks from `defaults`, recursively; keep what
 *  it has. `for…in` over the defaults: plain objects have no enumerable
 *  prototype keys. */
function fill(target: PlainObject, defaults: PlainObject) {
  for (const key in defaults) {
    const value = target[key];
    const fallback = defaults[key];
    if (value === undefined) target[key] = fallback;
    else if (isPlain(value) && isPlain(fallback)) fill(value, fallback);
  }
}

/**
 * Fill every nested object prop from its default, in place, and return
 * the props typed as complete. Top-level props are Vue's to default and
 * are never written.
 */
export function nestedProps<P extends object, D extends object>(
  props: P,
  defaults: D
): NestedProps<P, D> {
  for (const key in defaults) {
    const value = (props as PlainObject)[key];
    const fallback = (defaults as PlainObject)[key];
    if (isPlain(value) && isPlain(fallback)) fill(value, fallback);
  }
  return props as unknown as NestedProps<P, D>;
}
