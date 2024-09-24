import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from "vite-plugin-dts";
import pkg from "./package.json";
import libCss from 'vite-plugin-libcss';
import { terser } from 'rollup-plugin-terser';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  plugins: [
    vue(),
    dts({
      cleanVueFileName: true,
    }),
    libCss()
  ],
  build: {
    cssCodeSplit: true,
    lib: {
      entry: "./lib/index.ts",
      formats: ["es", "umd"],
      // the name expose in umd mode
      name: pkg.name,
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["vue"],
      plugins:[
        terser()
      ],
      output: {
        globals: {
          vue: "Vue"
        },
      },
    },
  },
})
