/*
=== GENERATOR ===
Goal: Prove the scrub leaves nothing publishable-unsafe behind: emails, bearer tokens, key-shaped strings, secret assignments, PEM blocks, home paths and LAN addresses come out of any string at any depth, counted by rule, while code that merely names a secret variable and a truncated text keep their shape.
// domain-invariant: $Scrub — If a string anywhere in a record matches a rule, then the shipped record holds the replacement
// domain-invariant: $Scrub — If a text is longer than its cap, then both ends survive around a marker that states what was removed
Impossible if true: a forbidden pattern survives a scrub

=== GENERATOR-DESCRIBED ===
$Scrub is the one rule set that makes a session file publishable: replacements over every string at any depth, counted by rule.
*/
import { describe, expect, it } from 'vitest';
import { Scrub } from './Scrub';

describe('Scrub', () => {
  // domain-invariant: $Scrub — If a string anywhere in a record matches a rule, then the shipped record holds the replacement
  // impossible-if-true: $Scrub — a forbidden pattern survives a scrub
  it('replaces every kind of secret at any depth and counts by rule', () => {
    const counts: Scrub.Counts = {};
    const record = {
      text: 'mail ekalashnikov@gmail.com from /home/parallels/dev at 10.211.55.7 via https://claude.ai/code/session_01ABC',
      nested: {
        list: [
          'Authorization: Bearer abcdefghijklmnop.qrstuv',
          'ADMIN_SECRET=super-secret-value-123',
          'ADMIN_SECRET=e2e-local-secret',
          'const ADMIN_SECRET = process.env.ADMIN_SECRET',
          'key sk-ant-abcdefghijklmnopqrstuvwxyz0123',
          'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
          '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----',
          'grep -----BEGIN',
          'ends with @gmail.com',
        ],
        number: 7,
      },
    };
    const scrubbed = Scrub.Class.value(record, counts);
    const json = JSON.stringify(scrubbed);
    expect(scrubbed.text).toBe('mail user@example.com from ~/dev at 10.0.0.1 via https://claude.ai/code/session_[redacted]');
    expect(scrubbed.nested.list[0]).toBe('Authorization: [redacted]');
    expect(scrubbed.nested.list[1]).toBe('ADMIN_SECRET=[redacted]');
    expect(scrubbed.nested.list[2]).toBe('ADMIN_SECRET=e2e-local-secret');
    expect(scrubbed.nested.list[3]).toBe('const ADMIN_SECRET = process.env.ADMIN_SECRET');
    expect(scrubbed.nested.list[4]).toBe('key [redacted-key]');
    expect(scrubbed.nested.list[5]).toBe('[redacted-key]');
    expect(scrubbed.nested.list[6]).toBe('[redacted PEM block]');
    expect(scrubbed.nested.list[7]).toBe('grep -----REDACTED');
    expect(scrubbed.nested.list[8]).toBe('ends with @example.com');
    expect(scrubbed.nested.number).toBe(7);
    expect(Scrub.Class.survivors(json)).toEqual([]);
    expect(counts).toMatchObject({ email: 1, 'home-path': 1, 'lan-ip': 1, 'session-url': 1, 'authorization-header': 1, 'secret-assignment': 1, 'api-key': 2, 'pem-block': 1, 'pem-marker': 1, 'bare-gmail': 1 });
    expect(Scrub.Class.survivors('call me at me@gmail.com')).toEqual(['@gmail\\.com']);
    expect(Scrub.Class.text('plain text')).toBe('plain text');
    expect(Scrub.Class.value(null)).toBeNull();
  });

  // domain-invariant: $Scrub — If a text is longer than its cap, then both ends survive around a marker that states what was removed
  it('truncates in the middle with a marker, and leaves short text alone', () => {
    const text = 'a'.repeat(50) + 'b'.repeat(50);
    expect(Scrub.Class.truncate(text, 200)).toBe(text);
    const cut = Scrub.Class.truncate(text, 20);
    expect(cut.startsWith('a'.repeat(10))).toBe(true);
    expect(cut.endsWith('b'.repeat(10))).toBe(true);
    expect(cut).toContain('[80 characters removed from the sample]');
  });
});
