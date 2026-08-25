import { Static } from 'ivue/extras';
import { Http } from './Http';
import { PublicApi } from '../api/PublicApi';
import { AdminApi } from '../api/AdminApi';
import { Drip } from '../delivery/Drip';
import { Scheduler } from '../schedule/Scheduler';

// The Worker's behavior: routing and the cron dispatch. src/index.ts is
// the Cloudflare entry ADAPTER — it only re-exposes these two statics in
// the `export default { fetch, scheduled }` shape the platform requires.
//
// The whole design is one invariant: at most one email per (subscriber,
// post), ever. The D1 `sends` table IS the invariant; the daily cron,
// /broadcast, and the dashboard's targeted send are three writers of the
// same ledger, so none can repeat what another already delivered.
//
//   POST /subscribe        {name, email, turnstileToken} — site form → D1
//   POST /comment          {slug, name, email, body, parentId?} — pending
//   GET  /comments         ?slug= — approved comments (never emails)
//   GET  /comment-subscription ?thread=&email=&token= — do I follow it?
//   *    /comment-unsubscribe  ?thread=&email=&token= — stop following one
//                                thread (GET renders, POST is the site's)
//   GET  /unsubscribe      ?email=&token=      — HMAC-signed one-click out
//   POST /broadcast        {slug}   (Bearer ADMIN_SECRET) — send a post NOW
//   POST /drip             (Bearer ADMIN_SECRET) — run a drip pass on demand
//   POST /postmark-webhook (Basic auth)         — Postmark suppression sync
//   *    /admin/*          (Bearer ADMIN_SECRET) — the dashboard's JSON API
//   cron hourly / 5-minute                       — drip tick / due jobs
//
// Everything else is served from the dashboard's static assets (the
// `assets` block in wrangler.jsonc) — the admin dashboard app itself.
class $Worker {
  static async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response> {
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
      if (url.pathname === '/comment' && request.method === 'POST')
        return Http.Class.withCors(
          await PublicApi.Class.comment(request, env, context),
          env,
          request,
        );
      if (url.pathname === '/comments' && request.method === 'GET')
        return Http.Class.withCors(
          await PublicApi.Class.comments(url, env),
          env,
          request,
        );
      if (url.pathname === '/comment-subscription' && request.method === 'GET')
        return Http.Class.withCors(
          await PublicApi.Class.commentSubscription(url, env),
          env,
          request,
        );
      if (url.pathname === '/comment-unsubscribe' && request.method === 'POST')
        return Http.Class.withCors(
          await PublicApi.Class.commentUnsubscribe(request, url, env),
          env,
          request,
        );
      if (url.pathname === '/comment-unsubscribe' && request.method === 'GET')
        return PublicApi.Class.commentUnsubscribe(request, url, env);
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
  }

  // Two crons: the HOURLY drip tick (each subscriber is eligible only
  // in the hour matching their local send-hour setting — see Drip), and
  // a 5-minute tick that executes due scheduled jobs (broadcasts, X
  // posts). The drip tick drains the queue too.
  static async scheduled(
    event: ScheduledController,
    env: Env,
    context: ExecutionContext,
  ): Promise<void> {
    if (event.cron === '0 * * * *') context.waitUntil(Drip.Class.run(env));
    context.waitUntil(Scheduler.Class.runDue(env));
  }
}

export namespace Worker {
  export const $Class = Static($Worker);
  export let Class = $Class;
}
