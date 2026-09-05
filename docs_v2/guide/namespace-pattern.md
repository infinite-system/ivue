---
title: Namespace Pattern
description: A capability needs one canonical object, one mutable class slot, and late dependency reads — the invariant beneath Reactive() and Static(), from ivue's canonical form down to the smallest wrapper-less shape and out to Node capability classes.
relatedPosts: [module-level-state, bulletproof-class-modules, circular-imports-dissolved]
---

# Namespace Pattern

> A dependency needs a canonical address and a moment of resolution. It needs
> a container only when the answer varies by runtime context.

## The canonical ivue form

This is the shape every ivue class ships in — the one the
[guide](/guide/modules) teaches and the whole standard is built on:

```ts
export namespace BaseElement {
  export const $Class = $BaseElement; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

Consumers always construct `new BaseElement.Class()`, and because
`Class` is a mutable binding, a kernel or a test can later compose the
slot without changing a single consumer. When the class also declares
**static members**, the anchor wraps them once, at definition —
[the anchor rule](/guide/static):

```ts
export namespace Settings {
  export const $Class = Static($Settings); // anchor — statics wrapped once
  export let Class = Reactive($Class); // in-place — Class === $Class
  export type Instance = typeof Class.Instance;
}
```

This page is about what sits *underneath* those forms. The namespace
pattern begins below ivue: it does not require Vue, refs, `Reactive()`,
or even TypeScript namespace syntax. Its invariant is:

```text
canonical object + mutable Class slot + late dependency read
```

Each part has one responsibility:

- The canonical object names the capability.
- `Class` selects its current implementation.
- A getter or method reads dependencies after module initialization.

## The smallest TypeScript form

The invariant needs **no transform at all**. The smallest namespace is a
raw class and a mutable slot:

```ts
class $Orders {
  static submit(orderId: string) {
    return orderId;
  }
}

export namespace Orders {
  export const $Class = $Orders; // raw — the immutable foundation
  export let Class = $Class; // selected — replaceable at boot or in tests
}
```

Application code reaches the selected capability through one public address:

```ts
Orders.Class.submit(orderId);
```

`Orders` remains stable while `Orders.Class` may change during boot or a
test. That replaceability is the whole invariant — the adapters are
**additive, not constitutive**: [`Static()`](/guide/static) joins when
methods must survive detachment as callbacks (and adds `$`-cached
getters); `Reactive()` joins when instances need Vue reactivity. And an
ordinary class export, with no namespace, is sufficient when nothing
ever needs to replace or compose the class.

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
replaceable class address. The [`Static()`](/guide/static) adapter makes
its methods safe to retain as callbacks:

```ts
import { Static } from 'ivue/extras';

class $Users {
  static find(userId: string) {
    return database.users.find(userId);
  }
}

export namespace Users {
  export const $Class = Static($Users); // anchor — statics wrapped once
  export let Class = $Class; // selected — kernels and tests swap this
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
  export const $Class = Static($Orders); // anchor — it declares statics
  export let Class = $Class;
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

Passing a method detached from the raw class declaration does not
preserve that receiver — which is why the raw class stays
module-private and the published anchor is `Static()`-wrapped: its
methods bind on first read, so direct registration is safe.
Registration reads the **selection**, so the retained callback belongs
to the composed class, not merely the foundation:

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

The kernel retains the anchor and applies extensions from that
foundation on every seal. Extensions declare new members, so the
composed result passes through `Static()` at installation — the same
line every seam swap writes:

```ts
function composeOrders() {
  let SelectedOrders = Orders.$Class; // the immutable anchor

  SelectedOrders = class AuditedOrders extends SelectedOrders {
    static submit(userId: string) {
      audit(userId);
      return super.submit(userId);
    }
  };

  Orders.Class = Static(SelectedOrders); // installation wraps
}
```

Static `super.submit()` retains the derived class as `this`. The base method's
`this.Users` therefore continues to resolve through the final selected class.

A complete kernel starts from `$Class`, gathers every extension, and
calls `Static()` once on the composed result. It never extends an
already selected result during a repeated seal — and it never extends
the mutable `Class` slot, whose value is an eager snapshot away from
load-order drift.

## When `$Class` belongs in the public namespace

The raw foundation belongs in the public namespace when application modules
inherit from it directly:

```ts
class $Notification {
  static deliver(message: string) {
    /* ... */
  }
}

export namespace Notification {
  export const $Class = Static($Notification); // anchor
  export let Class = $Class; // selection
}

class $ErrorNotification extends Notification.$Class {}
```

Here `$Class` is the immutable contract for declared inheritance —
already wrapped, so `$ErrorNotification` inherits working binding and
`$`-caches bare. `Class` is the runtime selection used for invocation.
When every extension goes through the kernel, the kernel may retain the base
privately instead.

The forms are additive:

| Required capability | Namespace surface |
|---|---|
| Ordinary class | no namespace required |
| Replaceable class | `const $Class = $X` + `let Class = $Class` |
| Static members (binding + `$`-caches) | `const $Class = Static($X)` + `let Class = $Class` |
| Vue class reactivity | `const $Class = $X` + `let Class = Reactive($Class)` + `Instance` |
| Both — statics AND instances | `const $Class = Static($X)` + `let Class = Reactive($Class)` + `Instance` |

The rule that decides between rows is visible in the class body:
**declare static members → wrap the anchor.** The `Static()` call
appears exactly where there is something for it to transform.

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
- A method detached from the raw class declaration still loses static
  `this`; anchors and selections bind, raw declarations do not.
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

[Static() — Capability Classes](/guide/static) is the shipped adapter,
from `ivue/extras`. [Node Development by Restart](/guide/node-class-hmr?experiment=1)
defines why the pattern stops before a custom HMR runtime.

## Reading a class's own statics

`Reactive(X) === X`, so a namespace's `Class` slot IS the class. A getter that
reads statics through that slot hard-binds to the base class, and a subclass
override is silently ignored:

```ts
// ❌ the override never applies
class $Tooltip {
  protected get Tooltip() {
    return Tooltip.Class as unknown as typeof $Tooltip;
  }
  static get DWELL_SECONDS() { return 0.4; }
  protected get dwellSeconds() {
    return this.Tooltip.DWELL_SECONDS;   // base value forever
  }
}
```

A subclass setting `0.1` still reads `0.4` through this shape. That defeats the
reason a live (non-`$`) static getter exists: it is the setting a subclass or
a test double overrides.

Take the first rung that applies.

**1. Nothing outside the instance reads it — delete the static.** A plain
instance getter costs zero bytes per instance and is overridable by ordinary
inheritance:

```ts
protected get dwellSeconds() { return 0.4; }
```

**2. Something outside reads it — keep the static, read it through `self`
directly at each call site:**

```ts
protected get self() {
  return this.constructor as typeof $Tooltip;
}

show() {
  this.dwellTimer.start(this.self.DWELL_SECONDS);
}
```

`this.constructor` is the actual class: the subclass when subclassed, and a
class that INHERITS the original when the instance came from `Reactive()`, so
statics resolve in both cases. TypeScript types `constructor` as `Function`,
so one cast is unavoidable — `self` is where it lives, declared once beside
the statics it types instead of asserted at every call site. A method that
reads two or more statics (or reads inside a loop) hoists it first —
`const self = this.self;` — which measures *faster* than the inline cast,
because the engine hoists the class as a loop constant.

An instance getter over a static earns its place when it genuinely
derives — mixing in instance state or transforming the value; a plain read
stays a direct `this.self.X` at the call site, so the knob keeps one name
and one override surface (the static).

**3. Overriding must not happen — name the class directly**,
`$Tooltip.DWELL_SECONDS`, so the code says so.

Never add a `protected get <ClassName>()` self-reference getter. It is a cast
wearing a getter costume: it looks live and is not.

## See it running

- [Inheritance chain](/examples/inheritance) — three levels, one instance, `super.total`.
- [Workspace Platform](/examples/workspace-platform) — a ClickUp-scale graph of models.
- [Extensible Kernel](/examples/extensible-kernel) — plugins extend a namespaced class key.
- [Invar — Terminal IDE](/examples/invar) — 108,000 lines of it in production.
