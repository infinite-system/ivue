---
venue: X long post (Premium, 25,000-char format); mirrors to Mastodon as a link post
purpose: post
lang: en
source: introducing-ivue, one-kilobyte-feature, computed-is-a-cache
status: draft-for-review
---

# Long post — launch

**Format note.** X long posts run to 25,000 characters, but only the
first 280 render in the timeline; everything after is behind "Show
more". So the first paragraph below is written to stand alone as the
preview and is under 280 characters on its own.

**Body — paste from the line below.**

---

Plain TypeScript classes, fully reactive, 1.1 kB gzipped. Instances stay
plain objects — nothing wraps them. 1,000,000 created in 22 ms. Zero
dependencies, 100% test coverage. This is ivue, and every number re-runs
live in your browser.

Here is the uncomfortable reading of the last decade. The field did not
abandon classes because classes failed. It abandoned them because making
classes work — cheaply, reactively, correctly — was hard, and it is
easier to canonize a retreat than to admit one. React said it out loud:
classes "confuse both people and machines." And they did. `this` broke
when you passed a method anywhere. Binding cost an allocation per method
per instance. Reactive state made it worse. Every framework hit the wall.
Every framework walked away.

The wound was treatable.

```ts
class $Counter {
  get count() { return ref(0) }        // state
  get double() { return this.count.value * 2 }  // derivation
  increment() { this.count.value++ }   // behavior
}
export const Counter = Reactive($Counter)
```

`Reactive()` transforms the prototype once. A getter returning `ref()`
becomes state: created on first touch, cached, stable. A plain getter
stays plain and re-derives on read — reactive through the leaves it
reads, zero bytes per instance. Methods bind once, to the right `this`,
with stable identity, which retires `() => this.method()` and the class
of bugs behind it. Nothing happens at construction.

The plain version: the object is born knowing the names of its state,
but the storage does not exist yet. Storage appears the first time
someone asks. State you never touch is state that never existed.

Two measurements that decide whether that matters.

One. 100,000 instances of a three-level reactive hierarchy — refs at
every level, computed overrides chaining through `super`, a hosted
composable — against 100,000 plain `{ id }` object literals. Heap after
GC: 3.08 MB versus 3.04 MB. The whole hierarchy costs 1.01× a bare
object. Node 26, `--expose-gc`, stable across runs.

Two. `computed()` is a cache, not a derivation. Vue's actual derivation
primitive is the tracked read — any function reading reactive state
inside an effect subscribes without a separate node. The cache costs real
bytes per instance, paid at creation, whether the value is read or not.
At 100,000 live instances, the composable-per-entity pattern holds 5.3×
the heap of the identical model as an ivue class. The default was never
neutral. It was unexamined.

What this is really about: signals won. Vue, Angular, Solid, Svelte and
the TC39 proposal agree on the engine layer. The open question is what
*authors* those signals. For a decade the answer has been "whatever
shape the framework hands you." ivue's answer is the oldest one in the
language — a class, with inheritance and encapsulation intact, compiled
by nothing, wrapped in nothing.

Come skeptical. The benchmarks run on your hardware, not ours.

https://ivue.dev · npm i ivue vue
