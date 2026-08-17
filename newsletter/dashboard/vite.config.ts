import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// The admin dashboard — an ivue application (Reactive/Static classes from
// this repo's own lib source). Two run modes:
//   dev:   `npx vite newsletter/dashboard` — the proxy below attaches the
//          ADMIN_SECRET from newsletter/.env SERVER-SIDE, so the secret
//          never reaches the browser; no login screen needed locally.
//   prod:  `npx vite build newsletter/dashboard` → dist/ ships as the
//          Worker's static assets; the app shows a login gate and keeps
//          the pasted secret in sessionStorage only.
export default defineConfig(({ mode }) => {
  const secrets = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '');
  return {
    plugins: [vue()],
    resolve: {
      alias: [
        {
          find: 'ivue/extras',
          replacement: fileURLToPath(new URL('../../lib/extras.ts', import.meta.url)),
        },
        {
          find: 'ivue',
          replacement: fileURLToPath(new URL('../../lib/index.ts', import.meta.url)),
        },
      ],
    },
    server: {
      port: 5190,
      proxy: {
        '/admin': {
          // defaults to the LIVE Worker (real data); set DEV_WORKER_ORIGIN
          // in newsletter/.env (e.g. http://localhost:8787) to target a
          // local `wrangler dev` instead
          target:
            secrets.DEV_WORKER_ORIGIN ||
            'https://ivue-newsletter.ekalashnikov.workers.dev',
          changeOrigin: true,
          headers: secrets.ADMIN_SECRET
            ? { authorization: `Bearer ${secrets.ADMIN_SECRET}` }
            : {},
        },
      },
    },
  };
});
