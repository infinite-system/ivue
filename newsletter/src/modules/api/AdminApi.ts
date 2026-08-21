import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Security } from '../platform/Security';
import { Posts } from '../content/Posts';
import { Settings } from '../config/Settings';
import { XPoster } from '../socials/XPoster';
import { Tweets } from '../socials/Tweets';
import { Scheduler } from '../schedule/Scheduler';
import type { JobKind } from '../schedule/Scheduler';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
import { Delivery } from '../delivery/Delivery';
import { Drip } from '../delivery/Drip';

// The dashboard's JSON API — every /admin/* route, all behind the same
// timing-safe Bearer ADMIN_SECRET check. The dashboard is a pure client
// of this surface: nothing here exists for the dashboard's convenience
// that an operator couldn't equally drive with curl.
class $AdminApi {
  static async handle(
    request: Request,
    url: URL,
    env: Env,
  ): Promise<Response> {
    if (!(await Security.Class.bearerAuthorized(request, env)))
      return Http.Class.json({ error: 'Unauthorized' }, 401);

    const route = `${request.method} ${url.pathname}`;
    switch (route) {
      case 'GET /admin/subscribers':
        return this.subscribers(url, env);
      case 'GET /admin/subscriber':
        return this.subscriber(url, env);
      case 'POST /admin/subscribers/add':
        return this.add(request, env);
      case 'POST /admin/subscribers/unsubscribe':
        return this.unsubscribe(request, env);
      case 'POST /admin/subscribers/resubscribe':
        return this.resubscribe(request, env);
      case 'POST /admin/subscribers/remove':
        return this.remove(request, env);
      case 'POST /admin/send':
        return this.send(request, env);
      case 'GET /admin/sends':
        return this.sends(url, env);
      case 'GET /admin/posts':
        return this.posts(env);
      case 'GET /admin/preview':
        return this.preview(url, env);
      case 'GET /admin/drip-preview':
        return this.dripPreview(env);
      case 'GET /admin/lists':
        return this.lists(env);
      case 'GET /admin/settings':
        return this.settings(env);
      case 'POST /admin/settings':
        return this.saveSettings(request, env);
      case 'POST /admin/tweet':
        return this.tweet(request, env);
      case 'GET /admin/tweets':
        return this.tweets(env);
      case 'POST /admin/schedule':
        return this.schedule(request, env);
      case 'GET /admin/schedule':
        return this.scheduleList(env);
      case 'POST /admin/schedule/cancel':
        return this.scheduleCancel(request, env);
      case 'GET /admin/stats':
        return this.stats(env);
      default:
        return Http.Class.notFound();
    }
  }

  static async subscribers(url: URL, env: Env): Promise<Response> {
    const page = await Audience.Class.page(env, {
      list: url.searchParams.get('list') ?? '',
      search: url.searchParams.get('search') ?? '',
      limit: Number(url.searchParams.get('limit') ?? 50),
      offset: Number(url.searchParams.get('offset') ?? 0),
    });
    return Http.Class.json(page);
  }

  static async subscriber(url: URL, env: Env): Promise<Response> {
    const address = (url.searchParams.get('email') ?? '').toLowerCase();
    if (!address) return Http.Class.json({ error: 'email required' }, 400);
    const [memberships, history] = await Promise.all([
      Audience.Class.memberships(env, address),
      Ledger.Class.historyFor(env, address),
    ]);
    if (!memberships.length)
      return Http.Class.json({ error: 'No such subscriber' }, 404);
    return Http.Class.json({ email: address, memberships, history });
  }

  static async add(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      email: string;
      name: string;
      list: string;
    }>(request);
    const address = String(body.email ?? '')
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
      return Http.Class.json({ error: 'Invalid email address.' }, 400);
    await Audience.Class.enroll(
      env,
      address,
      String(body.name ?? '')
        .trim()
        .slice(0, 80),
      String(body.list ?? '').trim() || Audience.Class.DEFAULT_LIST,
    );
    return Http.Class.json({ ok: true, email: address });
  }

  static async unsubscribe(request: Request, env: Env): Promise<Response> {
    const addresses = await this.readAddresses(request);
    await Audience.Class.suppressMany(env, addresses);
    return Http.Class.json({ ok: true, affected: addresses.length });
  }

  static async resubscribe(request: Request, env: Env): Promise<Response> {
    const addresses = await this.readAddresses(request);
    await Audience.Class.unsuppressMany(env, addresses);
    return Http.Class.json({ ok: true, affected: addresses.length });
  }

  static async remove(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      emails: string[];
      purgeSends: boolean;
    }>(request);
    const addresses = this.normalizeAddresses(body.emails);
    await Audience.Class.removeMany(env, addresses, Boolean(body.purgeSends));
    return Http.Class.json({ ok: true, affected: addresses.length });
  }

  // Targeted send: one post to explicit recipients. Writes the same
  // ledger as the drip and /broadcast, so a repeat is refused unless
  // `force` explicitly erases the ledger rows first.
  static async send(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      slug: string;
      emails: string[];
      force: boolean;
    }>(request);
    const slug = String(body.slug ?? '');
    const addresses = this.normalizeAddresses(body.emails);
    if (!addresses.length)
      return Http.Class.json({ error: 'emails required' }, 400);
    const catalog = await Posts.Class.load(env);
    const post = Posts.Class.find(catalog, slug);
    if (!post)
      return Http.Class.json({ error: `Unknown post slug: ${slug}` }, 400);

    if (body.force) await Ledger.Class.erase(env, addresses, post.slug);
    const alreadySent = await Ledger.Class.sentSetForSlug(env, post.slug);
    const skipped = addresses.filter((address) => alreadySent.has(address));
    const due = addresses
      .filter((address) => !alreadySent.has(address))
      .map((address) => ({ email: address, name: '' }));

    const report = await Delivery.Class.sendPost(env, post, due);
    return Http.Class.json({
      ok: true,
      slug: post.slug,
      delivered: report.delivered,
      outcomes: report.outcomes,
      skippedAsRepeat: skipped,
    });
  }

  // The global send log — every (recipient, post) delivery ever, newest
  // first; search matches recipient or slug.
  static async sends(url: URL, env: Env): Promise<Response> {
    const page = await Ledger.Class.page(env, {
      search: url.searchParams.get('search') ?? '',
      limit: Number(url.searchParams.get('limit') ?? 50),
      offset: Number(url.searchParams.get('offset') ?? 0),
    });
    return Http.Class.json(page);
  }

  static async posts(env: Env): Promise<Response> {
    const catalog = await Posts.Class.load(env);
    return Http.Class.json(Posts.Class.summaries(catalog));
  }

  // The exact email a subscriber receives, for the dashboard's preview
  // iframe — unsubscribe placeholder neutralized.
  static async preview(url: URL, env: Env): Promise<Response> {
    const slug = url.searchParams.get('slug') ?? '';
    const catalog = await Posts.Class.load(env);
    const post = Posts.Class.find(catalog, slug);
    if (!post)
      return Http.Class.json({ error: `Unknown post slug: ${slug}` }, 404);
    return Http.Class.html(
      post.emailHtml.replaceAll('{{UNSUBSCRIBE_URL}}', '#unsubscribe-preview'),
    );
  }

  static async dripPreview(env: Env): Promise<Response> {
    return Http.Class.json(await Drip.Class.preview(env));
  }

  static async settings(env: Env): Promise<Response> {
    return Http.Class.json({
      cadenceHours: await Settings.Class.cadenceHours(env),
      tweetTemplate: await Settings.Class.tweetTemplate(env),
      xConfigured: XPoster.Class.credentialsPresent(env),
      // read-only identity — configured in wrangler.jsonc, shown so the
      // settings page states the system's whole posture in one place
      sender: {
        senderName: env.SENDER_NAME,
        senderEmail: env.SENDER_EMAIL,
        replyTo: env.REPLY_TO,
        notifyEmail: env.NOTIFY_EMAIL,
        postmarkStream: env.POSTMARK_STREAM,
        defaultList: Audience.Class.DEFAULT_LIST,
      },
    });
  }

  static async saveSettings(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      cadenceHours: number;
      tweetTemplate: string;
    }>(request);
    if (body.cadenceHours !== undefined) {
      const cadenceHours = Number(body.cadenceHours);
      if (!Settings.Class.isValidCadence(cadenceHours))
        return Http.Class.json(
          {
            error: `Cadence must be ${Settings.Class.CADENCE_MINIMUM_HOURS}–${Settings.Class.CADENCE_MAXIMUM_HOURS} hours.`,
          },
          400,
        );
      await Settings.Class.setCadenceHours(env, cadenceHours);
    }
    if (body.tweetTemplate !== undefined) {
      try {
        await Settings.Class.setTweetTemplate(env, String(body.tweetTemplate));
      } catch (error) {
        return Http.Class.json(
          { error: error instanceof Error ? error.message : 'Bad template.' },
          400,
        );
      }
    }
    return this.settings(env);
  }

  // Post to X. 503 until the four X_* secrets exist, so the composer can
  // ship before the developer-portal dance is done.
  static async tweet(request: Request, env: Env): Promise<Response> {
    if (!XPoster.Class.credentialsPresent(env))
      return Http.Class.json(
        {
          error:
            'X credentials not configured — set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET via wrangler secret put.',
        },
        503,
      );
    const body = await Http.Class.readJsonBody<{
      text: string;
      slug: string;
    }>(request);
    const text = String(body.text ?? '').trim();
    if (!text) return Http.Class.json({ error: 'text required' }, 400);
    try {
      const result = await XPoster.Class.postTweet(env, text);
      await Tweets.Class.record(
        env,
        {
          tweetId: result.tweetId,
          text,
          slug: String(body.slug ?? '') || null,
        },
        Http.Class.nowSeconds(),
      );
      return Http.Class.json({
        ok: true,
        tweetId: result.tweetId,
        url: `https://x.com/i/status/${result.tweetId}`,
      });
    } catch (error) {
      return Http.Class.json(
        { error: error instanceof Error ? error.message : 'Tweet failed.' },
        502,
      );
    }
  }

  static async tweets(env: Env): Promise<Response> {
    return Http.Class.json(await Tweets.Class.log(env));
  }

  static async schedule(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{
      kind: JobKind;
      payload: Record<string, string>;
      dueAt: number;
    }>(request);
    try {
      const job = await Scheduler.Class.schedule(
        env,
        body.kind as JobKind,
        (body.payload ?? {}) as never,
        Number(body.dueAt),
      );
      return Http.Class.json({ ok: true, job });
    } catch (error) {
      return Http.Class.json(
        { error: error instanceof Error ? error.message : 'Bad schedule.' },
        400,
      );
    }
  }

  static async scheduleList(env: Env): Promise<Response> {
    return Http.Class.json(await Scheduler.Class.list(env));
  }

  static async scheduleCancel(request: Request, env: Env): Promise<Response> {
    const body = await Http.Class.readJsonBody<{ id: number }>(request);
    const cancelled = await Scheduler.Class.cancel(env, Number(body.id));
    if (!cancelled)
      return Http.Class.json(
        { error: 'Job not found or already executed.' },
        404,
      );
    return Http.Class.json({ ok: true });
  }

  static async lists(env: Env): Promise<Response> {
    return Http.Class.json(await Audience.Class.lists(env));
  }

  static async stats(env: Env): Promise<Response> {
    const [lists, signups, perPost, totalSends] = await Promise.all([
      Audience.Class.lists(env),
      Audience.Class.signupsByDay(env, 60),
      Ledger.Class.statsPerPost(env),
      Ledger.Class.totalSends(env),
    ]);
    return Http.Class.json({ lists, signups, perPost, totalSends });
  }

  static async readAddresses(request: Request): Promise<string[]> {
    const body = await Http.Class.readJsonBody<{ emails: string[] }>(request);
    return this.normalizeAddresses(body.emails);
  }

  static normalizeAddresses(emails: unknown): string[] {
    if (!Array.isArray(emails)) return [];
    return [
      ...new Set(
        emails
          .map((email) => String(email).trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }
}

export namespace AdminApi {
  export const $Class = Static($AdminApi);
  export let Class = $Class;
}
