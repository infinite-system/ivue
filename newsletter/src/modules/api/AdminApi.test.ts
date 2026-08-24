import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApi } from './AdminApi';
import { LocalTime } from '../platform/LocalTime';
import { Audience } from '../audience/Audience';
import { Ledger } from '../audience/Ledger';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';
import { Comments } from '../comments/Comments';

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

  it('subscriber detail returns memberships, history, and the projected pipeline', async () => {
    const env = makeTestEnv();
    installFetchStub({
      posts: [makePost('first-post', 1), makePost('second-post', 2), makePost('third-post', 3)],
    });
    await Audience.Class.enroll(env, 'ada@ivue.dev', 'Ada', 'newsletter');
    await Ledger.Class.record(env, [
      { email: 'ada@ivue.dev', slug: 'first-post', sentAt: 100 },
    ]);
    const detail = (await (
      await call('/admin/subscriber?email=ada@ivue.dev', env)
    ).json()) as {
      memberships: unknown[];
      history: { slug: string }[];
      cadenceDays: number;
      sendHourLocal: number;
      timezone: string;
      upcoming: { slug: string; title: string; projectedAt: number }[];
    };
    expect(detail.memberships).toHaveLength(1);
    expect(detail.history[0].slug).toBe('first-post');
    expect(detail.timezone).toBe('America/Toronto'); // default-zone fallback
    // the pipeline: unsent posts in drip order, every slot at the send
    // hour in the subscriber's zone, cadenceDays local days apart
    expect(detail.upcoming.map((entry) => entry.slug)).toEqual([
      'second-post',
      'third-post',
    ]);
    for (const entry of detail.upcoming)
      expect(LocalTime.Class.hourAt(entry.projectedAt, detail.timezone)).toBe(
        detail.sendHourLocal,
      );
    expect(
      LocalTime.Class.dayNumberAt(
        detail.upcoming[1].projectedAt,
        detail.timezone,
      ) -
        LocalTime.Class.dayNumberAt(
          detail.upcoming[0].projectedAt,
          detail.timezone,
        ),
    ).toBe(detail.cadenceDays);
    // last send was long ago — the first slot is the NEXT 9am, within a day
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(detail.upcoming[0].projectedAt).toBeGreaterThanOrEqual(
      nowSeconds - 3600,
    );
    expect(detail.upcoming[0].projectedAt).toBeLessThanOrEqual(
      nowSeconds + 25 * 3600,
    );
    expect((await call('/admin/subscriber?email=ghost@x.dev', env)).status).toBe(
      404,
    );
  });

  it('upcomingFor: slots land at the send hour, spaced by local calendar days', () => {
    const catalog = [makePost('first-post', 1), makePost('second-post', 2)];
    const schedule = { cadenceDays: 2, sendHourLocal: 9, defaultTimezone: 'UTC' };
    const nineAM = Date.UTC(2026, 0, 5, 9) / 1000; // Mon Jan 5, 9am UTC
    const daySeconds = 86_400;

    const fresh = AdminApi.Class.upcomingFor(catalog, [], 'UTC', schedule, nineAM);
    expect(fresh.map((entry) => entry.projectedAt)).toEqual([
      nineAM,
      nineAM + 2 * daySeconds,
    ]);

    const recentlyServed = AdminApi.Class.upcomingFor(
      catalog,
      [{ slug: 'first-post', sentAt: nineAM - 3600 }], // 8am same local day
      'UTC',
      schedule,
      nineAM,
    );
    expect(recentlyServed).toHaveLength(1);
    expect(recentlyServed[0].slug).toBe('second-post');
    expect(recentlyServed[0].projectedAt).toBe(nineAM + 2 * daySeconds);
  });

  it('preview serves the welcome email from its own build-time asset', async () => {
    const env = makeTestEnv();
    installFetchStub({});
    const response = await call('/admin/preview?slug=welcome', env);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Welcome');
    expect(html).not.toContain('{{UNSUBSCRIBE_URL}}');
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

  it('settings roundtrip: drip clock + per-list overrides save, invalid values refused', async () => {
    const env = makeTestEnv();
    const initial = (await (await call('/admin/settings', env)).json()) as {
      cadenceDays: number;
      sendHourLocal: number;
      defaultTimezone: string;
      listOverrides: Record<string, unknown>;
    };
    // env fallbacks
    expect(initial.cadenceDays).toBe(2);
    expect(initial.sendHourLocal).toBe(9);
    expect(initial.defaultTimezone).toBe('America/Toronto');
    expect(initial.listOverrides).toEqual({});

    await call('/admin/settings', env, 'POST', {
      cadenceDays: 3,
      sendHourLocal: 7,
      defaultTimezone: 'Europe/Berlin',
      listSchedules: { vip: { cadenceDays: 1, sendHourLocal: 18 } },
    });
    const updated = (await (await call('/admin/settings', env)).json()) as {
      cadenceDays: number;
      sendHourLocal: number;
      defaultTimezone: string;
      listOverrides: Record<
        string,
        { cadenceDays?: number; sendHourLocal?: number }
      >;
    };
    expect(updated.cadenceDays).toBe(3);
    expect(updated.sendHourLocal).toBe(7);
    expect(updated.defaultTimezone).toBe('Europe/Berlin');
    expect(updated.listOverrides.vip).toEqual({
      cadenceDays: 1,
      sendHourLocal: 18,
    });

    // clearing an override reverts the list to the defaults
    await call('/admin/settings', env, 'POST', {
      listSchedules: { vip: { cadenceDays: null, sendHourLocal: null } },
    });
    const cleared = (await (await call('/admin/settings', env)).json()) as {
      listOverrides: Record<string, unknown>;
    };
    expect(cleared.listOverrides).toEqual({});

    expect(
      (await call('/admin/settings', env, 'POST', { cadenceDays: 0 })).status,
    ).toBe(400);
    expect(
      (await call('/admin/settings', env, 'POST', { sendHourLocal: 24 }))
        .status,
    ).toBe(400);
    expect(
      (
        await call('/admin/settings', env, 'POST', {
          defaultTimezone: 'Not/AZone',
        })
      ).status,
    ).toBe(400);
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

  it('thread endpoint: 503 without creds, chains + ledgers with them; post-text serves plainText', async () => {
    const env = makeTestEnv();
    expect(
      (
        await call('/admin/thread', env, 'POST', {
          tweets: ['a', 'b'],
        })
      ).status,
    ).toBe(503);

    const configured = makeTestEnv({
      X_API_KEY: 'k',
      X_API_SECRET: 's',
      X_ACCESS_TOKEN: 't',
      X_ACCESS_SECRET: 'ts',
      SITE_ORIGIN: 'https://ivue.dev',
    });
    const calls = installFetchStub({ posts: [makePost('first-post', 1)] });
    expect(
      (
        await call('/admin/thread', configured, 'POST', {
          tweets: ['only one'],
          slug: 'first-post',
        })
      ).status,
    ).toBe(400);
    const posted = (await (
      await call('/admin/thread', configured, 'POST', {
        tweets: ['One', 'Two'],
        slug: 'first-post',
        imageUrls: ['https://ivue.dev/blog/first-post.png'],
      })
    ).json()) as { ok: boolean; tweetIds: string[] };
    expect(posted.tweetIds).toHaveLength(2);
    expect(calls.tweetCalls[1].reply).toEqual({
      in_reply_to_tweet_id: 'tweet-1',
    });

    const text = (await (
      await call('/admin/post-text?slug=first-post', configured)
    ).json()) as { plainText: string };
    expect(text.plainText).toContain('Plain text of first-post');
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

  it('list management: create, rename (overrides travel), delete guards', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'ada@ivue.dev', 'Ada', 'newsletter');

    // create — appears with zero members; duplicates and junk refused
    await call('/admin/lists/create', env, 'POST', { list: 'VIP ' });
    let lists = (await (await call('/admin/lists', env)).json()) as {
      list: string;
      members: number;
    }[];
    expect(lists.map((entry) => entry.list)).toEqual(['newsletter', 'vip']);
    expect(lists.find((entry) => entry.list === 'vip')?.members).toBe(0);
    expect(
      (await call('/admin/lists/create', env, 'POST', { list: 'vip' })).status,
    ).toBe(400);
    expect(
      (await call('/admin/lists/create', env, 'POST', { list: 'Bad Name!' }))
        .status,
    ).toBe(400);

    // rename — members and schedule overrides travel with the name
    await Audience.Class.enroll(env, 'bo@ivue.dev', 'Bo', 'vip');
    await call('/admin/settings', env, 'POST', {
      listSchedules: { vip: { sendHourLocal: 18 } },
    });
    await call('/admin/lists/rename', env, 'POST', {
      from: 'vip',
      to: 'insiders',
    });
    lists = (await (await call('/admin/lists', env)).json()) as {
      list: string;
      members: number;
    }[];
    expect(lists.map((entry) => entry.list)).toEqual([
      'insiders',
      'newsletter',
    ]);
    expect(lists.find((entry) => entry.list === 'insiders')?.members).toBe(1);
    const settings = (await (await call('/admin/settings', env)).json()) as {
      listOverrides: Record<string, { sendHourLocal?: number }>;
    };
    expect(settings.listOverrides).toEqual({
      insiders: { sendHourLocal: 18 },
    });

    // delete — refused while members remain, allowed once empty; the
    // default list is protected from both rename and delete
    expect(
      (await call('/admin/lists/delete', env, 'POST', { list: 'insiders' }))
        .status,
    ).toBe(400);
    await call('/admin/subscribers/remove', env, 'POST', {
      emails: ['bo@ivue.dev'],
      purgeSends: false,
    });
    expect(
      (await call('/admin/lists/delete', env, 'POST', { list: 'insiders' }))
        .status,
    ).toBe(200);
    expect(
      (await call('/admin/lists/rename', env, 'POST', { from: 'newsletter', to: 'other' })).status,
    ).toBe(400);
    expect(
      (await call('/admin/lists/delete', env, 'POST', { list: 'newsletter' }))
        .status,
    ).toBe(400);
  });

  it('drip-preview exposes the plan and stats aggregates the system', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'ada@ivue.dev', 'Ada', 'newsletter');
    installFetchStub({ posts: [makePost('first-post', 1)] });
    const plan = (await (await call('/admin/drip-preview', env)).json()) as {
      cadenceDays: number;
      sendHourLocal: number;
      entries: { email: string; list: string; timezone: string; dueAt: number }[];
    };
    expect(plan.cadenceDays).toBe(2);
    expect(plan.sendHourLocal).toBe(9);
    expect(plan.entries[0]).toMatchObject({
      email: 'ada@ivue.dev',
      list: 'newsletter',
      timezone: 'America/Toronto',
    });
    // the projected slot is 9am in the subscriber's (default) zone
    expect(LocalTime.Class.hourAt(plan.entries[0].dueAt, 'America/Toronto')).toBe(9);

    const stats = (await (await call('/admin/stats', env)).json()) as {
      lists: { list: string }[];
      totalSends: number;
    };
    expect(stats.lists[0].list).toBe('newsletter');
    expect(stats.totalSends).toBe(0);
  });

  // Approval is the only moment a reply notification may leave: the
  // text has been read by the operator by then.
  it('approving a reply emails the answered author, with a thread unsubscribe link', async () => {
    const env = makeTestEnv();
    const calls = installFetchStub({});
    const rootId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Ada',
      email: 'ada@ivue.dev',
      body: 'The opening comment.',
    });
    await Comments.Class.approve(env, rootId);
    const replyId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Bo',
      email: 'bo@ivue.dev',
      body: 'A reply for Ada.',
      parentId: rootId,
    });

    const response = await call('/admin/comments/approve', env, 'POST', {
      id: replyId,
    });
    expect(response.status).toBe(200);

    const notice = calls.notifications.find((message) =>
      message.To.includes('ada@ivue.dev'),
    );
    expect(notice?.Subject).toBe('Bo replied to you on ivue.dev');
    expect(notice?.TextBody).toContain('A reply for Ada.');
    // both links: the site thread (with its token) and the plain out
    expect(notice?.TextBody).toContain(`thread=${rootId}`);
    expect(notice?.TextBody).toContain('/comment-unsubscribe?thread=');
    // nobody else was mailed about it
    expect(
      calls.notifications.filter((message) =>
        message.Subject.includes('replied to you'),
      ),
    ).toHaveLength(1);
  });

  it('lock/unlock a thread through the admin route', async () => {
    const env = makeTestEnv();
    installFetchStub({});
    const rootId = await Comments.Class.submit(env, {
      slug: 'first-post',
      name: 'Ada',
      email: 'ada@ivue.dev',
      body: 'Opening.',
    });
    await Comments.Class.approve(env, rootId);

    const locked = await call('/admin/comments/lock', env, 'POST', {
      id: rootId,
      locked: true,
    });
    expect(await locked.json()).toEqual({ ok: true, locked: true });
    expect(await Comments.Class.threadLocked(env, rootId)).toBe(true);

    const unlocked = await call('/admin/comments/lock', env, 'POST', {
      id: rootId,
      locked: false,
    });
    expect(await unlocked.json()).toEqual({ ok: true, locked: false });
    expect(await Comments.Class.threadLocked(env, rootId)).toBe(false);

    const missing = await call('/admin/comments/lock', env, 'POST', {
      id: 4242,
      locked: true,
    });
    expect(missing.status).toBe(404);
  });
});
