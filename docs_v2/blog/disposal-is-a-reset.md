---
title: 'Disposal is a reset'
description: "Every reactive system answers birth well; death is where they get vague. ivue's $stopEffects is one verb that stops the instance's effects, frees its cells — and leaves the object ready to live again."
tags: [engine, patterns]
relatedPosts: [reactivity-is-an-allocator, rented-objects, computed-is-a-cache, bulletproof-class-modules]
date: 2026-08
---

# Disposal is a reset

![Disposal is a reset](/blog/disposal-is-a-reset.png)

<BlogPostDate />

Every reactive system answers birth well. Constructors, factories,
setup functions — creation is the polished path. Death is where the
answers get vague: disposers you must remember to collect, effects
tied to whichever component happened to create them, scopes that leak
because nobody owned them.

ivue's answer is one verb on every instance:

```ts
session.$stopEffects();
```

It looks like a cleanup call. It is actually three precise operations —
and the third one changes what disposal *means*.

## What one call does

**It stops the instance's effect scope.** Every watcher created
through `this.$watch` / `this.$watchEffect` lives in a scope the
instance owns — detached, so no component's lifecycle can reap it by
accident. `$stopEffects` stops that scope: every watcher dies at once,
no disposer bookkeeping, no survivor.

**The scope was lazy to begin with.** It is allocated on the *first*
`$watch` — an instance that never watches never has one. The cost of
the disposal machinery exists only for instances that created
something to dispose.

**It frees the cached cells — precisely.** Each transformed prototype
records exactly which cache keys it may install on an instance;
teardown walks the chain child → base and deletes only those. Not a
wipe, not a guess — the engine removes exactly what it created, at
every level of the inheritance chain, and touches nothing of yours.

## The part that changes the meaning

Because the cells are gone, the next read runs the initializers again.
Executed, not promised:

```ts
class $Counter {
  get count() {
    return ref(0);
  }
}
const Counter = Reactive($Counter);
const counter = new Counter();

counter.count.value = 41;
counter.count.value; // 41

counter.$stopEffects();

counter.count.value; // 0 — the initializer ran again
```

The instance after `$stopEffects` is not a corpse. It is the same
plain object restored to its pre-touch state — the state it had the
moment `new` returned, before anything materialized. Watch it again
and a fresh scope allocates; read a getter and a fresh cell appears;
derivations track through the new cells exactly as they did through
the old ones. Verified end to end: old watchers stay dead, cell
identity changes, a second `$watch` fires on the new cells.

> Disposal and reset are the same operation. The object's death is
> just its return to the moment before first touch.

That identity is what makes the primitive precise rather than merely
thorough. An evicted entity in a long-lived collection can be revived
by touching it. A test can recycle one instance through ten scenarios
instead of constructing ten. A pool can hand the same object out
twice and mean it.

## No hooks — on purpose

`$stopEffects` calls no user code. There is no `onDispose`, no
`beforeDestroy`, no magic method the engine promises to invoke —
ivue auto-calls nothing, at birth or at death. Richer cleanup
composes the way everything else in the standard composes: as an
ordinary method that does its own work and then calls the verb:

```ts
dispose() {
  this.socket.close(); // the non-Vue residue is YOURS to name
  this.$stopEffects();
}
```

A hook is a contract with an invisible caller. A method is a call you
can read at the call site. The second one survives refactoring,
subclassing, and grep.

## The ownership rule

The verb exists for instances that *outlive* components. A
component-scoped instance never calls it — plain `watch` in its
constructor lands in the component's scope and unmount reaps it for
free. But a module singleton, an entity created in a callback, a
model held in a collection — those have no component to die with, so
the standard's rule is one sentence: **every outliving instance has
an owner, and the owner disposes it.** When the owner is itself a
scope, one line auto-wires the whole thing:

```ts
getCurrentScope() && onScopeDispose(() => this.$stopEffects());
```

The same one-owner invariant that governs state and construction in
[the standard](/guide/standard) turns out to govern death. Teardown
is not a garbage-collection prayer. It is a verb — and someone
specific conjugates it.
