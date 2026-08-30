/*
=== GENERATOR ===
Goal: Prove Gmail-UI detection is a pure routing signal that can only widen to light on positive evidence: gmail addresses answer true without the network, Google-hosted MX answers true once per domain, and every failure answers false.
// domain-invariant: $GmailUi — If the DoH lookup fails or times out, then the answer is false (dark is the safe default)
Impossible if true: a DoH outage makes usesGmailUi throw into a send loop

=== GENERATOR-DESCRIBED ===
The detector decides which pre-rendered variant a recipient gets; the tests pin the failure edge because a thrown lookup would abort a whole delivery batch, while a wrong false merely sends the canonical dark email.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GmailUi } from './GmailUi';

describe('GmailUi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    GmailUi.Class.domainCache.clear();
  });

  it('gmail and googlemail addresses answer true without touching DNS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network must not be touched');
      }),
    );
    expect(await GmailUi.Class.usesGmailUi('a@gmail.com')).toBe(true);
    expect(await GmailUi.Class.usesGmailUi('B@GoogleMail.com')).toBe(true);
  });

  it('a Google-hosted MX answers true; a foreign MX answers false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const domain = new URL(String(input)).searchParams.get('name');
        return new Response(
          JSON.stringify({
            Answer: [
              {
                type: 15,
                data:
                  domain === 'workspace.test'
                    ? '1 aspmx.l.google.com.'
                    : '10 mail.example.com.',
              },
            ],
          }),
        );
      }),
    );
    expect(await GmailUi.Class.usesGmailUi('ops@workspace.test')).toBe(true);
    expect(await GmailUi.Class.usesGmailUi('ops@selfhosted.test')).toBe(false);
  });

  it('memoizes per domain — one lookup serves every recipient on it', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ Answer: [{ type: 15, data: '1 aspmx.l.google.com.' }] }),
        ),
    );
    vi.stubGlobal('fetch', fetchSpy);
    await GmailUi.Class.usesGmailUi('a@corp.test');
    await GmailUi.Class.usesGmailUi('b@corp.test');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // domain-invariant: $GmailUi — If the DoH lookup fails or times out, then the answer is false (dark is the safe default)
  it('a failing or non-OK DoH answers false, never throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('doh down');
      }),
    );
    expect(await GmailUi.Class.usesGmailUi('a@broken.test')).toBe(false);
    GmailUi.Class.domainCache.clear();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    expect(await GmailUi.Class.usesGmailUi('a@broken.test')).toBe(false);
  });
});
