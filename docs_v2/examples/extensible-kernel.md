---
title: 'Example: Extensible Kernel'
description: 'Construction binds to a namespaced class key. Sticky Plugin and Activity Plugin extend notifications through a small registry; sealing preserves super chains, reactive getters, and child inheritance with zero lookup at the call site.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [most-linted-superpower, bulletproof-class-modules, inheritance-exile]
---

<script setup>
import ExampleExtensibleKernel from '../.vitepress/theme/components/examples/ExampleExtensibleKernel.vue'
</script>

# Extensible Kernel

This is a working toast application. Its Sticky Plugin is enabled on load,
so the first toast stays visible. Turn Sticky Plugin off to restore its
eight-second auto-dismiss countdown. Turn Activity Plugin on to send each new
toast's `SHOW` event into the event stream.

<ClientOnly>
  <ExampleExtensibleKernel />
</ClientOnly>

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fextensible-kernel%2FKernel.ts&path=%2F%23%2Fextensible-kernel">Open in StackBlitz ⚡</a>

## How it works

A plugin system often brings a dependency injection container, decorators,
tokens, hierarchical injectors, and lifecycle wiring. This kernel is one
compact module singleton because the class graph already carries the
relationships it needs.

The central idea is that **construction binds to a namespaced class key**.
The key follows the form `namespace/Class`, where the namespace owns the
class. The core application therefore defines `core/Notification`. An
activity plugin from another vendor still registers against
`core/Notification` because it extends the core application's class.

At boot, the kernel *seals* the graph — it composes every plugin and
re-parents each `extends` chain. After sealing, `new Notification.Class()`
produces the fully extended class with `super`, reactive state, and child
inheritance intact. Construction reads a live namespace binding, so the call
site performs no registry lookup. Plugin dispatch adds no steady-state layer:
after boot, method calls follow the native prototype chain.

Sticky Plugin replaces the ordinary toast lifetime: each toast gets a gold
accent and remains visible until the user dismisses it. Activity Plugin
records every `show()` call in a separate event stream without changing the toast UI.
`ErrorNotification` inherits both plugins even though its class is declared
before they register.

## Why this is much smaller and removes Angular-style runtime resolution

Angular-style DI builds and resolves a second runtime graph: tokens choose
providers, scopes choose lifetimes, and factories mediate construction.

ivue uses the graph JavaScript already has. Modules hold references,
prototypes hold inheritance, and a namespace's live `Class` binding selects
the implementation. The kernel seals that graph once at boot; afterward,
construction is a live binding plus native `new`. No container participates.

That is the reduction: **compose once, then disappear.** Contextual providers,
request scopes, and runtime service selection still require DI machinery. When
the module and prototype graphs already express the relationship, they do not.

## What a plugin toggle does

Sealing changes subsequent construction; it does not mutate the class of an
existing object. The live example makes a plugin change through a coarse
reboot:

1. Capture the kind, message, and stable UI id of each visible toast.
2. Clear plugin registrations and register the enabled set.
3. Seal the class graph and replace each namespace's `Class` binding.
4. Construct replacement toast instances from the captured data.
5. Swap the visible list to those replacements.

The cards appear to change in place because their UI ids and data survive.
Their object identities do not. Production follows the same lifecycle:
register once, seal once, mount; a plugin configuration change reconstructs
the affected runtime state.

## The whole kernel

This is the complete registry:

<<< ../../examples/playground/src/examples/extensible-kernel/Kernel.ts

## Opting in with an owner key

An extensible class is an ordinary ivue class with two additions. `Class`
is a `let` binding that the kernel can rewrite, and `Kernel.Class.defineClass()`
associates the namespace with its owner key. Call sites keep the ordinary
ivue forms: `new Notification.Class(...)` and
`extends Notification.$Class`.

<<< ../../examples/playground/src/examples/extensible-kernel/Notification.ts

The key names the class owner, not the plugin. A vendor defining its own
class might use `acme-audit/AuditPanel`. When that vendor extends the core
notification class, it targets `core/Notification`.

## Plugins add concrete behavior

Each plugin extends the class it receives. Sticky Plugin refines plain
getters to pin and restyle notifications, then overrides `tick()` to disable
auto-dismiss. Activity Plugin overrides `show()`, delegates through
`super`, and sends the event to the example's reactive event stream. Sealing
stacks both classes in registration order.

<<< ../../examples/playground/src/examples/extensible-kernel/plugins.ts

`ErrorNotification extends Notification.$Class`. A subclass normally keeps
the parent it received at declaration time. During `sealClassGraph()`, the
kernel discovers that relationship from the real prototype hierarchy and
re-parents `ErrorNotification` onto the composed `Notification` class.
JavaScript's dynamic `super` lookup then follows the sealed chain.

## What to notice

- **`new Notification.Class()` performs no lookup.** It reads the live
  namespace binding. After boot, construction follows the same class every
  time.
- **Each plugin has one visible responsibility.** Sticky Plugin changes the
  accent and replaces auto-dismiss with a pinned lifetime. Activity Plugin
  records each `show()` call in the event stream.
- **The child follows the base class.** `ErrorNotification` receives both
  plugins through the re-parented inheritance chain.
- **`Kernel.Class.getClassGraph()` exposes metadata.** The panel displays the graph
  discovered from inheritance. Runtime construction never consults it.
- **A toggle reconstructs visible instances.** Production registers once,
  seals once, and restarts after a plugin change, like reloading an editor
  window after enabling an extension.

## Related guide pages

- [Static() — Capability Classes](/guide/static) — capability classes, `$`-cached statics, the anchor.
- [Inheritance & super](/guide/inheritance) — `extends $Class`, `super`, `override`.
- [Namespace Pattern](/guide/namespace-pattern) — `$Class`, `Class`, and the types derived from them.

## The source

::: code-group
<<< ../../examples/playground/src/examples/extensible-kernel/ErrorNotification.ts [ErrorNotification.ts]
<<< ../../examples/playground/src/examples/extensible-kernel/ExtensibleKernelExample.ts [example]
<<< ../../examples/playground/src/examples/extensible-kernel/ExtensibleKernelExample.vue [template]
:::

This is the frontend half of a full-stack substrate. The same kernel can route
construction on the server, so one plugin extends a model and its field in one
package — the argument the
[VS Code post](/blog/vscode-hand-rolled-decade) develops at length.
