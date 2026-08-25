/*
=== GENERATOR ===
Goal: Prove every credential check flows through one timing-safe comparison, and unsubscribe links are HMAC-bound to their address.
// domain-invariant: $Security — If two secrets differ, then the timing-safe comparison rejects them
Impossible if true: an unsubscribe token verifies for a different address

=== GENERATOR-DESCRIBED ===
$Security is the chokepoint: bearer checks, webhook auth, and signed links all reduce to these primitives, so the tests attack the primitives instead of every caller.
*/
import { describe, expect, it } from 'vitest';
import { Security } from './Security';
import { makeTestEnv } from '../../../test/TestDatabase';

describe('Security', () => {
  // domain-invariant: $Security — If two secrets differ, then the timing-safe comparison rejects them
  it('timingSafeEqualStrings matches equal and rejects unequal secrets', async () => {
    expect(
      await Security.Class.timingSafeEqualStrings('secret', 'secret'),
    ).toBe(true);
    expect(
      await Security.Class.timingSafeEqualStrings('secret', 'other'),
    ).toBe(false);
    expect(await Security.Class.timingSafeEqualStrings('', 'longer')).toBe(
      false,
    );
  });

  it('bearerAuthorized accepts the admin secret and nothing else', async () => {
    const env = makeTestEnv();
    const authorized = new Request('https://newsletter.test/admin/stats', {
      headers: { authorization: 'Bearer test-admin-secret' },
    });
    const wrong = new Request('https://newsletter.test/admin/stats', {
      headers: { authorization: 'Bearer nope' },
    });
    const absent = new Request('https://newsletter.test/admin/stats');
    expect(await Security.Class.bearerAuthorized(authorized, env)).toBe(true);
    expect(await Security.Class.bearerAuthorized(wrong, env)).toBe(false);
    expect(await Security.Class.bearerAuthorized(absent, env)).toBe(false);
  });

  // impossible-if-true: $Security — an unsubscribe token verifies for a different address
  it('unsubscribe tokens are stable 64-hex HMACs bound to the address', async () => {
    const env = makeTestEnv();
    const token = await Security.Class.unsubscribeToken('a@ivue.dev', env);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(await Security.Class.unsubscribeToken('a@ivue.dev', env)).toBe(
      token,
    );
    expect(await Security.Class.unsubscribeToken('b@ivue.dev', env)).not.toBe(
      token,
    );
  });

  it('unsubscribeUrl embeds the encoded address and its token', async () => {
    const env = makeTestEnv();
    const url = await Security.Class.unsubscribeUrl('a+tag@ivue.dev', env);
    expect(url).toContain('https://newsletter.test/unsubscribe?email=');
    expect(url).toContain(encodeURIComponent('a+tag@ivue.dev'));
    expect(url).toContain('&token=');
  });
});
