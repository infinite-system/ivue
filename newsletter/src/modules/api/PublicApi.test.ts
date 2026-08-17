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

describe('PublicApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('subscribe validates the address and enrolls (Turnstile off in tests)', async () => {
    const env = makeTestEnv();
    const bad = await PublicApi.Class.subscribe(
      postJson('/subscribe', { email: 'not-an-email' }),
      env,
    );
    expect(bad.status).toBe(400);
    const good = await PublicApi.Class.subscribe(
      postJson('/subscribe', { email: 'Ada@IVUE.dev', name: 'Ada' }),
      env,
    );
    expect(good.status).toBe(200);
    const active = await Audience.Class.active(env, 'newsletter');
    expect(active[0]).toEqual({ email: 'ada@ivue.dev', name: 'Ada' });
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
