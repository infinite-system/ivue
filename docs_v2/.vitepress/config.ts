import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

export default defineConfig({
  vite: {
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

  base: '/ivue/', // served at https://infinite-system.github.io/ivue/

  title: 'ivue',
  titleTemplate: ':title — Infinite Vue',
  description:
    'Class-based reactivity for Vue 3. Plain classes, full reactivity, one kilobyte.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/ivue/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    [
      'meta',
      {
        property: 'og:title',
        content: 'ivue — class-based reactivity for Vue 3',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Plain classes. Full reactivity. One kilobyte.',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://infinite-system.github.io/ivue/og-image.png',
      },
    ],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    [
      'meta',
      {
        name: 'twitter:image',
        content: 'https://infinite-system.github.io/ivue/og-image.png',
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

  markdown: {
    lineNumbers: true,
    theme: { light: 'github-light', dark: 'one-dark-pro' },
    config(md) {
      // GFM task lists: render `- [ ]` / `- [x]` as checkboxes (tickable in
      // the browser, not persisted) — used by the standard.md self-review
      // checklist. Rendered CHECKED regardless of source state: the skill
      // source keeps `[ ]` (the AI runs the checklist), while the docs read
      // as "the standard satisfies all of these".
      // Raw-HTML anchors in markdown (homepage sections) are NOT base-prefixed
      // by VitePress the way markdown links are — rewrite them here so they
      // work in dev and under the /ivue/ base in production. href ONLY:
      // src attributes are asset URLs that VitePress resolves (public dir +
      // base) itself — prefixing them breaks that resolution.
      md.core.ruler.push('base-prefix-raw-html', (state) => {
        const base = '/ivue/';
        const rewrite = (html: string) =>
          html.replace(/(href)="\/(?!ivue\/|\/)/g, `$1="${base}`);
        for (const token of state.tokens) {
          if (token.type === 'html_block') token.content = rewrite(token.content);
          if (token.type !== 'inline' || !token.children) continue;
          for (const child of token.children) {
            if (child.type === 'html_inline') child.content = rewrite(child.content);
          }
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
          checkbox.content = '<input type="checkbox" class="task-checkbox" checked> ';
          token.children.unshift(checkbox);
          tokens[i - 2].attrJoin('class', 'task-item');
        }
      });
    },
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'ivue' },
    siteTitle: 'ivue',

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/(?!standard|benchmarks)' },
      { text: 'Getting Started', link: '/guide/getting-started' },
      { text: 'Standard', link: '/guide/standard', activeMatch: '/guide/standard' },
      { text: 'Benchmarks', link: '/guide/benchmarks', activeMatch: '/guide/benchmarks' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: 'Blog', link: '/blog/', activeMatch: '/blog/' },
      {
        text: 'v2',
        items: [
          { text: 'Standard Operating Manual', link: '/guide/standard' },
          {
            text: 'Engine Under the Idiom',
            link: '/guide/engine-under-the-idiom',
          },
          { text: 'ivue vs the World', link: '/guide/model-layer' },
          { text: 'Performance by Design', link: '/guide/performance' },
          { text: 'Interactive Benchmarks', link: '/guide/benchmarks' },
        ],
      },
    ],

    sidebar: {
      '/': [
        {
          text: 'Introduction',
          collapsed: false,
          items: [
            { text: 'What is ivue?', link: '/guide/introduction' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Design & Philosophy', link: '/guide/design' },
            { text: 'Principles', link: '/guide/principles' },
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
            { text: 'Inheritance & super', link: '/guide/inheritance' },
            { text: 'Modules & Imports', link: '/guide/modules' },
            { text: 'Extensible Components', link: '/guide/extensible-components' },
            { text: 'HMR: Hot Reload for Classes', link: '/guide/hmr' },
          ],
        },
        {
          text: 'Going Deeper',
          collapsed: false,
          items: [
            { text: 'Standard Operating Manual', link: '/guide/standard' },
            {
              text: 'Engine Under the Idiom',
              link: '/guide/engine-under-the-idiom',
            },
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
          text: 'Basic Examples',
          collapsed: false,
          items: [
            { text: 'Overview & Playground', link: '/examples/' },
            { text: 'Classic Counter Example', link: '/examples/counter' },
            { text: 'Plain getter vs computed()', link: '/examples/derived' },
            { text: '$watch & $stopEffects', link: '/examples/lifecycle' },
            { text: 'Inheritance chain', link: '/examples/inheritance' },
            { text: 'Composable in a class', link: '/examples/pointer' },
          ],
        },
        {
          text: 'Advanced Examples',
          collapsed: false,
          items: [
            { text: 'Store Pattern', link: '/examples/store-pattern' },
            {
              text: 'Advanced Select Field',
              link: '/examples/choose-field',
            },
            {
              text: 'Advanced Media Uploader',
              link: '/examples/media-field',
            },
            {
              text: 'Virtual Scroller: 1M Items',
              link: '/examples/virtual-scroller',
            },
            {
              text: 'Formula Grid: 1M Cells',
              link: '/examples/formula-grid',
            },
            {
              text: 'Flyweight Grid: 20M Cells',
              link: '/examples/flyweight-grid',
            },
          ],
        },
        {
          text: 'Advanced Patterns',
          collapsed: false,
          items: [
            { text: 'Flyweight Pattern', link: '/guide/flyweight' },
          ],
        },
        {
          text: 'Reference',
          collapsed: false,
          items: [
            { text: 'Invariant-Based Design', link: '/reference/invariants' },
            { text: 'API', link: '/api/' },
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
