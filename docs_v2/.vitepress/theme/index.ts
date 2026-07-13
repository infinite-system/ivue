// The docs' live demos are BENCHMARKS — they must measure production
// semantics, not dev scaffolding. In dev serve, ivue's class-HMR arms a
// construct-trap proxy (~11× on bare instantiation; production pays zero —
// it is DCE'd). Opt the whole docs app out BEFORE any Reactive() call.
(globalThis as unknown as Record<symbol, boolean>)[
  Symbol.for('ivue.hmr.disable')
] = true;

import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
import IvueHero from './components/IvueHero.vue';
import DemoCounter from './components/DemoCounter.vue';
import DemoState from './components/DemoState.vue';
import DemoDerived from './components/DemoDerived.vue';
import DemoInheritance from './components/DemoInheritance.vue';
import DemoTeardown from './components/DemoTeardown.vue';
import DemoPointer from './components/DemoPointer.vue';
import DemoPerf from './components/DemoPerf.vue';
import GridBenchmark from './components/grid/GridBenchmark.vue';
import FormulaGrid from './components/grid/FormulaGrid.vue';
import FlyweightGrid20M from './components/grid/FlyweightGrid20M.vue';
import CreationBench from './components/CreationBench.vue';
import { registerDocsApp } from './quasar-docs-loader';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(IvueHero),
    });
  },
  enhanceApp({ app }) {
    registerDocsApp(app); // field embeds install Quasar lazily

    app.component('DemoCounter', DemoCounter);
    app.component('DemoState', DemoState);
    app.component('DemoDerived', DemoDerived);
    app.component('DemoInheritance', DemoInheritance);
    app.component('DemoTeardown', DemoTeardown);
    app.component('DemoPointer', DemoPointer);
    app.component('DemoPerf', DemoPerf);
    app.component('GridBenchmark', GridBenchmark);
    app.component('FormulaGrid', FormulaGrid);
    app.component('FlyweightGrid20M', FlyweightGrid20M);
    app.component('CreationBench', CreationBench);
  },
} satisfies Theme;
