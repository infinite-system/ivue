import type { Component } from 'vue';
import { Static, STATIC_RAW } from '../Static';
import { Kit } from './Kit';

// Reading a chain of layers back. `derive` leaves `derivedFrom`, `patch`
// and `layer` on every namespace it returns; this class walks that data
// and says what the layers did: the contacts where two layers wrote one
// field or moved one role, and the resolved tree with the layer that set
// each seam. Nothing here changes a kit. Tests and a dev panel import it;
// the app's render path never does, and `Kit.ts` never imports it.
class $KitInspect {
  /** The fields of an entry two layers may both write. `bind` composes through `inherited` and
   *  `subkit` recurses, so neither is a contact; these three replace, so a second write is one. */
  static readonly REPLACED_FIELDS: readonly string[] = ['view', 'namespace', 'props'];

  /** The derivation chain, base first: the shipped namespace, then every layer over it. */
  static layers(namespace: Kit.Namespace): Kit.Namespace[] {
    const chain: Kit.Namespace[] = [];
    for (let current: Kit.Namespace | undefined = namespace; current; current = current.derivedFrom)
      chain.unshift(current);
    return chain;
  }

  /** The contacts along a chain: a replaced field of one entry or a move of one role written by
   *  two or more layers — one line per contact naming every layer that wrote it, in order. */
  // invariant: A second write to one field is reported never merged (examples/playground/src/kit/kit.invariants.md)
  static conflicts(namespace: Kit.Namespace): string[] {
    const writes = new Map<string, string[]>();
    for (const layer of this.layers(namespace)) {
      if (!layer.patch) continue;
      for (const key of this.writesOf(layer.patch)) {
        if (key.endsWith('.bind') || key.includes('#position:')) continue;
        writes.set(key, [...(writes.get(key) ?? []), this.nameOf(layer)]);
      }
    }
    return [...writes]
      .filter(([, layers]) => layers.length > 1)
      .map(([key, layers]) => `${key}: written by ${layers.join(', then ')}`);
  }

  /** The contacts as a report: a console warning, or a throw when strict. Silent when there are none. */
  static report(namespace: Kit.Namespace, options: KitInspect.ReportOptions = {}): string[] {
    const lines = this.conflicts(namespace);
    if (!lines.length) return lines;
    const report = `Kit: two layers wrote one field — the last write wins:\n  ${lines.join('\n  ')}`;
    if (options.strict) throw new Error(report);
    console.warn(report);
    return lines;
  }

  /** The resolved tree as text, one line per seam: its position, its role, its view, its class,
   *  whether a bind feeds it, and the layer that last set each of those — `base` when none did.
   *  A role whose namespace declares a kit prints its own tree below it, indented. */
  static tree(namespace: Kit.Namespace): string {
    const writes = new Map<Kit.Namespace, Set<string>>();
    for (const layer of this.layers(namespace))
      if (layer.patch) writes.set(layer, new Set(this.writesOf(layer.patch)));
    return this.treeLines(namespace, writes, [], '', new Set()).join('\n');
  }

  /** A layer's name: the one given to `derive`, else its place in the chain. */
  static nameOf(layer: Kit.Namespace): string {
    return layer.layer ?? `layer ${this.layers(layer).length - 1}`;
  }

  /** Every write a patch makes, as keys: `Message.Head.view` for a replaced field, `Message.Head.bind`
   *  for a bind, `Message#move:Foot` for a move, `Message#position:Badge` for any role a relation placed. */
  static writesOf(patch: Kit.Patch, path: string[] = []): string[] {
    const keys: string[] = [];
    const prefix = path.join('.');
    for (const [role, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (role === 'order') {
        const order = value as Kit.OrderPatch;
        for (const moved of Object.keys(order.move ?? {}))
          keys.push(`${prefix}#move:${moved}`, `${prefix}#position:${moved}`);
        for (const names of [
          ...Object.values(order.after ?? {}),
          ...Object.values(order.before ?? {})
        ])
          for (const name of names ?? []) keys.push(`${prefix}#position:${name}`);
        for (const name of order.without ?? []) keys.push(`${prefix}#position:${name}`);
        continue;
      }
      const here = [...path, role].join('.');
      const entry = value as Partial<Kit.Entry>;
      if (!Kit.Class.isEntry(value) && !('bind' in entry || 'props' in entry)) {
        keys.push(...this.writesOf(value as Kit.Patch, [...path, role]));
        continue;
      }
      for (const field of this.REPLACED_FIELDS)
        if (entry[field as keyof Kit.Entry] !== undefined) keys.push(`${here}.${field}`);
      if (entry.bind) keys.push(`${here}.bind`);
      if (entry.subkit) keys.push(...this.writesOf(entry.subkit as Kit.Patch, [...path, role]));
    }
    return keys;
  }

  /** The layers are the root's, their writes computed once in `tree`: a nested namespace derived by
   *  `derive` keys its writes from its own kit, while the root's patches carry the whole path. A
   *  kit that names a class already open above it — a part whose sub-thread renders rows — prints
   *  once; the repeat is marked. */
  protected static treeLines(
    namespace: Kit.Namespace,
    writes: Map<Kit.Namespace, Set<string>>,
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
      if (!Kit.Class.isEntry(entry)) continue;
      const at = order.indexOf(role);
      const setBy = this.settersOf(writes, [...path, role], at >= 0);
      lines.push(
        `${indent}${at >= 0 ? at : '-'} ${role}: view ${this.viewName(entry.view)} · class ${this.className(entry.namespace)} · bind ${entry.bind ? 'yes' : 'no'} · ${setBy}`
      );
      if (entry.namespace)
        lines.push(
          ...this.treeLines(entry.namespace, writes, [...path, role], `${indent}  `, open)
        );
    }
    return lines;
  }

  /** `view←bubbles, position←compact`, or `base` when no layer touched the role. */
  protected static settersOf(
    writes: Map<Kit.Namespace, Set<string>>,
    path: string[],
    ordered: boolean
  ): string {
    const fields = [...this.REPLACED_FIELDS, 'bind', ...(ordered ? ['position'] : [])];
    const setters: string[] = [];
    for (const field of fields) {
      const key =
        field === 'position'
          ? `${path.slice(0, -1).join('.')}#position:${path[path.length - 1]}`
          : `${path.join('.')}.${field}`;
      let owner: Kit.Namespace | undefined;
      for (const [layer, keys] of writes) if (keys.has(key)) owner = layer;
      if (owner) setters.push(`${field}←${this.nameOf(owner)}`);
    }
    return setters.length ? setters.join(', ') : 'base';
  }

  protected static viewName(view: Component | string): string {
    if (typeof view === 'string') return `<${view}>`;
    const named = view as { __name?: string; name?: string };
    return named.__name ?? named.name ?? 'component';
  }

  /** The raw class's name: a bound subclass `Static()` returns names the class it wrapped under
   *  `STATIC_RAW`, and the anonymous subclass `derive` writes has no name, so the walk unwraps the
   *  first and steps over the second until a named class stands. A minified build prints whatever
   *  survived, which is why the chain is data. */
  protected static className(namespace: Kit.Namespace | undefined): string {
    if (!namespace) return '-';
    const chain = this.layers(namespace);
    let raw = chain[0].$Class as
      (Kit.NamespaceClass & { [STATIC_RAW]?: Kit.NamespaceClass }) | null;
    while (raw) {
      if (Object.hasOwn(raw, STATIC_RAW)) raw = raw[STATIC_RAW] ?? null;
      else if (raw.name === '') raw = Object.getPrototypeOf(raw);
      else break;
    }
    const base = raw?.name || 'class';
    return chain.length > 1 ? `${base} + ${chain.length - 1} layer(s)` : base;
  }
}

export namespace KitInspect {
  export const $Class = Static($KitInspect);
  export let Class = $Class;

  export interface ReportOptions {
    /** throw on a contact instead of warning */
    strict?: boolean;
  }
}
