// import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from "./package.json";
import dts from "vite-plugin-dts";
import { resolve } from 'node:path';

import { terser } from 'rollup-plugin-terser';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      cleanVueFileName: true,
    }),
  ],
  build: {
    minify: 'terser',
    lib: {
      entry: "./src/index.ts",
      formats: ["es", "umd"],
      // the name expose in umd mode
      name: pkg.name,
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      plugins: [terser({
        format: {
          comments: false,
        },

        mangle: {
          keep_classnames: false,
          reserved: [],
        },

      })],
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue"
        },
      },
    },
  },
  server: {
    port: 5010
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  }
})
