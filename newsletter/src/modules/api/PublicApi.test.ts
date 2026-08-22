import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApi } from './PublicApi';
import { Security } from '../platform/Security';
import { Audience } from '../audience/Audience';
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
});
