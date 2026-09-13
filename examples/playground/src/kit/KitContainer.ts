import type { Component } from 'vue';
import { Static } from '../Static';
import { Kit } from './Kit';

// The base of every class that composes others through a kit. It holds
// what every compositor wrote by hand and never differently: the kit read
// off its own class, and one seam method that reads an entry and never a
// role's name, and presence read off the entry's `shows`. A list role adds two facts the container supplies — which
// role an item takes and what identifies it — and receives the entry, the
// view and the props for that item without writing another line. A
// container with one entry role supplies neither: the role is the only one.
// A dispatch is a list of one: `roleOf` picks the card by an external name.
class $KitContainer<Roles extends object = Record<string, Kit.Entry>, Item = unknown> {
  /** the compositor's roles — a subclass declares its own and swaps the subtree */
  static get $kit(): object {
    return {};
  }

  /** What every entry this container builds hands its child, from the seam — a subclass declares it;
   *  absent, an entry built by `entry()` has no bind and its child receives `{ model, kit }`. */
  static bindEntry?(seam: Kit.Seam<any, any>): Kit.Bound;

  /** An entry of this container's kit: `Kit.Class.entry` — the view, the class it constructs, and a
   *  `rest` checked against that class's props — plus the container's `bindEntry` when it declares
   *  one and the entry brings no bind of its own. */
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
    const entry = Kit.Class.entry<N, Owner, Item, Rest>(view, namespace, rest);
    const bind = this.bindEntry;
    return bind && !entry.bind ? { ...entry, bind } : entry;
  }

  /** the one role a kit with a single entry role has, else nothing; built once per class */
  static get $onlyRole(): string | undefined {
    const kit = this.$kit as Record<string, unknown>;
    const roles = Object.keys(kit).filter((role) => role !== 'order');
    return roles.length === 1 ? roles[0] : undefined;
  }

  /** The one cast per class: instance code reads its own statics here. Typed as the statics every
   *  container has, so a subclass's own `self` — its whole constructor — narrows it without conflict. */
  protected get self(): KitContainer.Statics<Roles> {
    return this.constructor as unknown as KitContainer.Statics<Roles>;
  }

  /** the kit is the class's: a subclass with its own `$kit` swaps the subtree */
  get kit(): Roles {
    return this.self.$kit;
  }

  /**
   * What a seam hands a role's view: the entry's `bind` over the seam, or `{ model, kit }` when the
   * entry has none. Never a branch on the role's name — the entry is the table.
   */
  seam(role: KitContainer.RoleOf<Roles>, item?: Item, key?: string | number): Kit.Bound {
    return Kit.Class.seam(this, this.kit[role] as Kit.Entry, item, key);
  }

  /** whether a role renders this pass: the entry's `shows` over this model, or always */
  shows(role: KitContainer.RoleOf<Roles>): boolean {
    const entry = this.kit[role] as Kit.Entry;
    return entry.shows ? entry.shows(this) : true;
  }

  /** the role an item takes — the container's fact; a kit with one entry role needs no answer */
  roleOf(item: Item): KitContainer.RoleOf<Roles> {
    const role = this.self.$onlyRole;
    if (role === undefined)
      throw new Error(
        `${this.constructor.name}: roleOf() is not defined — a kit with several roles names which one an item takes`
      );
    return role as KitContainer.RoleOf<Roles>;
  }

  /** what identifies an item in its list — the container's fact; the loop's index by default */
  keyOf(item: Item, at?: number): string | number | undefined {
    return at;
  }

  /** the entry that renders an item: its role's */
  entryOf(item: Item): Kit.Entry {
    return this.kit[this.roleOf(item)] as Kit.Entry;
  }

  viewOf(item: Item) {
    return this.entryOf(item).view;
  }

  /** the seam for an item: its entry, fed the item and its key */
  propsOf(item: Item, at?: number): Kit.Bound {
    return Kit.Class.seam(this, this.entryOf(item), item, this.keyOf(item, at));
  }
}

export namespace KitContainer {
  export const $Class = Static($KitContainer);
  // plain — never instantiated; the first subclass's Reactive() reaches this prototype on its walk
  export let Class = $Class;
  export type Instance<
    Roles extends object = Record<string, Kit.Entry>,
    Item = unknown
  > = InstanceType<typeof $KitContainer<Roles, Item>>;

  /** what every container's class carries, read through `self`: its kit and its one role when it has one */
  export interface Statics<Roles extends object> {
    readonly $kit: Roles;
    readonly $onlyRole: string | undefined;
  }

  /** the keys of a kit that hold an entry — every key but `order` */
  export type RoleOf<Roles extends object> = Exclude<keyof Roles, 'order'> & string;
}
