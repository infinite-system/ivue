import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ivueHmr from "../lib/hmr-plugin";

export default defineConfig({
  root: "./",
  // keep the same name as your github repos
  mode: "production",
  resolve: {
    alias: {
      // the injected `import { ivueHotUpdate } from 'ivue'` resolves to the
      // local engine — same specifier a real app would use
      ivue: fileURLToPath(new URL("../lib/index.ts", import.meta.url)),
    },
  },
  plugins: [
    vue(),
    // class HMR boundaries; IVUE_FAST=1 gives production-speed instances
    ivueHmr({ fast: !!process.env.IVUE_FAST }),
  ],
  build: {
    outDir: "./dist-demo",
  },
});
