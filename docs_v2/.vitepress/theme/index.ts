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
      // navigation dynamic-imports a chunk that no longer exists. That
      // failure surfaces through TWO channels — vite's preload helper
      // emits vite:preloadError, while VitePress's router imports page
      // modules directly and the failure lands as an unhandled promise
      // rejection ("Failed to fetch dynamically imported module") that
      // no handler was catching, leaving a blank page. Reload instead:
      // the HTML is max-age=0, so the reload lands on the new build.
      // The sessionStorage guard reloads at most once per half-minute,
      // so a genuinely dead network cannot loop the tab.
      const reloadOntoFreshBuild = () => {
        const RELOAD_STAMP_KEY = 'ivue-deploy-race-reload';
        const lastReload = Number(
          sessionStorage.getItem(RELOAD_STAMP_KEY) ?? 0,
        );
        if (Date.now() - lastReload < 30_000) return;
        sessionStorage.setItem(RELOAD_STAMP_KEY, String(Date.now()));
        window.location.reload();
      };
      window.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        reloadOntoFreshBuild();
      });
      window.addEventListener('unhandledrejection', (event) => {
        const message = String(event.reason?.message ?? event.reason ?? '');
        if (
          /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(
            message,
          )
        ) {
          event.preventDefault();
          reloadOntoFreshBuild();
        }
      });

      // Browser auto-translate must never touch the brand: the nav logo
      // says "ivue" in every language. Re-tagged after each route change —
      // covers first paint and late-mounted layouts alike.
      //
      // LOGO EVALUATION RIG (temporary): each site section wears one of
      // the three de-haired logo candidates so they can be compared in
      // the real header — home/default = sky gradient (current colors),
      // /guide = brand indigo→emerald, /blog = gradient tile + white.
      // Once a winner is picked: point logo.svg at it and delete this.
      const LOGO_CANDIDATES: [prefix: string, source: string][] = [
        ['/blog', '/logo-tile.svg'],
        ['/guide', '/logo-indigo.svg'],
      ];
      const swapLogo = () => {
        const logoImage = document.querySelector<HTMLImageElement>(
          '.VPNavBarTitle .logo',
        );
        if (!logoImage) return;
        const match = LOGO_CANDIDATES.find(([prefix]) =>
          window.location.pathname.startsWith(prefix),
        );
        logoImage.src = match ? match[1] : '/logo-sky.svg';
        // the tile candidate also tries gradient "ivue" wordmark text
        document.documentElement.classList.toggle(
          'logo-rig-gradient-text',
          (match?.[1] ?? '') === '/logo-tile.svg',
        );
      };
      const shieldBrand = () => {
        document
          .querySelector('.VPNavBarTitle')
          ?.setAttribute('translate', 'no');
        swapLogo();
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
