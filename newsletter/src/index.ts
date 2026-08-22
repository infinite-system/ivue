// ivue newsletter Worker — entry point. Routing only; every behavior
// lives on a namespace-pattern class under src/modules/ (the invar
// conventions — see ../CONVENTIONS.md).
//
// The whole design is one invariant: at most one email per (subscriber,
// post), ever. The D1 `sends` table IS the invariant; the daily cron,
// /broadcast, and the dashboard's targeted send are three writers of the
// same ledger, so none can repeat what another already delivered.
//
//   POST /subscribe        {name, email, turnstileToken} — site form → D1
//   GET  /unsubscribe      ?email=&token=      — HMAC-signed one-click out
//   POST /broadcast        {slug}   (Bearer ADMIN_SECRET) — send a post NOW
//   POST /drip             (Bearer ADMIN_SECRET) — run a drip pass on demand
//   POST /postmark-webhook (Basic auth)         — Postmark suppression sync
//   *    /admin/*          (Bearer ADMIN_SECRET) — the dashboard's JSON API
//   cron daily                                  — each due subscriber gets
//                                                 their oldest unsent post
//
// Everything else is served from the dashboard's static assets (the
// `assets` block in wrangler.jsonc) — the admin dashboard app itself.

import { Http } from './modules/platform/Http';
import { PublicApi } from './modules/api/PublicApi';
import { AdminApi } from './modules/api/AdminApi';
import { Drip } from './modules/delivery/Drip';
import { Scheduler } from './modules/schedule/Scheduler';

export default {
  async fetch(request, env, context): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS')
      return Http.Class.withCors(new Response(null, { status: 204 }), env, request);
    try {
      if (url.pathname === '/subscribe' && request.method === 'POST')
        return Http.Class.withCors(
          await PublicApi.Class.subscribe(request, env, context),
          env,
          request,
        );
      if (url.pathname === '/unsubscribe' && request.method === 'GET')
        return PublicApi.Class.unsubscribe(url, env);
      if (url.pathname === '/broadcast' && request.method === 'POST')
        return PublicApi.Class.broadcast(request, env);
      if (url.pathname === '/drip' && request.method === 'POST')
        return PublicApi.Class.drip(request, env);
      if (url.pathname === '/postmark-webhook' && request.method === 'POST')
        return PublicApi.Class.postmarkWebhook(request, env);
      if (url.pathname.startsWith('/admin/'))
        return AdminApi.Class.handle(request, url, env);
      return Http.Class.notFound();
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'unhandled_error',
          path: url.pathname,
          error: String(error),
        }),
      );
      return Http.Class.withCors(
        Http.Class.json(
          { error: 'Something went wrong — try again in a minute.' },
          500,
        ),
        env,
        request,
      );
    }
  },

  // Two crons: the HOURLY drip tick (each subscriber is eligible only
  // in the hour matching their local send-hour setting — see Drip), and
  // a 5-minute tick that executes due scheduled jobs (broadcasts, X
  // posts). The drip tick drains the queue too.
  async scheduled(event, env, context): Promise<void> {
    if (event.cron === '0 * * * *') context.waitUntil(Drip.Class.run(env));
    context.waitUntil(Scheduler.Class.runDue(env));
  },
} satisfies ExportedHandler<Env>;
