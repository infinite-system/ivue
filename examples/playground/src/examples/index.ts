import type { Component } from 'vue';
import { manifest as counter } from './counter/manifest';
import { manifest as derived } from './derived/manifest';
import { manifest as lifecycle } from './lifecycle/manifest';
import { manifest as inheritance } from './inheritance/manifest';
import { manifest as pointer } from './pointer/manifest';
import { manifest as virtualScroller } from './virtual-scroller/manifest';
import { manifest as chooseField } from './fields/choose-field/manifest';
import { manifest as mediaField } from './fields/media-field/manifest';
import { manifest as flyweightGrid } from './flyweight-grid/manifest';
import { manifest as formulaGrid } from './formula-grid/manifest';
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
const withQuasar = (load: () => Promise<{ default: Component }>) => {
  return async () => {
    const { installQuasar } = await import('../quasar-loader');
    await installQuasar();
    return load();
  };
};

export const examples: ExampleEntry[] = [
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
  { ...counter, load: () => import('./counter/CounterExample.vue') },
  { ...derived, load: () => import('./derived/DerivedExample.vue') },
  { ...lifecycle, load: () => import('./lifecycle/LifecycleExample.vue') },
  {
    ...inheritance,
    load: () => import('./inheritance/InheritanceExample.vue'),
  },
  { ...pointer, load: () => import('./pointer/PointerExample.vue') },
  {
    ...virtualScroller,
    load: () => import('./virtual-scroller/VirtualScrollerExample.vue'),
  },
  {
    ...flyweightGrid,
    load: () => import('./flyweight-grid/FlyweightGridExample.vue'),
  },
  {
    ...formulaGrid,
    load: () => import('./formula-grid/FormulaGridExample.vue'),
  },
  { ...benchmarks, load: () => import('./benchmarks/BenchmarksExample.vue') },
];
