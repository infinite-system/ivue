---
title: "VS Code spent a decade hand-rolling reactive classes"
description: The most influential TypeScript app is class-OOP with no framework — emitters, disposables, DI decorators, and since 2022 its own signals system. Every one of those subsystems maps to one ivue feature.
date: 2026-07
tags: [story, javascript, patterns]
relatedPosts: [reactive-is-all-you-need, introducing-ivue, the-object-graph-they-took, module-level-state, inheritance-exile]
---

# VS Code spent a decade hand-rolling reactive classes

<BlogPostDate />

![VS Code spent a decade hand-rolling reactive classes](/blog/vscode-hand-rolled-decade.png)

The most influential TypeScript application in the world is not built on
React, Vue, or any framework. VS Code's core is class-based
object-oriented programming, all the way down: models, services, view
models, controllers — thousands of classes wired together by hand. And
because classes with hand-wired change propagation is exactly the problem
ivue solves, VS Code's source tree reads like a decade-long experiment
report on what a reactive class layer has to provide.

The conclusion of that experiment is the interesting part. In 2022 the
VS Code team started building **their own signals system for classes** —
`observableValue`, `derived`, `autorun`, living in
[`src/vs/base/common/observable.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/observable.ts)
— and has been migrating subsystems onto it ever since. When the team
that swore off frameworks hand-builds fine-grained reactivity for class
instances, that's the market saying a substrate was missing.

This post walks through what VS Code's classes actually do — the three
rituals every one of them performs — and maps each ritual to the ivue
feature that deletes it. Not to argue VS Code should adopt anything (it
never will, and the last section says why that's correct), but because
the comparison is the clearest possible answer to "what is ivue *for*?"

## The three rituals

Open almost any model class in VS Code's source and you find the same
three ceremonies, repeated with the discipline of a team that has been
burned by every alternative.

### Ritual one: the emitter pair

Change propagation is manual. A class that owns mutable state declares,
for each independently observable fact, a private `Emitter` and a public
event — then remembers to fire it in every code path that mutates:

```ts
// The shape of a VS Code model class (representative, not quoted)
class TabModel extends Disposable {
  private _label: string;
  private readonly _onDidChangeLabel = this._register(new Emitter<void>());
  readonly onDidChangeLabel = this._onDidChangeLabel.event;

  private _dirty: boolean;
  private readonly _onDidChangeDirty = this._register(new Emitter<void>());
  readonly onDidChangeDirty = this._onDidChangeDirty.event;

  setLabel(label: string): void {
    if (this._label === label) return;
    this._label = label;
    this._onDidChangeLabel.fire();
  }

  setDirty(dirty: boolean): void {
    if (this._dirty === dirty) return;
    this._dirty = dirty;
    this._onDidChangeDirty.fire();
  }
}
```

Five declarations and two guard-and-fire method bodies to make two fields
observable. Consumers subscribe by hand, and every subscription is a
leak until registered for disposal:

```ts
this._register(tab.onDidChangeLabel(() => this.render()));
this._register(tab.onDidChangeDirty(() => this.render()));
```

Now the same model in ivue:

```ts
class $TabModel {
  get label() {
    return ref('untitled');
  }
  get dirty() {
    return ref(false);
  }
}
```

That is not a simplified excerpt — it is the whole thing. The emitter
pair, the fire calls, the equality guards, the subscription plumbing, and
the disposal registration all exist to maintain a dependency graph by
hand. Leaf tracking maintains it structurally: whoever reads
`tab.label.value` inside an effect **is** subscribed, exactly to what it
read, unsubscribed the moment its scope dies. The ~10 lines of ceremony
per observable field aren't compressed — the job they did no longer
exists.

### Ritual two: derived state and the dirty flag

VS Code's view models cache derived values and invalidate them manually —
subscribe to every input's event, set a dirty flag, recompute on next
read. The bug surface is the coordination: fire an event in a new code
path, forget one subscription, and a stale value renders until something
else jostles it. This is why half of VS Code's fixed issues in any
release read "X doesn't update when Y."

ivue's answer is that **derived state is a language feature**. A plain
getter re-derives on read and participates in tracking with zero
allocation:

```ts
class $TabModel {
  get label() {
    return ref('untitled');
  }
  get dirty() {
    return ref(false);
  }

  // derived — no cache to invalidate, no flag to coordinate
  get title() {
    return this.dirty.value ? `● ${this.label.value}` : this.label.value;
  }
}
```

There is no dirty flag because the plain getter *is* the dirty-flag
protocol with the bookkeeping deleted: always consistent, costs one
string concat on read, allocates nothing. And when a derivation is
genuinely expensive — VS Code's marker aggregation, say — `computed()` is
the surgical opt-in, which is precisely the memoize-only-what-earns-it
economics their `derived()` observable exists to provide.

### Ritual three: Disposable, everywhere

Every VS Code class extends `Disposable` from
[`src/vs/base/common/lifecycle.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/lifecycle.ts),
registers everything it owns into a `DisposableStore`, and trusts the
tree of `dispose()` calls to run leak-free. It's the most disciplined
lifecycle culture in open source — and it's load-bearing: one
unregistered listener in an editor that opens ten thousand files is a
real memory leak.

ivue ships the same determinism as engine behavior instead of
inheritance. A component-scoped instance's watchers die with the
component, automatically. An instance that outlives components — the
VS Code case — owns a lazy effect scope:

```ts
class $MarkerService {
  get markers() {
    return shallowRef<Marker[]>([]);
  }

  constructor() {
    this.$watchEffect(() => this.persistFilterState());
  }

  persistFilterState() {
    /* ... */
  }
}

// the owner's dispose() equivalent — one call, everything reaped
markerService.$stopEffects();
```

`$stopEffects()` is `DisposableStore.dispose()` with the store assembled
for you: every `$watch`, every cached cell, released in one call. The
discipline VS Code enforces by convention and code review, the engine
enforces by construction.

## The tell: observable.ts

None of the above is speculation about what VS Code *ought* to want,
because the team wrote down what it wants. Their observable system —
`observableValue` for state, `derived` for memoized computation,
`autorun` for effects, `transaction` for batching — is a signals
implementation purpose-built to live on class instances, and new
subsystems (merge editor, source control graph, testing, chat) are built
on it while older code still speaks emitters.

Put their new idiom next to ivue's and the convergence is almost
uncomfortable:

```ts
// VS Code observable style (representative)
class ChatModel extends Disposable {
  private readonly _requests = observableValue<Request[]>(this, []);
  readonly requestCount = derived(this, (r) => this._requests.read(r).length);
}
```

```ts
// ivue
class $ChatModel {
  get requests() {
    return shallowRef<Request[]>([]);
  }
  get requestCount() {
    return this.requests.value.length; // plain getter — zero bytes
  }
}
```

Same architecture, same reactive granularity, same class-instance
substrate. The differences are the interesting residue: VS Code's
observables are **fields**, allocated per instance at construction —
because vanilla TypeScript has no mechanism to make them lazy. ivue's
ref-getters materialize on first touch and its plain getters never
allocate at all, which is why the comparison isn't just ergonomic. At
VS Code's population scale — tens of thousands of live tabs, tree items,
markers, decorations — per-instance reactive allocation is the whole
memory story. That's the gap the
[heap table](/guide/performance#memory-derivations-weigh-nothing)
measures: ~3.7 KB per instance for an ivue class against 8–20 KB for the
allocate-per-instance shapes, multiplied by populations that VS Code
actually holds.

## The service layer, without the injector

VS Code's dependency injection —
[`createDecorator`](https://github.com/microsoft/vscode/tree/main/src/vs/platform/instantiation),
constructor parameter decorators, an `InstantiationService` resolving a
registry — exists to solve two problems: services must resolve lazily
(the startup budget is sacred), and the service graph is a web of mutual
references that naive imports would deadlock.

Those are exactly the two problems the `$`-getter and the namespace
pattern solve, without an injector:

```ts
class $EditorGroupModel {
  private get $config() {
    return useConfigurationService(); // resolved on first touch, cached forever
  }
  get tabHeight() {
    return this.$config.density === 'compact' ? 22 : 35;
  }
}
```

First-touch resolution *is* lazy initialization; module-level singletons
through composable functions *are* the registry; and cross-module cycles
dissolve because every cross-reference lives in a getter body that runs
long after all modules load — [late resolution by construction](/guide/modules#circular-references-resolve-by-construction),
not by injector indirection. The
[Pinia Store Alternative](/examples/class-store) is this service layer in
miniature: the class is the service, one line makes it a singleton, and
nothing resolves until first use.

## The rendering boundary, and the flyweight

VS Code's deepest performance choice is that **the editor never renders
what exists — only what's observed**. The text buffer is a piece tree
holding millions of lines as plain data; the view renders the viewport's
worth of DOM by hand; reactivity, where it exists, is a sparse layer over
raw structures.

That is, verbatim, the invariant ivue's extreme examples are built on.
The [1,000,000-row scroller](/examples/virtual-scroller) is the
viewport-over-plain-data discipline; the
[20,000,000-cell flyweight grid](/examples/flyweight-grid) is the full
architecture — columnar ground truth in typed arrays, disposable facades
per render, a reactive overlay that materializes per observation and
evicts with the viewport, 4.7 bytes per live cell. An editor buffer and a
spreadsheet model are the same problem wearing different file
extensions, and "everything costs proportional to what's observed,
nothing costs proportional to what exists" is the sentence both
architectures are built from.

## What this does not claim

Honesty about the limits makes the rest worth believing:

- **VS Code core will never adopt a framework dependency**, ivue
  included, and shouldn't: its startup budget and dependency policy are
  part of why it wins. The claim is not "VS Code should use ivue."
- **True hot paths stay raw in any architecture.** The piece tree doesn't
  want reactivity per node; keystroke latency is hand-tuned. ivue's
  answer is the same as VS Code's — ground truth in plain structures,
  reactivity as a sparse overlay — plus
  [one-line hoisting](/guide/performance#hot-loops) where reads must run
  at native ref speed.
- **Vue's renderer is for app chrome, not editor surfaces.** Tabs,
  sidebars, panels, palettes — vdom territory. The text grid itself wants
  virtualization, which is what the examples demonstrate.

The claim is narrower and stronger: **for teams building VS Code-class
applications on Electron and web tech — IDEs, DAWs, design tools, data
platforms — ivue is the substrate VS Code's architecture converged
toward, available as a kilobyte instead of a decade.** The same classes,
services, models, and deterministic teardown; the reactive graph
maintains itself; the memory economics survive desktop-scale object
populations.

VS Code proved that serious software wants reactive classes badly enough
to build them from scratch, twice — emitters first, signals second. ivue
is what it looks like when that substrate is a library.
