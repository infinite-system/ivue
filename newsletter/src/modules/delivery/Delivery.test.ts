/*
=== GENERATOR ===
Goal: Prove sending writes the ledger for accepted deliveries alone: a rejection or a failed batch leaves the row open to retry.
// domain-invariant: $Delivery — If Postmark rejects a recipient, then the ledger stays unwritten for them
Impossible if true: a failed batch call writes the ledger

=== GENERATOR-DESCRIBED ===
$Delivery sits between Postmark and the sends table; the tests pin the write to the acknowledgment, because a ledger row without a delivery silences that subscriber forever.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Delivery } from './Delivery';
import { Ledger } from '../audience/Ledger';
import { makeTestEnv } from '../../../test/TestDatabase';
import { installFetchStub, makePost } from '../../../test/Fixtures';

describe('Delivery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends via Postmark, fills the unsubscribe placeholder, writes the ledger', async () => {
    const env = makeTestEnv();
    const postmarkCalls = installFetchStub({});
    const report = await Delivery.Class.sendPost(
      env,
      makePost('first-post', 1),
      [{ email: 'a@ivue.dev', name: 'Ada' }],
    );
    expect(report.delivered).toBe(1);
    const message = postmarkCalls[0].messages[0];
    expect(message.To).toBe('a@ivue.dev');
    expect(message.MessageStream).toBe('newsletter');
    expect(message.HtmlBody).not.toContain('{{UNSUBSCRIBE_URL}}');
    expect(message.HtmlBody).toContain('/unsubscribe?email=');
    const sent = await Ledger.Class.sentSetForSlug(env, 'first-post');
    expect(sent.has('a@ivue.dev')).toBe(true);
  });

  it('welcome email: sends once with the unsubscribe link, ledgers, never repeats', async () => {
    const env = makeTestEnv();
    const postmarkCalls = installFetchStub({});
    await Delivery.Class.sendWelcome(env, { email: 'new@ivue.dev', name: '' });
    expect(postmarkCalls.notifications).toHaveLength(1);
    const message = postmarkCalls.notifications[0];
    expect(message.To).toBe('new@ivue.dev');
    expect(message.Subject).toBe('Welcome to the ivue newsletter');
    expect(message.MessageStream).toBe('newsletter');
    expect(message.HtmlBody).not.toContain('{{UNSUBSCRIBE_URL}}');
    expect(message.HtmlBody).toContain('/unsubscribe?email=');
    expect(
      await Ledger.Class.hasSend(env, 'new@ivue.dev', 'welcome'),
    ).toBe(true);
    // a returning subscriber is never re-welcomed — the ledger row guards
    await Delivery.Class.sendWelcome(env, { email: 'new@ivue.dev', name: '' });
    expect(postmarkCalls.notifications).toHaveLength(1);
  });

  // domain-invariant: $Delivery — If Postmark rejects a recipient, then the ledger stays unwritten for them
  it('a rejected recipient is reported and NOT written to the ledger', async () => {
    const env = makeTestEnv();
    installFetchStub({
      postmarkOutcome: (recipient) =>
        recipient === 'bad@ivue.dev'
          ? { ErrorCode: 406, Message: 'inactive recipient' }
          : { ErrorCode: 0, Message: 'OK' },
    });
    const report = await Delivery.Class.sendPost(
      env,
      makePost('first-post', 1),
      [
        { email: 'good@ivue.dev', name: '' },
        { email: 'bad@ivue.dev', name: '' },
      ],
    );
    expect(report.delivered).toBe(1);
    expect(
      report.outcomes.find((outcome) => outcome.email === 'bad@ivue.dev')
        ?.errorCode,
    ).toBe(406);
    const sent = await Ledger.Class.sentSetForSlug(env, 'first-post');
    expect(sent.has('good@ivue.dev')).toBe(true);
    expect(sent.has('bad@ivue.dev')).toBe(false);
  });

  // impossible-if-true: $Delivery — a failed batch call writes the ledger
  it('a failed batch call leaves the ledger unwritten so the send retries', async () => {
    const env = makeTestEnv();
    installFetchStub({ postmarkStatus: 500 });
    const report = await Delivery.Class.sendPost(
      env,
      makePost('first-post', 1),
      [{ email: 'a@ivue.dev', name: '' }],
    );
    expect(report.delivered).toBe(0);
    expect(
      (await Ledger.Class.sentSetForSlug(env, 'first-post')).size,
    ).toBe(0);
  });
});
