import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
  themeConfig: {
    siteTitle: 'ivue ∞ Infinite Vue',
    search: {
      provider: 'local'
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
          { text: 'Basic Usage', link: '/pages/usage' },
          { text: 'Using Props', link: '/pages/usage' },
          { text: 'Using Emits', link: '/pages/usage' },
          { text: 'Using Refs', link: '/pages/usage' },
          { text: 'Using Define Expose', link: '/pages/usage' },
          { text: 'Using Composables', link: '/pages/usage' },
        ],
      },
      {
        collapsed: false,
        text: 'Advanced Usage',
        items: [
          { text: 'Using Class Inheritance', link: '/pages/usage' },
          { text: 'Extensible Props', link: '/pages/usage' },
          { text: 'Extensible Emits', link: '/pages/usage' },
          { text: 'Extensible Slots', link: '/pages/usage' },
        ],
      },

      {
        collapsed: false,
        text: 'Core Functions',
        items: [
          { text: 'ivue', link: '/api/init' },
          { text: '.init()', link: '/api/init' },
          { text: '.toRefs()', link: '/api/init' },
        ],
      },

      {
        collapsed: false,
        text: 'Utility Functions',
        items: [
          { text: 'propsWithDefaults', link: '/api/propsWithDefaults' },
        ],
      },
      
      {
        text: 'Utility Types',
        items: [
          { text: 'UnwrapComposable', link: '/types/UnwrapComposable' },
          { text: 'ExtractEmitTypes', link: '/types/ExtractEmitTypes' },
          { text: 'ExtractPropDefaultTypes', link: '/types/ExtractPropDefaultTypes' },
          { text: 'ExtendSlots', link: '/types/ExtendSlots' },
        ],
      },
    ]
  },
  base: '/ivue/',
  vite: { // To make vue-dd work, see https://github.com/vuetifyjs/vuetify/discussions/15735
    ssr: {
      noExternal: ["vue-dd"]
    }
  }
})
