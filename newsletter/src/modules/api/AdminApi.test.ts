import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApi } from './AdminApi';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';

const BEARER = 'Bearer test-admin-secret';

function adminRequest(path: string, method = 'GET', body?: object) {
  const url = new URL(`https://newsletter.test${path}`);
  const request = new Request(url, {
    method,
    headers: { authorization: BEARER },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { request, url };
}

async function call(path: string, env: Env, method = 'GET', body?: object) {
  const { request, url } = adminRequest(path, method, body);
  return AdminApi.Class.handle(request, url, env);
}

describe('AdminApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a wrong or missing bearer on every route', async () => {
    const env = makeTestEnv();
    const url = new URL('https://newsletter.test/admin/subscribers');
    const anonymous = await AdminApi.Class.handle(new Request(url), url, env);
    expect(anonymous.status).toBe(401);
  });

  it('subscribers pages, searches, and carries aggregates', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'ada@ivue.dev', 'Ada', 'newsletter');
    await Audience.Class.enroll(env, 'bo@ivue.dev', 'Bo', 'newsletter');
    const page = (await (
      await call('/admin/subscribers?search=ada&limit=10', env)
    ).json()) as { total: number; rows: { email: string }[] };
    expect(page.total).toBe(1);
    expect(page.rows[0].email).toBe('ada@ivue.dev');
  });

  it('subscriber detail returns memberships plus full send history', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'ada@ivue.dev', 'Ada', 'newsletter');
    await Ledger.Class.record(env, [
      { email: 'ada@ivue.dev', slug: 'first-post', sentAt: 100 },
    ]);
    const detail = (await (
      await call('/admin/subscriber?email=ada@ivue.dev', env)
    ).json()) as { memberships: unknown[]; history: { slug: string }[] };
    expect(detail.memberships).toHaveLength(1);
    expect(detail.history[0].slug).toBe('first-post');
    expect((await call('/admin/subscriber?email=ghost@x.dev', env)).status).toBe(
      404,
    );
  });

  it('add, bulk unsubscribe/resubscribe, and remove round-trip', async () => {
    const env = makeTestEnv();
    await call('/admin/subscribers/add', env, 'POST', {
      email: 'ada@ivue.dev',
      name: 'Ada',
      list: 'vip',
    });
    expect(await Audience.Class.active(env, 'vip')).toHaveLength(1);

    await call('/admin/subscribers/unsubscribe', env, 'POST', {
      emails: ['ada@ivue.dev'],
    });
    expect(await Audience.Class.active(env, 'vip')).toHaveLength(0);
    await call('/admin/subscribers/resubscribe', env, 'POST', {
      emails: ['ada@ivue.dev'],
    });
    expect(await Audience.Class.active(env, 'vip')).toHaveLength(1);

    await call('/admin/subscribers/remove', env, 'POST', {
      emails: ['ada@ivue.dev'],
      purgeSends: true,
    });
    expect(await Audience.Class.memberships(env, 'ada@ivue.dev')).toHaveLength(
      0,
    );
  });

  it('targeted send honors the ledger and force erases it explicitly', async () => {
    const env = makeTestEnv();
    installFetchStub({ posts: [makePost('first-post', 1)] });
    await Ledger.Class.record(env, [
      { email: 'ada@ivue.dev', slug: 'first-post', sentAt: 100 },
    ]);

    const refused = (await (
      await call('/admin/send', env, 'POST', {
        slug: 'first-post',
        emails: ['ada@ivue.dev'],
      })
    ).json()) as { delivered: number; skippedAsRepeat: string[] };
    expect(refused.delivered).toBe(0);
    expect(refused.skippedAsRepeat).toEqual(['ada@ivue.dev']);

    const forced = (await (
      await call('/admin/send', env, 'POST', {
        slug: 'first-post',
        emails: ['ada@ivue.dev'],
        force: true,
      })
    ).json()) as { delivered: number };
    expect(forced.delivered).toBe(1);
  });

  it('sends exposes the paged send log with search', async () => {
    const env = makeTestEnv();
    await Ledger.Class.record(env, [
      { email: 'ada@ivue.dev', slug: 'first-post', sentAt: 100 },
      { email: 'bo@ivue.dev', slug: 'first-post', sentAt: 200 },
    ]);
    const log = (await (
      await call('/admin/sends?search=ada&limit=10', env)
    ).json()) as { total: number; rows: { email: string; sentAt: number }[] };
    expect(log.total).toBe(1);
    expect(log.rows[0]).toMatchObject({ email: 'ada@ivue.dev', sentAt: 100 });
  });

  it('posts strips email bodies; preview serves the exact email html', async () => {
    const env = makeTestEnv();
    installFetchStub({ posts: [makePost('first-post', 1)] });
    const summaries = (await (await call('/admin/posts', env)).json()) as {
      slug: string;
      emailHtml?: string;
    }[];
    expect(summaries[0].slug).toBe('first-post');
    expect(summaries[0].emailHtml).toBeUndefined();

    const preview = await call('/admin/preview?slug=first-post', env);
    const markup = await preview.text();
    expect(markup).toContain('first-post');
    expect(markup).not.toContain('{{UNSUBSCRIBE_URL}}');
  });

  it('settings roundtrip: cadence saves, invalid values are refused', async () => {
    const env = makeTestEnv();
    const initial = (await (await call('/admin/settings', env)).json()) as {
      cadenceHours: number;
    };
    expect(initial.cadenceHours).toBe(40); // env fallback

    await call('/admin/settings', env, 'POST', { cadenceHours: 24 });
    const updated = (await (await call('/admin/settings', env)).json()) as {
      cadenceHours: number;
    };
    expect(updated.cadenceHours).toBe(24);

    const refused = await call('/admin/settings', env, 'POST', {
      cadenceHours: 0,
    });
    expect(refused.status).toBe(400);

    // the drip preview reads the stored cadence, not the env var
    installFetchStub({ posts: [makePost('first-post', 1)] });
    const plan = (await (await call('/admin/drip-preview', env)).json()) as {
      cadenceHours: number;
    };
    expect(plan.cadenceHours).toBe(24);
  });

  it('tweet endpoint: 503 without credentials, posts + ledgers with them', async () => {
    const env = makeTestEnv();
    const refused = await call('/admin/tweet', env, 'POST', {
      text: 'Hello',
    });
    expect(refused.status).toBe(503);

    const configured = makeTestEnv({
      X_API_KEY: 'k',
      X_API_SECRET: 's',
      X_ACCESS_TOKEN: 't',
      X_ACCESS_SECRET: 'ts',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ data: { id: '42' } })),
      ),
    );
    const posted = (await (
      await call('/admin/tweet', configured, 'POST', {
        text: 'New on the ivue blog',
        slug: 'first-post',
      })
    ).json()) as { ok: boolean; tweetId: string; url: string };
    expect(posted).toMatchObject({
      ok: true,
      tweetId: '42',
      url: 'https://x.com/i/status/42',
    });
    const log = (await (await call('/admin/tweets', configured)).json()) as {
      tweetId: string;
      slug: string;
    }[];
    expect(log[0]).toMatchObject({ tweetId: '42', slug: 'first-post' });
  });

  it('settings carries the tweet template and X status; template saves', async () => {
    const env = makeTestEnv();
    const initial = (await (await call('/admin/settings', env)).json()) as {
      tweetTemplate: string;
      xConfigured: boolean;
      sender: { senderEmail: string };
    };
    expect(initial.tweetTemplate).toContain('{title}');
    expect(initial.xConfigured).toBe(false);
    expect(initial.sender.senderEmail).toBe('newsletter@ivue.dev');

    await call('/admin/settings', env, 'POST', {
      tweetTemplate: 'Read this: {title} {url}',
    });
    const updated = (await (await call('/admin/settings', env)).json()) as {
      tweetTemplate: string;
    };
    expect(updated.tweetTemplate).toBe('Read this: {title} {url}');
    expect(
      (await call('/admin/settings', env, 'POST', { tweetTemplate: '  ' }))
        .status,
    ).toBe(400);
  });

  it('schedule endpoints: enqueue, list, cancel; invalid input refused', async () => {
    const env = makeTestEnv();
    const dueAt = Math.floor(Date.now() / 1000) + 3600;
    const created = (await (
      await call('/admin/schedule', env, 'POST', {
        kind: 'tweet',
        payload: { text: 'Hello', slug: '' },
        dueAt,
      })
    ).json()) as { ok: boolean; job: { id: number; dueAt: number } };
    expect(created.ok).toBe(true);
    expect(created.job.dueAt).toBe(dueAt);

    const listed = (await (await call('/admin/schedule', env)).json()) as {
      upcoming: { id: number }[];
    };
    expect(listed.upcoming).toHaveLength(1);

    const cancelled = await call('/admin/schedule/cancel', env, 'POST', {
      id: created.job.id,
    });
    expect(cancelled.status).toBe(200);
    expect(
      (await call('/admin/schedule/cancel', env, 'POST', { id: created.job.id }))
        .status,
    ).toBe(404);

    const refused = await call('/admin/schedule', env, 'POST', {
      kind: 'tweet',
      payload: { text: '' },
      dueAt,
    });
    expect(refused.status).toBe(400);
  });

  it('drip-preview exposes the plan and stats aggregates the system', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'ada@ivue.dev', 'Ada', 'newsletter');
    installFetchStub({ posts: [makePost('first-post', 1)] });
    const plan = (await (await call('/admin/drip-preview', env)).json()) as {
      cadenceHours: number;
      entries: { email: string; sendNow: boolean }[];
    };
    expect(plan.cadenceHours).toBe(40);
    expect(plan.entries[0]).toMatchObject({
      email: 'ada@ivue.dev',
      sendNow: true,
    });

    const stats = (await (await call('/admin/stats', env)).json()) as {
      lists: { list: string }[];
      totalSends: number;
    };
    expect(stats.lists[0].list).toBe('newsletter');
    expect(stats.totalSends).toBe(0);
  });
});
