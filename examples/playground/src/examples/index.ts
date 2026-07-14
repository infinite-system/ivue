import type { Component } from 'vue';
import { manifest as counter } from './counter/manifest';
import { manifest as derived } from './derived/manifest';
import { manifest as lifecycle } from './lifecycle/manifest';
import { manifest as inheritance } from './inheritance/manifest';
import { manifest as pointer } from './pointer/manifest';
import { manifest as storePattern } from './store-pattern/manifest';
import { manifest as kernelPattern } from './kernel-pattern/manifest';
import { manifest as chooseField } from './fields/choose-field/manifest';
import { manifest as mediaField } from './fields/media-field/manifest';
import { manifest as virtualScroller } from './virtual-scroller/manifest';
import { manifest as formulaGrid } from './formula-grid/manifest';
import { manifest as flyweightGrid } from './flyweight-grid/manifest';
import { manifest as benchmarks } from './benchmarks/manifest';

export interface ExampleEntry {
  slug: string;
  title: string;
  blurb: string;
  docsPath: string;
  load: () => Promise<{ default: Component }>;
}

// Adding an example = one folder with a manifest + one entry here.
// Every route component is lazy — a route never pays for the others.
// Field routes install Quasar (plugin + css + icons) before their chunk
// mounts; every other route stays Quasar-free.
//
// ORDER MATTERS: this list drives the playground sidebar, and it must stay
// in the SAME order the docs sidebar lists the examples (Basic → Advanced),
// so a visitor arriving from a docs page finds the playground laid out the
// same way.
const withQuasar = (load: () => Promise<{ default: Component }>) => {
  return async () => {
    const { installQuasar } = await import('../quasar-loader');
    await installQuasar();
    return load();
  };
};

export const examples: ExampleEntry[] = [
  // Basic
  { ...counter, load: () => import('./counter/CounterExample.vue') },
  { ...derived, load: () => import('./derived/DerivedExample.vue') },
  { ...lifecycle, load: () => import('./lifecycle/LifecycleExample.vue') },
  {
    ...inheritance,
    load: () => import('./inheritance/InheritanceExample.vue'),
  },
  { ...pointer, load: () => import('./pointer/PointerExample.vue') },
  // Advanced
  {
    ...storePattern,
    load: () => import('./store-pattern/StorePatternExample.vue'),
  },
  {
    ...kernelPattern,
    load: () => import('./kernel-pattern/KernelExample.vue'),
  },
  {
    ...chooseField,
    load: withQuasar(
      () => import('./fields/choose-field/ChooseFieldExample.vue'),
    ),
  },
  {
    ...mediaField,
    load: withQuasar(
      () => import('./fields/media-field/MediaFieldExample.vue'),
    ),
  },
  {
    ...virtualScroller,
    load: () => import('./virtual-scroller/VirtualScrollerExample.vue'),
  },
  {
    ...formulaGrid,
    load: () => import('./formula-grid/FormulaGridExample.vue'),
  },
  {
    ...flyweightGrid,
    load: () => import('./flyweight-grid/FlyweightGridExample.vue'),
  },
  { ...benchmarks, load: () => import('./benchmarks/BenchmarksExample.vue') },
];
