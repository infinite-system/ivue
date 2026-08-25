/*
=== GENERATOR ===
Goal: Prove Turnstile verification fails closed: transport errors, malformed tokens, and foreign hostnames or actions all read as no.
// domain-invariant: $Turnstile — If the verdict, action, or hostname is wrong, then verification fails
Impossible if true: an unreachable siteverify verifies a token

=== GENERATOR-DESCRIBED ===
The $Turnstile check guards the one form strangers can submit; the tests spend most of their rows on refusals because fail-open is the only catastrophic bug this module can have.
*/
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

  // domain-invariant: $Turnstile — If the verdict, action, or hostname is wrong, then verification fails
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

  // impossible-if-true: $Turnstile — an unreachable siteverify verifies a token
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
