import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
import IvueHero from './components/IvueHero.vue';
import PerfSlider from './components/PerfSlider.vue';
import DemoCounter from './components/DemoCounter.vue';
import DemoState from './components/DemoState.vue';
import DemoDerived from './components/DemoDerived.vue';
import DemoInheritance from './components/DemoInheritance.vue';
import DemoComputedInheritance from './components/DemoComputedInheritance.vue';
import DemoTeardown from './components/DemoTeardown.vue';
import DemoPointer from './components/DemoPointer.vue';
import DemoPerf from './components/DemoPerf.vue';
import GridBenchmark from './components/grid/GridBenchmark.vue';
import FormulaGrid from './components/grid/FormulaGrid.vue';
import FlyweightGrid20M from './components/grid/FlyweightGrid20M.vue';
import CreationBench from './components/CreationBench.vue';
import ExperimentalDocs from './components/ExperimentalDocs.vue';
import StackBlitzPlayground from './components/StackBlitzPlayground.vue';
import BlogIndex from './components/BlogIndex.vue';
import BlogShare from './components/BlogShare.vue';
import BlogAuthor from './components/BlogAuthor.vue';
import BlogPostNav from './components/BlogPostNav.vue';
import BlogPostDate from './components/BlogPostDate.vue';
import NewsletterSignup from './components/NewsletterSignup.vue';
import BlogArchiveScroller from './components/BlogArchiveScroller.vue';
import BlogBackLink from './components/BlogBackLink.vue';
import BenchmarkWinner from '@examples/benchmarks/BenchmarkWinner.vue';
import { registerDocsApp } from './quasar-docs-loader';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(IvueHero),
      'sidebar-nav-after': () => h(ExperimentalDocs),
      // Blog articles only (the components gate themselves on the route):
      // share buttons ride the outline aside; on narrower viewports the
      // aside disappears, so a second share row renders after the article.
      'doc-before': () => h(BlogBackLink),
      'aside-outline-after': () => [
        h(BlogShare, { placement: 'aside' }),
        h(NewsletterSignup, { placement: 'aside' }),
      ],
      'doc-after': () => [
        h(BlogShare, { placement: 'doc' }),
        h(BlogAuthor),
        h(BlogPostNav),
        h(BlogArchiveScroller),
        h(NewsletterSignup, { placement: 'doc' }),
        h(NewsletterSignup, { placement: 'cta' }),
      ],
      'layout-bottom': () => h(NewsletterSignup, { placement: 'toast' }),
    });
  },
  enhanceApp({ app, router }) {
    registerDocsApp(app); // field embeds install Quasar lazily

    if (typeof window !== 'undefined') {
      // Deploy-race recovery: a fresh deploy replaces the hashed chunks,
      // so a tab still running the OLD build dies when client-side
      // navigation dynamic-imports a chunk that no longer exists. Vite
      // reports exactly that as vite:preloadError — reload instead, which
      // fetches the new HTML (max-age=0) and lands on the new build.
      window.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        window.location.reload();
      });

      // Browser auto-translate must never touch the brand: the nav logo
      // says "ivue" in every language. Re-tagged after each route change —
      // covers first paint and late-mounted layouts alike.
      const shieldBrand = () => {
        document
          .querySelector('.VPNavBarTitle')
          ?.setAttribute('translate', 'no');
      };

      const onAfterRouteChange = router.onAfterRouteChange;
      router.onAfterRouteChange = async (to) => {
        await onAfterRouteChange?.(to);
        requestAnimationFrame(shieldBrand);

        if (router.route.data.isNotFound) {
          window.dispatchEvent(
            new CustomEvent('ivue:route-not-found', {
              detail: { href: to },
            }),
          );
        }
      };
      requestAnimationFrame(shieldBrand);
    }

    app.component('PerfSlider', PerfSlider);
    app.component('DemoCounter', DemoCounter);
    app.component('DemoState', DemoState);
    app.component('DemoDerived', DemoDerived);
    app.component('DemoInheritance', DemoInheritance);
    app.component('DemoComputedInheritance', DemoComputedInheritance);
    app.component('DemoTeardown', DemoTeardown);
    app.component('DemoPointer', DemoPointer);
    app.component('DemoPerf', DemoPerf);
    app.component('GridBenchmark', GridBenchmark);
    app.component('FormulaGrid', FormulaGrid);
    app.component('FlyweightGrid20M', FlyweightGrid20M);
    app.component('CreationBench', CreationBench);
    app.component('BenchmarkWinner', BenchmarkWinner);
    app.component('StackBlitzPlayground', StackBlitzPlayground);
    app.component('BlogIndex', BlogIndex);
    app.component('BlogPostDate', BlogPostDate);
  },
} satisfies Theme;
