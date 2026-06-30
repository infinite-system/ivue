# Inheritance & `super`

Reactive classes inherit like native classes — across as many levels as you like.
Computeds, refs, methods and `super` all resolve correctly through the chain.

## Deep computed chains

```ts
class $Base {
  get base() { return ref(10) }
  get tag()  { return computed(() => `Base:${this.base.value}`) }
}
class $Mid extends $Base {
  get tag()  { return computed(() => `Mid(${super.tag.value})`) }
}
class $Leaf extends $Mid {
  get tag()  { return computed(() => `Leaf{${super.tag.value}}`) }
  get sum()  { return computed(() => this.base.value + 1) } // reads a grandparent ref
}
const Leaf = Reactive($Leaf)

const leaf = new Leaf()
leaf.tag.value  // "Leaf{Mid(Base:10)}"
```

`super.tag.value` walks up to each ancestor's computed. Mutating an **ancestor**
ref re-runs the whole chain:

```ts
leaf.base.value = 20
leaf.tag.value  // "Leaf{Mid(Base:20)}"
```

## Why it doesn't collide

When `Reactive()` processes the prototype chain, each `(prototype, key)` gets its
own cache symbol. So `$Base`'s `tag` and `$Leaf`'s `tag` live under **different**
keys on the same instance — the child's cached computed and the `super` computed
it calls coexist instead of overwriting each other. No special configuration; it
just works.

## Methods and `super`

```ts
class $A { greet() { return 'A' } }
class $B extends $A { greet() { return super.greet() + '>B' } }
new (Reactive($B))().greet() // "A>B"
```

## Each level is usable on its own

A middle class is a complete reactive class too:

```ts
new (Reactive($Mid))().tag.value  // "Mid(Base:10)"
```

## One difference from native JS (and v1)

ivue v2 follows **native JS** accessor semantics: a setter-only accessor on a
child shadows an inherited getter. So *splitting* a `get` on one level and a `set`
on another (which ivue **v1** merged into one computed) does **not** merge in v2.

In v2 you don't need to — express writable state as a single getter returning a
ref or a writable computed:

```ts
// v2 way — getter + writable computed in one place
get _feel() { return ref('sleek') }
get feel()  {
  return computed({ get: () => this._feel.value, set: v => this._feel.value = v })
}
```

Everything else — overrides, `super`, reactivity through the chain — matches v1.

## Extending across files

When parent and child live in different files, use the
[namespace module pattern](/guide/modules) so children extend the raw class and
each file calls `Reactive()` on its own class. The idempotent transform makes
shared ancestors safe to process once.
