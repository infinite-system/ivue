import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";


export default defineConfig({
  root: "./",
  // keep the same name as your github repos
  mode: "production",
  plugins: [vue()],
  build: {
    outDir: "./dist-demo",
  },
});
