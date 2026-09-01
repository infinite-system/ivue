# Runtime-malleable architecture — swap logic, runner, and template live

**Status: parked (post-release). The logic/runner axes are proven and
shipped; the template axis is the open build.**

## The idea

Three swap axes make an app malleable at runtime — no rebuild, no
deploy:

1. **Logic** — the class behind a namespace slot (or a `get Logic()`
   seam on a consumer) is replaced, and every late read follows.
2. **Runner** — the class that drives a component arrives as a prop;
   the SFC is a shell.
3. **Template** — the view itself arrives as a prop: a path, a
   runtime-compiled string, or a loaded `.vue` file, rendered through
   `<component :is="dynamicView" v-if="template" />` with the built-in
   markup as fallback.

Swap M and C through slots and runner, swap V through the template
prop: runtime-malleable MVC. An agent generates a subclass plus a
template string and the running app mounts it — extend-don't-fork,
while the app is running. (Invar plugins are this idea wearing a
terminal.)

## What is already proven and shipped

- **Logic axis — proven at 20M cells with ZERO performance tax**
  (commit c2ec75fb). FlyweightSheet holds `protected get Logic()`
  returning `FlyweightLogic.Class`; every runtime read routes through
  it. The 9,000,000-call seeding loop destructures the bound methods
  ONCE from the seam (`const { isDataCol, numDataValue } = this.Logic`)
  and runs at plain-function speed — 78.8ms median on the page vs
  77.5ms with no seam at all (noise), vs 88.8ms for the original module
  functions. Both swap axes hold at once: swap the namespace slot, or
  subclass the sheet and override one getter to re-route the whole
  config/mapping layer including the hot loop.
- **The measured doctrine behind it** (in Static.ts, static.md, the
  skill): Static()'s bound methods are plain-function speed once read;
  the only per-call cost is reading through the accessor inside a
  loop (31.7 / 30.0 / 84.6 ms per 9M calls — module fn / hoisted bound
  / accessor-per-call, fresh-page Chromium medians). Discipline: in
  million-call loops destructure once, inside the function; everywhere
  else `Class.method()` is free.
- **Runner axis — shipped in the field components.** ChooseField's
  `runner` prop ([Function, Object]) accepts a class or a pre-built
  instance; the wrapper constructs the subclass with its own
  props/emit. Generalizing to any component is repetition, not
  invention.
- **Live-swap prior art**: the node-class-HMR machinery is precisely
  "swap the class generation under a running system."

## The open build: the template axis

Three tiers, increasing power and cost:

| tier | mechanism | cost / constraint |
| --- | --- | --- |
| path | `defineAsyncComponent` + dynamic import | precompiled, full SFC perf; template set known at build (glob) |
| runtime string | Vue full build w/ runtime compiler | ~14 kB extra gzip; CSP `unsafe-eval`; no SFC-time optimizations (patch flags, hoisting) |
| runtime .vue file | vue3-sfc-loader or similar | true drop-a-file-in; slowest compile, biggest surface |

Design sketch: components accept `template` + `runner`; the base
template renders `<component :is>` when a dynamic view is present and
its own markup otherwise. The runner class receives the same
props/emit either way.

## Boundaries to respect (named in discussion)

- **Constructions are malleable; live instances are not.** Swapping a
  class does not rewire objects already built from the old one —
  malleability applies at the next `new`; live objects need
  re-creation or an HMR-style hot-swap protocol.
- **Type safety moves to runtime — and the contract system is ready.**
  Dynamic templates can't be compiler-checked, but props/emits
  contracts are PLAIN DATA (propsWithDefaults, the two-tier system): a
  runner can validate a dynamic template's bindings against the
  contract at mount time. Most frameworks can't — their contracts live
  inside compiler macros.
- **Security**: runtime template strings execute expressions in render
  context — user-supplied templates are a code-injection surface.
  Trusted sources (agents we run, admin surfaces) only, or a
  sandboxed expression policy.
- **Performance discipline carries over**: malleable seams by default,
  measured hoists where a real loop earns them — the flyweight file
  demonstrates both in one constructor.

## The product endgame: the self-modifying app

The user prompts INSIDE the app, and the app meets them — an agentic
app whose users modify it to their need. The pattern is the flyweight
overlay applied to the app itself: the shipped class graph is columnar
ground truth, and each user's modifications are a SPARSE OVERLAY — a
small set of subclasses and template overrides attached at named
seams. A user's custom app is never a fork; it is
`base graph + their overlay, replayed at boot`.

The in-app loop:

1. User points at a thing and prompts ("group invoices by client, add
   a notes field").
2. The embedded agent walks the LIVE object graph to resolve which
   instance → class → seam produces that behavior — "point at the
   thing" resolves to a named seam, not a text search. This is where
   the object layer earns it.
3. It generates `class $MyInvoiceList extends InvoiceList.$Class` (+
   a template override where the view changes), runs the standards
   GATE on the output, validates the template against the
   contract-as-data at mount, swaps the slot.
4. The generated source lands in the user's CUSTOMIZATION LEDGER (a
   few KB of class text per tweak; D1 or local), replayed on every
   boot. No build, ever — `Reactive()` is a runtime transform.

Because template, props (contracts as data), and logic are all
controlled end to end, the agent can restructure ANY surface — and
even summon heavy machinery on demand: an agent UI that needs to show
a million log lines generates a flyweight-grid subclass on the fly
(FlyweightLogic's patternSource/columns overridden for log columns),
overrides how files render, how diffs appear — the whole presentation
AND behavior of its own tooling, per user, per need.

What makes it survivable rather than a party trick:

- **Upgrades don't destroy customizations.** Overlays attach at
  seams; on a base update the app diffs the user's overlay against
  the changed seams (noImplicitOverride semantics, applied at
  runtime) and reports exactly which tweaks need re-generation —
  never the SaaS classic "we redesigned, your workflow is gone."
- **Blast radius is the user.** Each person's overlay modifies THEIR
  instance — prompted code changes their own app, the one case where
  running generated code is mostly safe by construction. Remaining
  care: exfiltration where the app holds secrets — server-side seams
  take the gate plus a capability allowlist.
- **The app has an immune system.** The gate refuses generations that
  violate the standard; invariants contracts bound what a seam is
  allowed to mean; contract validation turns bad templates into
  mount-time diagnostics instead of white screens.

Receipt that this works: Invar IS this product in terminal form — an
app whose users (agents) modify it to their need, governed by the
skill and invariants, 94k lines and navigable. The GUI version is the
same architecture with a prompt box instead of a PTY.

The honest hard part is not machinery (every piece exists: seams,
gate, contracts-as-data, HMR-style swap, ledger storage) — it is
PRODUCT work: making seam-pointing feel effortless and overlay
failures feel safe.

## Sequencing

Post-release, as a ladder — each rung is a shippable artifact:

1. Generalize the `runner` + `template` pair on ONE docs demo
   component; measure the runtime-string tier's real cost.
2. The overlay ledger: persist + replay generated subclasses for one
   surface (a settings page, a list view).
3. The in-app agent: prompt → seam resolution via the live graph →
   gated generation → slot swap, on that same surface.
4. The story writes itself at every rung — "the app agents can extend
   while it runs" is press material for the W2/W4 machinery in
   tasks/press-plan.md, and rung 3 is a launch of its own.
