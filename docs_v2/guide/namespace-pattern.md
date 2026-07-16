---
title: The Namespace Pattern, Crystallized
description: A capability needs one canonical object, one mutable class slot, and late dependency reads. A tiny Static() adapter adds passable Node callbacks without a DI container or custom module runtime.
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
  export const $Class = $Orders;
  export let Class = Static($Class);
}
```

Application code reaches the selected capability through one public address:

```ts
Orders.Class.submit(orderId);
```

`Orders` remains stable while `Orders.Class` may change during boot or a test.
An ordinary class export is sufficient when nothing needs to
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
replaceable class address. The experimental `Static()` adapter makes its
methods safe to retain as callbacks:

```ts
import { Static } from './Static';

class $Users {
  static find(userId: string) {
    return database.users.find(userId);
  }
}

export namespace Users {
  export const $Class = $Users;
  export let Class = Static($Class);
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

### Selected resolution

The getter does not retain `Users.Class`. A test or boot-time plugin kernel may
change that selection before the application begins dispatching work. Runtime
composition is then sealed until process restart.

The circularity invariant is precise:

> Imports may be circular. Cross-module values must not be read eagerly.

A method body is late for the same reason. A named getter earns its place when
the dependency appears throughout the class or belongs in the capability's
readable anatomy.

## Objection models use the namespace without `Static()`

Objection models are stateful instance constructors with a framework-owned
static protocol. Give them the namespace's late selection point, but leave
their static methods untouched:

```ts
// User.model.ts
import { Model } from 'objection';
import { Orders } from './Order.model';

class $User extends Model {
  static tableName = 'users';

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

The other side follows the same rule:

```ts
// Order.model.ts
import { Model } from 'objection';
import { Users } from './User.model';

class $Order extends Model {
  static tableName = 'orders';

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: Users.Class,
        join: {
          from: 'orders.user_id',
          to: 'users.id',
        },
      },
    };
  }
}

export namespace Orders {
  export const $Class = $Order;
  export let Class = $Class;
  export type Instance = InstanceType<typeof Class>;
}
```

The dot in `Orders.Class` does not create lateness. The
`relationMappings` getter does. Objection calls the getter after module
initialization; only then does the object literal read the selected related
class.

This follows Objection's native contract: `relationMappings` may be an object,
function, or getter, and `modelClass` may be a model constructor or module
path. See [Objection's static relation properties](https://vincit.github.io/objection.js/api/model/static-properties.html#static-relationmappings).

The corresponding static field is eager and remains unsafe in a cycle:

```ts
static relationMappings = {
  orders: {
    modelClass: Orders.Class, // read during class initialization
  },
};
```

### Why a getter sometimes appeared insufficient

A static import always begins loading its target module. Under CommonJS it
becomes a top-level `require()`. The relation getter postpones the imported
value read, but it does not postpone execution of the target module.

Path-valued `modelClass`, a thunk containing `require()`, or a `lazyImport()`
inside the getter adds a second kind of lateness by postponing module loading:

| Relation form | Target module loads | Class value reads |
|---|---|---|
| Static field with imported class | during initialization | during initialization |
| Getter with imported class | during module-graph loading | when Objection reads the getter |
| Getter with path, thunk, or `lazyImport()` | when the relation resolves | when the relation resolves |
| Getter with `Related.Class` | during module-graph loading | when Objection reads the getter |

The namespace form does not need to postpone module loading. Its portability
comes from the export shape:

```ts
export namespace Orders {
  export const $Class = $Order;
  export let Class = $Class;
}
```

Under CommonJS, a named-import transform retains the module's exports object;
the later getter reaches its completed `Orders.Class` property. Under ESM,
`Orders` is a live exported binding and the later getter reaches the same
selected property. The namespace is therefore one stable exported address in
both module systems. ESM is not required.

What must remain late is the **read**, not the export. Do not copy the selected
class into another module-level binding or default export:

```ts
const OrderClass = Orders.Class; // eager snapshot — loses the invariant
export default Orders.Class; // eager snapshot — loses later selection
```

CommonJS may temporarily expose a partially initialized exports object during
a cycle, while ESM may leave an exported binding uninitialized during module
evaluation. Neither is a problem when no participant reads the namespace until
the relation getter runs. This works when the invariant covers the entire
cycle: no participant reads another participant's value while the graph is
loading.

A native Node ESM project uses emitted extensions in relative specifiers, such
as `./Order.model.js` under `moduleResolution: "NodeNext"`, but that is a module
configuration detail rather than the source of the circularity guarantee.

### Migration rule

Replace model-to-model path loaders with ordinary imports of the exported
namespace when all edges in the cycle follow these rules:

- Every relation map that reads another model is a getter or method.
- Every `modelClass` reads `Related.Class` inside that late body.
- No module snapshots `Related.Class` into a top-level binding or export.
- Decorators, mixins, static fields, schemas, and module-top-level factories do
  not inspect related classes during initialization.
- Circular inheritance and recursive construction remain forbidden.
- Boot-time model selection finishes before the first Objection query.

If a path or `lazyImport()` remains necessary, it identifies an eager module
edge outside the relation getter. Isolate that decorator, initializer, factory,
or side effect instead of making loader indirection the default model grammar.

Do not pass Objection models through `Static()`. Objection creates instances,
owns inherited static behavior, and may create specialized model subclasses.
Call model statics as members—`Users.Class.query()`—and reserve `Static()` for
stateless capability classes whose methods escape as callbacks.

## Retained handlers choose a class generation

Static methods are ordinary JavaScript functions. Calling one as a member
supplies the selected class as `this`:

```ts
Orders.Class.submit(userId);
```

Passing an ordinary static method alone does not preserve that receiver:

```ts
router.post('/orders', Orders.$Class.submit);
```

`Static()` binds the selected method on first read, so direct registration is
safe:

```ts
router.post('/orders', Orders.Class.submit);
```

The retained function belongs to the class selected during route
registration. Boot composition therefore finishes before callbacks escape.
After an edit, the Node process owner restarts and registers callbacks from one
fresh generation.

A forwarding closure is still available when an application deliberately
changes providers while the process remains live:

```ts
router.post('/orders', (request) =>
  Orders.Class.submit(request.params.userId),
);
```

That live-read behavior is optional. It is not the default Node development
contract.

ivue provides a stronger instance-method contract on the frontend.
`Reactive()` turns instance methods into lazily bound, referentially stable
functions. `Static()` applies the smaller static equivalent to backend
capability classes. Each adapter retains only its runtime's required behavior.

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
| Boot-time composition | a kernel assigns `Static(SelectedClass)` once |

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
function composeOrders() {
  let SelectedOrders = Orders.$Class;

  SelectedOrders = class AuditedOrders extends SelectedOrders {
    static submit(userId: string) {
      audit(userId);
      return super.submit(userId);
    }
  };

  Orders.Class = Static(SelectedOrders);
}
```

Static `super.submit()` retains the derived class as `this`. The base method's
`this.Users` therefore continues to resolve through the final selected class.

A complete kernel starts from `$Class`, gathers every raw extension, and calls
`Static()` once on the composed result. It never extends an already selected
result during a repeated seal.

## When `$Class` belongs in the public namespace

The raw foundation belongs in the public namespace when application modules
inherit from it directly:

```ts
class $Notification {}

export namespace Notification {
  export const $Class = $Notification;
  export let Class = Static($Class);
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
| Replaceable static capability | `const $Class` + `let Class` |
| Passable static methods | `const $Class` + `let Class = Static($Class)` |
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
need an explicit owner and remain ordinary instance classes:

```ts
class $Application {
  readonly worker = new OrderWorker.Class();
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
- A method detached from raw `$Class` still loses static `this`; retained
  callbacks use the selected `Static()` class.
- A selected static callback remains attached to one class generation; it does
  not follow a later `Class` assignment.

These are eager edges or genuine logical recursion. The pattern removes hidden
load-order discipline without hiding impossible graphs behind a container.

## One invariant across runtimes

The shared class grammar allows each runtime to add only its required adapter:

```text
canonical namespace object + mutable Class slot + late reads
├── Node: Static() capability classes and process restart
├── stateful Node: ordinary instances with explicit owners
├── ivue: Reactive() and Vue-facing Instance typing
├── plugins: boot-time class composition
└── development: reconstruction by the existing runtime owner
```

The namespace is not an ivue convention exported to Node. ivue and Node are
different expressions generated from the same smaller invariant.

[Static Classes for Node](/guide/node-static-runtime?experiment=1) contains the
working transform and benchmarks. [Node Development by Restart](/guide/node-class-hmr?experiment=1)
defines why the experiment stops before a custom HMR runtime.
