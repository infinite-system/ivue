---
name: node-namespace
description: Author and refactor TypeScript Node.js backends around static capability classes, mutable class namespaces, late dependency getters, lazy-bound static methods, native inheritance, and boot-time composition. Use for backend modules, circular imports, route or queue callbacks, plugin kernels, test doubles, and designs that would otherwise introduce DI tokens, decorators, forwardRef, or service instances that only hold methods.
---

# Node Namespace

Author stateless backend modules as static capability classes. Export one raw
inheritance foundation and one selected callback-safe class through a canonical
namespace.

Use the tested `Static()` reference at
[`experiments/node-namespace/Static.ts`](../../../experiments/node-namespace/Static.ts).
Keep it local to the backend until this experiment becomes a package.

## Canonical capability module

```ts
import { Static } from '../runtime/Static';
import { Users } from './Users';

class $Orders {
  static get Users() {
    return Users.Class;
  }

  static submit(request: OrderRequest) {
    return this.Users.find(request.params.userId);
  }
}

export namespace Orders {
  export const $Class = $Orders; // raw — declared inheritance extends this
  export let Class = Static($Class); // selected — callbacks read this
}
```

Use this shape for commands, queries, validation, mapping, orchestration,
routes, and other modules that would otherwise export a function bag.

Use an ordinary function or class export when the module needs no circular
dependency seam, selection, inheritance, or retained method callback.

## Read dependencies late

Import the namespace, then read its `Class` inside a static getter or method:

```ts
static get Users() {
  return Users.Class;
}
```

Apply these constraints:

- Keep every cross-module class read inside a getter or method body.
- Never snapshot `Other.Class` at module scope or in a static field.
- Never perform cross-module work in decorators or static initialization.
- Permit circular imports only when every cross-module value edge is late.
- Reject circular inheritance and recursive construction; lateness cannot make
  either structure valid.

Use a direct method-body read when a named dependency getter adds no clarity.
Both expressions are late.

## Pass selected methods directly

`Static()` binds a selected static method on first read and replaces the lazy
accessor with that ordinary bound function. Register it directly:

```ts
router.post('/orders', Orders.Class.submit);
queue.consume('orders', Orders.Class.submit);
```

Do not pass a method from raw `$Class`; raw static methods lose `this` when
detached.

The retained function belongs to the class selected during registration. It
does not follow a later `Orders.Class` assignment. Finish composition before
callbacks escape, and let normal process restart register a fresh generation
after source edits.

Treat `Class` as mutable during boot and tests, then sealed for the process
generation. Never implement plugins as runtime toggles by default.

Use a forwarding closure only when live provider changes are an explicit
application requirement:

```ts
router.post('/orders', (request) => Orders.Class.submit(request));
```

That closure adds live selection. It is not the default authoring shape.

## Preserve raw inheritance

Extend `$Class`, then apply `Static()` to the child:

```ts
class $PriorityOrders extends Orders.$Class {
  static override submit(request: OrderRequest) {
    audit(request);
    return super.submit(request);
  }
}

export namespace PriorityOrders {
  export const $Class = $PriorityOrders;
  export let Class = Static($Class);
}
```

Never extend `Orders.Class`. The selected class owns bound public methods;
`$Class` remains the untouched native `super` chain.

## Compose before selection

Apply plugin extensions to raw classes, then select once:

```ts
let SelectedOrders = Orders.$Class;

for (const extendOrders of orderExtensions) {
  SelectedOrders = extendOrders(SelectedOrders);
}

Orders.Class = Static(SelectedOrders);
```

Require the kernel to retain each original `$Class`, apply extensions in
deterministic order, and start every seal from that foundation. Never extend a
previously selected or previously extended result.

Use this boot sequence:

```text
load modules
→ compose raw classes
→ assign Static() selections
→ register retained callbacks
→ listen
```

## Let Node own restart

Use the project's existing watcher to restart the process after edits. Do not
add module invalidation, donor generations, method grafting, callback
forwarding registries, or state migration to this pattern.

The namespace shape makes a clean restart dependable because cross-module
values resolve after initialization. Production and development execute the
same capability classes and selected methods.

## Use instances only for identity

Choose an instance class when an object has genuine state, identity, lifetime,
or disposal:

```ts
class $OrderWorker {
  constructor(private readonly queue: OrderQueue) {}

  run() {
    return this.queue.take();
  }
}

export namespace OrderWorker {
  export const $Class = $OrderWorker;
  export let Class = $Class;
}
```

Give every long-lived instance an explicit owner. Do not route stateful
instance classes through `Static()`.

Use explicit context or scoped DI when provider choice varies by request,
tenant, session, or runtime data. One global `Class` slot represents one
application-wide selection.

## Use model namespaces without `Static()`

ORM models such as Objection models are stateful constructors with a
framework-owned static protocol. Use the namespace to make related model reads
late, but do not transform their inherited static API:

```ts
class $User extends Model {
  static get relationMappings() {
    return {
      orders: {
        relation: Model.HasManyRelation,
        modelClass: Orders.Class,
        join: {
          from: 'users.id',
          to: 'orders.user_id',
        },
      },
    };
  }
}

export namespace Users {
  export const $Class = $User;
  export let Class = $Class;
  export type Instance = InstanceType<typeof Class>;
}
```

The getter creates the lateness; `.Class` supplies the selected value. Never
put a cross-model `.Class` read in an eager static relation field.

The exported namespace is the cross-module indirection in both module systems.
A CommonJS named-import transform retains the module exports object; ESM
retains a live exported binding. The getter later reaches the completed
`Related.Class` property in either case. ESM is not required.

A static import still starts loading its target. Namespace imports remain safe
only when every value edge in the circular graph is late: decorators, mixins,
static fields, schemas, and top-level factories must not inspect the related
class during initialization. Never snapshot `Related.Class` into a top-level
binding or default export.

Replace path-valued `modelClass`, thunked `require()`, and `lazyImport()` with
ordinary namespace imports once the whole cycle satisfies that invariant. If
a loader workaround remains necessary, find the eager module edge outside the
relation getter. Finish any boot-time model selection before the first ORM
query, then call model statics as members such as `Users.Class.query()`.

## Keep resources in the composition root

Keep HTTP listeners, database pools, socket registries, workers, and shutdown
ownership outside capability classes. Late-read or pass those resources from a
stable composition root. Avoid module-top-level process side effects.

Use TypeScript `private static` for class-internal members accessed through
polymorphic `this`. It is an authoring-time restriction backed by an ordinary
runtime property, so it works through the selected subclass. Use `protected
static` when subclasses or plugins need direct access.

Use module closures or root-owned services when capability data must remain
private at runtime. Avoid `this.#member` in static capability classes: a
selected class is a subclass of `$Class`, while native static `#private` brands
only the declaring class and rejects the subclass receiver. Lexical access such
as `$Orders.#member` remains valid but is deliberately non-polymorphic.
Instance `#private` fields are unaffected.

## Test provider selection

Select test classes before registering callbacks and restore the global slot:

```ts
const ProductionOrders = Orders.Class;

afterEach(() => {
  Orders.Class = ProductionOrders;
});

it('uses a test provider', () => {
  class $TestOrders extends Orders.$Class {
    static override submit() {
      return 'test-order';
    }
  }

  Orders.Class = Static($TestOrders);
  expect(Orders.Class.submit()).toBe('test-order');
});
```

Do not mutate one global provider concurrently from parallel tests. Use
isolated workers or isolated module graphs when parallel selection is needed.

## Self-review

- [ ] Stateless modules use static capability classes.
- [ ] Each capability exports immutable `$Class` and mutable selected `Class`.
- [ ] Every selected static class is created through `Static($Class)`.
- [ ] Cross-module class values are read only inside getters or methods.
- [ ] No top-level snapshot, decorator read, or process side effect creates an
      eager dependency edge.
- [ ] Retained callbacks come from selected `Class`, never raw `$Class`.
- [ ] Declared children extend `$Class`, never selected `Class`.
- [ ] Kernel extensions compose raw classes before one final `Static()` call.
- [ ] The process watcher owns source-edit restart; no live HMR runtime appears.
- [ ] Instances exist only for state, identity, lifetime, or disposal.
- [ ] ORM models use late namespace reads without `Static()`.
- [ ] Context-varying dependencies use explicit context or scoped DI.
- [ ] Tests restore provider slots and avoid concurrent global mutation.
