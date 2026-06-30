import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'ivue',
  titleTemplate: ':title — Infinite Vue',
  description:
    'Reactive classes for Vue 3. Plain instances, fine-grained reactivity, zero per-instance proxy.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    [
      'meta',
      { property: 'og:title', content: 'ivue — class-based reactivity for Vue 3' },
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
          { text: 'Why v2', link: '/guide/introduction#ivue-v1-vs-v2' },
          { text: 'Migrate from v1', link: '/guide/migration' },
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
            { text: 'Inheritance & super', link: '/guide/inheritance' },
            { text: 'Modules & Imports', link: '/guide/modules' },
            { text: 'Teardown', link: '/guide/teardown' },
          ],
        },
        {
          text: 'Going Deeper',
          collapsed: false,
          items: [
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Migrating from v1', link: '/guide/migration' },
          ],
        },
        {
          text: 'Reference',
          collapsed: false,
          items: [{ text: 'API', link: '/api/' }],
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
