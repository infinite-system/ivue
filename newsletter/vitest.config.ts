import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'ivue/extras': fileURLToPath(new URL('../lib/extras.ts', import.meta.url)),
    },
  },
  // vitest's bundled vite predates node:sqlite — keep it external so Node
  // resolves the builtin itself
  ssr: {
    external: ['node:sqlite'],
  },
  test: {
    include: ['src/modules/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    server: {
      deps: {
        external: [/node:sqlite/],
      },
    },
  },
});
