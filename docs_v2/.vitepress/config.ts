import { defineConfig } from 'vitepress';

export default defineConfig({
  vite: {
    resolve: {
      // The home hero imports the real engine from ../lib/Reactive.ts.
      // One Vue copy for both the docs and the lib, or tracking breaks.
      dedupe: ['vue'],
    },
    server: {
      fs: { allow: ['../..'] },
    },
  },

  title: 'ivue',
  titleTemplate: ':title — Infinite Vue',
  description:
    'Class-based reactivity for Vue 3. Plain classes, full reactivity, one kilobyte.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'ivue — class-based reactivity for Vue 3' }],
    ['meta', { property: 'og:description', content: 'Plain classes. Full reactivity. One kilobyte.' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
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
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'ivue' },
    siteTitle: 'ivue',

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      {
        text: 'v2',
        items: [
          { text: 'The Standard (cheatsheet)', link: '/guide/standard' },
            { text: 'Performance', link: '/guide/performance' },
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
            { text: 'Design & Philosophy', link: '/guide/design' },
            { text: 'Principles', link: '/guide/principles' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Core',
          collapsed: false,
          items: [
            { text: 'Reactive State', link: '/guide/state' },
            { text: 'Computed & Watch', link: '/guide/computed-watch' },
            { text: 'Components & Templates', link: '/guide/components' },
            { text: 'Inheritance & super', link: '/guide/inheritance' },
            { text: 'Modules & Imports', link: '/guide/modules' },
            { text: 'Teardown', link: '/guide/teardown' },
          ],
        },
        {
          text: 'Going Deeper',
          collapsed: false,
          items: [
            { text: 'The Standard (cheatsheet)', link: '/guide/standard' },
            { text: 'Performance', link: '/guide/performance' },
          ],
        },
        {
          text: 'Reference',
          collapsed: false,
          items: [
            { text: 'API', link: '/api/' },
            { text: 'Invariants', link: '/reference/invariants' },
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
