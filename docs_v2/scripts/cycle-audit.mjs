// Import-cycle audit: Tarjan's strongly-connected-components algorithm over
// a TypeScript/JavaScript source tree, run twice — once over value imports
// (edges that survive compilation) and once over all imports including
// `import type` (edges that exist only for the type checker).
//
//   node docs_v2/scripts/cycle-audit.mjs <sourceRoot>
//
// A component of size 1 is an acyclic file. A component of size 2+ is a
// knot: every file in it can reach every other, so at least one cycle
// threads through it. Zero dependencies; ~70 lines.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const sourceRoot = resolve(process.argv[2] ?? 'src');
const sourceFiles = [];
(function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) walk(fullPath);
    else if (
      /\.(ts|tsx|mts|js|mjs)$/.test(entry) &&
      !/\.(test|spec)\./.test(entry) &&
      !fullPath.includes('__tests__') &&
      !entry.endsWith('.d.ts')
    )
      sourceFiles.push(fullPath);
  }
})(sourceRoot);

const fileSet = new Set(sourceFiles);
function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null; // external package — not our graph
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [base, base + '.ts', base + '.tsx', base + '.mts', base + '.js', base + '.mjs', join(base, 'index.ts'), join(base, 'index.js')];
  for (const candidate of candidates) if (fileSet.has(candidate)) return candidate;
  return null;
}

// `import type` edges are erased at compile time — they go in the type
// graph only. Everything else (named, default, side-effect, re-export)
// evaluates at load time and goes in both graphs.
const importFromPattern = /^\s*(import|export)\s+(type\s+)?[^'"]*from\s+['"]([^'"]+)['"]/gm;
const sideEffectPattern = /^\s*import\s+['"]([^'"]+)['"]/gm;
const valueGraph = new Map();
const fullGraph = new Map();
for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  const valueEdges = new Set();
  const allEdges = new Set();
  for (const found of source.matchAll(importFromPattern)) {
    const target = resolveImport(file, found[3]);
    if (!target) continue;
    allEdges.add(target);
    if (!found[2]) valueEdges.add(target);
  }
  for (const found of source.matchAll(sideEffectPattern)) {
    const target = resolveImport(file, found[1]);
    if (target) {
      allEdges.add(target);
      valueEdges.add(target);
    }
  }
  valueGraph.set(file, valueEdges);
  fullGraph.set(file, allEdges);
}

// Tarjan (1972): one depth-first pass, linear in files + imports. Each
// node gets a visit index; `lowlink` is the smallest index reachable from
// its subtree. When a node's lowlink equals its own index, everything
// above it on the stack is one strongly-connected component.
function stronglyConnectedComponents(graph) {
  let visitIndex = 0;
  const indices = new Map();
  const lowlinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  function connect(node) {
    indices.set(node, visitIndex);
    lowlinks.set(node, visitIndex);
    visitIndex++;
    stack.push(node);
    onStack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!indices.has(neighbor)) {
        connect(neighbor);
        lowlinks.set(node, Math.min(lowlinks.get(node), lowlinks.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        lowlinks.set(node, Math.min(lowlinks.get(node), indices.get(neighbor)));
      }
    }
    if (lowlinks.get(node) === indices.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      if (component.length > 1) components.push(component);
    }
  }
  for (const node of graph.keys()) if (!indices.has(node)) connect(node);
  return components;
}

const shortName = (file) => file.replace(sourceRoot + '/', '');
const valueKnots = stronglyConnectedComponents(valueGraph);
const typeKnots = stronglyConnectedComponents(fullGraph);
console.log(`files analyzed:        ${sourceFiles.length}`);
console.log(`value-import knots:    ${valueKnots.length}`);
for (const knot of valueKnots)
  console.log(`  CYCLE (${knot.length} files): ${knot.map(shortName).join(' <-> ')}`);
console.log(`all-import knots:      ${typeKnots.length}   (includes type-only edges — erased at compile time)`);
for (const knot of typeKnots)
  console.log(`  knot of ${knot.length}: ${knot.slice(0, 3).map(shortName).join(', ')}${knot.length > 3 ? ', …' : ''}`);
