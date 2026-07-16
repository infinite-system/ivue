---
name: node-namespace
description: Author and refactor TypeScript Node.js backends around static capability classes, mutable class namespaces, late dependency getters, boot-time composition, and live provider replacement. Use for backend modules, circular imports, plugin kernels, route or queue handlers, test doubles, and designs that would otherwise introduce DI tokens, decorators, forwardRef, or container resolution.
---

# Node Namespace

Author backend modules as static capability classes by default. A capability
class is an inheritable function bag: it holds behavior but no instance state.
Export it through one canonical namespace with one mutable `Class` slot.

## Canonical capability module

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

Use this shape for commands, queries, validation, mapping, orchestration, route
logic, and other modules that would otherwise export a bag of functions.

Use an ordinary function or class export when replacement and composition are
not requirements. Do not add a namespace that provides no live-selection
service.

## Read every dependency late

Import the namespace, then read its `Class` inside a static getter or method:

```ts
static get Users() {
  return Users.Class;
}
```

The read occurs after module initialization and observes later provider
replacement. Apply these constraints:

- Never assign `const Selected = Other.Class` at module scope.
- Never snapshot `Other.Class` in a static field.
- Never perform cross-module work in decorators or static initialization.
- Permit circular imports only when every cross-module value edge is late.
- Reject circular inheritance and recursive calls; lateness cannot make either
  structure valid.

Use a method body directly when a named dependency getter adds no clarity. Both
forms are late. The getter earns its name when several methods use the same
capability or when it belongs in the class's readable anatomy.

## Retained callbacks read through the namespace

Invoke a static method as a member so JavaScript supplies the selected class as
`this`:

```ts
Orders.Class.submit(userId);
```

When a router, timer, event emitter, or queue retains a callback, delegate
through a thin namespace closure:

```ts
router.post('/orders', (request) =>
  Orders.Class.submit(request.params.userId),
);
```

Each invocation reads the current `Orders.Class`, preserves static `this`, and
observes kernel or hot-runtime replacement.

Do not pass a static method detached when it uses `this`:

```ts
router.post('/orders', Orders.Class.submit);
```

A detached static method that never uses `this` can execute, but the retained
reference still freezes the selected implementation. Prefer the namespace
closure wherever live replacement is part of the contract.

Static capability classes need no lazy method binding.

## Compose through the kernel

Register every namespace before plugin composition:

```ts
kernel.defineClass('app/Orders', Orders);

kernel.registerClass('app/Orders', (Base) =>
  class AuditedOrders extends Base {
    static submit(userId: string) {
      audit(userId);
      return super.submit(userId);
    }
  },
);

kernel.sealClassGraph();
```

Require the kernel to retain the original class at `defineClass()` time. Start
every seal from that stored base, apply extensions in deterministic order, then
assign the result to `namespace.Class`.

Static `super` preserves the derived class as `this`, so base methods continue
to resolve dependency getters through the final selected class.

Expose a raw `$Class` only when application modules inherit from the declared
foundation outside the kernel:

```ts
class $Notification {}

export namespace Notification {
  export const $Class = $Notification;
  export let Class = $Class;
}
```

Keep `$Class` immutable. Only `Class` is a provider slot.

## Use instances only for actual identity

Choose an instance class when the object has genuine state, identity, lifetime,
or disposal:

```ts
class $OrderWorker {
  constructor(private readonly queue: OrderQueue) {}

  run() {
    return this.queue.take();
  }
}

export namespace OrderWorker {
  export let Class = $OrderWorker;
}
```

Give every long-lived instance an explicit owner. The owner constructs,
replaces, and disposes it. Provider choice and instance lifetime remain
separate responsibilities.

Use contextual DI or explicit parameters when provider choice varies by
request, tenant, session, or runtime data. One global `Class` slot represents
one application-wide selection.

## Hot replacement follows ownership

A static capability update replaces the complete selected class:

```ts
Orders.Class = UpdatedOrders;
```

The next namespace closure observes it. No instance migration, prototype
grafting, or bound-method dispatch slot is required.

A stateful instance update reconstructs its explicit owner. Do not combine old
instance state with methods from a newly evaluated declaration. Constructor
wiring, fields, closures, inheritance, and native private brands move together
as one generation.

Do not claim Node class HMR exists unless the project supplies a module runner,
canonical namespace registry, plugin recomposition, transactional slot update,
and owner-reconstruction path for stateful instances. The namespace shape
enables that runtime; it does not invalidate Node modules by itself.

## Keep process resources outside replaceable capabilities

Put HTTP listeners, database pools, socket registries, and other process-owned
resources in a stable composition root. Static capability classes late-read or
receive those resources. They do not create them in module top-level side
effects.

This keeps replacement cheap and makes ordinary shutdown and testing explicit.

## Testing provider replacement

Restore global provider slots after every test:

```ts
const ProductionOrders = Orders.Class;

afterEach(() => {
  Orders.Class = ProductionOrders;
});

it('uses a test provider', () => {
  Orders.Class = class TestOrders extends ProductionOrders {
    static submit() {
      return 'test-order';
    }
  };

  expect(Orders.Class.submit('ignored')).toBe('test-order');
});
```

Do not mutate one global provider concurrently from parallel tests. Use
isolated workers, isolated module graphs, or a scoped test kernel when
parallelism is required.

## Keep frontend and backend adapters separate

Share the namespace invariant, not environment machinery:

- Node default: static capability class and explicit slot replacement.
- Stateful Node: explicit instance ownership and reconstruction.
- ivue: `$Class`, `let Class = Reactive($Class)`, and Vue-facing `Instance`
  typing.
- Universal core: canonical ids, provider slots, plugin composition, and
  transactional replacement.

Never import Vue into a backend capability merely to preserve the frontend
export shape. Delete runtime-specific members until only the capabilities the
backend uses remain.

## Self-review

- [ ] Stateless backend modules use static capability classes by default.
- [ ] Every replaceable capability exports one namespace with mutable `Class`.
- [ ] Cross-module classes are read only inside static getters or methods.
- [ ] No top-level provider snapshot, construction, decorator read, or process
      side effect creates an eager dependency edge.
- [ ] Retained callbacks delegate through the canonical namespace.
- [ ] The kernel captures the original class before mutating `Class`.
- [ ] Plugin extensions use static inheritance and deterministic ordering.
- [ ] Instances exist only for genuine state, identity, lifetime, or disposal.
- [ ] Every long-lived instance has an explicit reconstruction owner.
- [ ] Context-varying dependencies use explicit context or scoped DI.
- [ ] Tests restore provider slots and do not race global mutations.
- [ ] Hot-update claims include module invalidation, transactional replacement,
      owner reconstruction, and final cold-start verification.
