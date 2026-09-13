import type { Component } from 'vue';
import { Reactive } from '../ivue';
import { Static } from '../Static';

// The kit: the roles a model's subtree composes, as data on the class.
//
// A model declares `static get $kit()` returning a record of entries. An
// entry names a role's view — an SFC, or a tag name for a markup role —
// and, when the role has a class of its own, the namespace that view
// constructs. A container's kit carries `order`, the sequence its template
// renders: `<component v-for="role in model.kit.order" :is="model.kit[role].view"
// v-bind="model.seam(role)" />`. `seam` returns `Kit.Class.seam`:
// what the entry's `bind` says, or `{ model, kit }`; the child's view
// constructs `new (props.kit?.namespace.Class ?? X.Class)(props)`. A model
// reads its kit from its own class and nowhere else, so a swapped class
// brings its own kit and no parent ever constructs a child.
//
// `$kit` is a `$`-prefixed static getter, so `Static()` caches it once per
// receiver class through its own-property guard. Nothing here caches.
//
// A layer is a subclass; `derive` writes one from a patch. A patch replaces
// an entry's fields, reaches below a namespace through `subkit`, extends
// what a child receives through `bind` (the layer below's arrives as
// `inherited`), and edits `order` only by relations against names —
// `after`, `before`, `without`, `move` — never by a list. Every function
// here builds new objects and reads the base; one tree never changes
// another. Reading a chain back — the printed tree, the contacts between
// layers — lives in `KitInspect.ts`, which imports this file and not the
// other way round.
class $Kit {
  /** A derived namespace: `$Class` extends the base's raw class with a `$kit` that is the base's
   *  merged with `patch`, once, here — so a relation that cannot resolve throws at derive time —
   *  and frozen in shape; `Class` is `Reactive($Class)`, what a subclass file would export. The
   *  chain is data on the result — `derivedFrom`, `patch`, `layer` — for whoever reads it back. */
  static derive<Space extends Kit.Namespace, P extends Kit.PatchOf<Space>>(
    namespace: Space,
    patch: P & Kit.Checked<Space, P>,
    layer?: string
  ): Space & Kit.Derived<Space, P> {
    const Base = namespace.$Class as Kit.NamespaceClass;
    const merged = this.freeze(this.merge(Base.$kit ?? {}, patch as Kit.Patch));
    const $Class = Static(
      class extends Base {
        static override get $kit() {
          return merged;
        }
      }
    );
    const derived = { $Class, Class: Reactive($Class), derivedFrom: namespace, patch, layer };
    return { ...namespace, ...derived } as unknown as Space & Kit.Derived<Space, P>;
  }

  /** A kit literal with `subkit` reaches written by hand, resolved: the form a subclass file takes
   *  when it does what `derive` does from data. */
  static resolve<K extends object>(kit: K): K {
    return this.freeze(this.merge({}, kit as Kit.Patch)) as K;
  }

  /** An entry whose types come from its namespace: the bind's result is held to the child's props,
   *  its `subkit` to the child's kit; `Owner` and `Item` arrive from the kit the entry sits in
   *  (`static get $kit(): X.Roles`). At runtime this is the object it was given. */
  static entry<
    N extends Kit.Namespace,
    Owner = unknown,
    Item = undefined,
    Rest extends Kit.EntryRest<Owner, Item, N> = Kit.EntryRest<Owner, Item, N>
  >(
    view: Kit.View,
    namespace: N,
    rest?: Rest & Kit.EntryCheck<Rest, { namespace: N }>
  ): Kit.Entry<Owner, Item, N> {
    return { ...rest, view, namespace };
  }

  /** What a seam hands a role's view: the entry's `bind` over the seam, or `{ model, kit }` when
   *  the entry has none — no seam object is built then. A role with a class always receives its
   *  entry, so its view constructs the class the kit names whatever the bind returned; a tag role
   *  receives only what its bind says. Nothing here reads a role's name: the entry is the table. */
  // invariant: The entry crosses the seam (examples/playground/src/kit/kit.invariants.md)
  static seam<Owner>(
    model: Owner,
    entry: Kit.Entry,
    item?: unknown,
    key?: string | number
  ): Kit.Bound {
    if (!entry.bind) return { model, kit: entry };
    const inherited = () => ({ model, kit: entry });
    const bound = entry.bind({ model, item, key, inherited });
    if (entry.namespace) bound.kit = entry;
    return bound;
  }

  /** The same view over a different contract: a fresh component object with the base view's
   *  `setup` and `render` and the namespace's `props` and `emits`. Fresh because the view object
   *  is shared by every kit that names it — writing onto it would widen every tree — and because
   *  Vue caches a component's normalized options per app by that object. A copy, not
   *  `Object.create`: Vue reads component options as own keys. A tag name passes through. */
  static view<Space extends Kit.Namespace>(view: Kit.View, namespace: Space): Kit.View {
    if (typeof view === 'string') return view;
    const Class = namespace.Class as Kit.NamespaceClass;
    const copy: Record<string, unknown> = { ...(view as object) };
    if (Class.props) copy.props = Class.props;
    if (Class.emits) copy.emits = Class.emits;
    return copy as Component;
  }

  /** The base kit with the patch over it: an entry is merged over the base's, `order` is resolved
   *  through its relations, and every role the order names must have an entry. */
  protected static merge(base: Record<string, unknown>, patch: Kit.Patch): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const role in patch) {
      const value = patch[role];
      if (value === undefined) continue;
      const current = base[role];
      if (role === 'order')
        out.order = this.order(
          base.order as readonly string[] | undefined,
          value as Kit.OrderPatch
        );
      else
        out[role] = this.mergeEntry(current as Kit.Entry | undefined, value as Partial<Kit.Entry>);
    }
    for (const role of (out.order as readonly string[] | undefined) ?? [])
      if (!out[role])
        throw new Error(`Kit.derive: the order names "${role}" but no entry declares it`);
    return out;
  }

  /** The patch's fields over the base entry's. A `subkit` derives the child's namespace here and
   *  is not kept; the view is rewrapped over a namespace the patch changed — brought a namespace
   *  and no view, or a subkit — so the entry declares what its class declares; a brought view over
   *  the same namespace is left alone. A patch's `bind` closes over the layer below's: the seam it
   *  receives carries `inherited`, which runs the base's bind on a copy of the same seam. */
  protected static mergeEntry(
    current: Kit.Entry | undefined,
    patch: Partial<Kit.Entry>
  ): Kit.Entry {
    const { subkit, ...fields } = patch;
    const merged = { ...current, ...fields } as Kit.Entry;
    if (subkit && merged.namespace)
      merged.namespace = this.derive(merged.namespace, subkit as never);
    if ((subkit || (patch.namespace && !patch.view)) && merged.namespace && merged.view)
      merged.view = this.view(merged.view, merged.namespace);
    const below = current?.bind;
    const above = patch.bind;
    if (above && below) merged.bind = (seam) => above({ ...seam, inherited: () => below(seam) });
    return merged;
  }

  /** The base order with one patch's relations applied. Guards first: a list is refused, a base
   *  without an order is refused, a role named twice is refused. Then one walk: every pass applies
   *  each relation whose anchor stands in the list and is not itself waiting to be placed, so an
   *  inserted role anchors a later relation of the same patch; a pass that applies nothing is a
   *  name the order never holds or relations that wait on each other, and the throw lists them. */
  // invariant: An order is edited only through relations against names (examples/playground/src/kit/kit.invariants.md)
  protected static order(base: readonly string[] | undefined, patch: Kit.OrderPatch): string[] {
    if (Array.isArray(patch))
      throw new Error(
        'Kit.derive: `order` in a patch takes relations (after, before, without, move), never a list — a list is a snapshot that drops every role upstream adds later'
      );
    if (!base) throw new Error('Kit.derive: the patch edits `order` but the base declares none');
    const next = [...base];
    let pending = this.relationsOf(patch);
    while (pending.length) {
      const waiting: Kit.Relation[] = [];
      for (const relation of pending)
        if (next.indexOf(relation.anchor) < 0 || this.placing(pending, relation))
          waiting.push(relation);
        else this.apply(next, relation);
      if (waiting.length === pending.length) {
        const list: string[] = [];
        for (const relation of waiting)
          list.push(
            relation.kind === 'without'
              ? `"without ${relation.role}"`
              : `"${relation.kind === 'move' ? 'move ' : ''}${relation.role} ${relation.side} ${relation.anchor}"`
          );
        throw new Error(
          `Kit.derive: these order relations cannot be placed — a name the order lacks, or relations that wait on each other: ${list.join(', ')}`
        );
      }
      pending = waiting;
    }
    return next;
  }

  /** Whether another pending relation still places this one's anchor. */
  protected static placing(pending: Kit.Relation[], relation: Kit.Relation): boolean {
    for (const other of pending)
      if (other !== relation && other.kind !== 'without' && other.role === relation.anchor)
        return true;
    return false;
  }

  /** A removal takes the role out; a move takes it out and places it; an insert places it. */
  protected static apply(next: string[], relation: Kit.Relation): void {
    if (relation.kind !== 'insert') next.splice(this.at(next, relation.role), 1);
    if (relation.kind === 'without') return;
    if (next.indexOf(relation.role) >= 0)
      throw new Error(
        `Kit.derive: "${relation.role}" is already in the order — move it, or name it once`
      );
    next.splice(
      next.indexOf(relation.anchor) + (relation.side === 'after' ? 1 : 0),
      0,
      relation.role
    );
  }

  /** Where a name sits in the list; a name the list does not hold throws. */
  protected static at(next: string[], name: string): number {
    const index = next.indexOf(name);
    if (index < 0)
      throw new Error(
        `Kit.derive: the order relation names "${name}" but the order has no such role`
      );
    return index;
  }

  /** The patch's relations as one list: each names the role it removes or places, the side, and
   *  the anchor. A run of names after one anchor chains, so `after: { Head: ['Badge', 'Pin'] }` puts
   *  Pin after Badge. A role named twice, or moved against itself, is refused here. */
  protected static relationsOf(patch: Kit.OrderPatch): Kit.Relation[] {
    const relations: Kit.Relation[] = [];
    const named = new Set<string>();
    const relate = (
      kind: Kit.Relation['kind'],
      role: string,
      side: Kit.Relation['side'],
      anchor: string
    ) => {
      if (named.has(role))
        throw new Error(
          `Kit.derive: "${role}" is named twice in one order patch — one relation per role`
        );
      if (kind === 'move' && anchor === role)
        throw new Error(`Kit.derive: "${role}" cannot move against itself`);
      named.add(role);
      relations.push({ kind, role, side, anchor });
    };
    for (const role of patch.without ?? []) relate('without', role, 'after', role);
    for (const role in patch.move) {
      const where = patch.move[role];
      if (where)
        relate(
          'move',
          role,
          'after' in where ? 'after' : 'before',
          'after' in where ? where.after : where.before
        );
    }
    for (const anchor in patch.after) {
      let previous = anchor;
      for (const role of patch.after[anchor] ?? []) {
        relate('insert', role, 'after', previous);
        previous = role;
      }
    }
    for (const anchor in patch.before) {
      const names = patch.before[anchor] ?? [];
      let previous = anchor;
      for (let index = names.length - 1; index >= 0; index--) {
        relate('insert', names[index], 'before', previous);
        previous = names[index];
      }
    }
    return relations;
  }

  /** Freeze the kit's SHAPE — the record, every entry, the order — and stop at an entry's leaves: a
   *  namespace (its `Class` slot is the global override), a view (Vue's object), a `props` bag (the
   *  consumer's). Frozen entries are what make sharing them between kits safe. */
  protected static freeze<K extends object>(kit: K): K {
    for (const role in kit) Object.freeze((kit as Record<string, unknown>)[role]);
    return Object.freeze(kit);
  }
}

export namespace Kit {
  export const $Class = Static($Kit);
  export let Class = $Class;

  /** A class as the kit reads it: the contract statics and the kit, all optional. */
  export type NamespaceClass = (abstract new (...args: any[]) => object) & {
    $kit?: Record<string, unknown>;
    props?: Record<string, unknown>;
    emits?: Record<string, unknown>;
  };

  /** What a namespace is at runtime: the raw class to extend and the reactive class to construct;
   *  a derived one carries the chain it came from. */
  /** what a role renders: a component, a tag name for a markup role, or a generic SFC — which
   *  vue-tsc types as a function of its type parameter rather than a `Component` */
  export type View = Component | string | ((...args: never[]) => unknown);

  export interface Namespace {
    $Class: NamespaceClass;
    Class: NamespaceClass;
    derivedFrom?: Namespace;
    patch?: Patch;
    layer?: string;
  }

  /* ---- what a namespace tells the types ---- */

  /** What a child's constructor takes: its props, read off its namespace's `Class`. */
  export type PropsOf<N extends Namespace> = ConstructorParameters<N['Class']>[0];

  /** The instance a namespace constructs — the `model` a bind under that namespace's kit receives. */
  export type ModelOf<N extends Namespace> = InstanceType<N['Class']>;

  /** The kit a namespace's class declares, `{}` when it declares none or types it loosely. */
  export type KitOf<N> = N extends { $Class: { $kit: infer K } } ? (K extends object ? K : {}) : {};

  /** The roles of a kit: its keys but `order`; every name when nothing is known about the kit. */
  export type RolesOf<K> = [keyof K] extends [never] ? string : Exclude<keyof K & string, 'order'>;

  /** The namespace an entry names; the loose `Namespace` for a tag role or a loosely typed entry. */
  export type NamespaceOf<E> = E extends { namespace?: infer N }
    ? N extends Namespace
      ? N
      : Namespace
    : Namespace;

  /** The item an entry's bind receives — read off the bind, `unknown` where no bind says. */
  export type ItemOf<E> = E extends { bind?(seam: Seam<any, infer I, any>): unknown } ? I : unknown;

  /* ---- the seam ---- */

  /** What `v-bind` accepts beside a child's props: a class, a style, an id, listeners, data and
   *  aria attributes. A key outside these and the child's props is refused where the types reach. */
  export interface Attrs {
    class?: unknown;
    style?: unknown;
    id?: string;
    [listener: `on${string}`]: unknown;
    [data: `data-${string}`]: unknown;
    [aria: `aria-${string}`]: unknown;
  }

  /** What a bind returns and what a seam hands a child: any of the child's props (the child keeps
   *  its defaults for the rest) and attributes. Under the loose `Namespace` the props are `any`,
   *  and so is the whole — a tag role's bind and a loosely typed entry's are unchecked. */
  export type Bound<N extends Namespace = Namespace> = 0 extends 1 & PropsOf<N>
    ? any
    : Partial<PropsOf<N>> & Attrs;

  /** The one argument a bind takes: the container's model; under a list container the item and
   *  the key the loop gave it, `undefined` under a section container; and `inherited`, the layer
   *  below's bind closed over this same seam — the default `{ model, kit }` when no layer bound.
   *  `item` is `Item` itself, never a conditional over it: a conditional makes the parameter's
   *  variance unmeasurable, and a typed entry then stops assigning to the loose `Kit.Entry`. */
  export interface Seam<Owner = unknown, Item = unknown, N extends Namespace = Namespace> {
    model: Owner;
    item: Item;
    key: string | number | undefined;
    inherited: () => Bound<N>;
  }

  export interface Entry<Owner = unknown, Item = unknown, N extends Namespace = Namespace> {
    /** the role's markup: an SFC, or a tag name for a markup role */
    view: View;
    /** the role's namespace — `$Class`, `Class`, and whatever else it exports; absent for a tag role */
    namespace?: N;
    /** the consumer's values for this role, read by the class's own getters as `this.props.kit.props.x` */
    props?: Partial<PropsOf<N>>;
    /** an override only: a patch over the roles below this entry's namespace, its binds owned by the child */
    subkit?: KitPatch<KitOf<N>, ModelOf<N>>;
    /** What the parent hands the child, from the seam; absent, the child receives `{ model, kit }`.
     *  A method signature on purpose: a method's parameter compares bivariantly, so an entry whose
     *  bind names its owner and item (`Seam<$Row, Part, typeof MessagePartText>`) still assigns to the
     *  loose `Kit.Entry` a view's `kit` prop declares. As a property, every typed kit would fail at
     *  its own prop boundary. */
    bind?(seam: Seam<Owner, Item, N>): Bound<N>;
    /** Whether the role renders this pass, over the compositor's model; absent, always. The kit's
     *  `v-if`, beside the view it guards, so a layer changes presence by data: `Footer: { shows: () => true }`.
     *  A later layer's rule replaces the one below — presence is one predicate, not a composition. */
    shows?(model: Owner): boolean;
  }

  /** What `entry()` takes beside the namespace and the view. */
  export type EntryRest<Owner, Item, N extends Namespace> = Omit<
    Entry<Owner, Item, N>,
    'view' | 'namespace'
  >;

  /* ---- a kit ---- */

  /** The roles of one kit, every bind owned by `Owner`; `Item` under a list container. Kept beside
   *  `Of` on purpose: a container that is a section container and a list container at once (a row
   *  with sections and parts) is `Of<Sections, Owner> & Roles<Parts, Owner, Part>` — one `order`
   *  over the sections, one item over the parts. */
  export type Roles<R extends string, Owner = unknown, Item = undefined> = {
    [K in R]: Entry<Owner, Item>;
  };

  /** A kit: entries keyed by role and, for a container, the order its template renders. */
  export type Of<R extends string, Owner = unknown, Item = undefined> = Roles<R, Owner, Item> & {
    order?: readonly R[];
  };

  /* ---- a patch ---- */

  /** The edits a patch makes to a container's order — relations against names, never a list.
   *  `Base` is the base kit's roles and `Added` the roles the patch itself declares; below a
   *  `subkit` the added names are open and the runtime check holds the line. */
  export interface OrderPatch<Base extends string = string, Added extends string = string> {
    /** roles inserted after the anchor, in the order given */
    after?: Partial<Readonly<Record<Base | Added, readonly Added[]>>>;
    /** roles inserted before the anchor, in the order given */
    before?: Partial<Readonly<Record<Base | Added, readonly Added[]>>>;
    /** base roles removed from the order */
    without?: readonly Base[];
    /** base roles placed again against another name */
    move?: Partial<Readonly<Record<Base, { after: Base | Added } | { before: Base | Added }>>>;
  }

  /** One relation as `order` applies it. */
  export interface Relation {
    kind: 'insert' | 'move' | 'without';
    role: string;
    side: 'after' | 'before';
    anchor: string;
  }

  /** A patch over one entry: every field optional, the seam owned by `Owner`, the item and the
   *  namespace read off the base entry, and a `subkit` whose binds are owned by the child. */
  export type EntryPatch<E, Owner> = Partial<Entry<Owner, ItemOf<E>, NamespaceOf<E>>>;

  /** A patch over a kit `K` owned by `Owner`: a patch per base role, relations over the order, and
   *  any new role as a loose entry. */
  export type KitPatch<K, Owner> = {
    [R in RolesOf<K>]?: R extends keyof K
      ? EntryPatch<K[R], Owner>
      : Partial<Entry<Owner, unknown>>;
  } & { order?: OrderPatch<RolesOf<K>, string> } & {
    [role: string]: Partial<Entry<Owner, unknown>> | OrderPatch<string, string> | undefined;
  };

  /** A patch with nothing known about its base; `{ subkit }` alone keeps namespace and view. */
  export type Patch<Owner = unknown> = KitPatch<{}, Owner>;

  /** The patch a namespace accepts: its binds see the namespace's own instances, its entries the
   *  namespaces the base kit names. */
  export type PatchOf<Space extends Namespace> = KitPatch<KitOf<Space>, ModelOf<Space>>;

  /* ---- the checks a literal passes at the call site ---- */

  /** The keys of a bind's result that are neither the child's props nor attributes: refused. */
  export type Exact<R, N extends Namespace> = {
    [K in Exclude<keyof R, keyof PropsOf<N> | 'class' | 'style' | 'id'>]: K extends
      `on${string}` | `data-${string}` | `aria-${string}`
      ? unknown
      : never;
  };

  /** A bind as written, held to its child: the seam it declared, a result with no stray key. */
  export type BindCheck<F, N extends Namespace> = 0 extends 1 & PropsOf<N>
    ? unknown
    : F extends (seam: infer S) => infer R
      ? (seam: S) => Exact<R, N>
      : unknown;

  /** An entry patch as written, held to the base entry it patches: its bind to the child's props,
   *  its subkit to the child's kit. */
  export type EntryCheck<EP, E> = (EP extends { bind: infer F }
    ? { bind: BindCheck<F, NamespaceOf<E>> }
    : unknown) &
    (EP extends { subkit: infer SK } ? { subkit: KitCheck<SK, KitOf<NamespaceOf<E>>> } : unknown);

  /** A kit patch as written, held to the kit it patches, role by role. */
  export type KitCheck<P, K> = {
    [R in keyof P]: R extends 'order'
      ? unknown
      : R extends keyof K
        ? EntryCheck<P[R], K[R]>
        : unknown;
  };

  /** The names a top-level patch adds: its keys that are not base roles. */
  export type AddedOf<Space extends Namespace, P> =
    string extends RolesOf<KitOf<Space>>
      ? string
      : Exclude<keyof P & string, RolesOf<KitOf<Space>> | 'order'>;

  /** An anchor map as written, held to the names it may anchor on: a key outside them is refused. */
  export type Anchored<A, Base extends string, Added extends string> = {
    [K in keyof A]: K extends Base | Added ? readonly Added[] : never;
  };

  /** The order relations of a top-level patch, held to the base's roles and the patch's own. */
  export type OrderCheck<O, Base extends string, Added extends string> = O extends object
    ? {
        after?: Anchored<NonNullable<O extends { after?: infer A } ? A : never>, Base, Added>;
        before?: Anchored<NonNullable<O extends { before?: infer A } ? A : never>, Base, Added>;
        without?: readonly Base[];
        move?: {
          [K in keyof NonNullable<O extends { move?: infer M } ? M : never>]: K extends Base
            ? { after: Base | Added } | { before: Base | Added }
            : never;
        };
      }
    : unknown;

  /** Everything `derive` holds a literal patch to once its keys are known. */
  export type Checked<Space extends Namespace, P> = KitCheck<P, KitOf<Space>> & {
    order?: OrderCheck<
      P extends { order?: infer O } ? O : never,
      RolesOf<KitOf<Space>>,
      AddedOf<Space, P>
    >;
  };

  /** What `derive` adds to the namespace it returns: the chain, and a `$Class` whose kit type knows
   *  the roles the patch added, so a later layer may anchor on them and still compile. */
  export type Derived<Space extends Namespace, P = {}> = {
    derivedFrom: Space;
    patch: Patch;
    layer?: string;
    $Class: Space['$Class'] & {
      $kit: KitOf<Space> & { [K in AddedOf<Space, P>]: Entry<ModelOf<Space>, unknown> };
    };
  };
}
