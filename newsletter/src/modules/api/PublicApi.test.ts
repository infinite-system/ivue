import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApi } from './PublicApi';
import { Security } from '../platform/Security';
import { Audience } from '../audience/Audience';
import { Comments } from '../comments/Comments';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';

function postJson(path: string, body: object, authorization?: string) {
  return new Request(`https://newsletter.test${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authorization ? { authorization } : {},
  });
}

// a test ExecutionContext that lets us await the waitUntil work
function makeTestContext() {
  const pending: Promise<unknown>[] = [];
  return {
    context: {
      waitUntil: (promise: Promise<unknown>) => {
        pending.push(promise);
      },
      passThroughOnException: () => undefined,
      props: {},
    } as ExecutionContext,
    settle: () => Promise.all(pending),
  };
}

describe('PublicApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('subscribe validates, enrolls, and pings the operator (Turnstile off in tests)', async () => {
    const env = makeTestEnv();
    const postmarkCalls = installFetchStub({});
    const { context, settle } = makeTestContext();
    const bad = await PublicApi.Class.subscribe(
      postJson('/subscribe', { email: 'not-an-email' }),
      env,
      context,
    );
    expect(bad.status).toBe(400);
    const good = await PublicApi.Class.subscribe(
      postJson('/subscribe', {
        email: 'Ada@IVUE.dev',
        name: 'Ada',
        timezone: 'Europe/Berlin',
      }),
      env,
      context,
    );
    expect(good.status).toBe(200);
    const active = await Audience.Class.active(env, 'newsletter');
    expect(active[0]).toEqual({
      email: 'ada@ivue.dev',
      name: 'Ada',
      timezone: 'Europe/Berlin',
    });

    // two sends rode waitUntil: the subscriber's welcome email and the
    // operator's transactional ping
    await settle();
    expect(postmarkCalls.notifications).toHaveLength(2);
    const welcome = postmarkCalls.notifications.find(
      (message) => message.To === 'ada@ivue.dev',
    );
    expect(welcome).toMatchObject({
      Subject: 'Welcome to the ivue newsletter',
      MessageStream: 'newsletter',
    });
    const operatorPing = postmarkCalls.notifications.find(
      (message) => message.To === 'evgeny@ivue.dev',
    );
    expect(operatorPing).toMatchObject({
      Subject: 'New subscriber: ada@ivue.dev',
      MessageStream: 'outbound',
    });
    expect(operatorPing?.TextBody).toContain('Active audience: 1');
  });

  it('a notification failure never breaks the signup', async () => {
    const env = makeTestEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('postmark unreachable');
      }),
    );
    const { context, settle } = makeTestContext();
    const response = await PublicApi.Class.subscribe(
      postJson('/subscribe', { email: 'a@ivue.dev' }),
      env,
      context,
    );
    expect(response.status).toBe(200);
    await settle(); // notifySignup swallows its own failure
    expect(await Audience.Class.active(env, 'newsletter')).toHaveLength(1);
  });

  it('unsubscribe requires a valid HMAC token and suppresses on success', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    const forged = new URL(
      'https://newsletter.test/unsubscribe?email=a@ivue.dev&token=deadbeef',
    );
    expect((await PublicApi.Class.unsubscribe(forged, env)).status).toBe(400);

    const token = await Security.Class.unsubscribeToken('a@ivue.dev', env);
    const genuine = new URL(
      `https://newsletter.test/unsubscribe?email=a@ivue.dev&token=${token}`,
    );
    expect((await PublicApi.Class.unsubscribe(genuine, env)).status).toBe(200);
    expect(await Audience.Class.active(env, 'newsletter')).toHaveLength(0);
  });

  it('broadcast requires the admin bearer and skips already-sent recipients', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    installFetchStub({ posts: [makePost('first-post', 1)] });

    const unauthorized = await PublicApi.Class.broadcast(
      postJson('/broadcast', { slug: 'first-post' }),
      env,
    );
    expect(unauthorized.status).toBe(401);

    const first = await PublicApi.Class.broadcast(
      postJson('/broadcast', { slug: 'first-post' }, 'Bearer test-admin-secret'),
      env,
    );
    expect(await first.json()).toMatchObject({
      recipients: 1,
      skippedAsRepeat: 0,
    });
    const repeat = await PublicApi.Class.broadcast(
      postJson('/broadcast', { slug: 'first-post' }, 'Bearer test-admin-secret'),
      env,
    );
    expect(await repeat.json()).toMatchObject({
      recipients: 0,
      skippedAsRepeat: 1,
    });
  });

  it('postmark webhook syncs suppression both directions under Basic auth', async () => {
    const env = makeTestEnv();
    await Audience.Class.enroll(env, 'a@ivue.dev', 'Ada', 'newsletter');
    const basic = `Basic ${btoa('postmark:test-admin-secret')}`;

    const unauthorized = await PublicApi.Class.postmarkWebhook(
      postJson('/postmark-webhook', {}),
      env,
    );
    expect(unauthorized.status).toBe(401);

    await PublicApi.Class.postmarkWebhook(
      postJson(
        '/postmark-webhook',
        {
          RecordType: 'SubscriptionChange',
          Recipient: 'A@ivue.dev',
          SuppressSending: true,
        },
        basic,
      ),
      env,
    );
    expect(await Audience.Class.active(env, 'newsletter')).toHaveLength(0);

    await PublicApi.Class.postmarkWebhook(
      postJson(
        '/postmark-webhook',
        {
          RecordType: 'SubscriptionChange',
          Recipient: 'a@ivue.dev',
          SuppressSending: false,
        },
        basic,
      ),
      env,
    );
    expect(await Audience.Class.active(env, 'newsletter')).toHaveLength(1);
  });

  it('comment: lands pending, pings the operator, never surfaces before approval', async () => {
    const env = makeTestEnv();
    const postmarkCalls = installFetchStub({});
    const { context, settle } = makeTestContext();

    const bad = await PublicApi.Class.comment(
      postJson('/comment', {
        slug: 'first-post',
        name: 'Ada',
        email: 'not-an-email',
        body: 'hi',
      }),
      env,
      context,
    );
    expect(bad.status).toBe(400);

    const good = await PublicApi.Class.comment(
      postJson('/comment', {
        slug: 'first-post',
        name: 'Ada',
        email: 'ada@ivue.dev',
        body: 'Great post.',
      }),
      env,
      context,
    );
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ ok: true, pending: true });

    // public read: nothing until approved
    const before = await PublicApi.Class.comments(
      new URL('https://newsletter.test/comments?slug=first-post'),
      env,
    );
    expect(await before.json()).toEqual([]);

    // operator ping rode waitUntil
    await settle();
    const ping = postmarkCalls.notifications.find((message) =>
      message.Subject.includes('New comment on first-post'),
    );
    expect(ping?.To).toBe('evgeny@ivue.dev');

    // approve → public, and the payload NEVER carries an email
    const page = await Comments.Class.page(env, {});
    await Comments.Class.approve(env, page.rows[0].id);
    const after = await PublicApi.Class.comments(
      new URL('https://newsletter.test/comments?slug=first-post'),
      env,
    );
    const payload = (await after.json()) as Record<string, unknown>[];
    expect(payload).toHaveLength(1);
    expect(JSON.stringify(payload)).not.toContain('ivue.dev'); // no email anywhere
    expect(payload[0].name).toBe('Ada');
  });

  it('comment: Turnstile fails closed; subscribe flag enrolls through the signup path', async () => {
    const env = makeTestEnv({ TURNSTILE_SECRET: 'secret' });
    installFetchStub({});
    const { context } = makeTestContext();
    const rejected = await PublicApi.Class.comment(
      postJson('/comment', {
        slug: 'first-post',
        name: 'Ada',
        email: 'ada@ivue.dev',
        body: 'hi',
      }),
      env,
      context,
    );
    expect(rejected.status).toBe(403);

    // Turnstile off: the subscribe flag enrolls with the timezone
    const openEnv = makeTestEnv();
    const { context: openContext, settle } = makeTestContext();
    await PublicApi.Class.comment(
      postJson('/comment', {
        slug: 'first-post',
        name: 'Ada',
        email: 'Ada@IVUE.dev',
        body: 'also subscribe me',
        subscribe: true,
        timezone: 'Europe/Berlin',
      }),
      openEnv,
      openContext,
    );
    await settle();
    const active = await Audience.Class.active(openEnv, 'newsletter');
    expect(active[0]).toEqual({
      email: 'ada@ivue.dev',
      name: 'Ada',
      timezone: 'Europe/Berlin',
    });
  });

  // ---- threads: replies, following, unfollowing ----------------------

  async function approvedThread(env: Env, context: ExecutionContext) {
    await PublicApi.Class.comment(
      postJson('/comment', {
        slug: 'first-post',
        name: 'Ada',
        email: 'ada@ivue.dev',
        body: 'The opening comment.',
      }),
      env,
      context,
    );
    const page = await Comments.Class.page(env, {});
    const rootId = page.rows[0].id;
    await Comments.Class.approve(env, rootId);
    return rootId;
  }

  it('comment: a reply carries its thread and lands pending like any other', async () => {
    const env = makeTestEnv();
    installFetchStub({});
    const { context, settle } = makeTestContext();
    const rootId = await approvedThread(env, context);

    const reply = await PublicApi.Class.comment(
      postJson('/comment', {
        slug: 'first-post',
        name: 'Bo',
        email: 'bo@ivue.dev',
        body: 'A reply.',
        parentId: rootId,
      }),
      env,
      context,
    );
    expect(reply.status).toBe(200);
    await settle();

    const pending = (await Comments.Class.page(env, { status: 'pending' }))
      .rows[0];
    expect(pending.parentId).toBe(rootId);
    expect(pending.rootId).toBe(rootId);

    // …and a reply into a locked thread is refused with a reader-facing reason
    await Comments.Class.setLocked(env, rootId, true);
    const refused = await PublicApi.Class.comment(
      postJson('/comment', {
        slug: 'first-post',
        name: 'Cy',
        email: 'cy@ivue.dev',
        body: 'let me in',
        parentId: rootId,
      }),
      env,
      context,
    );
    expect(refused.status).toBe(400);
    expect(await refused.json()).toEqual({
      error: 'Replies are locked on this thread.',
    });
  });

  it('comment-subscription reports following only with a valid thread token', async () => {
    const env = makeTestEnv();
    installFetchStub({});
    const { context } = makeTestContext();
    const rootId = await approvedThread(env, context);
    const token = await Security.Class.threadToken(rootId, 'ada@ivue.dev', env);

    const wrong = await PublicApi.Class.commentSubscription(
      new URL(
        `https://newsletter.test/comment-subscription?thread=${rootId}&email=ada@ivue.dev&token=nope`,
      ),
      env,
    );
    expect(wrong.status).toBe(403);

    const right = await PublicApi.Class.commentSubscription(
      new URL(
        `https://newsletter.test/comment-subscription?thread=${rootId}&email=ada@ivue.dev&token=${token}`,
      ),
      env,
    );
    expect(await right.json()).toEqual({ thread: rootId, following: true });
  });

  it('comment-unsubscribe: GET reports, GET+confirm and POST remove', async () => {
    const env = makeTestEnv();
    installFetchStub({});
    const { context } = makeTestContext();
    const rootId = await approvedThread(env, context);
    const token = await Security.Class.threadToken(rootId, 'ada@ivue.dev', env);
    const query = `thread=${rootId}&email=ada@ivue.dev&token=${token}`;

    // a mail scanner's prefetch must NOT unsubscribe — GET only reports
    const report = await PublicApi.Class.commentUnsubscribe(
      new Request(`https://newsletter.test/comment-unsubscribe?${query}`),
      new URL(`https://newsletter.test/comment-unsubscribe?${query}`),
      env,
    );
    expect(await report.text()).toContain('You follow this comment thread');
    expect(await Comments.Class.subscribed(env, rootId, 'ada@ivue.dev')).toBe(
      true,
    );

    // the site's in-page button
    const removed = await PublicApi.Class.commentUnsubscribe(
      postJson('/comment-unsubscribe', {
        thread: rootId,
        email: 'ada@ivue.dev',
        token,
      }),
      new URL('https://newsletter.test/comment-unsubscribe'),
      env,
    );
    expect(await removed.json()).toEqual({
      ok: true,
      following: false,
      removed: true,
    });
    expect(await Comments.Class.subscribed(env, rootId, 'ada@ivue.dev')).toBe(
      false,
    );

    // and a bad token gets nothing
    const bad = await PublicApi.Class.commentUnsubscribe(
      postJson('/comment-unsubscribe', {
        thread: rootId,
        email: 'ada@ivue.dev',
        token: 'forged',
      }),
      new URL('https://newsletter.test/comment-unsubscribe'),
      env,
    );
    expect(bad.status).toBe(403);
  });
});
