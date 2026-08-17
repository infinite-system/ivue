# newsletter conventions — the operative set (distilled from ../invar)

This directory (Worker + dashboard) is written to invar's ivue class
conventions and doubles as a public example of an ivue system. The
mechanical subset is enforced by `scripts/conventions-gate.sh` — run it
before every commit; it typechecks, runs the unit suite, and greps the
structural rules below. This file is the WHAT; the gate is the enforcement.

## Class kinds & the namespace pattern

- Exported STATELESS behavior is born as `class $X { static … }` published
  through the namespace pattern — never a bare `export function` bag:

  ```ts
  export namespace X {
    export const $Class = Static($X); // immutable anchor — extend THIS
    export let Class = $Class;        // mutable slot — doubles swap THIS
  }
  ```

- Reactive domain models (the dashboard's view models) publish the same
  seam with `Reactive()`:

  ```ts
  export namespace X {
    export const $Class = $X;
    export let Class = Reactive($Class); // in place ⇒ Class === $Class
    export type Instance = typeof Class.Instance;
  }
  ```

- **The wrapper lives at the ANCHOR.** `Static()` returns a NEW SUBCLASS,
  so `Class = Static($X)` leaves `$Class` unwrapped and `extends X.$Class`
  inherits `$`-getters that never cache. Required shape:
  `$Class = Static($X); Class = $Class`. `Reactive()` transforms in place,
  so wrapping at either line is the same object — the template above keeps
  one shape.
- **`extends X.Class` is forbidden** — an `extends` clause is an eager
  snapshot of a mutable slot. Extend `$Class`, which is `const`.
- **`Class` is always `let`**, never `const` — the slot exists so a test
  double or downstream customization can replace it in place.
- **ATOMIC-BIND**: a file exporting `namespace X { … Static($/Reactive($ }`
  is named `X.ts`. Converting a module means renaming the file in the SAME
  commit — a converted-but-not-renamed file is an incomplete conversion.
- **No `#private` members** — a `Static()` class is a subclass of `$Class`,
  and a `#` name is keyed to its declaring class, so `this.#member` is
  rejected on the wrapped receiver. No TS `private` either — it blocks
  subclass override. `protected` is the floor.
- `$` = the raw/underlying form of a public seam member, at both scopes
  (`$Class` → `Class`). The old `…Implementation` suffix is banned.
- Cross-module dependencies are read LATE — in getters and method bodies,
  never a top-level `new X.Class()` snapshot. This is what makes circular
  imports a non-event.

## ivue state discipline (dashboard models)

- Mutable state = ref-returning getters (`get rows() { return shallowRef([]) }`).
- Cheap derived state = PLAIN getters, never `computed()` unless
  memoization is proven (~300 bytes/instance for nothing).
- Reactive-closure and watch callbacks stay THIN — they only dial a
  prototype method (HMR hot-grafting + minimum footprint).
- SFCs destructure every template-touched Ref in ONE grouped statement;
  plain getters and methods stay dotted on the instance.

## Naming

- Full, spelled-out identifiers — no abbreviations, ever (`index` not
  `idx`, `response` not `res`, `subscriber` not `sub`). The gate greps a
  banned-abbreviation list on declarations.
- Never rename ivue namespace tokens (`Class`, `$Class`, `Instance`).
- Name the state a thing establishes, not the steps it takes.

## Files & tests

- One class per `PascalCase.ts` file; file grammar: imports → the
  eponymous declaration → exported types → end.
- TypeScript only; every dashboard component is `<script setup lang="ts">`.
- Tests are colocated (`X.test.ts` beside `X.ts`) and run against the REAL
  migrations via `node:sqlite` — never a hand-mocked SQL approximation.
  Dashboard models still missing tests ride a SHRINKING allowlist inside
  the gate; the list only ever shrinks.

## Verification

- The gate = tsc (Worker + dashboard) + full unit suite + every structural
  grep. MEASURED ≠ ENFORCED: a check must block with a non-zero exit and
  ride the always-run gate, not a separate on-demand script.
- Matchers that could silently rot carry POSITIVE CONTROLS — a known-bad
  line each matcher must detect before its silence about the real tree is
  trusted.
- End-to-end: Playwright walks the BUILT dashboard against `wrangler dev`
  with a local D1 (see README).
