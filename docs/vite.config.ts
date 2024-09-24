import path from 'path';
import { defineConfig } from 'vite';
import dynamicImport from 'vite-plugin-dynamic-import';
import tsconfigPaths from 'vite-tsconfig-paths';

import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import vue from '@vitejs/plugin-vue';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // vue({
    //   template: { transformAssetUrls },
    // }),

    // // @quasar/plugin-vite options list:
    // // https://github.com/quasarframework/quasar/blob/dev/vite-plugin/index.d.ts
    // quasar({
      // sassVariables: 'docs/quasar-variables.sass',
    // }),
    tsconfigPaths(),
    dynamicImport(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './docs'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
