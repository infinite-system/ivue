import { defineConfig } from 'vitepress';

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
  titleTemplate: ':title | Infinite Vue ∞ ivue',
  themeConfig: {
    outline: 'deep',
    siteTitle: 'ivue ∞ Infinite Vue',
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
          {
            text: 'Using Inside Composables',
            link: '/pages/usage#using-inside-composables',
          },
          { text: 'Using Computeds', link: '/pages/usage#using-computeds' },
          { text: 'Using Watch', link: '/pages/usage#using-watch' },
          {
            text: 'Using Lifecycle Hooks',
            link: '/pages/usage#using-lifecycle-hooks',
          },
        ],
      },

      {
        collapsed: false,
        text: 'Guidelines',
        items: [
          {
            text: "Dos and Don'ts",
            link: '/pages/guidelines#dos-and-don-ts',
          },
          {
            text: 'constructor() vs .init()',
            link: '/pages/guidelines#constructor-vs-init',
          },
          {
            text: 'Unwrapping Refs',
            link: '/pages/guidelines#unwrapping-refs',
          },
          {
            text: 'Naming Conventions',
            link: '/pages/guidelines#naming-conventions',
          },
        ],
      },
      {
        collapsed: false,
        text: 'Advanced Usage',
        items: [
          {
            text: 'Extend Props Defaults',
            link: '/pages/advanced-usage#extend-props-defaults',
          },
          { text: 'Extend Props', link: '/pages/advanced-usage#extend-props' },
          { text: 'Extend Emits', link: '/pages/advanced-usage#extend-emits' },
          { text: 'Extend Slots', link: '/pages/advanced-usage#extend-slots' },
          {
            text: 'Extend Classes',
            link: '/pages/advanced-usage#extend-classes',
          },
          {
            text: 'Extend Components',
            link: '/pages/advanced-usage#extend-components',
          },
        ],
      },
      { text: 'API' },
      {
        collapsed: false,
        text: 'Core Functions',
        items: [
          { text: 'ivue()', link: '/pages/api#ivue' },
          { text: 'iref()', link: '/pages/api#iref' },
          { text: 'iuse()', link: '/pages/api#iuse' },
          { text: '.init()', link: '/pages/api#init' },
          { text: '.toRefs()', link: '/pages/api#torefs' },
        ],
      },

      {
        collapsed: false,
        text: 'Utility Functions',
        items: [
          { text: 'propsWithDefaults()', link: '/pages/api#propswithdefaults' },
        ],
      },

      {
        collapsed: false,
        text: 'Utility Types',
        items: [
          {
            text: 'ExtractPropDefaultTypes',
            link: '/pages/api#extractpropdefaulttypes',
          },
          { text: 'ExtractEmitTypes', link: '/pages/api#extractemittypes' },
          { text: 'ExtendSlots', link: '/pages/api#extendslots' },
          { text: 'UseComposable', link: '/pages/api#UseComposable' },
        ],
      },
      
      {
        collapsed: false,
        text: 'Source Code',
        items: [
          { text: 'Browse Code', link: '/pages/browse-code' },
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
