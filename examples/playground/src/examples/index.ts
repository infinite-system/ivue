import type { Component } from 'vue';
import { manifest as virtualScroller } from './virtual-scroller/manifest';

export interface ExampleEntry {
  slug: string;
  title: string;
  blurb: string;
  docsPath: string;
  load: () => Promise<{ default: Component }>;
}

// Adding an example = one folder with a manifest + one entry here.
// Every route component is lazy — a route never pays for the others.
export const examples: ExampleEntry[] = [
  {
    ...virtualScroller,
    load: () => import('./virtual-scroller/VirtualScrollerExample.vue'),
  },
];
