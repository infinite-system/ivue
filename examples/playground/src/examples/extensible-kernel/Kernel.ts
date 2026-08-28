// Kernel.ts — the complete extensible-class registry, with no DI container.
//
// A class opts in with Kernel.Class.defineClass('core/Name', Namespace);
// plugins extend it with Kernel.Class.registerClass('core/Name', Base =>
// class extends Base {}); at boot Kernel.Class.sealClassGraph() composes
// every plugin and re-parents every extends-chain in topological order, so
// `new X.Class()` — read live off the namespace, zero lookup — always
// produces the fully-extended class, super chains intact. The dependency
// graph is DISCOVERED from the real prototype hierarchy (getClassGraph),
// never hand-declared.
//
// The kernel itself is a Static() capability class: pure static members,
// anchored so the registry is a class like everything else — reachable
// through Kernel.Class (late-bound: an app could subclass the kernel and
// swap the binding, the same extension story the kernel gives its classes).
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

class $Kernel {
  private static readonly nodes = new Map<string, Kernel.Node>();

  /** Register an owner-namespaced key (`namespace/Class`) and namespace. */
  static defineClass(name: string, ns: Kernel.Extensible) {
    const parentClass = Object.getPrototypeOf(ns.$Class.prototype)?.constructor;
    this.nodes.set(name, {
      name,
      ns,
      parentClass: parentClass === Object ? undefined : parentClass,
      makes: [],
      plugins: [],
    });
  }

  /** A plugin extends a class by name. Composition is deferred to seal. */
  static registerClass(
    name: string,
    make: (Base: Kernel.AnyClass) => Kernel.AnyClass,
    plugin = 'plugin',
  ) {
    const node = this.nodes.get(name);
    if (!node) throw new Error(`kernel: '${name}' is not defined`);
    node.makes.push(make);
    node.plugins.push(plugin);
  }

  /** Clear every plugin registration — back to the base classes. */
  static reset() {
    for (const node of this.nodes.values()) {
      node.makes = [];
      node.plugins = [];
    }
  }

  /** Boot: finalize the class graph. Re-parents each extends-chain onto its
   *  now-composed base (topological order) and stacks each node's plugins. */
  static sealClassGraph() {
    const byClass = this.nodeByClass();
    for (const node of this.topoOrder(byClass)) {
      const raw = node.ns.$Class;
      const parent = node.parentClass && byClass.get(node.parentClass);
      if (parent) {
        // splice the composed parent under this class's raw prototype
        Object.setPrototypeOf(raw.prototype, parent.ns.Class.prototype);
        Object.setPrototypeOf(raw, parent.ns.Class);
      }
      let cls: Kernel.AnyClass = raw;
      for (const make of node.makes) cls = make(cls); // stack plugins
      node.ns.Class = Reactive(cls) as Kernel.AnyClass; // the live binding
    }
  }

  /** Introspection — the tracked graph, discovered from the hierarchy. */
  static getClassGraph() {
    const byClass = this.nodeByClass();
    return [...this.nodes.values()].map((node) => ({
      name: node.name,
      extends: node.parentClass
        ? (byClass.get(node.parentClass)?.name ?? null)
        : null,
      plugins: [...node.plugins],
    }));
  }

  private static nodeByClass() {
    const map = new Map<Kernel.AnyClass, Kernel.Node>();
    for (const node of this.nodes.values()) map.set(node.ns.$Class, node);
    return map;
  }

  private static topoOrder(
    byClass: Map<Kernel.AnyClass, Kernel.Node>,
  ): Kernel.Node[] {
    const out: Kernel.Node[] = [];
    const seen = new Set<string>();
    const visit = (node: Kernel.Node) => {
      if (seen.has(node.name)) return;
      seen.add(node.name);
      const parent = node.parentClass && byClass.get(node.parentClass);
      if (parent) visit(parent);
      out.push(node);
    };
    for (const node of this.nodes.values()) visit(node);
    return out;
  }
}

export namespace Kernel {
  /* Identity */

  export const $Class = Static($Kernel); // statics anchored — children `extends` this
  export let Class = $Class; // plain form — a pure static capability class

  /* Types */

  export type AnyClass = new (...args: any[]) => any;

  export interface Extensible {
    $Class: AnyClass; // raw base — children/plugins extend this
    Class: AnyClass; // live binding — what you `new`; the kernel rewrites it
  }

  export interface Node {
    name: string;
    ns: Extensible;
    parentClass?: AnyClass; // captured at define time, before any re-parenting
    makes: ((Base: AnyClass) => AnyClass)[];
    plugins: string[];
  }
}
