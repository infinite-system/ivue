import { existsSync, createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';

// The AI chat example reads the docs site's sample pages
// (docs_v2/public/examples/chat/sample) and colours code through shiki,
// which only the docs install carries. In dev the playground serves the
// sample straight from the docs folder and resolves shiki from there;
// a built playground without either falls back gracefully (the example
// says so, and code stays plain).
const docsPublic = fileURLToPath(new URL('../../docs_v2/public', import.meta.url));
const docsShiki = fileURLToPath(new URL('../../docs_v2/node_modules/shiki', import.meta.url));

const serveDocsPublic = (): Plugin => ({
  name: 'serve-docs-public',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = (request.url ?? '').split('?')[0];
      if (!url.startsWith('/examples/chat/')) return next();
      const file = join(docsPublic, url);
      if (!existsSync(file) || !statSync(file).isFile()) return next();
      response.setHeader('content-type', 'application/json');
      createReadStream(file).pipe(response);
    });
  },
});

export default defineConfig({
  plugins: [vue(), serveDocsPublic()],
  resolve: {
    alias: existsSync(docsShiki) ? [{ find: /^shiki$/, replacement: docsShiki }] : [],
  },
  optimizeDeps: {
    // shiki ships as ESM with many lazy language chunks; pre-bundling it
    // stalls the dev server on first use (a 504 while esbuild works),
    // and serving it as-is costs nothing.
    exclude: ['shiki'],
  },
  server: {
    // node_modules live at the repo root (shared install) — allow serving
    // files from there in dev.
    fs: { allow: ['../..'] },
  },
});
