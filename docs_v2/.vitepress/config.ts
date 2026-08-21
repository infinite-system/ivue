import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

const deployedCommit = process.env.GITHUB_SHA ?? '';

// Nav NEW badges: lit at build time when the newest post/release is under
// two weeks old (dates from the committed *-dates.json files).
const FRESH_WINDOW_SECONDS = 14 * 86_400;
function newestTimestamp(datesFile: string): number {
  try {
    const records = JSON.parse(
      readFileSync(new URL(datesFile, import.meta.url), 'utf8'),
    ) as Record<string, { timestamp: number }>;
    return Math.max(
      0,
      ...Object.values(records).map((record) => record.timestamp),
    );
  } catch {
    return 0;
  }
}
const nowSeconds = Math.floor(Date.now() / 1000);
const hasNewBlog =
  nowSeconds - newestTimestamp('../blog/blog-dates.json') < FRESH_WINDOW_SECONDS;
const hasNewRelease =
  nowSeconds - newestTimestamp('../releases-dates.json') < 90 * 86_400;

// Blog sidebar, generated from the posts themselves: frontmatter titles +
// git-recovered dates (blog-dates.json), newest first, grouped by month.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath as toPath } from 'node:url';

function releasesSidebar() {
  const notesDirectory = toPath(new URL('../../releases', import.meta.url));
  const versions = readdirSync(notesDirectory)
    .filter((entry) => /^ivue@\d+\.\d+\.\d+\.md$/.test(entry))
    .map((entry) => entry.slice('ivue@'.length, -'.md'.length))
    .sort((first, second) => {
      const a = first.split('.').map(Number);
      const b = second.split('.').map(Number);
      return b[0] - a[0] || b[1] - a[1] || b[2] - a[2];
    });
  return [
    {
      text: 'Releases',
      items: [
        { text: 'All releases', link: '/releases/' },
        ...versions.map((version) => ({
          text: `ivue@${version}`,
          link: `/releases/${version}`,
        })),
      ],
    },
  ];
}

function blogSidebar() {
  const blogDirectory = toPath(new URL('../blog', import.meta.url));
  const recordedDates = JSON.parse(
    readFileSync(`${blogDirectory}/blog-dates.json`, 'utf8'),
  ) as Record<string, { date: string; timestamp: number }>;
  const posts = readdirSync(blogDirectory)
    .filter((entry) => entry.endsWith('.md') && entry !== 'index.md')
    .map((entry) => {
      const slug = entry.replace(/\.md$/, '');
      const source = readFileSync(`${blogDirectory}/${entry}`, 'utf8');
      const title =
        source.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? slug;
      const recorded = recordedDates[slug];
      return {
        slug,
        title,
        date: recorded?.date ?? '2099-01-01',
        timestamp: recorded?.timestamp ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((first, second) => second.timestamp - first.timestamp);

  const monthGroups = new Map<string, { text: string; link: string }[]>();
  for (const post of posts) {
    const month = new Date(post.date + 'T00:00:00Z').toLocaleDateString(
      'en-US',
      { year: 'numeric', month: 'long', timeZone: 'UTC' },
    );
    if (!monthGroups.has(month)) monthGroups.set(month, []);
    // sidebar text is rendered as HTML — the date rides each title as a
    // small grey suffix ("Aug 10"), styled via .sb-date in custom.css
    const shortDate = new Date(post.date + 'T00:00:00Z').toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric', timeZone: 'UTC' },
    );
    monthGroups.get(month)!.push({
      text: `${post.title} <span class="sb-date">${shortDate}</span>`,
      link: `/blog/${post.slug}`,
    });
  }
  return [
    {
      text: 'Blog',
      items: [{ text: 'All posts', link: '/blog/' }],
    },
    ...[...monthGroups].map(([month, items]) => ({
      text: month,
      collapsed: false,
      items,
    })),
  ];
}

export default defineConfig({
  vite: {
    define: {
      __IVUE_DEPLOYED_COMMIT__: JSON.stringify(deployedCommit),
    },
    resolve: {
      // The home hero imports the real engine from ../lib/Reactive.ts.
      // One Vue copy for both the docs and the lib, or tracking breaks.
      dedupe: ['vue'],
      alias: {
        // The playground is the canonical source of every example — docs
        // demos import the SAME classes the example pages show as code.
        '@examples': fileURLToPath(
          new URL('../../examples/playground/src/examples', import.meta.url),
        ),
      },
    },
    server: {
      fs: { allow: ['../..'] },
    },
  },

  base: '/', // served at https://ivue.dev/
  site: 'https://ivue.dev',

  title: 'ivue',
  titleTemplate: ':title — Infinite Vue',
  description:
    'Class-based reactivity for Vue 3. Plain classes, full reactivity, one kilobyte.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    [
      'script',
      {},
      `(() => {
        const docsBase = '/';
        const retryParam = '__ivue_deployment';
        const chunkReloadKey = 'ivue:deployment-chunk-reload';
        const routeReloadKey = 'ivue:deployment-route-reload';
        const deploymentToastKey = 'ivue:deployment-toast';
        const routeNotFoundEvent = 'ivue:route-not-found';
        const deployedCommit = ${JSON.stringify(deployedCommit)};
        const currentUrl = new URL(window.location.href);
        let deploymentRecoveryStarted = false;

        const navigateFresh = () => {
          const freshUrl = new URL(window.location.href);
          freshUrl.searchParams.set(retryParam, Date.now().toString());
          window.location.replace(freshUrl.href);
        };

        const isNotFound =
          document.title.startsWith('404') &&
          document.querySelector('meta[name="description"]')?.content ===
            'Not Found';

        const showDeploymentToast = () => {
          if (
            !deployedCommit ||
            sessionStorage.getItem(deploymentToastKey) !== deployedCommit
          ) {
            return;
          }

          sessionStorage.removeItem(deploymentToastKey);

          const mount = () => {
            const toast = document.createElement('div');
            const mark = document.createElement('img');
            const copy = document.createElement('span');
            const title = document.createElement('strong');
            const detail = document.createElement('span');

            toast.className = 'ivue-deployment-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            toast.setAttribute('aria-atomic', 'true');

            mark.src = '/mark.svg';
            mark.alt = '';
            mark.width = 36;
            mark.height = 36;
            copy.className = 'ivue-deployment-toast__copy';
            title.textContent = 'Fresh ivue docs just landed';
            detail.textContent =
              'Built in the open. You’re now on the latest version.';

            copy.append(title, detail);
            toast.append(mark, copy);
            document.body.append(toast);
            window.setTimeout(() => toast.remove(), 6_000);
          };

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mount, { once: true });
          } else {
            mount();
          }
        };

        const deploymentIsPending = async () => {
          if (!deployedCommit) return false;

          try {
            const response = await fetch(
              'https://api.github.com/repos/infinite-system/ivue/branches/main',
              {
                cache: 'no-store',
                headers: { Accept: 'application/vnd.github+json' },
              },
            );
            if (!response.ok) return false;

            const branch = await response.json();
            return Boolean(
              branch.commit?.sha && branch.commit.sha !== deployedCommit,
            );
          } catch {
            return false;
          }
        };

        const routeExistsInCurrentBuild = (href) => {
          const hashMap = window.__VP_HASH_MAP__;
          if (!hashMap) return false;

          let pagePath = new URL(href, window.location.href).pathname;
          if (!pagePath.startsWith(docsBase)) return false;

          pagePath = pagePath
            .replace(/\\.html$/, '')
            .replace(/\\/$/, '/index')
            .slice(docsBase.length)
            .replace(/\\//g, '_');

          let pageKey = (pagePath || 'index').toLowerCase() + '.md';
          if (Object.prototype.hasOwnProperty.call(hashMap, pageKey)) return true;

          pageKey = pageKey.endsWith('_index.md')
            ? pageKey.slice(0, -9) + '.md'
            : pageKey.slice(0, -3) + '_index.md';
          return Object.prototype.hasOwnProperty.call(hashMap, pageKey);
        };

        const recoverDuringDeployment = async (assetsAreMissing) => {
          if (deploymentRecoveryStarted) return;
          deploymentRecoveryStarted = true;

          // When assets are known-missing, poll unconditionally: the
          // GitHub API may be rate-limited, or the deploy may already
          // be finished with this page simply holding the stale build.
          if (!assetsAreMissing && !(await deploymentIsPending())) {
            deploymentRecoveryStarted = false;
            return;
          }

          let attempts = 0;
          const maxAttempts = 36;

          const retryWhenDeployed = async () => {
            attempts++;

            const probeUrl = new URL(docsBase, window.location.origin);
            probeUrl.searchParams.set(retryParam, Date.now().toString());

            try {
              const response = await fetch(probeUrl.href, {
                cache: 'no-store',
              });

              if (response.ok) {
                const html = await response.text();
                const probeDocument = new DOMParser().parseFromString(
                  html,
                  'text/html',
                );
                const liveCommit = probeDocument.querySelector(
                  'meta[name="ivue-deployment"]',
                )?.content;

                if (liveCommit && liveCommit !== deployedCommit) {
                  sessionStorage.setItem(deploymentToastKey, liveCommit);
                  navigateFresh();
                  return;
                }
              }
            } catch {}

            if (attempts < maxAttempts) {
              window.setTimeout(retryWhenDeployed, 5_000);
            } else {
              deploymentRecoveryStarted = false;
            }
          };

          window.setTimeout(retryWhenDeployed, 2_000);
        };

        const recoverNotFound = (href) => {
          if (
            routeExistsInCurrentBuild(href) &&
            !sessionStorage.getItem(routeReloadKey)
          ) {
            sessionStorage.setItem(routeReloadKey, Date.now().toString());
            navigateFresh();
            return;
          }

          void recoverDuringDeployment();
        };

        // Both dynamic-import failures (vite:preloadError) and static
        // module-script/stylesheet 404s funnel here. First failure: one
        // cache-busted reload. If assets are STILL missing right after
        // that reload (a mid-flight deploy: old hashed files deleted,
        // new HTML not yet propagated), don't go silent — poll until
        // the new build is live, then navigate. The guard is a
        // timestamp, not a one-shot, so recovery re-arms by itself.
        const handleAssetFailure = () => {
          const lastReload = Number(
            sessionStorage.getItem(chunkReloadKey) || 0,
          );

          if (Date.now() - lastReload > 15_000) {
            sessionStorage.setItem(chunkReloadKey, Date.now().toString());
            navigateFresh();
            return;
          }

          void recoverDuringDeployment(true);
        };

        window.addEventListener('vite:preloadError', (event) => {
          event.preventDefault();
          handleAssetFailure();
        });

        window.addEventListener(
          'error',
          (event) => {
            const target = event.target;
            if (!target || !target.tagName) return;
            if (target.tagName !== 'SCRIPT' && target.tagName !== 'LINK') {
              return;
            }

            const assetUrl = target.src || target.href || '';
            if (!assetUrl.includes('/assets/')) return;

            handleAssetFailure();
          },
          true,
        );

        // Bare dynamic imports (chunks Vite emits WITHOUT the preload
        // helper) fail as plain promise rejections — no vite:preloadError,
        // no element error event. The rejection message is the only signal.
        window.addEventListener('unhandledrejection', (event) => {
          const reason = event.reason;
          const message = String(
            (reason && reason.message) || reason || '',
          ).toLowerCase();
          if (
            !message.includes('dynamically imported module') &&
            !message.includes('importing a module script failed')
          ) {
            return;
          }

          event.preventDefault();
          handleAssetFailure();
        });

        window.addEventListener(routeNotFoundEvent, (event) => {
          recoverNotFound(event.detail?.href ?? window.location.href);
        });

        window.setTimeout(
          () => sessionStorage.removeItem(routeReloadKey),
          10_000,
        );

        if (isNotFound) {
          recoverNotFound(window.location.href);
          return;
        }

        if (currentUrl.searchParams.has(retryParam)) {
          currentUrl.searchParams.delete(retryParam);
          window.history.replaceState(
            window.history.state,
            '',
            currentUrl.href,
          );
        }

        showDeploymentToast();
        void recoverDuringDeployment();
      })();`,
    ],
    ['meta', { name: 'ivue-deployment', content: deployedCommit }],
    ...((hasNewBlog || hasNewRelease
      ? [
          [
            'script',
            {},
            `document.documentElement.dataset.newBlog=${JSON.stringify(hasNewBlog ? '1' : '')};` +
              `document.documentElement.dataset.newRelease=${JSON.stringify(hasNewRelease ? '1' : '')};`,
          ],
        ]
      : []) as any),
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    // og:title / og:description / og:url AND the image metas are
    // per-page (transformHead) — scrapers take the FIRST og:image, so a
    // global one here would shadow the per-post banners
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    // Cloudflare Web Analytics — manual beacon: the dashboard's
    // auto-injection cannot rewrite Worker-served responses, so the
    // snippet lives here (the token is public by design)
    [
      'script',
      {
        type: 'module',
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': '{"token": "b8644fc150fa4b50b77e43c020e05e0e"}',
      },
    ],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    [
      'link',
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    ],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300..800&family=Geist+Mono:wght@400..600&display=swap',
      },
    ],
  ],

  // Blog posts are not part of the guide's reading order — the default
  // prev/next pager would walk into "What is ivue?". BlogPostNav (under
  // the author card) provides older/newer navigation instead.
  transformPageData(pageData) {
    // generated release pages must not invite GitHub edits — the source
    // of truth is the note file in /releases
    if (pageData.relativePath.startsWith('releases/')) {
      pageData.frontmatter.editLink = false;
    }
    if (pageData.relativePath.startsWith('blog/')) {
      pageData.frontmatter.prev = false;
      pageData.frontmatter.next = false;
      pageData.frontmatter.editLink = false;
      if (pageData.relativePath !== 'blog/index.md') {
        pageData.frontmatter.pageClass =
          `blog-post ${pageData.frontmatter.pageClass ?? ''}`.trim();
      }
    }
  },

  // Per-page social cards: link previews (WhatsApp, Slack, X…) read
  // og:* from the static HTML, so every page emits its own title,
  // description and canonical URL. Blog posts additionally point
  // og:image/twitter:image at their own banner, so a shared post link
  // renders THAT post's card; everywhere else the global brand image
  // holds.
  transformHead({ pageData }) {
    const isHome = pageData.frontmatter.layout === 'home';
    const title = isHome
      ? 'ivue — Plain classes. Full reactivity. One kilobyte.'
      : `${pageData.title} — Infinite Vue`;
    const description =
      pageData.description ||
      'Class-based reactivity for Vue 3. Plain classes, full reactivity, one kilobyte.';
    const path = pageData.relativePath
      .replace(/(^|\/)index\.md$/, '$1')
      .replace(/\.md$/, '');
    const head: [string, Record<string, string>][] = [
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: `https://ivue.dev/${path}` }],
    ];
    const blogPost = pageData.relativePath.match(/^blog\/(?!index)([^/]+)\.md$/);
    const imageUrl = blogPost
      ? `https://ivue.dev/blog/${blogPost[1]}.png`
      : 'https://ivue.dev/og-image.png';
    head.push(
      ['meta', { property: 'og:image', content: imageUrl }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { name: 'twitter:image', content: imageUrl }],
    );
    return head;
  },

  markdown: {
    lineNumbers: true,
    theme: { light: 'github-light', dark: 'one-dark-pro' },
    // every markdown ![]() image ships loading="lazy" — blog banners and
    // in-post screenshots load as the reader scrolls, not up front
    image: { lazyLoading: true },
    config(md) {
      // GFM task lists: render `- [ ]` / `- [x]` as checkboxes — used by
      // the standard.md self-review checklist. Rendered UNCHECKED so the
      // reader can tick items off while reviewing their own diff in the
      // browser (ticks are not persisted).
      // Table cells that open with a ✅ / ❌ verdict marker (the DO/NEVER
      // table): strip the marker and tag the cell, so the theme draws a
      // styled badge instead of a raw emoji. The markers stay in the
      // markdown source — each cell is self-describing for AI agents even
      // when read outside the table.
      md.core.ruler.after('inline', 'verdict-cells', (state) => {
        const tokens = state.tokens;
        for (let i = 1; i < tokens.length; i++) {
          const token = tokens[i];
          const cellOpen = tokens[i - 1];
          if (token.type !== 'inline' || !token.children?.length) continue;
          if (cellOpen.type !== 'td_open') continue;
          const first = token.children[0];
          if (first.type !== 'text') continue;
          const verdict = first.content.startsWith('✅ ')
            ? 'do-cell'
            : first.content.startsWith('❌ ')
              ? 'never-cell'
              : '';
          if (!verdict) continue;
          first.content = first.content.slice(2);
          cellOpen.attrJoin('class', verdict);
        }
      });

      md.core.ruler.after('inline', 'task-lists', (state) => {
        const tokens = state.tokens;
        for (let i = 2; i < tokens.length; i++) {
          const token = tokens[i];
          if (
            token.type !== 'inline' ||
            !token.children?.length ||
            tokens[i - 1].type !== 'paragraph_open' ||
            tokens[i - 2].type !== 'list_item_open'
          ) {
            continue;
          }
          const first = token.children[0];
          if (first.type !== 'text') continue;
          const match = /^\[([ xX])\] /.exec(first.content);
          if (!match) continue;
          first.content = first.content.slice(4);
          const checkbox = new state.Token('html_inline', '', 0);
          checkbox.content = '<input type="checkbox" class="task-checkbox"> ';
          token.children.unshift(checkbox);
          tokens[i - 2].attrJoin('class', 'task-item');
        }
      });

      // Machine-translation hygiene: browser auto-translate (Chrome's
      // "Translate this page") must never touch code — `Reactive()` or
      // `$watch` rendered into another language destroys the docs. Every
      // code element gets translate="no"; prose stays translatable.
      const defaultCodeInline =
        md.renderer.rules.code_inline ??
        ((tokens, idx, options, _env, self) =>
          self.renderToken(tokens, idx, options));
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
        tokens[idx].attrSet('translate', 'no');
        return defaultCodeInline(tokens, idx, options, env, self);
      };
      for (const rule of ['fence', 'code_block'] as const) {
        const defaultRender = md.renderer.rules[rule]!;
        md.renderer.rules[rule] = (tokens, idx, options, env, self) =>
          defaultRender(tokens, idx, options, env, self).replace(
            /^<(div|pre)/,
            '<$1 translate="no"',
          );
      }
    },
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'ivue' },
    siteTitle: 'ivue',

    nav: [
      {
        text: 'Guide',
        activeMatch: '^/(engine|guide/|api/)',
        items: [
          { text: 'What is ivue?', link: '/guide/introduction' },
          { text: 'The Engine', link: '/engine' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Design & Philosophy', link: '/guide/design' },
          { text: 'Fundamental Principles', link: '/guide/principles' },
          { text: 'Standard Operating Manual', link: '/guide/standard' },
          {
            text: 'Sections',
            items: [
              { text: 'Core — Reactive State', link: '/guide/state' },
              { text: 'Performance — ivue vs the World', link: '/guide/model-layer' },
              { text: 'Advanced Patterns — Namespace', link: '/guide/namespace-pattern' },
              { text: 'Reference — API', link: '/api/' },
            ],
          },
        ],
      },
      {
        text: 'Examples',
        activeMatch: '/examples/',
        items: [
          { text: 'Overview', link: '/examples/' },
          { text: 'StackBlitz Playground', link: '/examples/stackblitz' },
          {
            text: 'Start Small',
            items: [
              { text: 'Classic Counter Example', link: '/examples/counter' },
              { text: 'Plain getter vs computed()', link: '/examples/derived' },
              { text: '$watch & $stopEffects', link: '/examples/lifecycle' },
              { text: 'Inheritance chain', link: '/examples/inheritance' },
              { text: 'Composable in a class', link: '/examples/pointer' },
            ],
          },
          {
            text: 'Full Complexity',
            items: [
              { text: 'Pinia Store Alternative', link: '/examples/class-store' },
              { text: 'Workspace Platform', link: '/examples/workspace-platform' },
              { text: 'Extensible Kernel', link: '/examples/extensible-kernel' },
              { text: 'Advanced Select Field', link: '/examples/choose-field' },
              { text: 'Advanced Media Uploader', link: '/examples/media-field' },
              { text: 'Virtual Scroller: 1M Items', link: '/examples/virtual-scroller' },
              { text: 'Formula Grid: 1M Cells', link: '/examples/formula-grid' },
              { text: 'Flyweight Grid: 20M Cells', link: '/examples/flyweight-grid' },
            ],
          },
          {
            text: 'Full Applications',
            items: [
              { text: 'Invar — Terminal IDE', link: '/examples/invar' },
            ],
          },
        ],
      },
      {
        text: 'Performance',
        activeMatch: '/guide/(model-layer|performance|benchmarks)',
        items: [
          { text: 'ivue vs the World', link: '/guide/model-layer' },
          { text: 'Performance by Design', link: '/guide/performance' },
          { text: 'Interactive Benchmarks', link: '/guide/benchmarks' },
        ],
      },
      { text: 'Standard', link: '/guide/standard', activeMatch: '/guide/standard' },
      { text: 'Blog', link: '/blog/', activeMatch: '/blog/' },
      { text: 'Releases', link: '/releases/', activeMatch: '/releases/' },
      { text: 'Community', link: '/community', activeMatch: '/community' },
    ],

    sidebar: {
      '/blog/': blogSidebar(),
      '/releases/': releasesSidebar(),
      '/examples/': [
        {
          text: 'Examples',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'StackBlitz Playground', link: '/examples/stackblitz' },
          ],
        },
        {
          text: 'Start Small',
          collapsed: false,
          items: [
            { text: 'Classic Counter Example', link: '/examples/counter' },
            { text: 'Plain getter vs computed()', link: '/examples/derived' },
            { text: '$watch & $stopEffects', link: '/examples/lifecycle' },
            { text: 'Inheritance chain', link: '/examples/inheritance' },
            { text: 'Composable in a class', link: '/examples/pointer' },
          ],
        },
        {
          text: 'Full Complexity',
          collapsed: false,
          items: [
            { text: 'Pinia Store Alternative', link: '/examples/class-store' },
            { text: 'Workspace Platform', link: '/examples/workspace-platform' },
            { text: 'Extensible Kernel', link: '/examples/extensible-kernel' },
            { text: 'Advanced Select Field', link: '/examples/choose-field' },
            { text: 'Advanced Media Uploader', link: '/examples/media-field' },
            { text: 'Virtual Scroller: 1M Items', link: '/examples/virtual-scroller' },
            { text: 'Formula Grid: 1M Cells', link: '/examples/formula-grid' },
            { text: 'Flyweight Grid: 20M Cells', link: '/examples/flyweight-grid' },
          ],
        },
        {
          text: 'Full Applications',
          collapsed: false,
          items: [
            { text: 'Invar — Terminal IDE', link: '/examples/invar' },
          ],
        },
        {
          text: 'Further Reading',
          collapsed: false,
          items: [
            { text: 'Flyweight Pattern', link: '/guide/flyweight' },
            { text: 'Keyed Version Signals', link: '/guide/keyed-version-signals' },
            { text: 'Interactive Benchmarks', link: '/guide/benchmarks' },
            { text: 'API Reference', link: '/api/' },
          ],
        },
      ],
      '/': [
        {
          text: 'Introduction',
          collapsed: false,
          items: [
            { text: 'What is ivue?', link: '/guide/introduction' },
            { text: 'The Engine', link: '/engine' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Design & Philosophy', link: '/guide/design' },
            { text: 'Fundamental Principles', link: '/guide/principles' },
            { text: 'Standard Operating Manual', link: '/guide/standard' },
          ],
        },
        {
          text: 'Core',
          collapsed: false,
          items: [
            { text: 'Reactive State', link: '/guide/state' },
            { text: 'Computed & Watch', link: '/guide/computed-watch' },
            { text: 'Components & Templates', link: '/guide/components' },
            { text: 'Lifecycle & Teardown', link: '/guide/lifecycle-teardown' },
            { text: 'Modules & Imports', link: '/guide/modules' },
            { text: 'Inheritance & super', link: '/guide/inheritance' },
            { text: 'Extensible Components', link: '/guide/extensible-components' },
            { text: 'Development & HMR', link: '/guide/hmr' },
          ],
        },
        {
          text: 'Performance',
          collapsed: false,
          items: [
            { text: 'ivue vs the World', link: '/guide/model-layer' },
            { text: 'Performance by Design', link: '/guide/performance' },
            { text: 'Interactive Benchmarks', link: '/guide/benchmarks' },
          ],
        },
        {
          text: 'Advanced Patterns',
          collapsed: false,
          items: [
            { text: 'Namespace Pattern', link: '/guide/namespace-pattern' },
            { text: 'Computed Seed Pattern', link: '/guide/computed-seed' },
            { text: 'Keyed Version Signals', link: '/guide/keyed-version-signals' },
            { text: 'Flyweight Pattern', link: '/guide/flyweight' },
            { text: 'Static() — Capability Classes', link: '/guide/static' },
            { text: 'Backend ivue', link: '/guide/backend' },
          ],
        },
        {
          text: 'Reference',
          collapsed: false,
          items: [
            { text: 'API Reference', link: '/api/' },
            { text: 'Invariants Behind ivue', link: '/reference/invariants' },
            { text: 'Community', link: '/community' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/infinite-system/ivue' },
    ],

    search: { provider: 'local' },

    outline: { level: [2, 3] },

    editLink: {
      pattern:
        'https://github.com/infinite-system/ivue/edit/main/docs_v2/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'ivue — Infinite Vue ∞',
    },
  },
});
