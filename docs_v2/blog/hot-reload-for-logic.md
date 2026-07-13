---
title: "Hot reload was never about components"
description: Frameworks hot-reload templates and call it developer experience. The state you actually care about lives in your logic — and now it survives edits too.
date: 2026-07
---

# Hot reload was never about components

![Hot reload was never about components](/blog/hot-reload-for-logic.png)

Every framework demos the same magic: edit a template, watch the button
change color, no refresh. Impressive — until you notice what it protects.
Component HMR preserves *component* state. The state that takes you ten
minutes to reconstruct — the half-built document, the deep scroll
position, the twelve-step editor session — lives in your **logic**, and
editing logic has always meant losing it.

ivue hot-reloads *classes*. Edit a method, and the new behavior grafts
onto **live instances with their state intact**:

```ts
step(delta: number) {
  this.celsius.value = clamp(this.celsius.value + delta);
  // ← edit this line; every live thermostat runs the new code
  //   on the next call, still holding its temperature
}
```

No remount. No lost refs. The instance you were debugging is still the
instance you're debugging, one method smarter.

The reason this works is the architecture, not a trick: in ivue, **state
lives per instance** (materialized refs) and **behavior lives on the
prototype** (methods, plain getters). A prototype can be swapped under
living objects — so a behavior edit is, structurally, a prototype-level
change, and the engine performs exactly that swap. Constructor-level
edits — the ones that genuinely change wiring — are detected by signature
and escalate to a component remount instead of going silently stale. The
detector is honest enough that comment-only edits never trigger it, and
a changed space inside a string always does.

Setup is one line, and there's a `fast` mode that trades class HMR for
production-speed instances when you're benchmarking instead of editing:

```ts
plugins: [vue(), ivueHmr()],           // class HMR
plugins: [vue(), ivueHmr({ fast: true })] // production-speed dev
```

The full mechanics — grafting, escalation, the 20M-cell live-swap story —
are in [HMR: Hot Reload for Classes](/guide/hmr). Your state deserves to
survive your edits.
