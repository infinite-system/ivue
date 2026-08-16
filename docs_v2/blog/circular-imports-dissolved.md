---
title: 'Circular imports, dissolved'
description: JavaScript's oldest structural wound — module A needs B, B needs A — was never about the cycle. It was about the clock. One idiom moves every cross-module reference from load time to first access, and 372 files with a deeply cyclic domain graph produce zero import cycles. Measured, not promised.
date: 2026-08
tags: [javascript, architecture, engine]
---

# Circular imports, dissolved

<BlogPostDate />

![Circular imports, dissolved](/blog/circular-imports-dissolved.png)

Every JavaScript codebase that grows past a few dozen files meets the
same wall:

```
ReferenceError: Cannot access 'BaseView' before initialization
```

Somewhere, module A imported B, and B — perhaps three hops away,
through a barrel file nobody remembers writing — imported A. The
loader had to pick which one evaluates first. It picked. Something
read a binding that did not exist yet, and the program died before it
ran.

The ecosystem has spent fifteen years treating this as a fact of
nature — something to lint against, refactor around, and inject past.
It is not a fact of nature. It is a timing error, and it has a
structural fix so complete that a 372-file codebase with a deeply
circular domain graph can measure **zero** import cycles — not
because the cycles were broken, but because they stopped mattering.

## The crash is real — the diagnosis is wrong

Here is what actually happens. When an ES module graph loads, the
runtime evaluates modules depth-first: before your module's body
runs, each of its imports runs first. A cycle makes that impossible
for everyone — someone in the loop has to go first, and while it
evaluates, the modules that point back at it are only
half-initialized. ES modules handle this gracefully in the
mechanism: imported bindings are *live* — views onto the exporting
module's slots, not copies — so a binding that is `undefined` during
loading becomes real the moment its module finishes.

Which means the crash never comes from the cycle itself. It comes
from code that **reads a binding at load time** — while the graph is
still initializing:

```ts
// The everyday load-time reads — each one is a bomb in a cycle:
class MenuView extends BaseView {}          // extends evaluates NOW
export const registry = new Registry();     // top-level construction
export const config = loadConfig(paths);    // top-level call
const client = createClient(Settings.url);  // top-level dependency read
```

Move the read to run time — inside a method, a getter, a callback —
and the same cycle is harmless, because by the time any method runs,
**every module in the graph has finished loading**. CommonJS tells
the same story with worse manners: instead of a `ReferenceError` you
get a half-filled `exports` object and an `undefined` that detonates
minutes later, somewhere else.

> A cycle never crashes a program. A load-time read of a
> half-initialized module does. The cycle just arranges the meeting.

The language did its half of the work when ES modules shipped live
bindings. What the ecosystem never supplied was the other half: a way
to write code where load-time reads of other modules *cannot occur*.
Not "are avoided when everyone is careful" — cannot occur, by the
shape of the code.

## The domain was never acyclic

Before the fix, look at what the standard workarounds actually cost,
because the price is paid in design, not syntax.

A customer has orders; an order belongs to a customer. A workspace
holds documents; a document knows its workspace. An editor owns a
selection; the selection reaches back to the editor to scroll itself
into view. **Domain graphs are cyclic because reality is cyclic** —
mutual reference is what it means for two things to be related.

The ecosystem's tools all answer this by bending the domain to
please the loader:

- **`import/no-cycle`** — a lint rule that bans the topology
  outright. Teams obey it by merging cohesive files into one, or
  extracting shared fragments into `utils/` dumping grounds whose
  only design rationale is "the linter stopped complaining."
- **`forwardRef`** — Angular and NestJS ship a function whose entire
  purpose is to wrap a reference in a closure so the framework reads
  it later: `@Inject(forwardRef(() => OrderService))`. It is the
  correct instinct — defer the read — expressed as a per-site patch
  with a warning label, applied only after the crash tells you where.
- **Deferred `import()`** — turning a static dependency into an
  async one, infecting every caller with a `Promise`, to solve a
  problem that has nothing to do with asynchrony.
- **Load-order rituals** — README sections explaining which barrel
  file must be imported first. Order-sensitivity as documentation.

Every one of these treats the symptom at one call site and leaves
the disease in place. And the disease compounds: the workarounds are
viral (one `forwardRef` breeds more), invisible until runtime, and
worst of all they push teams toward *acyclic architectures for
cyclic domains* — the model contorted to fit the loader.

> The object graph is cyclic because the world is cyclic. A lint
> rule cannot fix the world.

## The reduction: it was never the cycle — it was the clock

Strip the problem to its load-bearing structure and one variable
remains. A program has two clocks:

- **Load time** — modules evaluating, in some order, with the
  ordering constraint that causes everything above.
- **Run time** — everything after. No ordering constraint exists
  here, because *loading is over*. Every module is complete.

A reference is dangerous or safe depending on **which clock it reads
on** — nothing else. The topology is irrelevant. So the fix is not
to break cycles, manage cycles, or document cycles. It is to move
every cross-module reference to the second clock, *structurally*, so
that no discipline, vigilance, or lint rule is ever needed again.

That is what the [namespace pattern](/guide/namespace-pattern) does.

## The idiom

Every class module exports the same three-line namespace:

```ts
// Customer.ts
import { Reactive } from 'ivue';
import { ref } from 'vue';
import { Order } from './Order';

class $Customer {
  constructor(public name: string) {}

  get orders() {
    return ref<Order.Model[]>([]);
  }

  // Access-time reference: `Order.Class` is read when this METHOD
  // runs — long after every module has finished loading.
  placeOrder(total: number) {
    const order = new Order.Class(this, total);
    this.orders.value.push(order);
    return order;
  }
}

export namespace Customer {
  export const $Class = $Customer; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;
  export type Model = InstanceType<typeof Class>; // raw-instance type
}
```

```ts
// Order.ts
import { Reactive } from 'ivue';
import { ref } from 'vue';
import { Customer } from './Customer';

class $Order {
  constructor(
    public customer: Customer.Model, // type-space reference — free
    public total: number,
  ) {}

  get status() {
    return ref<'open' | 'shipped'>('open');
  }

  // Access-time reference back into the module that references us.
  // The cycle is COMPLETE — Customer needs Order, Order needs
  // Customer — and nothing anywhere can observe it.
  customerName() {
    return this.customer.name;
  }
}

export namespace Order {
  export const $Class = $Order; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;
  export type Model = InstanceType<typeof Class>;
}
```

Look at what each piece does to the clock:

- **The import is load-time, but it only touches the namespace
  object** — a container created the instant its module starts
  evaluating. Nobody reads `Order.Class` *through* it yet.
- **Every cross-module value reference lives inside a method or
  getter body** — `new Order.Class(...)`, a store touched through a
  [`$`-cached getter](/guide/state#prefixed-singletons), a
  capability class read through a static getter. All of it runs on
  the second clock.
- **Services and capability classes get the same one-liner.** The
  shape Invar uses at thirty sites:

```ts
class $TextEditing {
  // Late dependency read: the LIVE class slot, resolved per call.
  // Cycle-proof, subclass-overridable, zero-cost DI — one line.
  protected static get Files() {
    return Files.Class;
  }

  saveActiveDocument() {
    return (this.constructor as typeof $TextEditing).Files.write(this.activePath());
  }
}
```

No container, no decorators, no registration step, no `forwardRef`.
The "dependency injection framework" is a property read that happens
to occur after loading has finished.

## The one eager edge is the one that cannot be circular

One cross-module reference stays on the first clock: inheritance.
`class $Container extends BaseElement.$Class` evaluates at load
time — that is why the namespace publishes the immutable `$Class`
anchor for children to extend.

And this is the quietly beautiful part: **inheritance is the one
relation that is acyclic by logic, not by discipline**. A class
cannot be its own ancestor — not in JavaScript, not in any language,
not as a matter of syntax but as a matter of what "ancestor" means.
So the pattern's partition lands exactly on the joint:

> Eager where cycles are logically impossible. Lazy where cycles are
> legal. The pattern splits references along the same line the
> problem does — which is why nothing leaks.

There is no residue. The references that *can* form cycles all
resolve at access time; the reference that resolves at load time
*cannot* form one. The failure mode does not become rare. It becomes
inexpressible.

## Types ride free

Notice `Customer.Model` in `$Order`'s constructor — a type-space
reference into the module that value-references us back. This costs
nothing, ever: TypeScript erases type imports at compile time, so a
type-level cycle evaluates no code and cannot crash anything.

The pattern therefore splits the two spaces exactly where the
language splits them. **Type space may be as cyclic as the domain
demands** — mutual typing is the normal case, not an exception.
**Value space is acyclic-in-effect** — not because the edges are
gone, but because none of them is read while order matters.

Invar's import graph shows both halves at once: four type-level
strongly-connected components exist — the largest spans nine files
across the workspace, syntax, and search modules — and they are
completely inert. Nobody breaks them up, because there is nothing to
break.

## Measured at scale

Claims about module hygiene are usually vibes. This one is a graph
algorithm. [Invar](/blog/introducing-invar) — the terminal IDE built
on ivue — is 372 source files across 37 modules, 94,054 lines, with
exactly the kind of domain that produces import-cycle hell:
workspaces hold documents, documents reach language services,
language services reach back into workspaces, plugins touch
everything.

A codebase's imports form a directed graph: every file is a node,
and an edge runs from A to B when A imports B. A cycle is any path
that returns to its start. But "count the cycles" is the wrong
question to ask that graph — the number of distinct cycles can grow
*exponentially* with graph size, which is why cycle-listing tools on
tangled codebases either truncate their output or grind forever. The
well-posed question is: **how many knots?** A knot — formally a
*strongly connected component* — is a maximal group of files that
can all reach each other through imports. Every cycle, however long
and however many there are, lives entirely inside one knot. Zero
knots of two or more files means zero cycles — provably, not
probably.

That question has a famous answer.
**Tarjan's algorithm** (Robert Tarjan, 1972) finds every strongly
connected component in a single depth-first traversal — linear in
files plus imports. Each file gets a visit index on first arrival
and a *lowlink*: the smallest index reachable from anywhere in its
subtree. When the traversal finishes a file whose lowlink still
equals its own index, everything above it on the visit stack peels
off as one component. One pass, no revisits, mathematically
complete — it cannot miss a cycle, at any scale.

The whole audit is
[seventy lines with zero dependencies](https://github.com/infinite-system/ivue/blob/main/docs_v2/scripts/cycle-audit.mjs) —
walk the tree, regex the imports, run Tarjan twice: once over
**value imports** (edges that survive compilation) and once over
**all imports** including `import type` (edges that exist only for
the type checker and are erased before anything runs). Point it at
any codebase: `node cycle-audit.mjs src`.

Invar's numbers (measured 2026-08-11; type-declaration files carry
no value imports and are excluded):

```
files analyzed:                 371
value-import knots:               0
type-only knots:                  4   (largest: 9 files — inert)
forwardRef sites:                 0
cycle-breaking dynamic imports:   0
```

The three `await import()` calls in the entire codebase load
third-party vendor plugin artifacts and a platform introspection
module — things that are *genuinely* dynamic. Not one exists to
dodge initialization order.

Zero is the interesting number because of what it makes impossible:
**there is no arrangement of these 372 files' load order that
changes the program's behavior.** Load order — the thing entire
README sections, lint configs, and framework features exist to
manage — has ceased to be a variable. Nobody on that codebase has
ever debugged an initialization-order crash, drawn an import graph
on a whiteboard, or extracted a third module to appease a linter.
The problem is not handled well. It is absent.

### Why zero is normally out of reach

Run any cycle detector against a mature codebase and the normal
result is dozens of knots — sometimes hundreds. Teams triage the
list, allowlist the worst offenders, and eventually mute the rule.
That is not because those teams are careless. It is because, under
the ordinary way of writing JavaScript, **the value-import graph
mirrors the domain graph** — a load-time binding per relationship —
and the domain graph is cyclic. The cycles in the report *are* the
shape of the model.

Which leaves cleanup with only two levers. Distort the domain —
merge mutually-referencing files, invert relationships, insert
indirection layers — and buy zero at the price of the model. Or
change *when* references resolve, so the domain keeps its shape
while the load-time graph empties. The ecosystem's tools are all
partial versions of the second lever applied per crash site; the
namespace pattern is the second lever applied everywhere, by
construction.

The two-graph measurement shows the decoupling directly, and this
is the part a cycle report normally cannot say. The type graph
still holds four knots — the domain's true cyclic shape, visible to
the same algorithm, undistorted. The value graph holds zero —
because a knot needs load-time edges to stand on, and the idiom
leaves none. In an ordinary codebase those two numbers are chained
together; here one is the domain and the other is the discipline,
and they read independently.

We have not measured every codebase, so take the general claim the
right way around: the script is seventy dependency-free lines — run
it on yours, and see which lever your zero would need.

## The cost, honestly

The discipline is real and worth stating plainly. Cross-module
references go through the namespace — `Order.Class`, not a bare
imported class binding — one level of indirection at every use site.
Top-level instantiation is given up entirely: no
`export const registry = new Registry()`, no module-scope side
effects, no `export default` class. Each getter read costs a
property access — nanoseconds, and the `$`-cached form amortizes
even that.

And one thing stays impossible forever: circular `extends`. The
pattern does not fix it because nothing can — it is logically
incoherent, not technically hard. If you believe you need it, the
model is wrong, not the loader.

What you get back is the disappearance of an entire failure class —
not mitigated, not linted, not documented: **unexpressible**. The
same construction-over-vigilance trade that runs through
[everything else ivue does](/blog/win-by-reduction).

## The position

None of this touches the loader. There is no bundler plugin, no
custom resolver, no build step, no framework runtime mediating your
imports. The namespace pattern is
[plain JavaScript](/guide/namespace-pattern) — it works in Node and
Bun with no Vue in sight, which is why Invar's non-UI modules use
the identical shape.

That is the claim worth making precisely. JavaScript did not need a
new module system — it needed its references moved to the right
clock, and it needed the move to be *structural*, so that correctness
is a property of the shape rather than a habit of the team. Fifteen
years of `forwardRef`, cycle linting, and barrel-file liturgy were
spent managing a problem that one exported namespace and a
getter-shaped reference dissolve outright.

The wound was never the cycle. It was the clock. Set the clock
right, and the oldest structural problem in JavaScript does not get
easier to manage.

It gets impossible to have.
