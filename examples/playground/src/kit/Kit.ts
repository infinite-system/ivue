import type { Component } from 'vue';
import { Reactive } from '../ivue';
import { Static } from '../Static';

// The kit: the roles a model's subtree composes, as data on the class.
//
// A model declares `static get $kit()` returning a record of entries. An
// entry names a role's view — an SFC, or a tag name for a markup role —
// and, when the role has a class of its own, the namespace that view
// constructs. A container's kit may carry `order`, the sequence its
// template renders: `<component v-for="role in model.kit.order" :is="model.kit[role].view"
// v-bind="model.seamProps(role)" />`. `seamProps` hands the child what the
// entry's `bind` says, or `{ model, kit }` when the entry has none; the
// child's view constructs `new (props.kit?.namespace.Class ?? X.Class)(props)`.
// A model reads its kit from its own class and nowhere else, so a swapped
// class brings its own kit and no parent ever constructs a child.
//
// `$kit` is a `$`-prefixed static getter, so `Static()` caches it once per
// receiver class through its own-property guard: a subclass that has not
// built its kit yet never sees its parent's. Nothing here caches.
//
// Overrides are subclasses. A subclass spreads `super.$kit` and replaces
// entries; `derive` writes that subclass from a patch. A patch replaces an
// entry's fields, reaches below a namespace through `subkit`, extends what
// a child receives through `bind` (the layer below's bind arrives as
// `inherited`), and edits `order` only through relations against names —
// `after`, `before`, `without`, `move` — never through a list. Every
// function here builds new objects and reads the base; one tree never
// changes another.
class $Kit {
  /** The fields of an entry two layers may both write. `bind` composes through `inherited` and
   *  `subkit` recurses, so neither is a contact; these three replace, so a second write is one. */
  static readonly REPLACED_FIELDS: readonly string[] = ['view', 'namespace', 'props'];

  /** Whether a conflict report prints when `derive` is not strict — a live knob a test turns off. */
  static get warns(): boolean {
    return true;
  }

  /** Every entry with a `subkit` becomes an entry whose namespace is derived and whose view
   *  declares the derived contract; `order` passes through as the list it is; every other entry
   *  passes through untouched. */
  static resolve<K extends object>(kit: K): K {
    const out: Record<string, unknown> = {};
    for (const [role, value] of Object.entries(kit)) {
      if (role === 'order') out.order = value;
      else
        out[role] = this.isEntry(value) ? this.resolveEntry(value) : this.resolve(value as object);
    }
    return this.deepFreeze(out) as K;
  }

  /** A derived namespace: `$Class` extends the base's raw class with a `$kit` that is the base's
   *  merged with `patch` and resolved; `Class` is `Reactive($Class)` — what a subclass file
   *  would export — and `derivedFrom` names the base, since a minified build keeps no class names
   *  an inspector could read. The patch and the layer's name ride along for the printed tree and
   *  the conflict report. The base namespace is only read; the patch is read at derive time, so a
   *  malformed order relation throws here, not at the first render. */
  static derive<Space extends Kit.Namespace>(
    namespace: Space,
    patch: Kit.PatchOf<Space>,
    options: Kit.DeriveOptions = {}
  ): Space & Kit.Derived<Space> {
    const kit = this;
    const Base = namespace.$Class as Kit.NamespaceClass;
    const layer = options.name ?? `layer ${this.layers(namespace).length}`;
    this.reportConflicts(namespace, patch as Kit.Patch, layer, options.strict === true);
    this.merge(Base.$kit ?? {}, patch as Kit.Patch); // a malformed relation throws here, not at the first render
    const $Class = Static(
      class extends Base {
        static override get $kit() {
          return kit.resolve(kit.merge(Base.$kit ?? {}, patch as Kit.Patch));
        }
      }
    );
    return {
      ...namespace,
      $Class,
      Class: Reactive($Class),
      derivedFrom: namespace,
      patch: patch as Kit.Patch,
      layer
    };
  }

  /** The same view over a different contract: a fresh component object with the base view's
   *  `setup` and `render` and the namespace's `props` and `emits`. Fresh because the view object
   *  is shared by every kit that names it — writing onto it would widen every tree — and because
   *  Vue caches a component's normalized options per app by that object, so a mounted view keeps
   *  its first contract whatever is written onto it later. A copy, not `Object.create`: Vue reads
   *  component options as own keys, and a prototype-backed view renders nothing. A tag role has
   *  no contract to declare; its name passes through. */
  static view<Space extends Kit.Namespace>(
    view: Component | string,
    namespace: Space
  ): Component | string {
    if (typeof view === 'string') return view;
    const Class = namespace.Class as Kit.NamespaceClass;
    const copy: Record<string, unknown> = { ...(view as object) };
    if (Class.props) copy.props = Class.props;
    if (Class.emits) copy.emits = Class.emits;
    return copy as Component;
  }

  /** What a seam hands a role's view, for a container's `seamProps(role, item?, key?)` to return: the
   *  entry's `bind` over the seam, or `{ model, kit }` when the entry has none — no seam object is
   *  built then. A role with a class always receives its entry, so its view constructs the class the
   *  kit names whatever the bind returned; a tag role receives only what its bind says. Nothing here
   *  reads a role's name: the entry is the table. */
  // invariant: The entry crosses the seam (examples/playground/src/kit/kit.invariants.md)
  static seam<Owner>(
    model: Owner,
    entry: Kit.Entry,
    item?: unknown,
    key?: string | number
  ): Kit.Bound {
    if (!entry.bind) return { model, kit: entry };
    const inherited = () => ({ model, kit: entry });
    const bound = entry.bind({ model, item, key, inherited } as Kit.Seam);
    return entry.namespace ? { kit: entry, ...bound } : bound;
  }

  /** The derivation chain, base first: the shipped namespace, then every layer over it. */
  static layers(namespace: Kit.Namespace): Kit.Namespace[] {
    const chain: Kit.Namespace[] = [];
    for (let current: Kit.Namespace | undefined = namespace; current; current = current.derivedFrom)
      chain.unshift(current);
    return chain;
  }

  /** The conflicts a patch has with the layers already in the chain: a replaced field of one entry
   *  written by two layers, a role moved by two layers. One line per contact, naming every layer
   *  that wrote it, the new one last. */
  static conflicts(namespace: Kit.Namespace, patch: Kit.Patch, layer: string): string[] {
    const writes = new Map<string, string[]>();
    for (const previous of this.layers(namespace)) {
      if (!previous.patch) continue;
      for (const key of this.writesOf(previous.patch))
        writes.set(key, [...(writes.get(key) ?? []), previous.layer ?? 'layer']);
    }
    const lines: string[] = [];
    for (const key of this.writesOf(patch)) {
      if (key.endsWith('.bind') || key.includes('#position:')) continue; // binds compose; a placed role is a contact only when moved twice
      const before = writes.get(key);
      if (before) lines.push(`${key}: written by ${[...before, layer].join(', then ')}`);
    }
    return lines;
  }

  /** The resolved tree as text, one line per seam: its position, its role, its view, its class,
   *  whether a bind feeds it, and the layer that last set each of those — `base` when none did.
   *  A role whose namespace declares a kit prints its own tree below it, indented. */
  static tree(namespace: Kit.Namespace): string {
    const layers = this.layers(namespace).filter((layer) => layer.patch);
    return this.treeLines(namespace, layers, [], '', new Set()).join('\n');
  }

  /** The layers are the root's: a nested namespace derived by `resolve` keys its writes from its
   *  own kit, while the root's patches carry the whole path. A kit that names a class already open
   *  above it — a part whose sub-thread renders rows — prints once; the repeat is marked. */
  protected static treeLines(
    namespace: Kit.Namespace,
    layers: Kit.Namespace[],
    path: string[],
    indent: string,
    open: Set<Kit.NamespaceClass>
  ): string[] {
    const Class = namespace.$Class as Kit.NamespaceClass;
    const kit = Class.$kit;
    if (!kit) return [];
    if (open.has(Class)) return [`${indent}(a kit already printed above)`];
    open = new Set(open).add(Class);
    const order = (kit.order as readonly string[] | undefined) ?? [];
    const roles = [
      ...order,
      ...Object.keys(kit).filter((role) => role !== 'order' && !order.includes(role))
    ];
    const lines: string[] = [];
    if (order.length) lines.push(`${indent}order: ${order.join(' ')}`);
    for (const role of roles) {
      const entry = kit[role] as Kit.Entry;
      if (!this.isEntry(entry)) continue;
      const at = order.indexOf(role);
      const setBy = this.settersOf(layers, [...path, role], at >= 0);
      lines.push(
        `${indent}${at >= 0 ? at : '-'} ${role}: view ${this.viewName(entry.view)} · class ${this.className(entry.namespace)} · bind ${entry.bind ? 'yes' : 'no'} · ${setBy}`
      );
      if (entry.namespace)
        lines.push(
          ...this.treeLines(entry.namespace, layers, [...path, role], `${indent}  `, open)
        );
    }
    return lines;
  }

  /** `view←bubbles, position←compact`, or `base` when no layer touched the role. */
  protected static settersOf(layers: Kit.Namespace[], path: string[], ordered: boolean): string {
    const fields = [...this.REPLACED_FIELDS, 'bind', ...(ordered ? ['position'] : [])];
    const setters: string[] = [];
    for (const field of fields) {
      const key = field === 'position' ? this.positionKey(path) : `${path.join('.')}.${field}`;
      const owner = layers.filter((layer) => this.writesOf(layer.patch!).includes(key)).pop();
      if (owner) setters.push(`${field}←${owner.layer}`);
    }
    return setters.length ? setters.join(', ') : 'base';
  }

  protected static positionKey(path: string[]): string {
    return `${path.slice(0, -1).join('.')}#position:${path[path.length - 1]}`;
  }

  /** Every write a patch makes, as keys: `Message.Head.view` for a replaced field,
   *  `Message#move:Foot` for a move, `Message#position:Badge` for any role a relation placed. */
  protected static writesOf(patch: Kit.Patch, path: string[] = []): string[] {
    const keys: string[] = [];
    for (const [role, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (role === 'order') {
        const order = value as Kit.OrderPatch;
        const prefix = path.join('.');
        for (const moved of Object.keys(order.move ?? {}))
          keys.push(`${prefix}#move:${moved}`, `${prefix}#position:${moved}`);
        for (const names of [
          ...Object.values(order.after ?? {}),
          ...Object.values(order.before ?? {})
        ])
          for (const name of names) keys.push(`${prefix}#position:${name}`);
        for (const name of order.without ?? []) keys.push(`${prefix}#position:${name}`);
        continue;
      }
      const here = [...path, role];
      if (this.isEntry(value) || this.isEntryPatch(value)) {
        const entry = value as Partial<Kit.Entry>;
        for (const field of this.REPLACED_FIELDS)
          if (field in entry && entry[field as keyof Kit.Entry] !== undefined)
            keys.push(`${here.join('.')}.${field}`);
        if (entry.bind) keys.push(`${here.join('.')}.bind`);
        if (entry.subkit) keys.push(...this.writesOf(entry.subkit, here));
      } else keys.push(...this.writesOf(value as Kit.Patch, here));
    }
    return keys;
  }

  protected static reportConflicts(
    namespace: Kit.Namespace,
    patch: Kit.Patch,
    layer: string,
    strict: boolean
  ): void {
    const lines = this.conflicts(namespace, patch, layer);
    if (!lines.length) return;
    const report = `Kit.derive: "${layer}" writes what a layer below already wrote — the last write wins:\n  ${lines.join('\n  ')}`;
    if (strict) throw new Error(report);
    if (this.warns) console.warn(report);
  }

  protected static viewName(view: Component | string): string {
    if (typeof view === 'string') return `<${view}>`;
    const named = view as { __name?: string; name?: string };
    return named.__name ?? named.name ?? 'component';
  }

  /** The raw class's name, read past the anonymous subclass `derive` writes and the bound subclass
   *  `Static()` returns — a minified build prints whatever survived, which is why `derivedFrom` exists. */
  protected static className(namespace: Kit.Namespace | undefined): string {
    if (!namespace) return '-';
    const chain = this.layers(namespace);
    let raw: Kit.NamespaceClass | null = chain[0].$Class as Kit.NamespaceClass;
    while (raw && (raw.name === '' || raw.name === 'SelectedClass'))
      raw = Object.getPrototypeOf(raw) as Kit.NamespaceClass | null;
    const base = raw?.name || 'class';
    return chain.length > 1 ? `${base} + ${chain.length - 1} layer(s)` : base;
  }

  protected static resolveEntry(entry: Kit.Entry): Kit.Entry {
    if (!entry.namespace || !entry.subkit) return entry;
    const { subkit, ...rest } = entry;
    const namespace = this.derive(entry.namespace, subkit);
    return { ...rest, namespace, view: this.view(entry.view, namespace) };
  }

  /** The base kit with the patch over it: entries merged, `order` resolved through its relations,
   *  and every role the order names checked to have an entry — a name nothing declares throws. */
  protected static merge(base: Record<string, unknown>, patch: Kit.Patch): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const [role, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (role === 'order') {
        out.order = this.order(
          base.order as readonly string[] | undefined,
          value as Kit.OrderPatch
        );
        continue;
      }
      const current = base[role];
      out[role] =
        this.isEntry(current) || this.isEntry(value)
          ? this.mergeEntry(current as Kit.Entry | undefined, value as Partial<Kit.Entry>)
          : this.merge((current as Record<string, unknown>) ?? {}, value as Kit.Patch);
    }
    for (const role of (out.order as readonly string[] | undefined) ?? [])
      if (!this.isEntry(out[role]))
        throw new Error(`Kit.derive: the order names "${role}" but no entry declares it`);
    return out;
  }

  /** The base order with one patch's relations applied: `without` first, then moves and inserts
   *  as their anchors become present, so an inserted role can anchor a later insert of the same
   *  patch. A relation is against names only — a list is refused, a name the order never holds
   *  throws, a role named twice throws, and a set of relations that contradict each other throws. */
  // invariant: An order is edited only through relations against names (examples/playground/src/kit/kit.invariants.md)
  protected static order(base: readonly string[] | undefined, patch: Kit.OrderPatch): string[] {
    if (Array.isArray(patch))
      throw new Error(
        'Kit.derive: `order` in a patch takes relations (after, before, without, move), never a list — a list is a snapshot that drops every role upstream adds later'
      );
    if (!base) throw new Error('Kit.derive: the patch edits `order` but the base declares none');
    const relations = this.relationsOf(patch);
    this.refuseCycle(relations);
    const next = [...base];
    const missing = (name: string) =>
      new Error(`Kit.derive: the order relation names "${name}" but the order has no such role`);
    for (const role of patch.without ?? []) {
      const at = next.indexOf(role);
      if (at < 0) throw missing(role);
      next.splice(at, 1);
    }
    let pending = relations.filter((relation) => relation.kind !== 'without');
    while (pending.length) {
      const ready = pending.filter(
        (relation) =>
          next.includes(relation.anchor) &&
          (relation.kind === 'insert' || next.includes(relation.role))
      );
      if (!ready.length) {
        const stuck = pending[0];
        throw missing(next.includes(stuck.anchor) ? stuck.role : stuck.anchor);
      }
      for (const relation of ready) {
        if (relation.kind === 'insert' && next.includes(relation.role))
          throw new Error(
            `Kit.derive: "${relation.role}" is already in the order — move it, or name it once`
          );
        if (relation.kind === 'move') next.splice(next.indexOf(relation.role), 1);
        const anchorAt = next.indexOf(relation.anchor);
        next.splice(relation.side === 'after' ? anchorAt + 1 : anchorAt, 0, relation.role);
      }
      pending = pending.filter((relation) => !ready.includes(relation));
    }
    return next;
  }

  /** The patch's relations as one list: each names the role it places, the side, and the anchor.
   *  A run of names after one anchor chains, so `after: { Head: ['Badge', 'Pin'] }` puts Pin after
   *  Badge. A role named twice across the relations is refused here. */
  protected static relationsOf(patch: Kit.OrderPatch): Kit.Relation[] {
    const relations: Kit.Relation[] = [];
    const named = new Set<string>();
    const name = (role: string) => {
      if (named.has(role))
        throw new Error(
          `Kit.derive: "${role}" is named twice in one order patch — one relation per role`
        );
      named.add(role);
    };
    for (const role of patch.without ?? []) {
      name(role);
      relations.push({ kind: 'without', role, side: 'after', anchor: role });
    }
    for (const [role, where] of Object.entries(patch.move ?? {})) {
      name(role);
      const side = 'after' in where ? 'after' : 'before';
      const anchor = 'after' in where ? where.after : where.before;
      if (anchor === role) throw new Error(`Kit.derive: "${role}" cannot move against itself`);
      relations.push({ kind: 'move', role, side, anchor });
    }
    for (const side of ['after', 'before'] as const) {
      for (const [anchor, names] of Object.entries(patch[side] ?? {})) {
        let previous = anchor;
        for (const role of side === 'after' ? names : [...names].reverse()) {
          name(role);
          relations.push({ kind: 'insert', role, side, anchor: previous });
          previous = role;
        }
      }
    }
    return relations;
  }

  /** Every relation is an edge "X precedes Y"; a cycle among them is a patch that asks for two
   *  incompatible orders at once, refused before anything is placed. */
  protected static refuseCycle(relations: Kit.Relation[]): void {
    const after = new Map<string, string[]>();
    for (const relation of relations) {
      if (relation.kind === 'without') continue;
      const [first, second] =
        relation.side === 'after'
          ? [relation.anchor, relation.role]
          : [relation.role, relation.anchor];
      after.set(first, [...(after.get(first) ?? []), second]);
    }
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (node: string, trail: string[]) => {
      if (done.has(node)) return;
      if (visiting.has(node))
        throw new Error(
          `Kit.derive: the order relations form a cycle: ${[...trail, node].join(' → ')}`
        );
      visiting.add(node);
      for (const following of after.get(node) ?? []) visit(following, [...trail, node]);
      visiting.delete(node);
      done.add(node);
    };
    for (const node of after.keys()) visit(node, []);
  }

  /** A patch that names a namespace and keeps the base view gets that view rewrapped over the new
   *  class, so `{ namespace: Themed }` alone declares what Themed declares; a patch that brings its
   *  own view is left alone — that view declares what it declares. A patch's `bind` closes over
   *  the layer below's: the seam it receives carries `inherited`, which runs the base's bind on
   *  the same seam, or the seam's own default when the base had none. */
  protected static mergeEntry(
    current: Kit.Entry | undefined,
    patch: Partial<Kit.Entry>
  ): Kit.Entry {
    const merged = { ...current, ...patch } as Kit.Entry;
    if (patch.namespace && !patch.view && current?.view)
      merged.view = this.view(current.view, patch.namespace);
    const below = current?.bind;
    const above = patch.bind;
    if (above && below)
      merged.bind = (seam: Kit.Seam) => above({ ...seam, inherited: () => below(seam) });
    return merged;
  }

  protected static isEntry(value: unknown): value is Kit.Entry {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      ('view' in value || 'namespace' in value || 'subkit' in value)
    );
  }

  /** A patch over an entry that touches only `bind` or `props` names none of the entry's shape
   *  fields; it is still an entry patch, never a nested kit. */
  protected static isEntryPatch(value: unknown): value is Partial<Kit.Entry> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      ('bind' in value || 'props' in value)
    );
  }

  /** Freeze the kit's SHAPE — role maps, entries and the order — and stop at an entry's leaves: a
   *  namespace (its `Class` slot is the global override), a view (Vue's object), a `props` bag (the
   *  consumer's). Frozen entries are what make sharing them between kits safe. */
  protected static deepFreeze<K extends object>(value: K): K {
    const entry = this.isEntry(value);
    for (const [key, inner] of Object.entries(value)) {
      if (typeof inner !== 'object' || inner === null || Object.isFrozen(inner)) continue;
      if (entry && (key === 'namespace' || key === 'view' || key === 'props')) continue;
      this.deepFreeze(inner);
    }
    return Object.freeze(value);
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

  /** What a namespace is at runtime: the raw class to extend and the reactive class to construct. */
  export interface Namespace {
    $Class: NamespaceClass;
    Class: NamespaceClass;
    /** set by `derive`: the namespace this one was derived from */
    derivedFrom?: Namespace;
    /** set by `derive`: the patch this layer is */
    patch?: Patch;
    /** set by `derive`: the layer's name, given or `layer N` */
    layer?: string;
  }

  /** What a child's constructor takes: its props, read off its namespace. */
  export type PropsOf<N extends Namespace> = ConstructorParameters<N['Class']>[0];

  /** What `v-bind` accepts beside props. */
  export interface Attrs {
    class?: unknown;
    style?: unknown;
    [listener: `on${string}`]: unknown;
  }

  /** What a bind returns and what a seam hands a child. */
  export type Bound<N extends Namespace = Namespace> = PropsOf<N> & Attrs;

  /** The one argument a bind takes: the container's model; under a list container the item and
   *  the key the loop gave it, `undefined` under a section container; and `inherited`, the layer
   *  below's bind closed over this same seam — the default `{ model, kit }` when no layer bound. */
  export interface Seam<Owner = unknown, Item = never, N extends Namespace = Namespace> {
    model: Owner;
    item: [Item] extends [never] ? undefined : Item;
    key: [Item] extends [never] ? undefined : string | number;
    inherited: () => Bound<N>;
  }

  export interface Entry<Owner = unknown, Item = never, N extends Namespace = Namespace> {
    /** the role's markup: an SFC, or a tag name for a markup role */
    view: Component | string;
    /** the role's namespace — `$Class`, `Class`, and whatever else it exports; absent for a tag role */
    namespace?: N;
    /** the consumer's values for this role, read by the class's own getters as `this.props.kit.props.x` */
    props?: Record<string, unknown>;
    /** an override only: a patch over the roles below this entry's namespace */
    subkit?: Patch;
    /** what the parent hands the child, from the seam; absent, the child receives `{ model, kit }` */
    bind?(seam: Seam<Owner, Item, N>): Bound<N>;
  }

  /** The edits a patch makes to a container's order — relations against names, never a list. */
  export interface OrderPatch {
    /** roles inserted after the anchor, in the order given */
    after?: Readonly<Record<string, readonly string[]>>;
    /** roles inserted before the anchor, in the order given */
    before?: Readonly<Record<string, readonly string[]>>;
    /** base roles removed from the order */
    without?: readonly string[];
    /** base roles placed again against another name */
    move?: Readonly<Record<string, { after: string } | { before: string }>>;
  }

  /** One relation as `order` applies it. */
  export interface Relation {
    kind: 'insert' | 'move' | 'without';
    role: string;
    side: 'after' | 'before';
    anchor: string;
  }

  /** A patch is a kit whose every field is optional; `{ subkit }` alone keeps namespace and view.
   *  `Owner` types the model a top-level bind receives. */
  export type Patch<Owner = unknown> = {
    [role: string]: Partial<Entry<Owner, unknown>> | Patch | OrderPatch | undefined;
  } & { order?: OrderPatch };

  /** The patch a namespace accepts: its binds see the namespace's own instances. */
  export type PatchOf<Space extends Namespace> = Patch<InstanceType<Space['$Class']>>;

  /** What `derive` adds to the namespace it returns. */
  export interface Derived<Space extends Namespace> {
    derivedFrom: Space;
    patch: Patch;
    layer: string;
  }

  export interface DeriveOptions {
    /** the layer's name in the conflict report and the printed tree */
    name?: string;
    /** throw on a conflict instead of warning */
    strict?: boolean;
  }

  /** The roles of one kit, every bind owned by `Owner`; `Item` under a list container. */
  export type Roles<R extends string, Owner = unknown, Item = never> = {
    [K in R]: Entry<Owner, Item>;
  };

  /** A kit: entries keyed by role and, for a container, the order its template renders. */
  export type Of<R extends string, Owner = unknown, Item = never> = Roles<R, Owner, Item> & {
    order?: readonly R[];
  };
}
