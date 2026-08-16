---
title: "Composables are organs, not skeletons"
description: The ecosystem's decade of composables is not ivue's rival — it's the substrate. Classes give the body a spine; composables keep doing what they do best.
date: 2026-07
tags: [patterns, architecture]
---

# Composables are organs, not skeletons

<BlogPostDate />

![Composables are organs, not skeletons](/blog/organs-not-skeletons.png)

The false choice haunting every "classes vs composables" thread: pick a
side. But look at what each is actually *good at*. A composable is a
superb **unit** — `useMouse`, `useFetch`, `useElementSize` — small,
reusable, battle-tested by an entire ecosystem. What a composable is bad
at is being a **skeleton**: compose thirty of them into an entity and you
get closure soup — no identity, no inheritance, per-instance allocation
for every derived value, and a lifetime chained to a component.

So don't choose. Host them:

```ts
class $Pointer {
  private get $mouse() {
    return useMouse(); // the composable — created once, encapsulated
  }
  get x() {
    return this.$mouse.x;
  }
  get y() {
    return this.$mouse.y;
  }
}
```

The `$`-getter is ivue's singleton slot: created on first touch, cached
whole, forever. `useMouse` becomes a private organ inside a class body —
consumers see two refs and have no idea a composable exists. `private`
means what it always means. And because the first touch happens during
the component's setup (the state destructure), the composable's listeners
bind to the component scope and clean themselves up on unmount. Live:

<DemoPointer />

This is the relationship the whole library has with the ecosystem:
VueUse, your stores, your `useWhatever` — all of it plugs into classes
through one convention, keeping its reactivity intact through Vue's own
tracking. The class contributes what composables lack: identity,
structure, inheritance, a lifetime you own. The composable contributes
what classes shouldn't rebuild: the unit.

Organs, hosted in a body with a spine.
[Reactive State — `$`-prefixed singletons](/guide/state#prefixed-singletons)
is the two-minute version; [Design & Philosophy](/guide/design) is the
argument in full.
