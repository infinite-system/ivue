import { defineConfig } from 'vitepress';

import {
  defaultHoverInfoProcessor,
  transformerTwoslash,
} from '@shikijs/vitepress-twoslash';

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
  appearance: 'dark',
  titleTemplate: ':title | Infinite Vue ∞ ivue',
  markdown: {
    theme: {
      light: 'one-light',
      dark: 'dracula-soft',
    },
    codeTransformers: [
      transformerTwoslash({
        twoslashOptions: {
          vfsRoot: '../',
          compilerOptions: {
            baseUrl: './',
            paths: {
              "@/*": ["../*"]
            }
          }
        },
        errorRendering: 'hover',
        processHoverInfo(info) {
          return (
            defaultHoverInfoProcessor(info)
              // Remove shiki_core namespace
              .replace(/_shikijs_core\w*\./g, '')
          );
        },
      }),
    ],
    linkify: false,
    toc: {
      level: [2, 3, 4],
    },
  },
  themeConfig: {
    logo: '/ivue-logo.png',
    outline: 'deep',
    siteTitle: '1.5.7',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/infinite-system/ivue' },
      { icon: 'twitter', link: 'https://x.com/evgenykalash' },
    ],
    search: {
      provider: 'local',
    },
    nav: [
      {
        text: 'Docs',
        activeMatch: `/`,
        link: '/',
      },
      {
        text: 'API',
        activeMatch: `^/api/`,
        link: '/api/',
      },
      {
        text: 'Playground',
        link: 'https://play.vuejs.org',
      },
      {
        text: 'About',
        activeMatch: `^/about/`,
        items: [
          { text: 'FAQ', link: '/about/faq' },
          { text: 'Team', link: '/about/team' },
          { text: 'Releases', link: '/about/releases' },
          {
            text: 'Community Guide',
            link: '/about/community-guide',
          },
          { text: 'Code of Conduct', link: '/about/coc' },
          { text: 'Privacy Policy', link: '/about/privacy' },
          {
            text: 'The Documentary',
            link: 'https://www.youtube.com/watch?v=OrxmtDw4pVI',
          },
        ],
      },
    ],
    sidebar: [
      {
        collapsed: false,
        text: 'Introduction',
        items: [
          { text: 'What is ivue?', link: '/pages/introduction' },
          { text: 'How it works?', link: '/pages/how-it-works' },
          { text: 'Getting Started', link: '/pages/getting-started' },
        ],
      },

      {
        collapsed: false,
        text: 'Guide',
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
          {
            text: 'Playground',
            link: '/pages/playground',
          },
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
          {
            text: 'Using Pinia Store',
            link: '/pages/usage#using-pinia-store',
          },
          {
            text: 'Using Quasar Framework',
            link: '/pages/usage#using-quasar-framework',
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
          {
            text: 'Convert Legacy Classes to Reactive Classes with ivue',
            link: '/pages/advanced-usage#legacy-to-reactive',
          },
        ],
      },
      {
        collapsed: false,
        text: 'Core Functions',
        items: [
          { text: 'ivue()', link: '/pages/api#ivue' },
          { text: 'iref()', link: '/pages/api#iref' },
          { text: 'ishallowRef()', link: '/pages/api#ishallowref' },
          { text: 'iuse()', link: '/pages/api#iuse' },
        ],
      },
      {
        collapsed: false,
        text: 'Core Methods',
        items: [
          { text: 'constructor()', link: '/pages/api#constructor' },
          { text: '.init()', link: '/pages/api#init' },
          { text: '.toRefs()', link: '/pages/api#torefs' },
        ],
      },

      {
        collapsed: false,
        text: 'Core Types',
        items: [
          {
            text: 'IVue',
            link: '/pages/api#IVue',
          },
          { text: 'Use', link: '/pages/api#Use' },
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
        ],
      },
      {
        collapsed: false,
        text: 'Source Code',
        items: [{ text: 'Browse Code', link: '/pages/browse-code' }],
      },
    ],
  },
  base: '/ivue/',
  vite: {
    configFile: './vite.config.ts', // This is IMPORTANT, otherwise @/* paths do not get resolved!
    // To make vue-dd work, see https://github.com/vuetifyjs/vuetify/discussions/15735
    ssr: {
      noExternal: ['vue-dd'],
    },
  },
});
