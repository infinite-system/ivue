# React bridge — ivue as the MobX alternative

**Status: parked (deliberately out of pre-release scope). Trigger: after
the release ships and settles.**

## The claim

ivue's model layer is framework-free: it depends on `@vue/reactivity`
(standalone package; since Vue 3.5 even `watch` lives there), not on
Vue-the-framework. One bridge module makes the same classes drive React.

## The work

1. **Engine imports** — point `lib/Reactive.ts` at `@vue/reactivity`
   instead of `vue` (verify every imported symbol exists there).
2. **The bridge** (~50–100 lines): an `observer()` HOC or `useIvue()`
   hook — a `ReactiveEffect` wraps the render, `useSyncExternalStore`
   schedules the re-render on invalidation. Same shape as mobx-react /
   `@preact/signals-react`. Granularity: component-level re-render
   (React's native model), not per-binding DOM patching.
3. **Props seam** (the one real design question): React props are fresh
   plain objects per render — the class holds a shallow-reactive props
   wrapper the hook syncs each render (Vue's props proxy gave leaf
   tracking for free; React needs this shim).
4. **Lifecycle**: no component effectScope — the outliving-instance
   pattern (`$watch` + dispose in `useEffect` cleanup) becomes the
   default. StrictMode double-render needs idempotence care in the
   bridge.
5. TSX note: `.value` everywhere is MORE uniform than SFCs — no
   compiler-unwrap seam, no destructure discipline.

## The post (gated on measurements)

- Title: **"Drop makeObservable"** (per the title doctrine — the action
  a MobX user gets to take).
- Description: ivue as a high-performance, ergonomic MobX alternative —
  classes without annotations, instances at plain-object cost, 1.1 KB.
- MobX pains it answers: per-class `makeObservable`/`makeAutoObservable`
  annotation maps, per-instance walk-and-wrap at construction,
  ~16 KB+ bundle.
- **Gate**: real MobX-vs-ivue benchmark (creation, read paths) in the
  same harness as the existing published numbers. Measured, not
  promised — no post without the table.
