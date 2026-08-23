---
title: Keyed Version Signals
description: The third state shape — sparse, unbounded, keyed by ids or coordinates unknown until runtime. Collections of reactive primitives as plain values, priced by observation - reads materialize, writes to the unobserved cost nothing.
relatedPosts: [reactivity-is-an-allocator, twenty-million-cells, patterns-the-author-never-wrote]
---

# Keyed Version Signals — reactivity priced per key

ivue expresses state at three granularities, all obeying one invariant —
**nothing exists until observed**:

| State shape | Expression |
| --- | --- |
| Named members | `get x() { return ref(v) }` |
| Wholesale-replaced structure | `get rows() { return shallowRef<Row[]>([]) }` |
| **Keyed / sparse / unbounded** | **`Map<key, Ref>` + get-or-create track, peek-only bump** |

The first two are getters — one reactive cell per *named* member. But
when state is **keyed** — cells by `(row, col)`, entities by id, rows of
a stream — a getter per key is impossible: the keys aren't known until
runtime and there may be millions. The answer is to hold **collections
of reactive primitives as plain values**, and materialize reactivity
*per observation*:

```ts
class $Sheet {
  // Plain readonly field — the COLLECTION isn't reactive; its VALUES are.
  protected readonly cellVersions = new Map<number, Ref<number>>();

  /** READ path: get-or-create, then subscribe — observation materializes. */
  protected trackCell(cellKey: number): void {
    let versionRef = this.cellVersions.get(cellKey);
    if (!versionRef) {
      versionRef = ref(0);
      this.cellVersions.set(cellKey, versionRef);
    }
    void versionRef.value; // subscribes whatever effect is currently running
  }

  /** WRITE path: PEEK-ONLY — unobserved keys allocate nothing, notify no one. */
  protected bumpCell(cellKey: number): void {
    const versionRef = this.cellVersions.get(cellKey);
    if (versionRef) versionRef.value++;
  }
}
```

## The asymmetry IS the pattern

Reads **get-or-create**; writes **peek**. That one-way door is what makes
the cost model honest:

- A key nobody watches has **no ref, no subscribers, no memory** — a
  write to it is a Map miss and nothing more.
- The moment a renderer, a watcher, or a live query *reads* a key, its
  signal materializes and subscribes the running effect.
- When observation moves away, the overlay can be **evicted** — keyed
  reactivity must ship a release path, because Maps hold strong refs and
  attached watchers subscribe permanently. (Getters get this for free;
  keyed collections must do it deliberately.)

## Version signals, not value holders

The refs carry **versions, not values**. Ground truth lives in plain
storage — typed arrays, Maps, a database row — and the ref is a
notification channel: bump to invalidate, readers re-derive from ground
truth. This decoupling is what lets the pattern scale: the reactive
overlay stays integer-thin no matter how heavy the real data is.

Per-key cached computeds follow the same shape (`Map<key, ComputedRef>`,
bodies delegating to methods), with the same mandatory eviction.

## Coarse tiers — one signal covering many keys

The same pattern works at lower resolution: one ref for a block of rows,
or one whole-collection version counter, for subscribers that span many
keys. A "the table changed at all" subscriber costs one integer where
naive design puts a node per row. Fine and coarse tiers compose — bump
both on write; readers pick their resolution.

## On the backend: this is cache invalidation

Swap `(row, col)` for `userId` and the pattern is a per-entity cache
with structural invalidation ([Backend ivue](/guide/backend), Pattern 2):
write to user #42, and only computations that read user #42 re-derive —
on their next read, not eagerly. The hand-rolled `dirty` flag someone
always forgets to set, made unforgettable — and free for every entity
nobody is currently asking about.

## Proof at scale

This is the reactive layer of the
[Flyweight Pattern](/guide/flyweight): 20,000,000 live spreadsheet cells
at 4.7 bytes each, where reactivity is a sparse overlay that materializes
per observation and evicts when the viewport moves away. Getters price
*members*; keyed version signals price *keys* — the same invariant, one
level deeper.

No wrapper is needed anywhere: `ref()` and `computed()` are first-class
values from `@vue/reactivity`, and Maps of them inside a `Reactive()`
class compose with everything — methods stay bound, `$watch` works, and
the collection itself stays a plain field.
