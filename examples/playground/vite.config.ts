import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    // node_modules live at the repo root (shared install) — allow serving
    // files from there in dev.
    fs: { allow: ['../..'] },
  },
});
