---
name: node-namespace
description: Author and refactor TypeScript Node.js backends around mutable class namespaces, late dependency getters, boot-time class composition, and HMR-safe prototype behavior. Use for backend service classes, circular imports, plugin kernels, provider replacement, route or queue handlers, service ownership, test doubles, and designs that would otherwise introduce DI tokens, decorators, forwardRef, or container resolution.
---

# Node Namespace

Author each application-wide class capability behind one canonical namespace
with one mutable constructor. Resolve cross-module dependencies through getters
or method bodies so imports may cycle without eager value reads.

## Canonical class module

Use this form when a kernel, plugin, test, or hot-update runtime may replace the
class:

```ts
class $Orders {
  get Users() {
    return UserService.Class;
  }

  submit(orderId: string) {
    const users = new this.Users();
    return users.findForOrder(orderId);
  }
}

export namespace Orders {
  export let Class = $Orders;
}
```

Keep `$Orders` module-private so its unique runtime name remains useful in stack
traces. Export only the live `Class` slot. Let the kernel capture the original
constructor internally when registering the namespace.

Use an ordinary `export class Orders` when replacement and composition are not
requirements. Do not add a namespace that provides no live-selection service.

## Read every dependency late

Import the namespace, then read its `Class` only inside a getter or method:

```ts
get UserService() {
  return UserService.Class;
}
```

This read occurs after module initialization and observes later provider
replacement. Apply these constraints:

- Never assign `const Selected = Other.Class` at module scope.
- Never snapshot `Other.Class` in an instance field.
- Never construct another service at module scope.
- Keep cross-module work out of decorators and static initializers.
- Permit circular imports only when every value edge is late.
- Reject circular inheritance and recursive construction; lateness cannot make
  either structure valid.

Use a method body directly when a named dependency getter adds no clarity. Both
forms are late; the getter earns its name when the class uses the dependency in
several places or when the dependency is part of the model's readable anatomy.

## Keep provider choice separate from lifetime

A dependency getter answers which constructor is selected. It does not decide
how many instances exist or how long they live.

Let an explicit owner choose the lifetime:

```ts
class $Application {
  readonly orders = new Orders.Class();
}
```

Use the composition root for application singletons. Use request construction
for request-scoped services. Accept an existing instance when another owner
controls the lifetime. Do not allocate a new service on every getter read unless
the dependency is intentionally transient.

Use contextual DI or explicit parameters when provider choice varies by request,
tenant, session, or runtime data. A single global `Class` slot represents one
application-wide choice; do not stretch it into a contextual container.

## Register and seal through the kernel

Register every namespace before any plugin composition:

```ts
kernel.defineClass('app/Orders', Orders);

kernel.registerClass('app/Orders', (Base) =>
  class AuditedOrders extends Base {
    submit(orderId: string) {
      audit(orderId);
      return super.submit(orderId);
    }
  },
);

kernel.sealClassGraph();
```

Require the kernel to retain the original constructor at `defineClass()` time.
Start every seal from that stored base, compose extensions, then assign the
result to `namespace.Class`.

Expose a raw `$Class` in the namespace only when application modules must inherit
from the declared foundation outside the kernel:

```ts
class $Notification {}

export namespace Notification {
  export const $Class = $Notification;
  export let Class = $Class;
}
```

Keep `$Class` immutable. Only `Class` is a provider slot.

## Use thin closures at retained-callback boundaries

Call methods normally inside the backend:

```ts
orders.submit(orderId);
```

When a router, timer, event emitter, or queue retains a callback, delegate
through a thin closure:

```ts
router.post('/orders', (request) =>
  orders.submit(request.params.orderId),
);
```

The closure preserves `this` and looks up `orders.submit` on every invocation,
so a prototype graft becomes visible without route re-registration.

Do not pass an ordinary method detached:

```ts
router.post('/orders', orders.submit);
```

Do not default to `.bind(orders)` for hot-reloadable handlers; a bound function
retains the implementation selected at bind time.

Use an optional lazy stable binder only when an API requires the same callback
identity for subscription and removal, debouncing, or cancellation. Method
binding is a callback-boundary capability, not part of dependency resolution.

## Keep class behavior graftable

Place replaceable behavior on the prototype:

- Use ordinary methods and accessors.
- Avoid arrow-function fields for service behavior; they are per-instance and
  require owner reconstruction after an edit.
- Keep constructors focused on instance wiring.
- Keep module top level declarative and side-effect free.
- Put process resources such as listeners, pools, and socket registries in a
  stable owner outside replaceable service generations.
- Treat constructor, field-initializer, native `#private`, member-kind, and
  inheritance edits as rebuild-required.
- Treat native addon, environment, Node flag, and global patch changes as
  process-restart boundaries.

Do not claim Node class HMR exists unless the project supplies a module runner,
stable class registry, update classifier, and owner-rebuild path. The namespace
shape enables that runtime; it does not implement module invalidation alone.

## Testing provider replacement

Restore global provider slots after each test:

```ts
const ProductionOrders = Orders.Class;

afterEach(() => {
  Orders.Class = ProductionOrders;
});

it('uses a test provider', () => {
  Orders.Class = class TestOrders extends ProductionOrders {
    submit() {
      return 'test-order';
    }
  };

  expect(new Orders.Class().submit('ignored')).toBe('test-order');
});
```

Do not mutate one global provider concurrently from parallel tests. Use isolated
workers, isolated module graphs, or a scoped test kernel when parallelism is
required.

## Type instance surfaces only when needed

Construction infers the instance automatically:

```ts
const orders = new Orders.Class();
```

Name the type only at an API boundary:

```ts
export type OrdersInstance = InstanceType<typeof Orders.Class>;
```

Do not export an `Instance` alias by reflex. Unlike Vue expose proxies, an
ordinary Node class has no unwrapping type mismatch to repair.

## Keep frontend and backend adapters separate

Share the namespace grammar, not environment machinery:

- Node: `let Class = $Orders`, explicit service ownership.
- ivue: `$Class`, `Class = Reactive($Class)`, and Vue-facing `Instance` typing.
- Universal core: stable ids, provider slots, plugin composition, update
  classification, and prototype grafting.

Never import Vue into a backend class merely to preserve the frontend export
shape. Delete runtime-specific members until only the capabilities the backend
uses remain.

## Self-review

- [ ] Every replaceable capability exports one namespace with mutable `Class`.
- [ ] The implementation class has a unique module-local `$Domain` name.
- [ ] The kernel captures the original class before mutating `Class`.
- [ ] Cross-module constructors are read only inside getters or methods.
- [ ] No top-level construction, provider snapshot, decorator read, or static
      initializer creates an eager dependency edge.
- [ ] Provider choice and instance lifetime have separate owners.
- [ ] Context-varying dependencies use explicit context or scoped DI.
- [ ] Retained callbacks use thin closures unless stable callback identity is
      specifically required.
- [ ] Replaceable behavior lives on the prototype, not arrow-function fields.
- [ ] Tests restore provider slots and do not race global mutations.
- [ ] Hot-update claims include module invalidation, safe classification,
      owner reconstruction, and a final cold-start verification.
