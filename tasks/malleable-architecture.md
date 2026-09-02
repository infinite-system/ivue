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

## The law: malleability is a function of uniformity

None of this exists elsewhere, and the reason is structural: the agent
can override ANY component only if EVERY component is overridable THE
SAME WAY. One shape for classes (the standard) is what made agents
able to write them at 94k lines; one shape for components is what
makes an app addressable seam-by-seam. Partial adoption is a demo;
total shape is a platform. Others hold the ingredients (headless UI
separates logic from view at authoring time; low-code tools have
runtime views) — nobody holds the uniform shape across every
component, because without a standard-with-teeth it cannot be reached.

**The universal component shell** — the class standard's second half.
Every component is the same three seams:

- **contract** — props/emits as namespace data (already the standard),
  opening with a spread of the malleable base:
  `...Malleable.propsTypes` carrying `runner` + `template`. The
  two-tier contract system makes universalizing a ONE-LINE move per
  component.
- **runner** — the SFC constructs `props.runner ?? new X.Class(props,
  emit)`; the class that drives is injectable (ChooseField's shipped
  mechanism, generalized).
- **template** — `<component :is="dynamicView" v-if="template">`
  with the built-in markup as the v-else. View injectable, default
  intact.

Because the shape is uniform, the GATE can verify it exactly as it
verifies class shape today — the shell becomes a checkable ruling,
not a convention. Migration follows the docs-components rule:
opportunistic when touched, never a bulk sweep; new components born
in the shape.

**Contract home upgrade (2026-09-02): the contract moves ONTO the
class as a plain static getter** — `static get props()` returning the
propsWithDefaults call. No Static() machinery needed (static
inheritance and `super` are native; a getter read is data, nothing to
bind). Three properties by construction: UNIQUE (each read builds a
fresh object — components can never share a mutable contract; read
once per SFC, so cost is nil), EXTENSIBLE (`static override get
props() { return { ...super.props, extra } }` — contract inheritance
IS class inheritance, and noImplicitOverride narrates it), and
SINGLE-OWNER (the class carries state, derivation, methods, AND
contract — the namespace's one-dot enumeration now includes the
contract). One rule rides along: entry objects are built INSIDE the
getter body — a hoisted shared entry const reintroduces the sharing
hazard through the shallow spread. Receipt pending: convert
MediaField/ContactField (the shipped subclass pair) before this
becomes skill doctrine.

**The runner-contract bootstrap, dissolved (2026-09-02).** The knot:
props are declared ONCE at component definition
(`defineProps(X.Class.props)`), but the runner arrives at MOUNT and
may carry a wider contract — while being itself selected by a prop.
The ruling that makes the circle structurally impossible:

> **Runner swap is contract-PRESERVING; contract change is a
> COMPONENT swap — at the component's OWN inner `:is`.** The declared
> (parent-facing) props belong to the SHELL (base class); a swapped-in
> runner honors them — Liskov applied to the shell. A variant needing
> NEW inputs is not a runner swap: the agent generates a thin view
> whose `defineProps` reads the subclass contract fresh, and the
> component renders it through ITS OWN `<component :is="model.template"
> :runner="model">`. The parent never changes — it keeps rendering
> `<InvoiceRow>` — because every component is its own swap point
> (the uniformity law delivering swap reach by construction; static
> imports in parents are irrelevant, since no component is ever
> replaced, only re-driven and re-skinned from within). The inner
> view's contract collapses to ONE prop — the runner — so a variant's
> new inputs are runner state/derivations/ledger config, and its
> `static get props()` describes the RUNNER's inputs. The only case
> that touches a parent: a variant needing data only the parent holds
> — a feature spanning two components by definition (the atomic-unit
> case), not a reach failure. (Review note 2026-09-02: a fresh-eyes
> pass misread this as a parent-level swap and flagged static
> imports as a wall; the user's reading above is the correct one.)

Escape valves for the in-between cases, both already shipped shapes:
parent-constructed runner instances (variant inputs flow through the
CONSTRUCTOR — props are the view's contract, constructor args are
the runner's contract; ChooseField's precedent), and attrs
fallthrough for one or two optional extras. Bonus only
contracts-as-data gets: the shell can VERIFY at mount — compare the
arriving runner's `class.props` against the declared set and warn on
mismatch. Everywhere else this failure is silent; here it is a
tripwire the trust layer gets for free.

**Contract timing under global override (2026-09-02).**
`defineProps(X.Class.props)` evaluates ONCE at SFC module evaluation
(then Vue caches normalization per component definition). So a slot
swap BEFORE the module imports carries the whole new contract —
props, defaults, everything: **global override genuinely overrides
props on reload**, provided ledger replay runs before component
imports (lazy route/component imports give this nearly free). A swap
AFTER module evaluation freezes that definition's contract — and
mid-session contract changes already belong to the `:is` axis (the
bootstrap ruling), where a fresh thin SFC reads the subclass
contract at generation time. The per-rung timing table:

| what changes | mechanism | takes effect |
| --- | --- | --- |
| behavior, globally | slot swap | next mount |
| behavior, one site | injection / runnerFor | next render there |
| contract, one place, now | component swap (:is) | immediately |
| contract, globally | slot swap + reload (replay-first) | one reload |

The reload rung is what the recovery doctrine already made cheap —
"reload from scratch" was carrying the contract axis all along.

**THE SIMPLIFICATION (user ruling 2026-09-02): RELOAD IS THE ONLY
VERB.** The deletion test: remove the live machinery (drift-in,
epochs, key-bumps, the HMR runtime flip) and correctness survives —
so none of it was load-bearing. Reload-only is the REDUCED design:

- **Apply, rollback, quarantine, safe mode are ONE operation.** Apply
  = write the ledger, reload. Rollback = reload with a shorter
  ledger. Safe mode = reload with an empty one. The trust layer and
  the apply path were always the same verb.
- **One effect model for every change.** Behavior and contract
  changes land identically (ledger replay before import, fresh
  realm). The timing table below collapses to one row; the agent's
  "lowest rung" procedure disappears; the module-cache problem, the
  injected-runner problem, and the entire old-instance-under-new-
  class bug class become UNREACHABLE rather than managed.
- **Three requirements, all already in the vocabulary:**
  1. **Observation-bounded state restore.** Instances are plain
     objects whose cells materialize on first read, so
     `Object.keys()` over the graph's roots yields exactly the
     observed state — snapshot that, reload, restore. Unread state
     was default; form drafts ARE cells, so dirty forms survive
     without a special rule; route lives in the URL; scroll is a few
     numbers per surface. (The state carry-over verb, applied to the
     whole app.)
  2. **The agent never lived in the renderer** (main / worker), so a
     renderer reload is invisible to a running turn. Coalesce reloads
     to turn boundaries.
  3. **Double-buffered reload in Electron** (`WebContentsView` on a
     `BaseWindow` — BrowserView is deprecated since Electron 30): load
     the new renderer hidden, restore, swap when painted. Both views
     are live compositor surfaces, so the swap is ONE repaint with no
     intermediate frame. Readiness is the APP's signal, never
     `did-finish-load` (which precedes replay + restore): restore
     state → lay out → restore scroll → two rAFs → IPC "restored" →
     swap → destroy old. Optional: a WARM STANDBY renderer already
     booted on the base graph, needing only the ledger delta + the
     snapshot to catch up — latency approaches snapshot transfer. No
     cross-fade (views lack opacity): a hard cut, which is the goal.
     Zero flicker —
     and a viewer CANNOT distinguish a double-buffered reload from a
     hot swap, so the wave-2 demo survives visually intact and
     becomes honest ("applied, your input is still there") instead of
     "no reload."
- **Honest costs:** truly ephemeral UI (open dropdown, text
  selection) resets unless captured; the web tier cannot
  double-buffer and blinks (demo tier, acceptable); state not
  reachable from a root is not snapshotted — the discipline the
  standard already has.

The invalidation ladder below (A–C) is DEMOTED TO RESERVE: recorded
because the analysis is correct and may be wanted for a hot path
someday, but NOT part of the base design. Rung D is the design.

**Invalidation mechanics (reserve; superseded above) — the fact that
decides it: the ESM module cache.** `app.unmount()` + remount does NOT re-read
contracts — re-import returns the cached module; the module-scope
props expression never re-evaluates. So invalidation is a ladder of
four verbs, cheapest first:

- **A. Nothing — drift-in at next mount.** Slot swap reaches future
  `new X.Class` reads; live instances finish on the old class until
  their site naturally remounts. Correct for most behavior changes,
  per "constructions are malleable, live instances are not."
- **B. Key-bump — the surgical remount verb.** Owner holds an
  `overlayEpoch` ref; subtrees key on it; ledger-apply bumps it →
  that subtree remounts, fresh setups read the new slot. Scoped, no
  reload. Behavior only (same definition = frozen contract).
- **C. Vue's HMR runtime — mid-session definition swap.** This IS
  the "HMR-style hot-swap protocol" named above, and it has TWO
  verbs with different state semantics:
  `__VUE_HMR_RUNTIME__.reload(id, newDefinition)` replaces a
  definition (props included) and remounts every live instance in
  place (state resets, parents undisturbed);
  `rerender(id, newRenderFn)` swaps JUST the template of every
  mounted instance **while their state survives** — a running form
  keeps its half-typed input as the layout morphs around it.
  Caveats, stated honestly: the runtime is __DEV__-guarded with no
  official HMR-only prod flag — but NO FORK is needed (2026-09-02):
  Vue's esm-bundler dist ships the HMR code with guards compiled to
  `process.env.NODE_ENV !== 'production'`, resolved by OUR bundler.
  So **patch-package** flips just the HMR guard sites (the global
  `__VUE_HMR_RUNTIME__` install + the per-instance registerHMR
  hooks, ~4 edits) to `true`, leaving every warning/slow-path
  guarded: HMR-only, full-speed production Vue as a committed diff
  in patches/, replayed on install — the ledger pattern applied to
  node_modules (a delta against a dependency, replayed at boot).
  Version bumps fail the patch LOUDLY (build error, not silent
  regression; two-minute refresh per Vue upgrade); a Vite transform
  plugin matching the guard patterns is the version-tolerant
  upgrade if refreshes get old. Demo needs none of this (dev-mode
  bundle works today); the patch is what makes the claim
  product-grade. Plain runtime components still need
  `createRecord(id, comp)` wired by the app.
  Runtime-compiled generated components sidestep the module cache
  anyway (definitions born fresh).
  **THE WAVE-2 FLAGSHIP DEMO lives here**: live app with ticking
  state → prompt → agent emits template → runtime compile →
  `rerender()` → the interface morphs around its own live data, no
  reload. "The app agents can extend while it runs" as 15 seconds of
  footage. Supersedes Invar-driving-Invar as the strongest wave-2
  clip; HOLSTERED until wave 2 per the press plan's second-wave
  rule.
- **D. Full reload — guaranteed.** Web: location.reload(). Electron:
  `webContents.reload()` — the RENDERER reloads while MAIN persists
  (ledger, agent, running work survive; only the view realm
  re-evaluates, replay-first). The desktop shell turns hard refresh
  into a view-layer reboot under a running supervisor.

**Injected runners after a slot swap (2026-09-02; MOOT under
reload-only — every instance is reconstructed from the new slots at
boot; kept for the reserve ladder).** A `:runner`
passed from outside was constructed from the OLD class; the child
holds that instance and reads `props.runner` ONCE in setup (by
design — the total-destructure idiom binds a component to one
instance for life). Two rulings dissolve "hard to track":
- **A shell instance is bound to one runner for life; a new runner
  is a REMOUNT.** The parent keys the child on runner identity, so a
  fresh runner is automatically a fresh mount — never fight the
  once-read.
- **Nobody tracks consumers — consumers derive from a REACTIVE
  per-seam epoch.** The ledger publishes `Ledger.epochOf(Seam)` as a
  ref; the owner's `runnerFor` cache key AND the child's `:key` both
  derive from it. Ledger-apply bumps the seam's epoch → every owner
  that READ it re-renders → keys change → children remount → setups
  capture runners regenerated from the new slot (the cache disposes
  the stale instance per the outliving-instance discipline).
  Propagation is Vue's dependency tracking; it is observation-bounded
  (only owners reading that seam's epoch react). Rung B stops being a
  manual verb and becomes a DERIVATION. The quiescence guard still
  gates dirty subtrees.
- **Residue — long-lived singletons** (a session object in a store):
  the live-instance boundary stands, plus one verb between B and D:
  **reconstruct with state carry-over** — serialize the instance's
  cells, construct from the new slot, restore. Generic here because
  instances are plain objects with enumerable ref-getter cells. Or
  reload. The OWNER's call, never the consumer's.

D is cheap because the speed doctrine bounds it: reload cost =
module eval + graph rebuild + first paint, and observation-bounded
work bounds all three (22ms/1M creation; ~400 observed cells at any
data size). The malleability architecture and its reset button are
the same architecture. Discipline riding along: route, ledger, and
domain state persist (main process / IndexedDB); the graph REBUILDS
on boot rather than being precious. Verb per rung: A drift-in, B
"this surface now," C "this contract everywhere now," D "globally,
guaranteed."

**Minimal diffs are BY CONSTRUCTION (the AI-development property).**
An agent's override artifact is a subclass, and a subclass contains
only the DELTA: the overridden members plus `...super.props` and the
new entries. Everything unchanged is inherited, not copied — the
ledger entry IS the diff, readable as one. Inheritance is the diff
format (config-object and fork-the-file extensibility carry the
whole surface; the change drowns). Agent decision procedure, one
sentence: **take the lowest rung that reaches the goal** — and the
app can truthfully report timing ("applied; full effect on reload")
because the table above is knowable, not folklore.

**Runners are NOT the default — self-construction is (2026-09-02).**
The deciding question is lifetime ownership: a shell-constructed
runner rides component scope (watchers reaped on unmount, free); an
injected runner is an outliving instance someone must dispose.
Injection-as-default would make manual lifecycle the norm for every
component to serve flexibility most sites never use. And it buys
nothing: `new X.Class(props, emit)` reads the MUTABLE namespace slot
late (at mount), so the default path is already swappable globally —
the ledger's mass-customization works THROUGH self-construction. The
malleability ladder: (1) namespace slot swap — global, zero
call-site changes; (2) injection — per-site/per-row surgery; (3)
component swap — contract changes. The law is uniformity of SEAMS,
not uniformity of USE: the nullish IS the seam, self-construction
its un-injected state. The one domain where injection is rightly
default: **the instance predates or outlives the view** (entity
views over the object graph, `:runner="item"`) — constructing a
second model inside the view would fork identity. Criterion, not
policy: does this instance exist independently of this view? Yes →
inject; no (it IS the view's state) → self-construct. Same split the
standard already draws between component-scoped and outliving
instances.

**Runner construction in lists (2026-09-02).** Inline
`:runner="new X.Class({...})"` in a v-for re-runs per parent render —
and since the shell reads `props.runner` ONCE in setup, that means a
discarded instance (plus any watchers it registered) every render
while the child drives the first one forever, and a silently dead
swap axis. The standard's own rule already forbids it: construction
is logic, and logic never lives in a template expression. Two
canonical shapes: (a) **the items ARE the runners** — v-for over
live entities, `:runner="item"`, identity and disposal ride the
collection (the pure object-graph form); (b) **keyed runner cache on
the owner** — `runnerFor(row)` memoizing per item in a WeakMap,
template reads the method, construct-once identity survives
re-render (the flyweight pattern in runner clothes; runners holding
watchers follow the outliving-instance dispose discipline). And (b)
is where per-row malleability lands: WHICH class `runnerFor`
constructs is the owner's decision, so it reads the LEDGER — the
agent's per-row overlay applies in one model method, never in a
template.

**The namespace is the module shape** — the tier that completes the
one-shape-per-layer table: values = contracts-as-data, instances =
the class standard, components = the universal shell, modules = the
namespace (`X.Class`, `X.$Class`, `X.Instance`, `X.ItemContext`, …).
The module unit decouples from the FILE (ES modules' accidental
boundary) and becomes the CONCEPT: one addressable node carrying its
class, raw class, types, and constants — fully-qualified at every
call site (`VirtualScroller.ItemContext<T>`), dot-enumerable in one
autocomplete. Same-shaped nodes at every scale is what the law
demands, and it is what makes the graph WALKABLE by the agent:
resolve the namespace, enumerate its surface, find the seam,
generate against its types.

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

**Superseding tier (review 2026-09-02): compile in main, load as a
blob module.** With the backend compiling TS + templates + SFCs
(see the gap register's #3 ruling), the renderer receives finished
JavaScript and imports it via a blob URL under CSP
`script-src 'self' blob:` — NOT unsafe-eval. The runtime-string
tier's two costs above (14 kB runtime compiler, no SFC-time
optimizations) both disappear: compiler-dom in build mode emits
patch flags and hoisting for generated templates exactly as for
shipped ones. The hidden eval window becomes unnecessary.

### What the shell costs (so uniformity is defensible everywhere)

- **Per render**: the fallback is one boolean; `<component :is>`
  mounts the resolved component DIRECTLY — no wrapper instance, no
  extra tree layer. With a stable `template` value the vnode type is
  the same reference every render, so `isSameVNodeType` passes and
  `shouldUpdateComponent` short-circuits. The only delta vs a
  hard-coded child: the vnode lands in the parent's dynamic-children
  block, costing two identity/short-circuit checks per parent
  re-render. Nanoseconds against a microsecond component render —
  under 0.1%.
- **Per instance**: the contract spread adds two props
  (`runner`, `template`) and `runner ?? new X.Class()` is one nullish
  check at setup. Bytes and a branch, once per mount.
- **The one real cost**: runtime-compiled template STRINGS pay a
  one-time compile (~0.1–2 ms each, cache by string) and ship the
  full Vue build (~14 kB extra gzip). The runtime compiler is the
  same compiler — the produced render function is as optimized as
  build-time output. Fallback-running components pay zero of this.
- **Granularity boundary — viewport, not dataset.** Even grid CELLS
  can carry the shell: the flyweight grid holds 20M data cells but
  renders ~400 live DOM cells (16 visible rows + 4 overscan × 20
  columns), regardless of dataset size. Virtualization decouples
  component count from data count. ~400 instances = sub-2 ms mount
  (ivue creation nearly free), and keyed windowing makes scroll a
  patch pass, not remounts — sub-millisecond per frame. The law:
  **component count is bounded by the viewport, and the viewport is
  always small** — anything rendering enough cells to worry about is
  already virtualized, and if it isn't, virtualization is the fix,
  not shell-avoidance. Per-cell malleability ("override how a CELL
  renders") is a headline capability, not a tax.

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
  sandboxed expression policy. Egress is solved structurally by the
  user-controlled allowlist (section below).
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

### Recovery: quarantine, rollback, safe mode (the trust layer)

Self-modification is only trustworthy if no tweak can brick the app.
The model — and every ingredient already exists in this codebase:

1. **Quarantine before rollback.** Every overlaid seam mounts inside an
   error boundary (`onErrorCaptured` per dynamic component); a broken
   tweak quarantines THAT ledger entry and renders the base seam.
   Blast radius: one seam, never the app.
2. **Trial → committed → quarantined ledger states.** A generation
   applies in TRIAL; only a healthy mount plus a grace period promotes
   it to COMMITTED — a safe point. (The newsletter ledger's invariant,
   re-worn: only an acknowledged delivery writes the ledger.)
3. **Crash-loop guard → safe mode.** Two failed boots inside a window
   boot base-only. The deploy-guard's reloadOntoFreshBuild
   (sessionStorage stamp, at most once per 30s) is this exact
   mechanism pointed at a different failure.
4. **Rollback = replay a prefix.** The ledger is append-only: a safe
   point is an index, base is the empty overlay. No undo logic —
   reconstruct forward from zero. UNIQUELY CHEAP HERE: disposal is a
   reset and creation is nearly free (20M cells in 78ms), so a full
   from-scratch reboot is a sub-second recovery action.
5. **The escape hatch.** `?safe=1` (or a long-press) boots base
   unconditionally — no persisted state can brick the user.

### User-controlled egress: integrations as capability grants

The exfiltration boundary flips into the product's superpower: the
app's generated code can do anything INTERNALLY, but can only talk to
the outside through domains the user enabled in their control panel —
default-deny, per-domain, revocable.

- **Integrations without a marketplace.** "Send new invoices to my
  Slack webhook" → the agent generates the subclass → the app asks
  "this needs hooks.slack.com — enable it?" → one click. Any service
  with an HTTP API is an integration; zero per-connector engineering.
- **Three enforcement rings, defense in depth:**
  1. Generation-time — the gate statically refuses overlays reaching
     non-allowlisted domains (caught before the code exists).
  2. Runtime, BROWSER-enforced — CSP `connect-src` built per-user from
     the allowlist. The browser enforces it: no generated code can
     bypass it, however clever. (The artifact-sandbox mechanism, made
     user-controlled.)
  3. Server-side — overlay server code egresses only through the
     platform's proxy, which checks the list and writes the audit
     ledger.
- **Audit is the trust UX.** The panel shows "overlay #12 sent 3
  requests to hooks.slack.com today, 2.1 KB" — permissions plus
  visibility, the mobile-OS model for your own app's generated code.
  Revoking a domain degrades its overlays gracefully (the quarantine
  semantics from the trust layer, reused).

Receipt that this works: Invar IS this product in terminal form — an
app whose users (agents) modify it to their need, governed by the
skill and invariants, 94k lines and navigable. The GUI version is the
same architecture with a prompt box instead of a PTY.

The honest hard part is not machinery (every piece exists: seams,
gate, contracts-as-data, HMR-style swap, ledger storage) — it is
PRODUCT work: making seam-pointing feel effortless and overlay
failures feel safe.

## The delivery vehicle: desktop shell (Electron/Tauri)

Not packaging — an ARCHITECTURE upgrade. Three pillars get stronger
than the web can make them:

- **Safe mode becomes a real supervisor**: main process watches the
  renderer; a bricked overlay crashes the renderer and main reboots it
  base-only — OS-grade crash-loop guard instead of a sessionStorage
  stamp.
- **Egress moves to the network layer**: session.webRequest/proxy
  enforces the user's allowlist for ALL renderer traffic (stronger
  than CSP); the panel is literally a firewall the user owns. Two-ring
  model: generated overlays run ONLY in the sandboxed renderer,
  platform code in main.
- **Ledger + agent go local**: customization ledger on the user's
  disk (their app is theirs, offline, no multi-tenant surface); the
  embedded agent gets real tools via Node in main.

Also dissolves the web's blocker: runtime template compilation needs
unsafe-eval — desktop controls policy per-window (compile in a hidden
eval-allowed window, ship the compiled render fn to the strict-CSP
display renderer).

Tauri vs Electron: Tauri ~10x lighter; Electron wins if the agent
needs Node in-process — lean Electron BECAUSE the agent is the
product. Keep the web tier as the zero-install demo (path templates
only, no eval); desktop = full self-modification. That ladder is the
go-to-market. Precedent: Invar already lives outside the browser.

### Shell candidate: Electrobun (assessed 2026-09-01)

blackboardsh/electrobun — v1 shipped, ~12.7k stars, 40+ production
apps; macOS 14+ / Windows 11+ / Ubuntu official. Bun (or their JSC
runtime) in main, system webviews by default, optional bundled
Chromium (`bundleCEF`), typed RPC between isolated processes,
bsdiff kilobyte-scale updates. Scored against our four pillars:

- Agent runtime in main: ✅ Bun covers everything Node would
  (filesystem, processes, SDK, ledger) — faster startup, better DX.
- Hidden eval window for template compile: ✅ we set CSP per page we
  load; compile webview gets unsafe-eval, display webview stays
  strict.
- Trust layer: ✅ their isolated-process typed-RPC model is CLOSER to
  our quarantine design than Electron's defaults.
- Egress firewall: ⚠️ system webviews expose no uniform
  session.webRequest equivalent — the one real gap.

**The gap dissolves by making egress shell-agnostic**: webviews get
NO direct network — app served from localhost, injected CSP
connect-src points only at our local proxy, the proxy (our Bun/Node
process) enforces the user's allowlist. The firewall lives in OUR
process, not the shell's API. This is now the canonical egress
design regardless of shell — stronger and portable.

Honest costs: WebKit variance on macOS/Linux system webviews
(bundleCEF fixes it but eats the size win); single-maintainer
project (contributor note: PRs may never be reviewed) — Electron's
boringness is a feature when trust IS the pitch.

Decision (revised same day): **uniform behavior across platforms is
a REQUIREMENT** — runtime-compiled templates and the trust pitch
demand one engine everywhere. That rules out system-webview mode
(WebKit on macOS/Linux, Chromium on Windows = three engines);
Electrobun's fix is bundleCEF, which erases its tiny-bundle
headline. Once Chromium ships anyway, Electron is the boring,
battle-tested way to ship it — and its session.webRequest becomes
defense-in-depth ON TOP of the canonical proxy ring. **Electron
leads; Electrobun demoted to watch-it-mature.**

Non-factor noted: "Node cluster vs Bun single-threaded" does not
decide this — Bun has workers, subprocesses, and reusePort; and our
localhost proxy serves ONE user, never enough traffic to need
cluster. Parallel work (compiles, agent loops) is worker/subprocess
shaped in both runtimes.

### The chassis: Quasar — wrap, don't go raw (decided 2026-09-01)

Quasar fills two holes at once without touching the law:

- **Build modes solve the whole ladder in one chassis**: SPA
  (zero-install demo) / PWA / Electron (Quasar's electron mode IS
  Electron — consistent with the shell decision above) / Capacitor
  (iOS + Android — a rung we hadn't even claimed). One codebase.
- **Component base**: fallback templates consume Quasar components
  (QSelect etc.) INTERNALLY instead of hand-rolling primitives.

Why this does not violate the uniformity law: malleability =
uniformity AT THE SEAM LEVEL. The universal shell (contract, runner,
template) is our layer; what the fallback template paints inside —
QSelect or a raw listbox — sits BEHIND the seam, invisible to the
agent, the ledger, and the override machinery. Uniformity is about
every component exposing the same three seams, never about who
renders the pixels.

Why wrap beats raw (bottleneck principle): the bottleneck is shell +
agent + ledger + trust — the things that exist nowhere else. Raw
primitives are months of undifferentiated work (QSelect alone:
keyboard nav, a11y, virtual scroll, filtering, dark mode). And the
viewport law applies again: a page holds a handful of selects —
per-instance weight is irrelevant at real counts.

**The one rule that keeps swap-out free: the contract is OURS, never
Quasar-shaped.** Failure mode = wrapper mirroring QSelect's ~100
props 1:1 (contracts become Quasar's API in our namespace; swap-out
breaks every consumer). Instead ChooseField's contract stays
domain-shaped and minimal (options, value, label, disabled); the
fallback template translates to QSelect inside. Then "go raw bit by
bit" is not a migration project — it is swapping fallback internals
behind an unchanged contract, i.e. THE TEMPLATE AXIS WE SELL.
Replacing Quasar through our own seam is dogfooding.

Bonus: **the agent gets a vocabulary** — generated template
overrides may legally use the whole Quasar catalog, a documented
component language LLMs already know from training data. Better
generated UI on day one, no primitive-teaching phase.

Existence proof: ChooseField already ships the runner seam over a
Quasar base in production. The pattern is running, not hypothetical.

### The backend is malleable too — the same seam, pointed down

Electron has two halves; only extending one is half an architecture.
The reduction: a renderer component's TEMPLATE is not "presentation",
it is **the boundary through which the runner touches something
outside itself** — the human eye. The backend's boundary faces the
other way: **the machine**. So the shell generalizes without a new
mechanism:

| seam | renderer | backend service |
| --- | --- | --- |
| contract | props/emits as data | callable surface as data (IPC methods, params, returns) |
| runner | injectable class | injectable class |
| boundary | template (`<component :is>`) | **capability grant** (which paths, domains, processes) |

**Extensions NEVER run in main** — but the reason is HEALTH, not
restraint (corrected 2026-09-01): a separate supervised host
(Electron `utilityProcess`) can be killed and restarted, while a
module loaded into main cannot be cleanly unloaded and takes the app
down when it crashes. Crash isolation and hot-swap force the rule;
authority level does not.

Extensions receive **capability OBJECTS, not imports** — a generated
service never writes `import fs`; it is handed a handle.

**FULL ACCESS IS A GRANT, NOT THE ABSENCE OF THE GRANT SYSTEM (user
ruling 2026-09-01).** Root is a scope value. The grant system exists
for the user to restrain things that ARE NOT THEM — refusing the
owner full authority on their own machine is paternalism, and a
prompt-per-fs-call destroys the loop the product sells (prompt → the
app changes → try it). Because the handle mechanism is identical at
every scope, there is no "restricted API" beside a "real API": one
code path, nothing to rewrite when a scope changes, same audit shape
either way.

Two tiers on the trust axis, not a permission taxonomy:

| tier | when | default for |
| --- | --- | --- |
| **unrestricted** | your machine, your prompt, your app — the `--dangerously-skip-permissions` equivalent, flipped once | solo desktop user (THE DEFAULT) |
| **scoped** | anything the user did not personally just ask for: someone else's shared overlay, unattended agent runs, work on another party's behalf | shared/multi-party surfaces |

**Audit is orthogonal and always on** — it is not a third tier;
recording what happened costs nothing and blocks nothing.

**What buys the right to run unrestricted is RECOVERY, not prompts.**
People run codex in YOLO mode because git exists; the customization
ledger is the app's git (quarantine, safe mode, replay-a-prefix).
Recovery scales where prompts do not, because it costs nothing until
something breaks. We run our own agent fleet in YOLO nightly — a
product that refuses its owner the same setting is preaching.

**The one held line (flag, not a wall): egress stays default-deny even
in unrestricted mode** — one switch away, never a prompt-per-call. The
asymmetry is not about trust: data that already left the machine
cannot be un-sent. Filesystem, spawn, and native modules default OPEN
on the user's own machine.

**Correction (review 2026-09-02): the ledger recovers the APP, not the
user's data.** Replay-a-prefix restores overlay code; it holds nothing
of ~/Documents. A bad overlay deleting user files under the
unrestricted default is as unrecoverable as exfiltration — so the
"recovery buys the right to run unrestricted" argument needed one
more rule to be true: **THE TRASH RULE — the fs capability handle
never hard-deletes. Delete means move-to-trash, at every scope,
always.** One rule in one handle, and the argument holds again.
`spawn` remains the honest hole (a shell `rm` bypasses the handle);
it stays open per the YOLO-consistency ruling, but recovery does NOT
reach spawn side effects — they are audited always, and the scoped
tier implements spawn through an OS sandbox (bwrap/Landlock/Seatbelt,
the layer DeepSeek Harness is ahead on).

The scoped tier earns its existence the moment overlays become
shareable (which the ledger already makes possible): building the
mechanism now while shipping the permissive default costs nothing and
is what makes "install someone else's overlay" safe later.

**The prize is the ATOMIC UNIT.** "Show me my biggest folders, live"
needs a backend scanner AND a flyweight grid. Every extensibility
system alive splits that across two lifecycles (a plugin here, a
webview there, a hand-rolled protocol between). Here **one ledger
entry spans both halves**: the unit of malleability stops being the
module and becomes the **FEATURE** — generated together, gated
together, quarantined together, rolled back in one move. Half a
feature can never outlive its other half, which is exactly how plugin
systems rot. The joint between halves is the contract, already plain
data, so the agent generates against a CHECKABLE interface instead of
a convention.

Honest costs:

- **Stateful teardown** (watchers, handles, sockets) on hot-swap —
  scoping, not a wall: the standard already carries `dispose()` +
  `$stopEffects`; the runner contract includes teardown.
- **A process per feature is too heavy** — one extension host holds
  many runners; a separate process only for the genuinely untrusted,
  tiered by grant.
- **Headless must work.** The Invar terminal rung has a backend and no
  renderer: if the backend seam only works with a UI attached, the
  seam is wrong. That rung is the forcing function.

Rival (VS Code — extension host + webview, the closest living thing):
loses on all four axes — extensions are packaged and installed rather
than generated, reload required, the inter-half protocol is
hand-written, and an extension receives ALL of Node rather than a
scoped grant. The deeper precedent is **Emacs**: one live image where
backend and UI are equally redefinable — and no trust layer at all.
**What this builds is Emacs' malleability with a capability system.**

## The clear advantages (distilled — all from one root)

The standard with teeth is the moat; features are its corollaries:
member-granularity seams (swap unit = a getter, not a module/file);
verifiable generation (the gate checks structure, others review or
trust); contracts as data (mount-time template validation); no build
step by construction (Reactive() is a runtime transform); the live
object graph (agent introspects the RUNNING app); recovery cheap
because creation is cheap (rollback-by-replay as the primary safety
story); and the 94k-line receipt (Invar) that generated code need not
rot. A competitor copies a feature; the moat is a discipline.

## Positioning: DeepSeek Harness (investigated 2026-09-01)

DeepSeek Harness (OSS, ~2026-08-15, ~90K stars in two days) is the
closest prior art — and an INDEPENDENT convergence on the law:
everything is a plugin (model adapter, tools, sessions, UI, even the
agent loop), one uniform shape (`apply(ctx)` + a YAML line), built on
Cordis. Different layer though: Harness makes the AGENT malleable for
developers; this design makes the USER'S APP malleable for end users.

Their gaps are this doc's pillars: self-written plugins are
memory-only ("gone on restart, with no way to persist") and disabled
by default; plugins run in-process with full trust ("good faith" —
their reviewer's words) vs our gate + contracts + invariants; no
recovery layer for plugins vs our quarantine/rollback/safe-mode; no
egress control vs our user-owned allowlist; module-granularity swap
vs our member-granularity seams; Cordis lifecycle is heavyweight and
~10x token-inefficient vs a 1.1 kB runtime transform.

Where they are ahead: shipped + mindshare, OS-level TOOL sandboxing
(bwrap/Landlock/Seatbelt), 40 providers, four years of Cordis
hardening, and a mature append-only session log with replay/fork.

Strategic: validates the category and the uniformity law from an
independent reducer; gives the eventual story an anchor ("Harness
makes the agent malleable; this makes YOUR APP malleable — with a
ledger, a gate, and a permission panel you own"). Threat is medium:
entering our territory means rebuilding on member-level seams and a
user trust layer, which is the standard itself. Sources:
deepseek.com/harness, thenewstack.io, justin3go.com review (2026-08).

## The product identity: Invar's control plane (2026-09-01)

The app IS the Electron version of Invar — with switchable MODES:
**Desktop / Editor / Agent Harness**, all three living in one shell.

The move that makes this coherent (not scope creep): **a mode is the
malleable pattern applied at the root.** The three modes are not
three apps sharing code — they are three TEMPLATE SETS over ONE
object graph, one ledger, one agent, one trust layer. The mode
switcher is the root component's template seam. No new mechanism:
the architecture predicts modes. Self-similarity all the way up:
cell → component → page → mode → platform, the same seam at every
scale (the generative test passing).

This re-seats Invar instead of replacing it — the platform ladder:

| rung | surface | role |
| --- | --- | --- |
| terminal (Invar) | TUI — just another renderer behind the seam | headless: servers, CI, SSH; deploy where only a terminal exists |
| web (Quasar SPA) | browser | zero-install demo, path templates only |
| desktop (Electron) | full OS surface | THE CONTROL PLANE — home folder, file search, media, app launch, agent over the live environment |
| mobile (Capacitor) | iOS/Android | same seams, same ledger |

One codebase, four platforms, all extended through the same three
seams — "everyone extends ALL platforms the same way."

**Desktop mode scope discipline** (scoping, not fatal): we do NOT
ship an OS replacement. We ship PRIMITIVES (file list, media
surface, launcher) + the agent that summons machinery — a flyweight
grid materializing for 1M log lines and a video surface
materializing for an mp4 are the same move. Desktop MVP = an agentic
finder/launcher over the home folder; users grow it from there.

**Trust generalization**: home-folder access + overlays extend the
egress allowlist to a RESOURCE allowlist — network domains,
filesystem scopes, app-launch permissions; one default-deny control
panel governs every capability grant, same ledger, same rings. Not
new architecture — the egress design was the general shape all
along.

**Mode sequencing** (by distance from what exists): Harness first
(Invar ported — immediate dogfooding), Editor second, Desktop third
as the launch halo.

**Harness mode's core surface: the transcript viewer (2026-09-02).**
The agent is not rendered directly — its append-only `.jsonl` is,
through a virtual scroller with a shell component PER RECORD KIND
(message, tool call, tool result, thinking, error), each overridable
via the ledger. "Override how tool outputs render" is the harness's
day-one feature. Append-only is what makes it clean, not just fast:
indices never shift, offsets never move, so an observed window is
consistent even while the agent is still writing. Opening a 300 MB
transcript in 50–100 ms is O(observed), by four moves:
1. **Block index, harness-written.** Sparse sidecar (every Nth
   record: offset, index, kind, byte length — SSTable-style) appended
   by the harness AS IT WRITES; lookup = binary search + one ≤N-line
   block scan. ~0.5 MB index for 2M records. Foreign files without a
   sidecar: index in a worker, from the END backwards, after first
   paint.
2. **Tail-first cold open.** Read the last ~1 MB, parse backwards,
   paint — the whole open cost is one range read; background indexing
   then runs end→start, ahead of anyone scrolling up. The number
   comes from never reading the file, not from reading it fast.
3. **No height estimation — index-anchored scroll, measured window
   (deletion test, 2026-09-02).** An estimator bridges index-space to
   pixel-space for records you have NOT rendered — a cumulative-height
   model of the unobserved bulk that nothing needs. Anchor the
   scroller by INDEX: position = record index, scrollbar =
   index/total, the window renders forward from the anchor and its
   10–30 records get real heights by rendering them. Layout is
   synchronous within the frame (render → measure → position → paint
   before anything shows), so render straight into the live window —
   no background pass, no prior, no drift, no kind→height table.
   Tail-first open lays out upward from the bottom anchor after
   measuring, same single frame. This is how the existing scroller
   lands pixel-exact at the end of a 400k-char book. Index metadata
   (kind, length) stays for search, filtering, and prefetch sizing —
   never for heights.
4. **Main owns the bytes; the renderer holds a sparse cache.** File
   handle in main, sync range reads in a worker (placement rule),
   records over IPC per index range; renderer keeps observed blocks +
   prefetch margin, evicts far ones — memory O(observed + margin).
   Live tail is PUSH (the harness is the writer, in main), never
   polling.
Search composes: `rg` → byte offset → sparse index → scroll
position; "jump to where the test failed" is three lookups. Same
generator as the search architecture above: observed window,
streamed arrival, process split as trust boundary.

### The speed doctrine: work is bounded by observation

One generator under every speed win in the stack — **work scales
with what is OBSERVED, never with what EXISTS**:

- ivue creation: state materializes on first ACCESS — 20M instances
  are cheap because nobody read their cells yet.
- Flyweight grid: 20M data cells, ~400 observed DOM cells.
- Viewport law: component count bounded by the visible window.
- Reactive leaf tracking: only READ leaves subscribe.
- Games proved it at industry scale: frustum/occlusion culling —
  nobody renders what the camera can't see.

Desktop-mode application: native shells do NOT hold this invariant
uniformly (Finder chokes on 100k-file directories, Explorer
thumbnails eagerly, file dialogs load whole listings). A flyweight
file surface treats a million-entry directory like the grid treats
20M cells — observed window only, instant at any size. Same move
for media grids, log viewers, search results, web-page surfaces.
"Nicer than the desktop itself" is credible BECAUSE the OS never
reduced to this generator.

Honest boundary (so the claim stays a receipt): search latency is
an INDEXING problem before a rendering problem — Spotlight/Everything
win on their index, not their UI. The search architecture, three
moves, all the same doctrine:

- **Tiered engines, not one.** Content search = ripgrep (brute scan
  saturates SSDs; zero index maintenance — never build an index rg
  makes redundant). Our OWN indexes only where brute force loses:
  filename/metadata across the disk (fs events → index deltas,
  Everything-style: observation-bounded WRITING — index what
  changed, never rescan the world) and semantic layers the agent
  adds later.
- **Indexing decoupled from rendering = the doctrine over TIME.**
  Results STREAM into a collection; the flyweight surface renders
  the observed window of what has ARRIVED. First paint at first
  match, regardless of how long the scan behind it runs — render
  what's arrived, not what exists.
- **The process split is free — and it's the trust boundary.**
  rg/index workers live in main (fs access); the display webview
  holds only the streamed result collection and never touches the
  filesystem. Performance hygiene and the security model are the
  same seam.
- **Sync fs survives — placement decides, not the API.** Invar's
  sync fs code ports UNCHANGED: bulk work (walks, indexing, hashing)
  runs sync inside worker threads/subprocesses, where blocking is
  free and sync beats async (direct syscalls vs libuv threadpool
  queueing + promise overhead). Only the Electron main thread must
  never run fs loops (it services IPC/window events, sync or async
  alike); one-shot small ops there stay sync. Terminal rung and
  desktop rung share one sync implementation — only placement
  differs.

Precedent: Everything (Windows) beats the native OS with a
journal-fed index as a solo project; ours adds the malleable,
agent-extensible surface on top.

## Gap register — fresh-eyes review (2026-09-02)

A full read after two days of accretion. The design contradicts
nothing in itself and the earlier stress tests still resolve; these
are the omissions a build would meet. Severity-tagged; each carries
its proposed ruling. (One fatal finding from the same review — that
static parent imports block child swaps — was withdrawn: the swap
is at each component's OWN inner `:is`; ruling refined above.)

### Fatal-tier (a false claim; a missing mechanism)

1. **Recovery ≠ user data.** FIXED IN PLACE above: the TRASH RULE on
   the fs handle; spawn named as outside recovery, audited, sandboxed
   in the scoped tier.
2. **"No build, ever" is true of Reactive() only.** Generated code is
   TypeScript; the browser runs JavaScript; the gate is Node. RULING:
   **compile in main (desktop) or a service (web); the renderer only
   ever receives JavaScript.** Pipeline: `ts.transpileModule` (ms) for
   TRIAL; full `tsc` language service against the app's OWN SHIPPED
   `.d.ts` bundle in the background as the gate for COMMITTED (the
   app carries its types — that is what makes generations verifiable,
   not merely runnable); `@vue/compiler-sfc`/`compiler-dom` in build
   mode for views. Delivery: JS text over IPC → blob-URL `import()`
   under `script-src blob:` (no unsafe-eval). Wiring detail: blob
   modules cannot resolve bare specifiers, so the transpile step
   rewrites `import ... from 'ivue'`/`'vue'` to a renderer-exposed
   module registry (or an import map, which Electron honors).

### Scoping-tier (real gaps; proposed rulings)

3. **Emits and slots — the two unaddressed contract channels.**
   Emits follow the props rulings (a new event = an inner component
   swap) but the LISTENER lives in the parent — a variant that emits
   something new is a feature spanning two components (atomic-unit
   case; the ledger entry names both halves). Slots are render
   functions, not data: declare them as data — `static get slots()`
   (names + expected slot props) — so the mount-time verifier covers
   them.
4. **Overlay composition semantics + the ledger schema.** Same-seam
   overlays CHAIN as linear inheritance in ledger order (each
   subclasses the previous result). Inter-overlay dependency is a
   ledger FIELD; removing an entry quarantines its dependents rather
   than orphaning them; non-prefix removal = replay-with-skip. Ledger
   entry schema: id, seam address (stable id, see flags), kind
   (class | view | backend | patch | data), base-version hash, state
   (trial | committed | quarantined), dependencies, timestamp.
5. **Data schema malleability.** "Add a notes field" needs a home.
   RULING: **base columns + a sparse overlay column** — a JSON
   extension bag per entity. Overlays never migrate the base schema;
   a rolled-back overlay leaves its data inert, never destroyed. The
   flyweight-overlay pattern applied to storage.
6. **Renderer-realm isolation does not exist for the scoped tier.**
   Capability objects isolate the backend half; UI overlays share the
   JS realm with the base app inside a window. RULING: renderer trust
   is all-or-nothing PER WINDOW; scoped-tier UI overlays get their own
   realm (sandboxed iframe or BrowserView with a postMessage
   contract). Stated now so the sharing story never over-promises.
7. *(MOOT under reload-only — drafts are cells and survive the
   snapshot; kept for the reserve ladder.)* **Rung B destroys dirty
   user state.** Key-bump remounts reset
   state; a ledger apply mid-form kills the user's input. RULING: a
   QUIESCENCE GUARD — never remount a subtree with dirty state; defer
   to idle or navigation; prefer `rerender()` for pure template
   changes (it preserves state by design).
8. **"Items are runners" conflated model and view-model.** The
   entity in the runner slot leaves the shell no view class to read
   its contract from. RULING: **the entity rides in as a PROP to a
   self-constructed, component-scoped view-model** — identity by
   reference, lifecycle automatic. Injection stays only for runners
   that genuinely predate the view (a long-lived editor session).
   Self-construction is the default even more thoroughly than stated.
9. **The pointing mechanism is assumed.** "Walk the live graph from
   the thing the user pointed at" needs a registry: the shell
   registers runner ↔ component uid; namespaces are enumerable; DOM →
   component → runner → namespace in three lookups. Cheap; must
   exist.
10. **Trial promotion is a smoke test.** "Healthy mount + grace
    period" proves no crash, not correctness. RULING: **the test is a
    subclass** — the agent generates the test beside the overlay;
    trial promotes only when it passes. The article's pattern becomes
    the trust layer's evidence standard.

### Flags (record; no ruling needed yet)

- Seam addresses need STABLE IDs — a base rename must not orphan
  overlays (the upgrade-diff paragraph assumes this; make it a field).
- Egress is `default-src`, not just `connect-src` — image beacons and
  form actions leak; the rule is that the renderer has NO direct
  network at all (proxy ring), which covers every vector.
- Semantic drift on base upgrade (member exists, behavior changed) is
  undetectable statically — trial/quarantine catch crashes, not
  silent meaning changes. An honest limit.
- Multi-window Electron = per-renderer module caches; invalidation
  verbs are per window.
- HMR records accumulate definitions over a long session — replace
  per seam, never append.
- The doc lists boundaries but no explicit IMPOSSIBILITY list; add one
  when the shell lands (cannot rewire a live instance without
  re-creation; cannot change a mounted definition's contract without
  HMR reload; cannot un-send egress; cannot recover user data via the
  ledger — only via the trash rule; cannot isolate overlays within one
  renderer realm).

## Sequencing

Post-release, as a ladder — each rung is a shippable artifact:

1. The universal shell: `Malleable.propsTypes` base contract + the
   shell shape on ONE docs demo component (runner + template +
   :is/fallback); measure the runtime-string tier's real cost; add
   the shell ruling to the gate.
2. The overlay ledger: persist + replay generated subclasses for one
   surface (a settings page, a list view).
3. The recovery layer on that surface: error-boundary quarantine,
   trial/committed ledger states, crash-loop safe mode, ?safe=1 —
   plus the egress ring (per-user CSP connect-src + audit).
4. The in-app agent: prompt → seam resolution via the live graph →
   gated generation → slot swap, on that same surface.
5. The story writes itself at every rung — "the app agents can extend
   while it runs" is press material for the W2/W4 machinery in
   tasks/press-plan.md, and rung 4 is a launch of its own.
