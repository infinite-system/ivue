// kernel.ts — the complete extensible-class registry, with no DI container.
//
// A class opts in with kernel.defineClass('core/Name', Namespace); plugins
// extend it with kernel.registerClass('core/Name', Base => class extends Base
// {}); at boot
// kernel.sealClassGraph() composes every plugin and re-parents every
// extends-chain in topological order, so `new X.Class()` — read live off the
// namespace, zero lookup — always produces the fully-extended class, super
// chains intact. The dependency graph is DISCOVERED from the real prototype
// hierarchy (getClassGraph), never hand-declared.
import { Reactive } from '../../ivue';

type AnyClass = new (...args: any[]) => any;
export interface Extensible {
  $Class: AnyClass; // raw base — children/plugins extend this
  Class: AnyClass; // live binding — what you `new`; the kernel rewrites it
}
interface Node {
  name: string;
  ns: Extensible;
  parentClass?: AnyClass; // captured at define time, before any re-parenting
  makes: ((Base: AnyClass) => AnyClass)[];
  plugins: string[];
}

const nodes = new Map<string, Node>();
const nodeByClass = () => {
  const map = new Map<AnyClass, Node>();
  for (const node of nodes.values()) map.set(node.ns.$Class, node);
  return map;
};

export const kernel = {
  /** Register an owner-namespaced key (`namespace/Class`) and namespace. */
  defineClass(name: string, ns: Extensible) {
    const parentClass = Object.getPrototypeOf(ns.$Class.prototype)?.constructor;
    nodes.set(name, {
      name,
      ns,
      parentClass: parentClass === Object ? undefined : parentClass,
      makes: [],
      plugins: [],
    });
  },

  /** A plugin extends a class by name. Composition is deferred to seal. */
  registerClass(
    name: string,
    make: (Base: AnyClass) => AnyClass,
    plugin = 'plugin',
  ) {
    const node = nodes.get(name);
    if (!node) throw new Error(`kernel: '${name}' is not defined`);
    node.makes.push(make);
    node.plugins.push(plugin);
  },

  /** Clear every plugin registration — back to the base classes. */
  reset() {
    for (const node of nodes.values()) {
      node.makes = [];
      node.plugins = [];
    }
  },

  /** Boot: finalize the class graph. Re-parents each extends-chain onto its
   *  now-composed base (topological order) and stacks each node's plugins. */
  sealClassGraph() {
    const byClass = nodeByClass();
    for (const node of topoOrder(byClass)) {
      const raw = node.ns.$Class;
      const parent = node.parentClass && byClass.get(node.parentClass);
      if (parent) {
        // splice the composed parent under this class's raw prototype
        Object.setPrototypeOf(raw.prototype, parent.ns.Class.prototype);
        Object.setPrototypeOf(raw, parent.ns.Class);
      }
      let cls: AnyClass = raw;
      for (const make of node.makes) cls = make(cls); // stack plugins
      node.ns.Class = Reactive(cls) as AnyClass; // the live binding
    }
  },

  /** Introspection — the tracked graph, discovered from the hierarchy. */
  getClassGraph() {
    const byClass = nodeByClass();
    return [...nodes.values()].map((node) => ({
      name: node.name,
      extends: node.parentClass
        ? (byClass.get(node.parentClass)?.name ?? null)
        : null,
      plugins: [...node.plugins],
    }));
  },
};

function topoOrder(byClass: Map<AnyClass, Node>): Node[] {
  const out: Node[] = [];
  const seen = new Set<string>();
  const visit = (node: Node) => {
    if (seen.has(node.name)) return;
    seen.add(node.name);
    const parent = node.parentClass && byClass.get(node.parentClass);
    if (parent) visit(parent);
    out.push(node);
  };
  for (const node of nodes.values()) visit(node);
  return out;
}
