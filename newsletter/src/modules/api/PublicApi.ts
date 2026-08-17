import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Security } from '../platform/Security';
import { Turnstile } from '../platform/Turnstile';
import { Posts } from '../content/Posts';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
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

  static async subscribe(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      name: string;
      email: string;
      list: string;
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

    await Audience.Class.enroll(
      env,
      address,
      String(body.name ?? '')
        .trim()
        .slice(0, 80),
      String(body.list ?? '').trim() || Audience.Class.DEFAULT_LIST,
    );
    return Http.Class.json({ ok: true });
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
    const slug = String(body.slug ?? '');
    const posts = await Posts.Class.load(env);
    const post = Posts.Class.find(posts, slug);
    if (!post)
      return Http.Class.json({ error: `Unknown post slug: ${slug}` }, 400);

    const recipients = await Audience.Class.active(
      env,
      String(body.list ?? '').trim() || Audience.Class.DEFAULT_LIST,
    );
    const alreadySent = await Ledger.Class.sentSetForSlug(env, post.slug);
    const due = recipients.filter(
      (recipient) => !alreadySent.has(recipient.email),
    );

    const report = await Delivery.Class.sendPost(env, post, due);
    return Http.Class.json({
      ok: true,
      slug: post.slug,
      recipients: report.delivered,
      skippedAsRepeat: recipients.length - due.length,
    });
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
