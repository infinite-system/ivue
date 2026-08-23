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
import NewsletterQuickJoin from './components/NewsletterQuickJoin.vue';
import BlogComments from './components/BlogComments.vue';
import RelatedPosts from './components/RelatedPosts.vue';
import ChannelNote from './components/ChannelNote.vue';
import BlogArchiveScroller from './components/BlogArchiveScroller.vue';
import BlogBackLink from './components/BlogBackLink.vue';
import BenchmarkWinner from '@examples/benchmarks/BenchmarkWinner.vue';
import { registerDocsApp } from './quasar-docs-loader';
// the archive's size, for newsletter copy — "the whole blog in N days"
// recomputes at every build (posts × the every-other-day cadence)
import recordedBlogDates from '../../blog/blog-dates.json';
import { initAnalytics } from './analytics';
import { installDeployGuard, reloadIfNotFoundIsStale } from './deploy-guard';
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
      'doc-before': () => [h(BlogBackLink), h(ChannelNote)],
      'aside-outline-after': () => [
        h(RelatedPosts, { variant: 'aside' }),
        h(BlogShare, { placement: 'aside' }),
        h(NewsletterSignup, { placement: 'aside' }),
      ],
      // Post-page order: author → related → prev/next → comments →
      // archive → newsletter. Related rides right after the author
      // badge (compact rows on mobile); comment threads grow
      // unboundedly, so the curated links stay above that growth. On
      // guide pages the blog-only components render nothing, so
      // related still lands right after share.
      'doc-after': () => [
        h(BlogShare, { placement: 'doc' }),
        h(NewsletterQuickJoin, { placement: 'post-footer', align: 'center' }),
        h(BlogAuthor),
        h(RelatedPosts, { variant: 'doc' }),
        h(BlogPostNav),
        h(BlogComments),
        h(BlogArchiveScroller),
        h(NewsletterSignup, { placement: 'doc' }),
        h(NewsletterSignup, { placement: 'cta' }),
      ],
      // mobile menu: the quick-join rides below the social links
      'nav-screen-content-after': () =>
        h(NewsletterQuickJoin, { placement: 'mobile-menu', align: 'center' }),
      'layout-bottom': () => h(NewsletterSignup, { placement: 'toast' }),
    });
  },
  enhanceApp({ app, router }) {
    registerDocsApp(app); // field embeds install Quasar lazily

    // newsletter copy interpolates these in components AND markdown
    const archivePostCount = Object.keys(recordedBlogDates).length;
    app.config.globalProperties.$archivePostCount = archivePostCount;
    app.config.globalProperties.$archiveDays = archivePostCount * 2;
    initAnalytics(); // PostHog — production-only, browser-only, async

    if (typeof window !== 'undefined') {
      // Deploy-race protection. PRIMARY: the deploy guard gates every
      // SPA navigation on the hashmap comparison and hard-navigates
      // stale tabs onto the new build BEFORE anything can 404 (see
      // deploy-guard.ts — VitePress swallows the import failure
      // internally, so after-the-fact rescue handlers never see it).
      installDeployGuard(router);

      // BACKSTOP: for failures that still surface through vite's
      // preload helper or as unhandled rejections (lazy in-page
      // components, prefetches), reload onto the new build. The
      // sessionStorage guard reloads at most once per half-minute,
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

      // The local nav (Menu / Return to top) is a SECOND sticky header —
      // hide it while reading down, bring it back the moment the reader
      // scrolls up (the same intent signal mobile browser chrome uses).
      let lastScrollY = window.scrollY;
      let localNavTicking = false;
      window.addEventListener(
        'scroll',
        () => {
          if (localNavTicking) return;
          localNavTicking = true;
          requestAnimationFrame(() => {
            const currentY = window.scrollY;
            const scrollingDown = currentY > lastScrollY;
            if (scrollingDown && currentY > 150) {
              document.documentElement.classList.add('local-nav-hidden');
            } else if (!scrollingDown) {
              document.documentElement.classList.remove('local-nav-hidden');
            }
            lastScrollY = currentY;
            localNavTicking = false;
          });
        },
        { passive: true },
      );

      // Browser auto-translate must never touch the brand: the nav logo
      // says "ivue" in every language. Re-tagged after each route change —
      // covers first paint and late-mounted layouts alike.
      const shieldBrand = () => {
        document
          .querySelector('.VPNavBarTitle')
          ?.setAttribute('translate', 'no');
      };

      // At iPad widths the seven nav items overflow the bar and push the
      // "…" extra menu out of view. CSS collapses the flat Community link
      // in that range (custom.css), and this injects Community INTO the
      // extra flyout — VitePress never puts nav links there itself. The
      // injected group is visible only in the same range, so wider
      // viewports never show Community twice. Idempotent; the navbar
      // persists across routes, so one successful injection is enough.
      const injectExtraNavLinks = () => {
        const extraMenu = document.querySelector('.VPNavBarExtra .VPMenu');
        if (!extraMenu || extraMenu.querySelector('.ivue-extra-nav')) return;
        const group = document.createElement('div');
        group.className = 'group ivue-extra-nav';
        const item = document.createElement('div');
        const link = document.createElement('a');
        link.className = 'ivue-extra-link';
        link.href = '/community';
        link.textContent = 'Community';
        item.appendChild(link);
        group.appendChild(item);
        extraMenu.prepend(group);
      };

      // Navbar dropdowns (Guide, Examples, …) are pure :hover flyouts —
      // after clicking a link the pointer is still over them, so the
      // menu hangs open over the new page. The closed flag lives on
      // <html> (route changes re-patch the flyout DOM, so a class on
      // the flyout itself gets wiped) and clears as soon as the
      // pointer reaches anything outside a flyout — or a flyout
      // button is pressed again (the tap path on iPad).
      const reopenFlyouts = (event: Event) => {
        if ((event.target as Element | null)?.closest?.('.VPFlyout .menu'))
          return;
        document.documentElement.classList.remove('ivue-flyout-closed');
        document.removeEventListener('mouseover', reopenFlyouts);
      };
      document.addEventListener('click', (event) => {
        const target = event.target as Element | null;
        if (target?.closest?.('.VPFlyout .button')) {
          reopenFlyouts(event);
          return;
        }
        if (!target?.closest?.('.VPNavBar .VPFlyout .menu a')) return;
        document.documentElement.classList.add('ivue-flyout-closed');
        document.addEventListener('mouseover', reopenFlyouts);
      });

      // CSS animations play once per element insertion — an SPA
      // navigation back to a page reuses DOM and the avatar ring's
      // loader sweep would never replay. Restart it on every visit.
      const restartAvatarRing = () => {
        document
          .querySelectorAll<HTMLElement>('.cm-avatar')
          .forEach((avatar) => {
            avatar.style.animation = 'none';
            void avatar.offsetWidth; // reflow commits the removal
            avatar.style.animation = '';
          });
      };

      const onAfterRouteChange = router.onAfterRouteChange;
      router.onAfterRouteChange = async (to) => {
        await onAfterRouteChange?.(to);
        requestAnimationFrame(() => {
          shieldBrand();
          injectExtraNavLinks();
          restartAvatarRing();
        });

        if (router.route.data.isNotFound) {
          // a "404" on a stale build is usually the deploy race, not a
          // real missing page — the guard reloads if the maps disagree
          reloadIfNotFoundIsStale();
          window.dispatchEvent(
            new CustomEvent('ivue:route-not-found', {
              detail: { href: to },
            }),
          );
        }
      };
      requestAnimationFrame(() => {
        shieldBrand();
        injectExtraNavLinks();
      });
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
    app.component('NewsletterQuickJoin', NewsletterQuickJoin);
    app.component('BlogPostDate', BlogPostDate);
  },
} satisfies Theme;
