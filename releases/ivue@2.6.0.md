# ivue@2.6.0 — clone, nestedProps with customCloner, one handler per event, LazyCodeGroup

Feature release, no breaking API changes. The props-contract system
gains its two missing halves — a copier that can hold callbacks and
constructors, and a filler that completes a nested object prop at every
depth — the standard gains a ruling with a gate check, and the docs ship
their source on demand. Around them, the virtual scroller example took
its touch selection through two phones and its scroll integrator into
the ivue shape; those live in the playground and the docs, not the
package, and are listed at the end.

### Added

- **`clone(value)`** (core) — the configuration copier `propsWithDefaults`
  now uses by default. It copies plain objects and arrays, keeping sparse
  holes and null prototypes, and retains everything else by reference:
  callbacks, class constructors, class instances, `Date`, `Map`, `Set`.
  Container trees must be acyclic.
- **`nestedProps(props, defaults, customCloner?)`** (`ivue/extras`) —
  fills every nested object prop from the class's own `propsDefaults`, in
  place, once, at the seam where props enter the class. Vue resolves a
  default only when a prop is absent, so a supplied partial object arrived
  with its sibling leaves gone; this completes it, arrays taken whole, and
  returns the props typed as complete. `NestedPartial<T>` is what a page
  may pass; `NestedProps<P, D>` is what the class reads, with `Date`,
  `RegExp`, `Map`, `Set` and functions taken whole. The merge is possible
  because the defaults are a value the class owns — a compiler-only
  default has nothing to fill from. The [Props & Defaults](https://ivue.dev/guide/props-and-defaults#nested-defaults-complete-at-every-depth)
  guide is the reference; the virtual scroller's `scroll` and `selection`
  knobs are the worked example.
- **`customCloner`** on `nestedProps`, the same policy knob
  `propsWithDefaults` has: `clone` by default, `structuredClone` when
  built-in objects need their own copies, the identity only when the
  caller owns a fresh tree per instance.

### Changed

- **`propsWithDefaults` defaults to `clone`, not `structuredClone`.**
  Defaults carrying a callback, a constructor or a class instance used to
  throw at first access; they now pass through by reference. The one
  semantic move: `Date`, `Map`, `Set` and typed arrays inside a default
  were copied per instance before and are shared by reference now. Pass
  `structuredClone` as the third argument to keep per-instance copies, or
  for cyclic data.
- **The library builds its two entries independently**, so the copier is
  inlined in both `ivue` and `ivue/extras` with no shared chunk and no Vue
  import in extras; the build gates the core at 1,134 bytes gzipped.

### Fixed

- **`nestedProps` shared a mutable default branch between instances.**
  A missing branch was written in by reference, so two components filled
  from one defaults object edited each other's knobs. Every branch is
  copied through `customCloner` now.

### The standard (ships in the tarball — `npx ivue skill`)

- **One DOM event, one handler, named for the event.** A template never
  binds two events to one method and a class never registers one method
  for two event types: a cancel gets `onPointerCancel`, whose body may
  delegate to `onPointerUp`. The reason is the override seam — a subclass
  extends the cancel alone, by name. The gate check `one_handler_per_event`
  enforces it per element; the constitution proves it red and green.
- **A nested object prop is filled with `nestedProps`** in the
  constructor; the class reads complete props and never merges in a
  getter.
- **A SCREAMING static may compose other SCREAMING constants** — a knobs
  tree assembled from parts' constants keeps the constant's name; the
  derived-getter check knows the difference.

### Docs and playground

- **`LazyCodeGroup`** — source tabs on the example pages load one
  highlighted chunk per file, on demand, in VitePress's own code-block
  markup. The scroller page's chunk went from 256 KB to 6.9 KB gzipped.
  Specs and contracts moved to pages of their own.
- **Touch selection, drawn by the class** — long press selects the word
  with two handles and a Copy chip, a handle drag extends, a swipe over the
  selection scrolls; a flick carries the glide it interrupted, on Android
  as on iOS, after five on-device logs named the platform's event
  timing. Each rule is a record in the scroller's contract or the fork's.
- **The Lenis fork in the ivue shape** — six classes, `Class = $Class`
  with no `Reactive()` (the state is read every frame, never tracked),
  handlers as prototype methods bound once, statics for constants and pure
  maths, types in the namespace, colocated specs bound to its own
  contract. Frame timing measured identical before and after.
- The scroller re-renders no row on a scroll frame (the thumb is its own
  component), the copy chip keeps the selection and reads "Copied" for a
  moment, and the reading creep, the thumb and a seek's converge loop no
  longer fight each other.

### Measured

Core `ivue` entry: **1,087 bytes gzipped** by the build gate
(`1,095` by `gzip -c dist/index.es.js | wc -c`), down from 1,146;
`ivue/extras`: **898 bytes**. Tests: **324 passing, 100% coverage on
every metric** across the engine, `Static.ts`, `LazyShared.ts`,
`clone.ts`, `nestedProps.ts` and the extras entry.
