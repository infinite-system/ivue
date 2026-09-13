import type { Component } from 'vue';
import { Static } from '../Static';
import { Kit } from './Kit';

// The base of every class that composes others through a kit. It holds
// what every compositor wrote by hand and never differently: the kit read
// off its own class, and one seam method that reads an entry and never a
// role's name. A list role adds two facts the container supplies — which
// role an item takes and what identifies it — and receives the entry, the
// view and the props for that item without writing another line. A
// container with one entry role supplies neither: the role is the only one.
// A dispatch keyed below a role map overrides `entryOf` instead of `roleOf`.
class $KitContainer<Roles extends object = Record<string, Kit.Entry>, Item = unknown> {
  /** the compositor's roles — a subclass declares its own and swaps the subtree */
  static get $kit(): object {
    return {};
  }

  /** What every entry this container builds hands its child, from the seam — a subclass declares it;
   *  absent, an entry built by `entry()` has no bind and its child receives `{ model, kit }`. */
  static bindEntry?(seam: Kit.Seam<any, any>): Kit.Bound;

  /** An entry of this container's kit: the view, the class it constructs, and the container's
   *  `bindEntry` when it declares one. Loosely typed on purpose: the bind is typed where it is
   *  declared, and a container's one bind serves every kind its seam's item narrows to. */
  static entry(
    view: Component | string,
    namespace?: Kit.Namespace,
    rest?: Partial<Kit.Entry>
  ): Kit.Entry {
    const bind = this.bindEntry;
    return bind ? { view, namespace, bind, ...rest } : { view, namespace, ...rest };
  }

  /** the one role a kit with a single entry role has, else nothing; built once per class */
  static get $onlyRole(): string | undefined {
    const kit = this.$kit as Record<string, unknown>;
    const roles = Object.keys(kit).filter(
      (role) => role !== 'order' && Kit.Class.isEntry(kit[role])
    );
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

  /** the entry that renders an item: its role's — a dispatch keyed below a role map overrides this */
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

  /** the keys of a kit that hold an entry — never `order`, never a role map */
  export type RoleOf<Roles extends object> = {
    [Role in keyof Roles]: Roles[Role] extends Kit.Entry ? Role : never;
  }[keyof Roles] &
    string;
}
