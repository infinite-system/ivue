// httpTransport.ts — the real-backend path. Point ServerApi at any server
// implementing the wire contract (see server-node/server.mjs):
//
//   import { ServerApi } from './ServerApi';
//   import { httpTransport } from './httpTransport';
//   ServerApi.Class.use(httpTransport('https://api.example.com'));
//
// Everything else — components, classes, search, uploads — runs unchanged.

import type { ServerApi } from './ServerApi';

export function httpTransport(baseUrl: string): ServerApi.ServerTransport {
  const base = baseUrl.replace(/\/$/, '');
  return {
    async request(method, path, options = {}) {
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

      let body: BodyInit | undefined;
      const headers: Record<string, string> = {};

      if (options.files?.length) {
        const form = new FormData();
        for (const file of options.files) form.append('files', file, file.name);
        for (const [key, value] of Object.entries(options.payload ?? {})) {
          if (value !== undefined && value !== null) {
            form.append(key, String(value));
          }
        }
        body = form; // browser sets the multipart boundary header
      } else if (options.payload !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.payload);
      }

      const response = await fetch(url, { method, headers, body });
      if (!response.ok) {
        throw new Error(`${method} ${path} → ${response.status}`);
      }
      return await response.json();
    },
  };
}
