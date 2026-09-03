# infinite-architecture.invariants.md — the gears of a shapeless system

The domain of this contract is infinite architecture: a system whose every
part shares one shape can take any shape, at any data size, with cost bounded
by what is observed and change bounded by a delta. ivue, the flyweight grid,
the virtual scroller, and Invar are the evidence substrate; the malleable
desktop control plane is the design the records govern before it is built.
Shipped receipts are cited as measurements; design-stage claims are cited to
the working narrative and stay `provisional` until their verification runs.

Two kinds of records, and the split is load-bearing: reality-based records
are forced by how JavaScript, ES modules, layout, and machines behave; chosen
records are the disciplines that stand on them. Chosen never contradicts
reality; where a chosen record needs a reality record, it names it.

## Generator

The records below are gears. This section is the mechanism they form, in
invariant form, so a scan of this file alone carries the deep picture.

STUDY ALSO: [the malleable architecture narrative](tasks/malleable-architecture.md) —
the dated working record of how these gears were found, broken, and refined,
with the product endgame, the trust layer, and the gap register. Read it for
the full context; this contract carries the falsifiable core.

### One shape at every scale makes an interface infinite

**Invariant:** If every part of a system exposes the same seams, every view is a window over an index-addressable source, every change is a delta replayed at boot, and every irreversible action is gated, then the system can take any form and hold any data size while its cost stays bounded by observation and its risk stays bounded by recovery.

**Scope:** Application systems built on the ivue class standard, from a grid cell to a desktop control plane hosting other agents. The goal vector is a product that its own users and agents reshape at runtime without a build, a fork, or a way to brick it.

**Components:** One per gear, each delete-testable:
- [Cost follows observation not existence](#cost-follows-observation-not-existence) — why size never sets the bill.
- [A class is fixed at construction](#a-class-is-fixed-at-construction) — why change reaches new constructions only.
- [A module evaluates once per realm](#a-module-evaluates-once-per-realm) — why a fresh realm is the only full refresh.
- [Data that left the machine cannot be recalled](#data-that-left-the-machine-cannot-be-recalled) — why egress is the held line.
- [An append-only log has stable addresses](#an-append-only-log-has-stable-addresses) — why a window over a growing log stays consistent.
- [Only a rendered element has a true height](#only-a-rendered-element-has-a-true-height) — why the window measures instead of estimating.
- [Every component exposes the same three seams](#every-component-exposes-the-same-three-seams) — why any part is addressable the same way.
- [The contract lives on the class as a static getter](#the-contract-lives-on-the-class-as-a-static-getter) — why contracts inherit and never share.
- [A runner swap preserves the contract](#a-runner-swap-preserves-the-contract) — why the bootstrap circle cannot close.
- [Self-construction is the default](#self-construction-is-the-default) — why lifecycle stays automatic.
- [Construction never lives in a template](#construction-never-lives-in-a-template) — why identity survives a re-render.
- [Every change is a delta replayed at boot](#every-change-is-a-delta-replayed-at-boot) — why a custom app is never a fork.
- [Reload is the only apply verb](#reload-is-the-only-apply-verb) — why apply and recovery are one operation.
- [Main compiles and the renderer receives JavaScript](#main-compiles-and-the-renderer-receives-javascript) — why generated code is verifiable and eval-free.
- [Extensions never run in main](#extensions-never-run-in-main) — why a crash is a restart, not an outage.
- [Full access is a grant with root as its scope](#full-access-is-a-grant-with-root-as-its-scope) — why one code path serves every trust tier.
- [Delete means move to trash](#delete-means-move-to-trash) — why recovery reaches the user's files.
- [All egress passes through the local proxy](#all-egress-passes-through-the-local-proxy) — why one mechanism is firewall, integration, and tap.
- [Every view is a window over an indexed source](#every-view-is-a-window-over-an-indexed-source) — why one primitive plus adapters is the whole interface.
- [Context is retained by reference and retrieved on demand](#context-is-retained-by-reference-and-retrieved-on-demand) — why compaction stops losing.
- [The governor is as observable as the governed](#the-governor-is-as-observable-as-the-governed) — why routing agents through the plane is trustworthy.

**Mechanism:** Uniform seams make every part addressable by one procedure, so an agent can find and replace any part the same way. Observation-bounded cost makes the interface indifferent to data size, so any source can be shown through one primitive. Deltas replayed at boot make every modification small, inspectable, and reversible by replaying less. A fresh realm on every apply makes stale-instance bugs unreachable instead of managed. Gating the one irreversible action and trashing instead of deleting make the unrestricted tier survivable. The proxy that enforces egress is the same wire that observes and governs hosted agents.

**Generates:** The universal component shell; the customization ledger and its recovery modes; the window primitive and its adapters; the transcript viewer and the retrieval index; the two trust tiers; the desktop control plane with Desktop, Editor, and Harness as template sets over one graph.

**Rejected alternatives:** Live hot-swap machinery as the base design — deleted 2026-09-02; correctness survived its removal, so it was optimization wearing architecture's clothes.

**Open question:** Whether every seam address survives a base rename without a stable id field in the ledger.

**Evidence:** Shipped: the flyweight grid at 20 million cells with the logic seam in place (78.8 ms median seeding, commit c2ec75fb); ChooseField's `runner` prop in production; ivue creating one million instances in 22 ms; Invar at 94,000 agent-written lines under the standard. Design-stage: `tasks/malleable-architecture.md`, every section dated.

**Impossible if true:** A part that must be modified by a procedure different from every other part; an interface whose cost grows with a dataset it is not showing; a modification whose artifact is larger than its change; an apply whose failure cannot be undone by replaying less.

**Verification:** Run every component record's Verification; the generator holds when all hold and the design-stage records have moved to runnable commands.

**Status:** provisional

**Last refined:** 2026-09-02

## Reality-based invariants

### Cost follows observation not existence

**Invariant:** If work is performed only for what is read, rendered, or indexed, then cost scales with the observed set and not with the size of what exists.

**Scope:** Every layer of the stack: instance creation, derivation tracking, rendering, indexing, search, context retrieval.

**Mechanism:** Lazy materialization pays nothing for a cell until it is read; virtualization renders only the viewport; an incremental index writes only what changed; a retrieval index carries references, not content. Each defers the cost to the moment of observation, and unobserved work is never done. The same principle games call frustum culling.

**Generates:** Creation that does not scale with members declared; grids bounded by the viewport; tail-first opening of arbitrarily large logs; the retrieval index as compaction; the claim that reload is cheap.

**Evidence:** ivue creates one million instances in 22 ms because no cell materializes before first access (`docs_v2/guide/performance.md`); the flyweight grid holds 20 million cells and renders about 400 DOM cells; the virtual scroller lands pixel-exact at the end of a 400,000-character book. Sibling record in Invar: `project.invariants.md` "Cost tracks the actively observed set".

**Impossible if true:** A viewer whose open time grows with file size while its window does not; an instance whose creation cost grows with unread members.

**Verification:** Open `examples/playground` at the flyweight grid; the page reports seeding time under 90 ms for 20 million cells with roughly 400 rendered cells in the DOM.

**Status:** provisional

**Last refined:** 2026-09-02

### A class is fixed at construction

**Invariant:** If an instance was constructed from a class, then replacing the class in its namespace slot afterwards does not change that instance; only constructions that read the slot later follow the replacement.

**Scope:** Every namespace slot (`X.Class`) and every instance built from it, in every realm.

**Mechanism:** JavaScript sets an object's prototype at construction. The slot is a mutable binding read at `new` time; the instance keeps the prototype it was given. Late reads are what make the slot swappable; the instance is what the swap cannot reach.

**Generates:** The rule that constructions are malleable and live instances are not; the reload verb; the ledger replay happening before construction, at boot.

**Evidence:** `lib/Reactive.ts` transforms prototypes and returns the same class; `examples/playground/src/examples/flyweight-grid/model/FlyweightSheet.ts` reads `FlyweightLogic.Class` through a seam at construction time.

**Impossible if true:** A live instance whose behavior changes because its namespace slot was reassigned after it was built.

**Verification:** Construct an instance, reassign `X.Class` to a subclass, and assert the existing instance's prototype is unchanged while a new construction gets the subclass.

**Status:** provisional

**Last refined:** 2026-09-02

### A module evaluates once per realm

**Invariant:** If a module has been evaluated in a realm, then every later import of it returns the same module and its module-scope expressions never run again in that realm.

**Scope:** Every ES module in the renderer, including single-file components whose `defineProps` argument is evaluated at module scope.

**Mechanism:** The ES module loader caches evaluated modules by specifier for the life of the realm. Unmounting and remounting an application reuses the cache. A component's contract, read once at module evaluation, is therefore frozen until a new realm evaluates the module again.

**Generates:** Reload as the only full refresh; ledger replay before component imports; the demotion of soft remount to a partial refresh.

**Evidence:** `tasks/malleable-architecture.md`, the invalidation section; the ES module specification's module map.

**Impossible if true:** A soft remount that re-reads a component's contract; a module-scope expression that runs twice in one realm.

**Verification:** Reassign a namespace slot after a component module has loaded, remount the app without reload, and assert the component's props option is unchanged.

**Status:** provisional

**Last refined:** 2026-09-02

### Data that left the machine cannot be recalled

**Invariant:** If bytes have been sent to another host, then no local action can unsend them, so egress is the one action recovery cannot reach.

**Scope:** Every network write from any process of the application, including generated code and hosted agents.

**Mechanism:** Transmission hands the bytes to a party outside local control. Every other destructive action has a local inverse: a deleted file returns from trash, a bad overlay is replayed away, a crashed renderer restarts. Transmission has none.

**Generates:** Egress as the one held line under the unrestricted tier; the default-deny allowlist; the local proxy as the enforcement point.

**Evidence:** `tasks/malleable-architecture.md`, the trust tier section and its 2026-09-02 correction.

**Impossible if true:** A recovery mode that restores confidentiality after transmission.

**Verification:** Inspection: no record in this contract or the narrative claims a rollback of transmitted data.

**Status:** provisional

**Last refined:** 2026-09-02

### An append-only log has stable addresses

**Invariant:** If records are only ever appended, then every record index and byte offset is permanent, so a window over the log stays consistent while the log grows and a key that names a record stays valid forever.

**Scope:** Agent transcripts, the customization ledger, and every index built over either.

**Mechanism:** Appending changes nothing before the end. Offsets of earlier records cannot move, indices cannot be reused, and a sparse index written at append time remains correct. A window addressed by index reads the same records it read before, plus whatever arrived.

**Generates:** The harness-written block index; tail-first opening; retrieval keys that carry the record index; live tail by push without re-indexing.

**Evidence:** `tasks/malleable-architecture.md`, the transcript viewer section; the ledger's replay-a-prefix recovery, which depends on prefix stability.

**Impossible if true:** A record whose index changes after a later append; a retrieval key that resolves to a different record than it did when written.

**Verification:** Append to a fixture log with a sparse index and assert every previously recorded offset still resolves to the same record.

**Status:** provisional

**Last refined:** 2026-09-02

### Only a rendered element has a true height

**Invariant:** If an element's height depends on its content, then that height is known only after layout, and any value produced before rendering is an estimate.

**Scope:** Every variable-height item in a virtualized list or grid.

**Mechanism:** Layout is the only process that resolves fonts, wrapping, and nested content into pixels. A predictor can approximate it from metadata and can be wrong by any amount.

**Generates:** Index-anchored scrolling with a measured window and no height estimator; layout inside one frame so measuring never shows an intermediate paint.

**Evidence:** `examples/playground/src/examples/virtual-scroller/VirtualScroller.ts`; the deletion of the estimator on 2026-09-02 in `tasks/malleable-architecture.md`.

**Impossible if true:** A pre-render height that is exact for every item of arbitrary content.

**Verification:** Render a fixture item with wrapped text and assert its measured height differs from any constant prior.

**Status:** provisional

**Last refined:** 2026-09-02

## Chosen invariants

### Every component exposes the same three seams

**Invariant:** If a component is behavioral, then it exposes exactly three seams: a contract as data, an injectable runner that drives it, and a boundary through which the runner touches the outside, which is a template in the renderer and a capability grant in the backend.

**Scope:** Every behavioral component in the renderer and every service in the backend; a markup-only leaf may stay classless.

**Mechanism:** An agent can replace any part only if every part is replaceable the same way. Three named seams give one procedure for finding and swapping any part. The gate can verify the shape because it is a shape, not a convention.

**Generates:** The universal component shell; gate-checkable component form; swap reach by construction, because each component holds its own inner `:is`.

**Rejected alternatives:** Adopt the shell only where malleability is wanted — partial adoption leaves parts the agent cannot address, and the law is uniformity of seams, not of use.

**Evidence:** ChooseField ships the runner seam over a Quasar base in production; the shell design in `tasks/malleable-architecture.md`.

**Impossible if true:** A behavioral component whose driver cannot be injected; a component whose view cannot be replaced from within.

**Verification:** When the shell lands: a gate check that every `.vue` file constructing a `.Class` reads `props.runner ?? new` and renders a `<component :is` fallback pair.

**Status:** provisional

**Last refined:** 2026-09-02

### The contract lives on the class as a static getter

**Invariant:** If a class owns a component's contract, then the contract is a static getter on that class whose body builds every entry fresh, so each read is a unique object and a subclass extends it with `super`.

**Scope:** Every props and emits contract of a shell component.

**Mechanism:** A getter runs on every read, so no two components share a mutable contract object. Static inheritance and `super` are native, so `static override get props()` spreading `super.props` inherits the contract through the same chain as behavior. Entries built inside the body keep the shallow spread unique; a hoisted shared entry reintroduces sharing.

**Generates:** Contracts that inherit with the class; `noImplicitOverride` narrating contract extension; the namespace's one-dot enumeration including the contract.

**Rejected alternatives:** A separate exported contract constant — it is the only part of a component that does not follow the inheritance chain, so variants must re-import and re-spread it by convention.

**Open question:** Whether emits and slots join the getter as data, so the mount-time verifier covers all three channels.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the contract home ruling; the shipped `propsWithDefaults` contract system it builds on.

**Impossible if true:** Two components observing the same contract object; a subclass whose contract cannot reach its parent's entries with `super`.

**Verification:** When MediaField and ContactField are converted: assert `MediaField.$Class.props !== MediaField.$Class.props` and that `ContactField.$Class.props` contains every key of its parent's.

**Status:** provisional

**Last refined:** 2026-09-02

### A runner swap preserves the contract

**Invariant:** If a runner is swapped into a component, then it honors the component's declared contract; a variant that needs new inputs is a new view rendered through the component's own inner `:is`, whose contract is the runner itself.

**Scope:** Every runner injection and every generated view.

**Mechanism:** The declared props are read once at module evaluation and belong to the shell. A runner arriving at mount cannot widen them. New inputs therefore come from the runner's own state, derivations, or ledger configuration, and the inner view reads them through one prop. The parent never changes, because no component is ever replaced, only re-driven and re-skinned from within.

**Generates:** The dissolution of the runner-contract bootstrap; mount-time verification of an arriving runner's contract against the declared set.

**Rejected alternatives:** Late-bound component registration so parents can swap children — unnecessary once each component swaps itself from within; kept only for a new component type where none existed.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the bootstrap ruling and its 2026-09-02 review note.

**Impossible if true:** A runner swap that changes a component's parent-facing props; a parent template edited to reach a child variant.

**Verification:** When the shell lands: inject a subclass runner with extra state and assert the parent-facing props set is unchanged while the inner view renders the extra state.

**Status:** provisional

**Last refined:** 2026-09-02

### Self-construction is the default

**Invariant:** If a component's runner is the component's own state, then the shell constructs it in setup; a runner is injected only when the instance exists independently of the view.

**Scope:** Every shell component's runner resolution.

**Mechanism:** A runner constructed in setup rides the component's effect scope, so its watchers are reaped on unmount for free. An injected runner is an outliving instance someone must dispose. The default path already reads the mutable namespace slot late, so it is globally swappable without injection.

**Generates:** Automatic lifecycle for the common case; injection reserved for entity views and long-lived sessions; the entity riding in as a prop to a self-constructed view-model.

**Rejected alternatives:** Injection as the default — it makes manual lifecycle the norm for every component to serve flexibility most sites never use.

**Evidence:** The ivue standard's split between component-scoped and outliving instances (`.claude/skills/ivue/SKILL.md`); ChooseField's `props.runner ?? new` shape.

**Impossible if true:** A shell that requires every call site to construct its runner.

**Verification:** `grep -rn "props.runner ??" --include=*.vue examples docs_v2` lists every shell component's setup with the nullish default.

**Status:** provisional

**Last refined:** 2026-09-02

### Construction never lives in a template

**Invariant:** If a runner must be built for a list item, then the owner class builds it once and caches it by item, or the item rides in as a prop; a template expression never constructs an instance.

**Scope:** Every `v-for` that binds a runner.

**Mechanism:** A template expression re-runs on every parent render. Since the shell reads its runner once in setup, an inline `new` produces a discarded instance per render while the child keeps the first, and any watchers the discarded instances registered leak. A keyed cache on the owner returns the same instance across renders.

**Generates:** The `runnerFor` cache pattern keyed on the item; the site where per-item overlays apply, because the owner decides which class to construct.

**Evidence:** The ivue standard's rule that logic never lives in a template expression; `tasks/malleable-architecture.md`, the list construction ruling.

**Impossible if true:** A `:runner="new` binding in any template.

**Verification:** `grep -rn ':runner="new ' --include=*.vue examples docs_v2 newsletter` returns nothing.

**Status:** provisional

**Last refined:** 2026-09-02

### Every change is a delta replayed at boot

**Invariant:** If a user or agent modifies the application, then the modification is stored as a delta against a named seam, in an append-only ledger, and applied by replaying the ledger at boot; the base is never edited.

**Scope:** Every customization: subclasses, views, backend services, dependency patches, and data extensions.

**Mechanism:** A subclass contains only its overrides, so inheritance is the diff format and the artifact is as small as the change. Replaying a prefix of the ledger is rollback; an empty ledger is safe mode; a quarantined entry is skipped on replay. A base upgrade diffs the ledger against changed seams and names what needs regeneration.

**Generates:** Minimal artifacts by construction; recovery without undo logic; upgrades that do not destroy customizations; the same shape for dependency patches, which are deltas replayed on install.

**Rejected alternatives:** Config objects or forked files as the customization unit — each carries the whole surface, so the change drowns in it.

**Open question:** How overlays targeting the same seam chain, and how a dependent overlay is quarantined when its dependency is removed.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the self-modifying app and recovery sections; the newsletter ledger's acknowledged-delivery invariant as the pattern's shipped ancestor.

**Impossible if true:** A customization stored as a copy of the base; a rollback that requires inverse operations.

**Verification:** When the ledger lands: apply two entries, replay a prefix of one, and assert the resulting graph equals a fresh boot with only the first entry.

**Status:** provisional

**Last refined:** 2026-09-02

### Reload is the only apply verb

**Invariant:** If a ledger entry is applied, then the renderer realm is discarded and rebuilt with the ledger replayed before component imports, and observed state is snapshotted before and restored after; no live instance is patched in place.

**Scope:** Every apply, rollback, quarantine, and safe-mode entry in every renderer.

**Mechanism:** A class is fixed at construction and a module evaluates once per realm, so only a fresh realm reaches every construction and every contract. Instances are plain objects whose cells materialize on first read, so the observed state is exactly the enumerable cells of the graph's roots, and unread state needs no saving. In the desktop shell the new renderer loads hidden, restores, and swaps in one repaint; the agent lives in main and never notices.

**Generates:** Apply, rollback, quarantine, and safe mode as one operation with different ledger lengths; the unreachability of stale-instance bugs; the warm-standby renderer.

**Rejected alternatives:** Per-seam epochs, key-bump remounts, and Vue's HMR runtime as the base mechanism — removed on 2026-09-02 by deletion test; correctness survived, so they were optimization.

**Open question:** Which ephemeral UI state, such as an open menu or a text selection, is worth capturing beyond the graph's cells.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the simplification ruling.

**Impossible if true:** An apply path that mutates a mounted instance's class; a renderer that keeps instances built before the ledger changed.

**Verification:** When the shell lands: apply an entry, assert the renderer's process id or realm changed, and assert a dirty form field's value survived.

**Status:** provisional

**Last refined:** 2026-09-02

### Main compiles and the renderer receives JavaScript

**Invariant:** If code is generated at runtime, then it is transpiled, gated, and compiled in the main process or a service, and the renderer loads the finished JavaScript as a module without any evaluator of its own.

**Scope:** Every generated class, view, and single-file component.

**Mechanism:** Generated code is TypeScript and the browser runs JavaScript; the gate is Node. Compiling in main keeps `unsafe-eval` and the runtime template compiler out of the renderer, and lets the Vue compiler emit build-time optimizations for generated templates exactly as for shipped ones. The application ships its own type declarations so the gate can typecheck generations against the real graph. Delivery is a blob-URL module import under a content security policy that permits blob scripts only.

**Generates:** Trial promotion on a fast transpile with full typecheck in the background; a renderer with no evaluator; import rewriting to a renderer module registry.

**Rejected alternatives:** The runtime compiler and an eval-permitted window in the renderer — both dissolved once compilation moved to main.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the gap register's second ruling.

**Impossible if true:** A renderer content security policy containing `unsafe-eval`; a generated template compiled in the renderer.

**Verification:** When built: the renderer's policy header lists `blob:` and not `unsafe-eval`, and the renderer bundle does not contain the Vue compiler.

**Status:** provisional

**Last refined:** 2026-09-02

### Extensions never run in main

**Invariant:** If backend code is generated or installed at runtime, then it runs in a supervised host process and receives capability objects, never bare imports of platform modules.

**Scope:** Every generated or third-party backend service in the desktop shell.

**Mechanism:** A separate process can be killed and restarted; a module loaded into main cannot be unloaded and takes the application down when it crashes. Crash isolation and hot-swap force the rule regardless of trust level. A capability object carries its scope, so the same code path serves every grant.

**Generates:** The extension host; capability handles as the only route to the filesystem, network, and processes; the ledger entry that spans a feature's backend and frontend halves.

**Rejected alternatives:** One process per extension — too heavy; one host holds many runners, with a separate process only for the untrusted.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the backend section and its 2026-09-01 correction.

**Impossible if true:** A generated service that imports `fs` directly; a service crash that terminates the main process.

**Verification:** When built: `grep -rn "from 'fs'\|require('fs')" <extension-host-dir>` returns nothing outside the capability layer.

**Status:** provisional

**Last refined:** 2026-09-02

### Full access is a grant with root as its scope

**Invariant:** If the user runs their own application on their own machine, then the default tier grants full authority through the same capability handles at root scope; a narrower scope applies only to code the user did not personally request.

**Scope:** The trust tiers of the desktop shell: unrestricted for the owner's own prompts, scoped for shared overlays and unattended runs.

**Mechanism:** The grant system exists for the user to restrain what is not them. Root is a scope value, so no second API exists for the unrestricted case and nothing is rewritten when a scope changes. Audit records every capability use in every tier, because recording costs nothing and blocks nothing. Recovery, not prompting, is what makes the unrestricted tier survivable.

**Generates:** Two tiers instead of a permission taxonomy; a single code path per capability; audit always on; the sharing story built on the scoped tier.

**Rejected alternatives:** A prompt per filesystem call — it destroys the loop the product sells and is paternalism toward the owner.

**Evidence:** The agent fleet runs codex and claude with permissions bypassed nightly (`.claude/skills/agent-fleet/SKILL.md`); design-stage: `tasks/malleable-architecture.md`, the trust tier ruling.

**Impossible if true:** A restricted API beside a real one; a capability use in any tier that leaves no audit record.

**Verification:** When built: exercise a filesystem handle at root scope and at a path scope and assert both go through one class with one audit row each.

**Status:** provisional

**Last refined:** 2026-09-02

### Delete means move to trash

**Invariant:** If a capability handle deletes a file, then the file is moved to the system trash and never unlinked, at every scope and in every tier.

**Scope:** Every filesystem capability object the shell hands to generated code, hosted agents, or itself.

**Mechanism:** The ledger recovers the application, not the user's data; it holds nothing of the home folder. Under the unrestricted tier a bad overlay could otherwise destroy user files as irrecoverably as exfiltration. Routing every delete through trash gives user data the local inverse that egress lacks. A shell spawned by the agent bypasses the handle, so spawn stays outside recovery and is audited always.

**Generates:** The truth of the claim that recovery buys the right to run unrestricted; spawn named as the audited exception.

**Rejected alternatives:** Claiming the ledger restores deleted files — a false sentence removed from the narrative on 2026-09-02.

**Evidence:** `tasks/malleable-architecture.md`, the 2026-09-02 correction in the trust tier section.

**Impossible if true:** A capability handle that unlinks a file; a recovery claim covering files removed through spawn.

**Verification:** When built: `grep -rn "unlinkSync\|rmSync\|fs.rm(" <capability-layer>` returns nothing, and a delete through the handle leaves the file in the trash.

**Status:** provisional

**Last refined:** 2026-09-02

### All egress passes through the local proxy

**Invariant:** If any process of the application or any hosted agent sends bytes off the machine, then the bytes pass through the local proxy, which enforces the user's allowlist, records the audit row, and observes the content.

**Scope:** Renderer, extension host, and every hosted agent whose base URL is redirected to the proxy.

**Mechanism:** The renderer has no direct network; its content security policy permits only the proxy. Hosted agents honor base-URL environment variables, so their model calls arrive in plaintext at the proxy without interception. One wire therefore serves as firewall, as the integration layer for any HTTP service the user enables, and as the observability tap that sees system prompts, tool definitions, and every turn.

**Generates:** The default-deny allowlist; integrations without a marketplace; the transcript of any hosted agent; governed mode, where the proxy injects fundamentals, unifies hooks, gates outputs, and controls compaction.

**Rejected alternatives:** A per-shell network API such as session request hooks — kept as defense in depth, never as the enforcement point, because the proxy is shell-agnostic.

**Open question:** Whether an agent that ignores base-URL overrides is worth a local certificate authority, an install step on the user's own machine.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the egress and observability sections; the agent fleet's launch commands, which already set per-agent environment.

**Impossible if true:** A renderer policy that permits a remote `connect-src`; a hosted agent's model call that the proxy did not record.

**Verification:** When built: the renderer policy lists only the proxy origin, and a hosted agent's turn appears in the transcript viewer with its request and response.

**Status:** provisional

**Last refined:** 2026-09-02

### Every view is a window over an indexed source

**Invariant:** If a surface shows a collection, then it is the window primitive over a source adapter that maps an index range to items, and the view never holds more than the observed window plus a prefetch margin.

**Scope:** Every list, grid, log, transcript, directory, result set, and file view in the application.

**Mechanism:** The virtual scroller and the flyweight grid are one primitive in one and two dimensions. A source is anything addressable by index: a block-indexed log, a row-indexed CSV, a statement-indexed dump, a database by keyset, a directory by entry, a stream by arrival. An adapter is a `Static()` capability class, so an agent can write one. Main holds the bytes; the renderer holds the window; memory is a function of the screen. Computing over the whole dataset is not bounded by the window, so a compute engine in main answers queries and the window shows the result.

**Generates:** One interface for every data size; the transcript viewer; the CSV and SQL surfaces; adapters as the agent's way to summon machinery; DuckDB in main as the compute engine behind the window.

**Rejected alternatives:** A bespoke viewer per source — every viewer re-derives scrolling, selection, export, and per-cell components.

**Evidence:** Shipped: the virtual scroller at one million rows in twelve DOM nodes; the flyweight grid at 20 million cells. Design-stage: `tasks/malleable-architecture.md`, the window primitive section.

**Impossible if true:** A collection view whose memory grows with the collection; a source that needs its own scrolling implementation.

**Verification:** Open the virtual scroller and flyweight grid examples in `examples/playground` and assert rendered element counts stay bounded while the dataset grows.

**Status:** provisional

**Last refined:** 2026-09-02

### Context is retained by reference and retrieved on demand

**Invariant:** If a hosted agent's context must be reduced, then every record is kept in the indexed transcript and the agent receives a hierarchical index of stable keys plus tools to retrieve and pin, so nothing is dropped and only distance changes.

**Scope:** Compaction of every governed agent, and the agent's memory across sessions.

**Mechanism:** A summary decides what matters before the need is known; an index defers that decision to the moment of need. Keys carry a slug for meaning and the record index for uniqueness, and an append-only log keeps them stable. The proxy fulfils retrieve and pin calls locally in a sub-loop. Fundamentals are re-injected after every cut. The index is the transcript viewer's own index, re-exposed to the model.

**Generates:** Compaction that loses nothing; pinned ranges that survive every cut; cross-session memory without a vector database; the agent reasoning about its own history as a navigable object.

**Rejected alternatives:** A prose summary as the compacted context — whatever it guesses wrong is gone.

**Open question:** Which heuristic expands a referenced key automatically so a model that under-retrieves still sees what it needs.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the compaction and index rulings; Invar's conductor anchors as the hand-written ancestor of the index entry.

**Impossible if true:** A compaction that discards a record from the transcript; a retrieval key that stops resolving.

**Verification:** When built: compact a fixture session, retrieve a key from before the cut, and assert the full record returns.

**Status:** provisional

**Last refined:** 2026-09-02

### The governor is as observable as the governed

**Invariant:** If the control plane injects, rewrites, gates, or compacts anything on behalf of a hosted agent, then that intervention is written to the same transcript as its own record kind and shown in the same viewer.

**Scope:** Every governed-mode capability of the proxy and every hook the plane fires.

**Mechanism:** The observability claim has a hole exactly where a user would look first if the plane's own actions were hidden. Writing interventions as records makes them filterable, searchable, and exportable like everything else, and lets a user answer why an agent behaved as it did by reading what was done to it.

**Generates:** No action opaque, including the plane's; the honest answer to why route agents through the plane.

**Rejected alternatives:** Logging interventions to a separate operator log — the user would need two viewers and two mental models for one session.

**Evidence:** Design-stage: `tasks/malleable-architecture.md`, the hosted agents section.

**Impossible if true:** An intervention absent from the transcript; a hook that fired without a record.

**Verification:** When built: run a governed session with one injection and assert the transcript contains a record of that kind between the request and the model's reply.

**Status:** provisional

**Last refined:** 2026-09-02
