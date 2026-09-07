import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import pkg from './package.json';
// import libCss from 'vite-plugin-libcss';
import { terser } from 'rollup-plugin-terser';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  plugins: [
    vue(),
    // vite-plugin-dts is a build-only concern (d.ts emission), and merely
    // IMPORTING it pulls @microsoft/api-extractor, whose current releases
    // break under our pinned plugin version on fresh installs. Load it only
    // when actually building the library — never under vitest.
    ...(process.env.VITEST
      ? []
      : [
          (await import('vite-plugin-dts')).default({
            cleanVueFileName: true,
          }),
        ]),
    // libCss(),
  ],
  build: {
    minify: 'esbuild',
    cssCodeSplit: true,
    lib: {
      // scripts/build-lib.mjs builds each entry independently. The shared
      // copier stays inline, and extras needs neither a core chunk nor Vue.
      entry: './lib/index.ts',
      formats: ['es', 'cjs'],
      name: pkg.name,
      fileName: (format, entryName) =>
        format === 'es' ? `${entryName}.es.js` : `${entryName}.cjs`,
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        // Output plugins run AFTER Vite's final esbuild pass. Preserve PURE
        // annotations so consumers can still tree-shake unused exports.
        plugins: [terser({ format: { preserve_annotations: true } })],
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
});
