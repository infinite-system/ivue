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
import BlogPublishedDate from './components/BlogPublishedDate.vue';
import BlogPostNav from './components/BlogPostNav.vue';
import BlogPostDate from './components/BlogPostDate.vue';
import NewsletterSignup from './components/NewsletterSignup.vue';
import NewsletterQuickJoin from './components/NewsletterQuickJoin.vue';
import BlogDripShowcase from './components/BlogDripShowcase.vue';
import BlogComments from './components/BlogComments.vue';
import RelatedPosts from './components/RelatedPosts.vue';
import ChannelNote from './components/ChannelNote.vue';
import BlogArchiveScroller from './components/BlogArchiveScroller.vue';
import BlogBackLink from './components/BlogBackLink.vue';
import BlogSidebarSearch from './components/BlogSidebarSearch.vue';
import BenchmarkWinner from '@examples/benchmarks/BenchmarkWinner.vue';
import { registerDocsApp } from './quasar-docs-loader';
// the archive's size, for newsletter copy — "the whole blog in N days"
// recomputes at every build (posts × the every-other-day cadence)
import recordedBlogDates from '../../blog/blog-dates.json';
import { initAnalytics } from './analytics';
import { installDeployGuard, reloadIfNotFoundIsStale } from './deploy-guard';
import { installLinkPreviews } from './link-preview';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(IvueHero),
      // blog rail head: All posts + the search box (blog section only)
      'sidebar-nav-before': () => h(BlogSidebarSearch),
      'sidebar-nav-after': () => h(ExperimentalDocs),
      // Blog articles only (the components gate themselves on the route).
      'doc-before': () => [h(BlogBackLink), h(ChannelNote)],
      'aside-outline-after': () => [
        h(RelatedPosts, { variant: 'aside' }),
        h(NewsletterSignup, { placement: 'aside' }),
      ],
      // Post-page order: author → share → quick-join → related →
      // prev/next → comments → archive → newsletter. Share sits right
      // under the author card at every width (one inline row); comment
      // threads grow unboundedly, so the curated links stay above that
      // growth. On guide pages the blog-only components render nothing.
      // Published sits directly above VitePress's Last updated line,
      // same style — the date is findable at the bottom, never a
      // freshness verdict at the top (the content is timeless).
      'doc-footer-before': () => h(BlogPublishedDate),
      'doc-after': () => [
        h(BlogAuthor),
        h(BlogShare, { placement: 'doc' }),
        h(NewsletterQuickJoin, { placement: 'post-footer', align: 'center' }),
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
      installLinkPreviews(); // hover cards for internal prose links

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
      // An anchor JUMP scrolls down programmatically — that's arrival,
      // not reading, so the bar must survive it: any in-page anchor
      // click (TOC, outline dropdown, prose #links) opens a grace
      // window during which scrolling down never hides the bar.
      let anchorJumpUntil = 0;
      const keepLocalNavThroughJump = () => {
        anchorJumpUntil = Date.now() + 1200;
        document.documentElement.classList.remove('local-nav-hidden');
      };
      document.addEventListener(
        'click',
        (event) => {
          const anchor = (event.target as Element | null)?.closest?.(
            'a[href*="#"]',
          ) as HTMLAnchorElement | null;
          if (!anchor) return;
          const url = new URL(anchor.href, window.location.origin);
          if (url.pathname === window.location.pathname && url.hash)
            keepLocalNavThroughJump();
        },
        { passive: true, capture: true },
      );
      window.addEventListener('hashchange', keepLocalNavThroughJump);
      window.addEventListener(
        'scroll',
        () => {
          if (localNavTicking) return;
          localNavTicking = true;
          requestAnimationFrame(() => {
            const currentY = window.scrollY;
            const scrollingDown = currentY > lastScrollY;
            if (
              scrollingDown &&
              currentY > 150 &&
              Date.now() > anchorJumpUntil
            ) {
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
      // below 1152px and the Releases link below 960px (iPad mini), and
      // this injects both INTO the extra flyout — VitePress never puts
      // nav links there itself. Each injected row is visible only in
      // the range where its bar link is hidden, so no width shows a
      // link twice. Idempotent; the navbar persists across routes, so
      // one successful injection is enough.
      const injectExtraNavLinks = () => {
        const extraMenu = document.querySelector('.VPNavBarExtra .VPMenu');
        if (!extraMenu || extraMenu.querySelector('.ivue-extra-nav')) return;
        const group = document.createElement('div');
        group.className = 'group ivue-extra-nav';
        for (const [href, text, modifier] of [
          ['/releases/', 'Releases', 'releases'],
          ['/community', 'Community', 'community'],
        ]) {
          const item = document.createElement('div');
          item.className = `ivue-extra-item ivue-extra-item--${modifier}`;
          const link = document.createElement('a');
          link.className = 'ivue-extra-link';
          link.href = href;
          link.textContent = text;
          item.appendChild(link);
          group.appendChild(item);
        }
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

      // The outline marker ships as a fixed-height bar; when an "On
      // this page" link wraps to two lines the bar under-covers it.
      // VitePress moves the marker by writing its style.top on every
      // active-anchor change — observing that write is the exact
      // moment to match the marker's height to the active link's real
      // height. One observer per outline element (it is re-created on
      // navigation, so re-attach after each route change).
      const sizeOutlineMarker = () => {
        const marker = document.querySelector<HTMLElement>(
          '.VPDocAsideOutline .outline-marker',
        );
        const active = document.querySelector<HTMLElement>(
          '.VPDocAsideOutline .outline-link.active',
        );
        // offsetHeight includes the line box's leading — trim it so the
        // bar hugs the text (a 5px margin-top in CSS re-centers it)
        if (marker && active)
          marker.style.height = `${active.offsetHeight - 14}px`;
      };
      let outlineMarkerObserver: MutationObserver | null = null;
      const watchOutlineMarker = () => {
        outlineMarkerObserver?.disconnect();
        const marker = document.querySelector<HTMLElement>(
          '.VPDocAsideOutline .outline-marker',
        );
        if (!marker) return;
        outlineMarkerObserver = new MutationObserver(sizeOutlineMarker);
        outlineMarkerObserver.observe(marker, {
          attributes: true,
          attributeFilter: ['style'],
        });
        sizeOutlineMarker();
      };
      requestAnimationFrame(watchOutlineMarker);

      // The mobile sub-nav button reads "Menu" from a single config
      // string (themeConfig.sidebarMenuLabel), but the sidebar it opens
      // is section-specific — name the section instead. Re-applied on
      // every route change: the component re-renders from config.
      const localNavLabel = (path: string) => {
        if (path.startsWith('/blog')) return 'Blog';
        if (path.startsWith('/examples')) return 'Examples';
        if (path.startsWith('/releases')) return 'Releases';
        if (
          path.startsWith('/guide') ||
          path.startsWith('/api') ||
          path.startsWith('/reference') ||
          path.startsWith('/engine')
        )
          return 'Guide';
        return 'Menu';
      };
      const labelLocalNav = () => {
        const text = document.querySelector<HTMLElement>(
          '.VPLocalNav .menu .menu-text',
        );
        if (text) text.textContent = localNavLabel(window.location.pathname);
        // …and the outline dropdown beside it names the page instead of
        // the generic "On this page" (CSS truncates it — see custom.css)
        const outline = document.querySelector<HTMLElement>(
          '.VPLocalNavOutlineDropdown .menu-text',
        );
        if (outline) {
          const pageTitle = document.title.replace(/\s+—\s+ivue$/, '').trim();
          if (pageTitle) outline.textContent = pageTitle;
        }
      };
      requestAnimationFrame(labelLocalNav);

      // The outline dropdown's panel (.items) is created on every open —
      // head it with the article's title so the section rows read as
      // ITS contents (CSS indents them beneath it). One observer on the
      // dropdown element; re-attached after each route change.
      let outlineDropdownObserver: MutationObserver | null = null;
      const headOutlinePanel = () => {
        const panel = document.querySelector<HTMLElement>(
          '.VPLocalNavOutlineDropdown .items',
        );
        if (!panel || panel.querySelector('.ivue-outline-title')) return;
        const pageTitle = document.title.replace(/\s+—\s+ivue$/, '').trim();
        if (!pageTitle) return;
        const heading = document.createElement('p');
        heading.className = 'ivue-outline-title';
        heading.textContent = pageTitle;
        panel.prepend(heading);
      };
      const watchOutlineDropdown = () => {
        outlineDropdownObserver?.disconnect();
        const dropdown = document.querySelector('.VPLocalNavOutlineDropdown');
        if (!dropdown) return;
        outlineDropdownObserver = new MutationObserver(headOutlinePanel);
        outlineDropdownObserver.observe(dropdown, { childList: true });
      };
      requestAnimationFrame(watchOutlineDropdown);

      // Tapping the logo while the mobile menu is open: VitePress only
      // closes the screen on route CHANGE, so from the home page the
      // menu would stay open over the page. Close it explicitly.
      document.addEventListener('click', (event) => {
        if (!(event.target as Element | null)?.closest?.('.VPNavBarTitle'))
          return;
        if (document.querySelector('.VPNavScreen')) {
          document
            .querySelector<HTMLButtonElement>('.VPNavBarHamburger')
            ?.click();
        }
      });

      const onAfterRouteChange = router.onAfterRouteChange;
      router.onAfterRouteChange = async (to) => {
        await onAfterRouteChange?.(to);
        requestAnimationFrame(() => {
          shieldBrand();
          injectExtraNavLinks();
          restartAvatarRing();
          watchOutlineMarker();
          labelLocalNav();
          watchOutlineDropdown();
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
    app.component('BlogDripShowcase', BlogDripShowcase);
    app.component('BlogPostDate', BlogPostDate);
  },
} satisfies Theme;
