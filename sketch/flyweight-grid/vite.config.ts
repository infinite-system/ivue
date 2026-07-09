/**
 * Standalone vite config — run the sketch without touching the demo app:
 *
 *   npx vite sketch/flyweight-grid --host
 */
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
});
