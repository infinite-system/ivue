import { Static } from 'ivue/extras';
import { Http } from '../platform/Http';
import { Security } from '../platform/Security';
import { Posts } from '../content/Posts';
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
    return Http.Class.json({
      cadenceHours: Number(env.CADENCE_HOURS),
      entries: await Drip.Class.preview(env),
    });
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
