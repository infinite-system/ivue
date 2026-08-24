import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { LocalTime } from '../platform/LocalTime';
import { Security } from '../platform/Security';
import { Turnstile } from '../platform/Turnstile';
import { Audience } from '../audience/Audience';
import { Comments } from '../comments/Comments';
import { Delivery } from '../delivery/Delivery';
import { Drip } from '../delivery/Drip';

// The Worker's public and operator endpoints — the surface that existed
// before the dashboard: site subscribe form, one-click unsubscribe,
// Postmark suppression sync, and the Bearer-authorized /broadcast +
// /drip operator calls.
class $PublicApi {
  static get EMAIL_PATTERN() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  static async subscribe(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      name: string;
      email: string;
      list: string;
      timezone: string;
      turnstileToken: string;
    }>(request);
    const address = String(body.email ?? '')
      .trim()
      .toLowerCase();
    if (!this.EMAIL_PATTERN.test(address))
      return Http.Class.json(
        { error: 'That email address does not look right.' },
        400,
      );

    // Bot gate — enforced as soon as TURNSTILE_SECRET is set; the form
    // sends the widget token as turnstileToken. Fails closed.
    if (env.TURNSTILE_SECRET) {
      const human = await Turnstile.Class.verify(
        body.turnstileToken,
        request.headers.get('CF-Connecting-IP'),
        env,
      );
      if (!human)
        return Http.Class.json(
          { error: 'Verification failed — try again.' },
          403,
        );
    }

    const name = String(body.name ?? '')
      .trim()
      .slice(0, 80);
    const list = String(body.list ?? '').trim() || Audience.Class.DEFAULT_LIST;
    // browser-reported IANA zone; invalid/absent stores NULL and the
    // drip falls back to the default_timezone setting
    const timezone = LocalTime.Class.normalizeTimezone(body.timezone) || null;
    await Audience.Class.enroll(env, address, name, list, timezone);
    // welcome email + operator ping ride waitUntil — the subscriber's
    // response never waits on them, and their failures never surface
    context.waitUntil(
      Delivery.Class.sendWelcome(env, { email: address, name }),
    );
    context.waitUntil(
      Delivery.Class.notifySignup(env, { email: address, name }, list),
    );
    return Http.Class.json({ ok: true });
  }

  // A blog comment: Turnstile-gated exactly like /subscribe, stored
  // PENDING — nothing shows publicly until the operator approves. The
  // optional `subscribe` flag enrolls the commenter through the same
  // path as the signup form (one Turnstile token covers the one
  // request; the Worker fans out server-side).
  static async comment(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      slug: string;
      name: string;
      email: string;
      body: string;
      parentId: number;
      subscribeReplies: boolean;
      subscribe: boolean;
      timezone: string;
      turnstileToken: string;
    }>(request);

    if (env.TURNSTILE_SECRET) {
      const human = await Turnstile.Class.verify(
        body.turnstileToken,
        request.headers.get('CF-Connecting-IP'),
        env,
      );
      if (!human)
        return Http.Class.json(
          { error: 'Verification failed — try again.' },
          403,
        );
    }

    try {
      await Comments.Class.submit(env, {
        slug: String(body.slug ?? ''),
        name: String(body.name ?? ''),
        email: String(body.email ?? ''),
        body: String(body.body ?? ''),
        parentId: Number(body.parentId ?? 0) || null,
        // replies-to-me is opt-OUT (the form pre-checks it); the
        // newsletter is a separate, opt-IN box
        subscribeReplies: body.subscribeReplies !== false,
      });
    } catch (error) {
      return Http.Class.json(
        {
          error:
            error instanceof Error ? error.message : 'Could not submit.',
        },
        400,
      );
    }

    const commenter = {
      slug: String(body.slug ?? '').trim(),
      name: String(body.name ?? '').trim(),
      email: String(body.email ?? '')
        .trim()
        .toLowerCase(),
      body: String(body.body ?? '').trim(),
    };
    context.waitUntil(Delivery.Class.notifyComment(env, commenter));

    if (body.subscribe === true) {
      const timezone =
        LocalTime.Class.normalizeTimezone(body.timezone) || null;
      await Audience.Class.enroll(
        env,
        commenter.email,
        commenter.name,
        Audience.Class.DEFAULT_LIST,
        timezone,
      );
      context.waitUntil(
        Delivery.Class.sendWelcome(env, {
          email: commenter.email,
          name: commenter.name,
        }),
      );
      context.waitUntil(
        Delivery.Class.notifySignup(
          env,
          { email: commenter.email, name: commenter.name },
          Audience.Class.DEFAULT_LIST,
        ),
      );
    }

    return Http.Class.json({ ok: true, pending: true });
  }

  // Approved comments for one post — id, name, body, time. The email
  // column is structurally absent from the query (see Comments).
  static async comments(url: URL, env: Env): Promise<Response> {
    const slug = (url.searchParams.get('slug') ?? '').trim();
    if (!slug) return Http.Class.json({ error: 'slug required' }, 400);
    return Http.Class.json(await Comments.Class.approvedFor(env, slug));
  }

  // Does this (thread, address) pair still follow replies? Called by the
  // site when a reader arrives from a notification email, so the page can
  // say "you're following this thread" and offer one click to stop. The
  // token is what authorizes the answer — there are no accounts.
  static async commentSubscription(url: URL, env: Env): Promise<Response> {
    const rootId = Number(url.searchParams.get('thread') ?? 0);
    const address = (url.searchParams.get('email') ?? '').trim().toLowerCase();
    const token = url.searchParams.get('token') ?? '';
    if (!rootId || !address)
      return Http.Class.json({ error: 'thread and email required' }, 400);
    const expected = await Security.Class.threadToken(rootId, address, env);
    if (!(await Security.Class.timingSafeEqualStrings(token, expected)))
      return Http.Class.json({ error: 'Invalid link.' }, 403);
    return Http.Class.json({
      thread: rootId,
      following: await Comments.Class.subscribed(env, rootId, address),
    });
  }

  // Stop following one thread. GET renders a page (the plain-text link
  // in every notification email, works with no JS); POST is the site's
  // in-page button. Both require the thread token.
  static async commentUnsubscribe(
    request: Request,
    url: URL,
    env: Env,
  ): Promise<Response> {
    const fromBody =
      request.method === 'POST'
        ? await Http.Class.readJsonBody<{
            thread: number;
            email: string;
            token: string;
          }>(request)
        : ({} as { thread?: number; email?: string; token?: string });
    const rootId = Number(fromBody.thread ?? url.searchParams.get('thread') ?? 0);
    const address = String(fromBody.email ?? url.searchParams.get('email') ?? '')
      .trim()
      .toLowerCase();
    const token = String(fromBody.token ?? url.searchParams.get('token') ?? '');
    const expected =
      rootId && address
        ? await Security.Class.threadToken(rootId, address, env)
        : '';
    const authorized =
      Boolean(rootId) &&
      Boolean(address) &&
      (await Security.Class.timingSafeEqualStrings(token, expected));

    if (!authorized) {
      return request.method === 'POST'
        ? Http.Class.json({ error: 'Invalid link.' }, 403)
        : new Response('Invalid link.', { status: 400 });
    }

    // A GET without confirm=1 only REPORTS — mail scanners prefetch
    // links, and a prefetch must never silently unfollow a thread.
    if (request.method === 'GET' && url.searchParams.get('confirm') !== '1') {
      const following = await Comments.Class.subscribed(env, rootId, address);
      const confirmUrl =
        `${env.WORKER_ORIGIN}/comment-unsubscribe?thread=${rootId}` +
        `&email=${encodeURIComponent(address)}&token=${token}&confirm=1`;
      return Http.Class.html(
        `<!doctype html><meta charset="utf-8"><title>Comment replies</title>
         <body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#1c2432">
         ${
           following
             ? `<h1 style="font-size:1.4rem">You follow this comment thread.</h1>
                <p>We email you when someone replies to you there.</p>
                <p><a href="${confirmUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Stop following this thread</a></p>`
             : `<h1 style="font-size:1.4rem">You already stopped following this thread.</h1>
                <p>No more reply emails from it.</p>`
         }
         <p style="color:#5b6478;font-size:.9rem">This only affects that one
         thread. Your newsletter subscription, if you have one, is separate.</p>`,
      );
    }

    const removed = await Comments.Class.unsubscribe(env, rootId, address);
    if (request.method === 'POST')
      return Http.Class.json({ ok: true, following: false, removed });
    return Http.Class.html(
      `<!doctype html><meta charset="utf-8"><title>Stopped following</title>
       <body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#1c2432">
       <h1 style="font-size:1.4rem">Done — you stopped following that thread.</h1>
       <p>No more reply emails from it. Your newsletter subscription, if you
       have one, is untouched.</p>
       <p><a href="${env.SITE_ORIGIN}">Back to ivue.dev</a></p>`,
    );
  }

  static async unsubscribe(url: URL, env: Env): Promise<Response> {
    const address = (url.searchParams.get('email') ?? '').toLowerCase();
    const token = url.searchParams.get('token') ?? '';
    const expected = address
      ? await Security.Class.unsubscribeToken(address, env)
      : '';
    if (
      !address ||
      !(await Security.Class.timingSafeEqualStrings(token, expected))
    )
      return new Response('Invalid unsubscribe link.', { status: 400 });

    await Audience.Class.suppress(env, address);

    return Http.Class.html(
      `<!doctype html><meta charset="utf-8"><title>Unsubscribed</title>
       <body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#1c2432">
       <h1 style="font-size:1.4rem">You're unsubscribed.</h1>
       <p>No more emails from the ivue newsletter. Changed your mind?
       Sign up again any time at <a href="${env.SITE_ORIGIN}">ivue.dev</a>.</p>`,
    );
  }

  static async broadcast(request: Request, env: Env): Promise<Response> {
    if (!(await Security.Class.bearerAuthorized(request, env)))
      return Http.Class.json({ error: 'Unauthorized' }, 401);

    const body = await Http.Class.readJsonBody<{ slug: string; list: string }>(
      request,
    );
    try {
      const report = await Delivery.Class.broadcastPost(
        env,
        String(body.slug ?? ''),
        String(body.list ?? '').trim() || Audience.Class.DEFAULT_LIST,
      );
      return Http.Class.json({
        ok: true,
        slug: report.slug,
        recipients: report.delivered,
        skippedAsRepeat: report.skippedAsRepeat,
      });
    } catch (error) {
      return Http.Class.json(
        { error: error instanceof Error ? error.message : 'Broadcast failed.' },
        400,
      );
    }
  }

  // The cron's exact pass, runnable on demand — same auth as /broadcast.
  static async drip(request: Request, env: Env): Promise<Response> {
    if (!(await Security.Class.bearerAuthorized(request, env)))
      return Http.Class.json({ error: 'Unauthorized' }, 401);
    const delivered = await Drip.Class.run(env);
    return Http.Class.json({ ok: true, delivered });
  }

  // Postmark SubscriptionChange webhook: any suppression on their side
  // (their footer link, hard bounce, spam complaint) lands in OUR
  // unsubscribes table, and a reactivation clears it — D1 stays the
  // single source of truth. Configure in Postmark: newsletter stream →
  // Webhooks → Subscription change, with Basic auth postmark/ADMIN_SECRET.
  static async postmarkWebhook(request: Request, env: Env): Promise<Response> {
    if (!(await Security.Class.basicAuthorized(request, env)))
      return Http.Class.json({ error: 'Unauthorized' }, 401);

    const event = await Http.Class.readJsonBody<{
      RecordType: string;
      Recipient: string;
      SuppressSending: boolean;
      SuppressionReason: string;
    }>(request);
    if (event.RecordType !== 'SubscriptionChange' || !event.Recipient)
      return Http.Class.json({ ok: true, ignored: true });

    const address = event.Recipient.toLowerCase();
    if (event.SuppressSending) await Audience.Class.suppress(env, address);
    else await Audience.Class.unsuppress(env, address);
    console.error(
      JSON.stringify({
        event: 'postmark_suppression_sync',
        recipient: address,
        suppressed: Boolean(event.SuppressSending),
        reason: event.SuppressionReason ?? null,
      }),
    );
    return Http.Class.json({ ok: true });
  }
}

export namespace PublicApi {
  export const $Class = Static($PublicApi);
  export let Class = $Class;
}
