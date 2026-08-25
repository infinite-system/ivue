// ivue newsletter Worker — the Cloudflare entry ADAPTER. All behavior
// (routing, the cron dispatch, and the one-email-per-(subscriber, post)
// invariant it serves) lives on the Worker class:
// src/modules/platform/Worker.ts. The platform's contract requires an
// `export default { fetch, scheduled }` object here — the standard-gate
// skip row for this file records that exception.
import { Worker } from './modules/platform/Worker';

export default {
  fetch: (request, env, context) => Worker.Class.fetch(request, env, context),
  scheduled: (event, env, context) => Worker.Class.scheduled(event, env, context),
} satisfies ExportedHandler<Env>;
