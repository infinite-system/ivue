import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
import IvueHero from './components/IvueHero.vue';
import DemoCounter from './components/DemoCounter.vue';
import DemoState from './components/DemoState.vue';
import DemoDerived from './components/DemoDerived.vue';
import DemoInheritance from './components/DemoInheritance.vue';
import DemoTeardown from './components/DemoTeardown.vue';
import DemoPerf from './components/DemoPerf.vue';
import GridBenchmark from './components/grid/GridBenchmark.vue';
import FormulaGrid from './components/grid/FormulaGrid.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(IvueHero),
    });
  },
  enhanceApp({ app }) {
    app.component('DemoCounter', DemoCounter);
    app.component('DemoState', DemoState);
    app.component('DemoDerived', DemoDerived);
    app.component('DemoInheritance', DemoInheritance);
    app.component('DemoTeardown', DemoTeardown);
    app.component('DemoPerf', DemoPerf);
    app.component('GridBenchmark', GridBenchmark);
    app.component('FormulaGrid', FormulaGrid);
  },
} satisfies Theme;
