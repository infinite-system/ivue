---
title: The Namespace Pattern, Crystallized
description: A capability needs one canonical object, one mutable class slot, and late dependency reads. The pattern resolves circular references and supports composition without requiring a DI container or a framework.
search: false
---

# The Namespace Pattern, Crystallized

::: warning Current exploration
This page extracts an invariant used by ivue and explores its application
outside Vue. It is research material, not part of ivue's required operating
manual.
:::

> A dependency needs a canonical address and a moment of resolution. It needs
> a container only when the answer varies by runtime context.

The namespace pattern begins below ivue. It does not require Vue, refs,
`Reactive()`, or even TypeScript namespace syntax. Its invariant is:

```text
canonical object + mutable Class slot + late dependency read
```

Each part has one responsibility:

- The canonical object names the capability.
- `Class` selects its current implementation.
- A getter or method reads dependencies after module initialization.

## The smallest TypeScript form

```ts
class $Orders {
  static submit(orderId: string) {
    return orderId;
  }
}

export namespace Orders {
  export let Class = $Orders;
}
```

Application code reaches the selected capability through one public address:

```ts
Orders.Class.submit(orderId);
```

`Orders` remains stable while `Orders.Class` may change during boot, a test, or
a hot update. An ordinary class export is sufficient when nothing needs to
replace or compose the class.

## The JavaScript form exposes the primitive

TypeScript `namespace` is one expression of the invariant. A JavaScript object
expresses the same runtime mechanism:

```js
class OrdersImplementation {
  static submit(orderId) {
    return orderId;
  }
}

export const Orders = {
  Class: OrdersImplementation,
};
```

The `const` above protects the `Orders` binding. Its `Class` property remains
mutable:

```js
Orders.Class = TestOrders;
```

A TypeScript namespace carries more compile-time precision:

```ts
export namespace Orders {
  export const $Class = $Orders;
  export let Class = $Class;
}
```

TypeScript rejects assignment to `Orders.$Class` and permits assignment to
`Orders.Class`. Plain object syntax can express the same contract with a
`readonly $Class` property type. Runtime immutability requires a non-writable
property descriptor in either emitted form.

The mechanism remains ordinary property access. The TypeScript form documents
which property is the foundation and which property is the selection.

## Static capability classes are the backend default

Most backend modules are collections of functions. A static capability class
keeps that allocation-free shape while adding inheritance, `super`, and a
replaceable class address:

```ts
class $Users {
  static find(userId: string) {
    return database.users.find(userId);
  }
}

export namespace Users {
  export let Class = $Users;
}
```

No `Users` instance exists. The selected class itself is the function bag:

```ts
const user = Users.Class.find(userId);
```

Instance classes remain appropriate for objects with genuine identity,
mutable state, ownership, or disposal. Static capability classes cover
commands, queries, validation, mapping, orchestration, and route logic without
inventing service instances whose only purpose is to hold methods.

## Static dependency getters complete the pattern

A dependency getter reads the live class slot when behavior runs:

```ts
class $Orders {
  static get Users() {
    return Users.Class;
  }

  static submit(userId: string) {
    return this.Users.find(userId);
  }
}

export namespace Orders {
  export let Class = $Orders;
}
```

This produces two guarantees.

### Late resolution

`Orders.ts` may import `Users.ts` while `Users.ts` imports `Orders.ts`. Neither
module reads the other's `Class` slot while the module graph is initializing.
The getter body runs later, so both module bindings are ready.

### Live resolution

The getter does not retain `Users.Class`. A test, plugin kernel, or hot-update
runtime may change that selection. The next getter read returns the new class.

The circularity invariant is precise:

> Imports may be circular. Cross-module values must not be read eagerly.

A method body is late for the same reason. A named getter earns its place when
the dependency appears throughout the class or belongs in the capability's
readable anatomy.

## Retained handlers keep the namespace read live

Static methods are ordinary JavaScript functions. Calling one as a member
supplies the selected class as `this`:

```ts
Orders.Class.submit(userId);
```

Passing the function alone does not preserve that receiver. It also freezes
the implementation selected during route registration:

```ts
router.post('/orders', Orders.Class.submit);
```

A thin namespace closure preserves both properties:

```ts
router.post('/orders', (request) =>
  Orders.Class.submit(request.params.userId),
);
```

Each request reads `Orders.Class`, calls `submit` as a member, and therefore
observes kernel replacement or hot update. No method-binding runtime is
required for the static-first backend shape.

ivue provides a stronger instance-method contract on the frontend.
`Reactive()` turns instance methods into lazily bound, referentially stable
functions. Vite and Vue reconstruct the owning component after script edits,
so each retained method belongs to one coherent class generation. That is a
Vue lifecycle capability around the same class model, not a requirement of the
namespace invariant.

## What the pattern removes from DI

For one application-wide provider choice, conventional dependency injection
usually associates a token with a provider and resolves that provider for a
consumer. The namespace pattern reduces those operations to language
features:

| Responsibility | Expression |
|---|---|
| Canonical token | the imported `Orders` object |
| Provider selection | `Orders.Class = SelectedOrders` |
| Dependency resolution | `static get Orders() { return Orders.Class; }` |
| Invocation | native static member call |
| Boot-time composition | a kernel assigns `Class` once |

There is no string token, decorator, reflection metadata, provider array, or
second runtime object graph. The module graph names the capability. The getter
delays the edge. The mutable property selects the implementation.

This reduction has a deliberate scope. A global `Class` slot represents one
application-wide answer. Contextual dependency injection remains appropriate
when the answer varies by request, tenant, session, or runtime data, or when
multiple providers must coexist.

## A kernel composes the selected class

The kernel retains the foundation and applies extensions from that foundation
on every seal:

```ts
type ClassCapability = {
  Class: typeof $Orders;
};

function extendOrders(capability: ClassCapability) {
  const Base = capability.Class;

  capability.Class = class AuditedOrders extends Base {
    static submit(userId: string) {
      audit(userId);
      return super.submit(userId);
    }
  };
}
```

Static `super.submit()` retains the derived class as `this`. The base method's
`this.Users` therefore continues to resolve through the final selected class.

A complete kernel stores the original base privately, gathers every extension,
and assigns one composed result. It never extends an already extended result
during a repeated seal.

## When `$Class` belongs in the public namespace

The raw foundation belongs in the public namespace when application modules
inherit from it directly:

```ts
class $Notification {}

export namespace Notification {
  export const $Class = $Notification;
  export let Class = $Class;
}

class $ErrorNotification extends Notification.$Class {}
```

Here `$Class` is an immutable TypeScript contract for declared inheritance.
`Class` is the runtime selection used for construction or static invocation.
When every extension goes through the kernel, the kernel may retain the base
privately instead.

The forms are additive:

| Required capability | Namespace surface |
|---|---|
| Ordinary class | no namespace required |
| Replaceable static capability | `let Class = $Orders` |
| Public raw inheritance | `const $Class` + `let Class` |
| Vue class reactivity | `$Class` + `let Class = Reactive($Class)` + `Instance` |

The canonical ivue form keeps `Class` mutable even when no kernel is installed:

```ts
export namespace BaseElement {
  export const $Class = $BaseElement; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

Consumers always use `new BaseElement.Class()`. A later kernel registration can
compose the slot without changing those consumers.

## Provider choice and lifetime remain separate

Static capability classes have no instance lifetime. Stateful classes still
need an explicit owner:

```ts
class $Application {
  readonly orders = new Orders.Class();
}
```

The `Class` slot answers which constructor is selected. The owner answers how
many instances exist, how long they live, and who disposes them. Keeping those
questions separate prevents a provider-selection pattern from becoming an
implicit lifetime container.

## Boundaries remain explicit

Late reads remove accidental initialization order. They do not make a
structural contradiction valid:

- `A extends B` and `B extends A` cannot both establish a parent first.
- Constructors that recursively construct each other still recurse forever.
- A top-level `Other.Class` snapshot remains eager.
- A static field initialized from `Other.Class` snapshots the provider.
- Decorators and module side effects may still read dependencies too early.
- A detached static method that uses `this` still needs a member-call boundary.

These are eager edges or genuine logical recursion. The pattern removes hidden
load-order discipline without hiding impossible graphs behind a container.

## One invariant across runtimes

The shared class grammar allows each runtime to add only its required adapter:

```text
canonical namespace object + mutable Class slot + late reads
├── Node: static capability classes and slot replacement
├── stateful Node: explicit owners and optional instance adaptation
├── ivue: Reactive() and Vue-facing Instance typing
├── plugins: boot-time class composition
└── development: environment-specific hot update
```

The namespace is not an ivue convention exported to Node. ivue and Node are
different expressions generated from the same smaller invariant.

The [Node Class HMR design](/guide/node-class-hmr?experiment=1) follows the
static-first form into a long-running backend process.
