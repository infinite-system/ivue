import type { Component } from 'vue';
import { Reactive } from '../ivue';
import { Static } from '../Static';

// The kit: the roles a model's subtree composes, as data on the class.
//
// A model declares `static get $kit()` returning a record of entries. An
// entry names a role's view and, when the role has a class of its own, the
// namespace that view constructs. A parent's template renders every seam
// as `<component :is="model.kit.Role.view" :kit="model.kit.Role" …props />`;
// the child's view constructs `new (props.kit?.namespace.Class ?? X.Class)(props)`.
// A model reads its kit from its own class and nowhere else, so a swapped
// class brings its own kit and no parent ever constructs a child.
//
// `$kit` is a `$`-prefixed static getter, so `Static()` caches it once per
// receiver class through its own-property guard: a subclass that has not
// built its kit yet never sees its parent's. Nothing here caches.
//
// Overrides are subclasses. A subclass spreads `super.$kit` and replaces
// entries; an entry in an override may carry `subkit`, a patch over the
// roles below its namespace, which `resolve` turns into a derived namespace
// once, at kit build time. An entry may carry `props`, the consumer's
// values for the role, which the role's class reads in the getters its
// author opened (`this.props.kit?.props?.cap ?? this.props.cap`). Every
// function here builds new objects and reads the base; one tree never
// changes another.
class $Kit {
  /** Every entry with a `subkit` becomes an entry whose namespace is derived and whose view
   *  declares the derived contract; every other entry passes through untouched. */
  static resolve<K extends object>(kit: K): K {
    const out: Record<string, unknown> = {};
    for (const [role, value] of Object.entries(kit)) {
      out[role] = this.isEntry(value) ? this.resolveEntry(value) : this.resolve(value as object);
    }
    return this.deepFreeze(out) as K;
  }

  /** A derived namespace: `$Class` extends the base's raw class with a `$kit` that is the base's
   *  deep-merged with `patch` and resolved; `Class` is `Reactive($Class)` — what a subclass file
   *  would export — and `derivedFrom` names the base, since a minified build keeps no class names
   *  an inspector could read. The base namespace is only read. */
  static derive<Space extends Kit.Namespace>(namespace: Space, patch: Kit.Patch): Space {
    const kit = this;
    const Base = namespace.$Class as Kit.NamespaceClass;
    const $Class = Static(
      class extends Base {
        static get $kit() {
          return kit.resolve(kit.merge(Base.$kit ?? {}, patch));
        }
      },
    );
    return { ...namespace, $Class, Class: Reactive($Class), derivedFrom: namespace };
  }

  /** The same view over a different contract: a fresh component object with the base view's
   *  `setup` and `render` and the namespace's `props` and `emits`. Fresh because the view object
   *  is shared by every kit that names it — writing onto it would widen every tree — and because
   *  Vue caches a component's normalized options per app by that object, so a mounted view keeps
   *  its first contract whatever is written onto it later. A copy, not `Object.create`: Vue reads
   *  component options as own keys, and a prototype-backed view renders nothing. */
  static view<Space extends Kit.Namespace>(view: Component, namespace: Space): Component {
    const Class = namespace.Class as Kit.NamespaceClass;
    const copy: Record<string, unknown> = { ...(view as object) };
    if (Class.props) copy.props = Class.props;
    if (Class.emits) copy.emits = Class.emits;
    return copy as Component;
  }

  protected static resolveEntry(entry: Kit.Entry): Kit.Entry {
    if (!entry.namespace || !entry.subkit) return entry;
    const { subkit, ...rest } = entry;
    const namespace = this.derive(entry.namespace, subkit);
    return { ...rest, namespace, view: this.view(entry.view, namespace) };
  }

  protected static merge(base: Record<string, unknown>, patch: Kit.Patch): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const [role, value] of Object.entries(patch)) {
      const current = base[role];
      out[role] =
        this.isEntry(current) || this.isEntry(value)
          ? this.mergeEntry(current as Kit.Entry | undefined, value as Partial<Kit.Entry>)
          : this.merge((current as Record<string, unknown>) ?? {}, value as Kit.Patch);
    }
    return out;
  }

  /** A patch that names a namespace and keeps the base view gets that view rewrapped over the new
   *  class, so `{ namespace: Themed }` alone declares what Themed declares; a patch that brings its
   *  own view is left alone — that view declares what it declares. */
  protected static mergeEntry(current: Kit.Entry | undefined, patch: Partial<Kit.Entry>): Kit.Entry {
    const merged = { ...current, ...patch } as Kit.Entry;
    if (patch.namespace && !patch.view && current?.view) merged.view = this.view(current.view, patch.namespace);
    return merged;
  }

  protected static isEntry(value: unknown): value is Kit.Entry {
    return typeof value === 'object' && value !== null && ('view' in value || 'namespace' in value || 'subkit' in value);
  }

  /** Freeze the kit's SHAPE — role maps and entries — and stop at an entry's leaves: a namespace
   *  (its `Class` slot is the global override), a view (Vue's object), a `props` bag (the
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
  }

  export interface Entry<Space extends Namespace = Namespace> {
    view: Component;
    /** the role's namespace — `$Class`, `Class`, and whatever else it exports; absent for a markup leaf */
    namespace?: Space;
    /** the consumer's values for this role, read by the class's own getters as `this.props.kit.props.x` */
    props?: Record<string, unknown>;
    /** an override only: a patch over the roles below this entry's namespace */
    subkit?: Patch;
  }

  /** A patch is a kit whose every field is optional; `{ subkit }` alone keeps namespace and view. */
  export type Patch = { [role: string]: Partial<Entry> | Patch };

  export type Of<Roles extends string> = Record<Roles, Entry>;
}
