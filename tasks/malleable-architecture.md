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
