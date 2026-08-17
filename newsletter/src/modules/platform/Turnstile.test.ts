import { afterEach, describe, expect, it, vi } from 'vitest';
import { Turnstile } from './Turnstile';
import { makeTestEnv } from '../../../test/TestDatabase';

function stubSiteverify(result: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(result))),
  );
}

describe('Turnstile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a missing, empty, or oversized token without calling out', async () => {
    const env = makeTestEnv();
    expect(await Turnstile.Class.verify(undefined, null, env)).toBe(false);
    expect(await Turnstile.Class.verify('', null, env)).toBe(false);
    expect(await Turnstile.Class.verify('x'.repeat(3000), null, env)).toBe(
      false,
    );
  });

  it('rejects when no hostnames are configured', async () => {
    const env = makeTestEnv({ TURNSTILE_HOSTNAMES: '' });
    expect(await Turnstile.Class.verify('token', null, env)).toBe(false);
  });

  it('accepts a successful verdict for the right action and hostname', async () => {
    stubSiteverify({ success: true, action: 'newsletter', hostname: 'ivue.dev' });
    expect(await Turnstile.Class.verify('token', '1.2.3.4', makeTestEnv())).toBe(
      true,
    );
  });

  it('rejects a success with the wrong action or hostname', async () => {
    stubSiteverify({ success: true, action: 'login', hostname: 'ivue.dev' });
    expect(await Turnstile.Class.verify('token', null, makeTestEnv())).toBe(
      false,
    );
    stubSiteverify({ success: true, action: 'newsletter', hostname: 'evil.dev' });
    expect(await Turnstile.Class.verify('token', null, makeTestEnv())).toBe(
      false,
    );
  });

  it('fails closed when siteverify is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(await Turnstile.Class.verify('token', null, makeTestEnv())).toBe(
      false,
    );
  });
});
