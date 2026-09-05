---
venue: X (composer hook picker), mirrored to Bluesky and Mastodon
purpose: card-text
lang: en
source: introducing-ivue, the-options-api-everyone-wanted, bulletproof-class-modules, ban-private, what-native-signals-should-steal, a-million-rows-twelve-divs, reactivity-is-an-allocator, win-by-reduction, twenty-million-cells, the-test-is-a-subclass, one-kilobyte-feature, measured-not-promised
status: draft-for-review
---

# xHooks — 12 calendar articles, 2–3 distinct angles each

Every hook is segment 1 of an X thread: it carries the banner, and the
link rides the closing segment. All are ≤270 characters (weighted limit
minus numbering room). Distinctness rule applied: if two hooks would
pull the same reader, one was cut.

ivue identity line, used verbatim wherever a hook needs it: **ivue, a
1.1 kB class layer over Vue's reactivity.**

YAML-ready: paste the `xHooks:` block into the post's frontmatter.

---

## introducing-ivue

```yaml
xHooks:
  - >-
    Plain TypeScript classes, fully reactive, 1.1 kB gzipped. Instances
    stay plain objects — no proxy wraps them. 1,000,000 created in 22 ms.
    Zero dependencies, 100% test coverage. That is ivue, and every number
    on the site runs live in your browser.
  - >-
    The field did not abandon classes because classes failed. It
    abandoned them because making them reactive was hard. `this` broke
    when you passed a method. Binding cost an allocation per method per
    instance. ivue fixes both in 1.1 kB.
  - >-
    Where does your domain logic live? If the answer is "in composables
    that exist only while their component does", your objects are rented
    from the framework. ivue, a 1.1 kB class layer over Vue's
    reactivity, is the eviction notice.
```

## the-options-api-everyone-wanted

```yaml
xHooks:
  - >-
    What people loved about the Options API was anatomy: open a
    stranger's file, know where state, derivations and actions live. The
    anatomy was fake — a plain object pretending to be a class. The class
    is the real one, and it was in the language all along.
  - >-
    The Options API had mixins. It never had inheritance of derived
    values. In ivue, a 1.1 kB class layer over Vue's reactivity, a
    computed is a getter — so subclass a store and override one
    derivation. `super` works.
  - >-
    ivue's own admin dashboard runs eleven models and a router-backed
    store on zero computed() calls. Derivations are plain prototype
    getters: reactive through the leaves they read, zero bytes per
    instance. The buckets cost nothing.
```

## bulletproof-class-modules

```yaml
xHooks:
  - >-
    Nine kinds of value a class module can hold. Nine homes, one each.
    Mutable state, derivations, stores, methods, tunable statics, shared
    registries. No judgment calls left at the call site — and the forked
    registry and the load-order race become unwritable.
  - >-
    Every value in a class module wants three things at once: computed
    once, still overridable, and free until first use. JavaScript helps
    with none of them. Here is the full map that closes the triangle, in
    code, every kind shown.
```

## ban-private

```yaml
xHooks:
  - >-
    Every `private` member is a fork waiting to happen. You need line 12
    of a 40-line method changed; the member is private; your only option
    is to copy the file. Now two files must remember every future fix.
    So the ivue standard bans the keyword.
  - >-
    TypeScript's `private` is a sign on a door, not a lock. It protects
    nothing at runtime and forbids exactly one person: the subclass
    author extending your work the right way. Two rules replace it —
    `protected` everywhere, `noImplicitOverride: true`.
  - >-
    Rename a base member with `noImplicitOverride` on, and every subclass
    breaks at compile time, at the exact member, by name. Seam drift
    becomes a build error. Proven across a 108,000-line IDE where agents
    extend the classes daily.
```

## what-native-signals-should-steal

```yaml
xHooks:
  - >-
    TC39's signals proposal standardizes the graph and defers the object
    — how signals attach to the things your app is made of. We spent
    three years in that territory and put numbers on it. Three problems,
    three mechanisms, three receipts.
  - >-
    A derived value does not need its own box. It is a question you ask
    of the boxes you already have. Measured: a cache node pays for itself
    at about two reads per change. A production model with ninety
    derivations needed exactly zero.
  - >-
    Reachability is not the last word on memory. Ten thousand leaked
    component models: 85 MB under closure-based signals, 4.7 MB when the
    object can hand its own storage back. GC passes also ran 2–3× faster
    on the smaller live graph.
```

## a-million-rows-twelve-divs

```yaml
xHooks:
  - >-
    A 1,000,000-row list holding about a dozen divs in the DOM. Scroll
    position stops being a byproduct of layout and becomes one number the
    program owns. Every operation is O(window) — scrolling, jumping,
    resizing. Live on the page, counter visible.
  - >-
    To scroll a tall document natively, the DOM has to BE tall. A million
    rows is a fifty-million-pixel strip — past the layout caps some
    engines enforce. So this list fires the browser from the job and
    synthesizes the physics itself.
  - >-
    Measuring a million row heights up front is O(total) — the exact cost
    the design exists to refuse. Instead: heights captured one-shot as
    rows enter the window, a prefix sum never materialized as an array.
    Jump deep and watch the estimate converge.
```

## reactivity-is-an-allocator

```yaml
xHooks:
  - >-
    Ask what reactivity is for and everyone says: keep the screen in sync
    with the data. Here is a different use. Whether a SQLite connection
    EXISTS is decided by two refs. Open the pane, it connects. Switch
    tabs, it closes. Not pooled — closed.
  - >-
    The naive reactive backend wraps the file system in refs. This one
    does the opposite: the file-system class holds zero refs and zero
    state. Reactivity is not the plumbing. It decides what exists, what
    is fresh, and what is still believed.
  - >-
    A notify channel cannot report its own silence. A watcher that goes
    quiet looks exactly like a filesystem where nothing changed. So an
    entire 108,000-line IDE ships one file watcher — over a five-second
    pull floor that writes zero refs when nothing moved.
```

## win-by-reduction

```yaml
xHooks:
  - >-
    Do not solve a removable problem more efficiently. Remove the
    condition that creates it. Plain instances remove the proxy layer.
    Plain getters remove cache allocation. Late references remove
    initialization-order puzzles. Fewer problems remain.
  - >-
    A convention is strongest when following it makes a category of
    failure unavailable. An unread member cannot allocate. A plain getter
    cannot secretly own a memo node. A late reference cannot fail because
    of import order. Impossibilities, not warnings.
  - >-
    Small library, large applications. The generator is compact; what it
    generates can be enormous. 1.1 kB is not a compression trophy — it is
    what remains after you stop paying for machinery the design never
    needed.
```

## twenty-million-cells

```yaml
xHooks:
  - >-
    Google Sheets caps a spreadsheet at ten million cells. This document
    holds twenty million — every cell formula-capable, editable, and
    reactive — in about 89 MB. That is 4.7 bytes per cell. Click the
    button and build it yourself.
  - >-
    4.7 bytes per cell is 8.5× BELOW the cost of a plain { row, col, raw }
    object with no reactivity at all. Under the floor, fully reactive.
    One invariant taken all the way down: nothing costs proportional to
    what exists, only to what is observed.
  - >-
    A write to a cell nobody is watching allocates nothing and notifies
    no one. Twenty million cells exist; only the few hundred you can see
    cost anything. The reactive overlay materializes on observation and
    evicts when the viewport moves away.
```

## the-test-is-a-subclass

```yaml
xHooks:
  - >-
    No mock framework anywhere in this test suite. No jest.mock, no stub
    factories. The double is a subclass: override one method, and the
    compiler checks the fake against the real contract. Stub drift
    becomes a compile error.
  - >-
    A check that can only fail toward "pass" is a decoration. So every
    detector here is shown its quarry at least once — a fixture whose
    only job is to be caught, a holder that never releases. It caught two
    real instrument bugs.
  - >-
    Want the real class with one parameter small enough to observe?
    Subclass it and pinch one protected getter. Every code path stays the
    production path. That is the entire test double — five readable
    lines.
```

## one-kilobyte-feature

```yaml
xHooks:
  - >-
    The whole engine — lazy state, method binding, reactive inheritance
    with super, teardown, $watch — is 1,120 bytes gzipped, zero
    dependencies, 100% coverage on every metric. You can read all of it
    before lunch and KNOW what happens on every property access.
  - >-
    100,000 instances of a three-level reactive hierarchy versus 100,000
    plain { id } object literals. Heap after GC: 3.08 MB against 3.04 MB.
    The whole hierarchy costs 1.01× a bare object. That is why creation
    is measured in milliseconds — the work is not there.
  - >-
    Zero dependencies is a supply-chain claim, not a vanity one. No
    transitive tree to audit, no lockfile churn, no upgrade that breaks
    you from three levels down. The engine you read today is the engine
    that runs next year.
```

## measured-not-promised

```yaml
xHooks:
  - >-
    Every performance number on this site names what was measured, at
    what scale, on which engine — and most of them re-run live in your
    browser on the same build that ships to npm. Press the button and get
    your own hardware's answer.
  - >-
    Numbers age. Machines differ. Engines improve. The method is the part
    that stays true, which is why every figure here carries it. The
    benchmark protocol, the import-cycle audit, the census scripts — all
    published, all pointable at your own codebase.
```

---

## Notes for the composer

- All 33 hooks are ≤270 characters (counted; see the INDEX checkpoint
  report). None opens with a backtick — the YAML trap the W1 spec names.
- URLs cost a fixed 23 characters on X regardless of length, so a hook
  with room to spare can absorb one link; none of these carry one,
  because the link belongs in the closing segment on X and in post 1 on
  Bluesky and Mastodon.
- Re-promotion weeks later uses an UNUSED hook, never a repeat. Three
  hooks means three firings per article across the rotation.
