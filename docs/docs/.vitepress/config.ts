import { defineConfig } from 'vitepress';

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
  titleTemplate: ':title | Infinite Vue ∞ ivue',
  themeConfig: {
    siteTitle: 'Infinite Vue ∞ ivue',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/infinite-system/ivue' },
      { icon: 'twitter', link: 'https://x.com/evgenykalash' },
    ],
    search: {
      provider: 'local',
    },
    sidebar: [
      {
        collapsed: false,
        text: 'Guide',
        items: [
          { text: 'What is ivue?', link: '/pages/introduction' },
          { text: 'How it works?', link: '/pages/how-it-works' },
          { text: 'Getting Started', link: '/pages/getting-started' },
        ],
      },
      {
        collapsed: false,
        text: 'Usage',
        items: [
          { text: 'Basic Usage', link: '/pages/usage#basic-usage' },
          { text: 'Using Props', link: '/pages/usage#using-props' },
          { text: 'Using Emits', link: '/pages/usage#using-emits' },
          { text: 'Using Refs', link: '/pages/usage#using-refs' },
          {
            text: 'Using Define Expose',
            link: '/pages/usage#using-define-expose',
          },
          { text: 'Using Composables', link: '/pages/usage#using-composables' },
          { text: 'Using Inside Composables', link: '/pages/usage#using-inside-composables' },
          { text: 'Using Computeds', link: '/pages/usage#using-computeds' },
          { text: 'Using Watch', link: '/pages/usage#using-watch' },
          { text: 'Using Lifecycle Hooks', link: '/pages/usage#using-lifecycle-hooks' },
        ],
      },
      {
        collapsed: false,
        text: 'Advanced Usage',
        items: [
          { text: 'Extend Props Defaults', link: '/pages/advanced-usage' },
          { text: 'Extend Props', link: '/pages/advanced-usage' },
          { text: 'Extend Emits', link: '/pages/advanced-usage' },
          { text: 'Extend Slots', link: '/pages/advanced-usage' },
          { text: 'Extend Classes', link: '/pages/advanced-usage' },
          { text: 'Extend Components', link: '/pages/advanced-usage' },
        ],
      },
      {
        collapsed: false,
        text: 'Recommendations',
        items: [
          { text: "Dos and Don'ts", link: '/pages/recommendations#dos-and-donts' },
          { text: "constructor() vs init()", link: '/pages/recommendations#dos-and-donts' },
          { text: "Casting Types", link: '/pages/recommendations#dos-and-donts' },
          { text: "Naming Convetions", link: '/pages/recommendations#dos-and-donts' },
        ],
      },

      {
        collapsed: false,
        text: 'Core Functions',
        items: [
          { text: 'ivue()', link: '/api/init' },
          { text: '.init()', link: '/api/init' },
          { text: '.toRefs()', link: '/api/init' },
        ],
      },

      {
        collapsed: false,
        text: 'Utility Functions',
        items: [{ text: 'propsWithDefaults', link: '/api/propsWithDefaults' }],
      },

      {
        text: 'Utility Types',
        items: [
          {
            text: 'ExtractPropDefaultTypes',
            link: '/types/ExtractPropDefaultTypes',
          },
          { text: 'ExtractEmitTypes', link: '/types/ExtractEmitTypes' },
          { text: 'ExtendSlots', link: '/types/ExtendSlots' },
          { text: 'UnwrapComposable', link: '/types/UnwrapComposable' },
        ],
      },
    ],
  },
  base: '/ivue/',
  vite: {
    // To make vue-dd work, see https://github.com/vuetifyjs/vuetify/discussions/15735
    ssr: {
      noExternal: ['vue-dd'],
    },
  },
});
