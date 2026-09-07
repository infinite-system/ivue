/*
=== GENERATOR ===
Goal: Prove one stored markdown body renders per platform — plain kinds lose what they cannot show, the lint names it, X counts a URL as 23, and every derived kind regenerates from the base by one function.
// domain-invariant: $Projection — If a kind is plain, then bold, headings, lists, images, rich links and code fail its lint
// domain-invariant: $Projection — If the base has N `---` rules, then the derived thread has N+1 segments
Impossible if true: a platform card shows text the platform would not accept

=== GENERATOR-DESCRIBED ===
$Projection is the only place a platform's rules live: limits, folds, the derivation from the base, the plain-text stripping. Copy, preview and the poster all read the same projection.
*/
import { describe, expect, it } from 'vitest';
import { Projection } from './Projection';

const piece = {
  title: 'Put your Vue state back in objects',
  base: 'Every framework bet on **classes**.\n\n---\n\nSo: find them. [the post](https://ivue.dev/blog/introducing-ivue)\n\n---\n\nThe core is 1.1 kB.',
  links: [{ label: 'the post', url: 'https://ivue.dev/blog/introducing-ivue' }],
};

describe('Projection', () => {
  // domain-invariant: $Projection — If the base has N `---` rules, then the derived thread has N+1 segments
  it('derives a thread from the rules, plain per segment, the link on the last segment only when none carries one', () => {
    const thread = Projection.Class.derive('x-thread', piece);
    expect(thread.segments).toHaveLength(3);
    expect(thread.segments![0]).toBe('Every framework bet on classes.');
    expect(thread.segments![1]).toBe('So: find them. the post https://ivue.dev/blog/introducing-ivue');
    // a URL already rides segment 2, so the last segment stays bare
    expect(thread.segments![2]).toBe('The core is 1.1 kB.');
    const bare = Projection.Class.derive('x-thread', { ...piece, base: 'One.\n\n---\n\nTwo.' });
    expect(bare.segments![1]).toBe('Two.\nhttps://ivue.dev/blog/introducing-ivue');
  });

  it('derives the other kinds: first segment, joined plain, markdown with the canonical link, title, email with greeting', () => {
    expect(Projection.Class.derive('x-post', piece).body).toBe('Every framework bet on classes.');
    expect(Projection.Class.derive('linkedin', piece).body).toContain('So: find them.');
    expect(Projection.Class.derive('linkedin', piece).body).not.toContain('---');
    expect(Projection.Class.derive('reddit', piece).body).toMatch(/\*\*classes\*\*[\s\S]*Originally published at https:\/\/ivue\.dev/);
    expect(Projection.Class.derive('hn', piece).body).toBe(piece.title);
    const email = Projection.Class.derive('email', piece, { greeting: 'Hi Peter,', signoff: 'Evgeny' });
    expect(email.body.startsWith('Hi Peter,\n\n')).toBe(true);
    expect(email.body.endsWith('\n\nEvgeny')).toBe(true);
  });

  it('cards come one per heading, else one per segment, never more than four', () => {
    const headed = '## One\n\ntext\n\n## Two\n\ntext\n\n## Three\n\ntext\n\n## Four\n\ntext\n\n## Five\n\ntext';
    expect(Projection.Class.cards(headed)).toEqual(['One\n\ntext', 'Two\n\ntext', 'Three\n\ntext', 'Four\n\ntext']);
    expect(Projection.Class.cards('a\n\n---\n\nb')).toEqual(['a', 'b']);
  });

  it('counts X-weighted: every URL is 23, everything else per code point', () => {
    expect(Projection.Class.count('abc')).toBe(3);
    expect(Projection.Class.count('see https://ivue.dev/blog/a-very-long-slug-that-goes-on')).toBe(4 + 23);
    expect(Projection.Class.count('🧵')).toBe(1);
  });

  // domain-invariant: $Projection — If a kind is plain, then bold, headings, lists, images, rich links and code fail its lint
  it('the plain lint names each construct the platform would lose', () => {
    const problems = Projection.Class.lint(
      'x-post',
      '# Title\n\n**bold** and [a link](https://x.y) and `code`\n\n- item\n\n![alt](https://x.y/i.png)',
    );
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/bold/),
        expect.stringMatching(/headings/),
        expect.stringMatching(/lists/),
        expect.stringMatching(/images/),
        expect.stringMatching(/bare URLs/),
        expect.stringMatching(/code/),
      ]),
    );
    expect(Projection.Class.lint('reddit', '# fine\n\n**fine**')).toEqual([]);
  });

  // impossible-if-true: $Projection — a platform card shows text the platform would not accept
  it('limits: 280 on X, 300 Bluesky, 500 Mastodon, 80 for an HN title, a cover for an article', () => {
    const long = 'x'.repeat(281);
    expect(Projection.Class.lint('x-segment', long)).toEqual(['281 characters, the limit is 280']);
    expect(Projection.Class.lint('bluesky', 'x'.repeat(300))).toEqual([]);
    expect(Projection.Class.lint('mastodon', 'x'.repeat(501))[0]).toMatch(/limit is 500/);
    expect(Projection.Class.lint('hn', 'x'.repeat(81))[0]).toMatch(/limit is 80/);
    expect(Projection.Class.lint('x-article', 'body', {})).toEqual(['an article needs a cover image']);
    expect(Projection.Class.lint('x-article', 'body', { cover: '/blog/a.png' })).toEqual([]);
    expect(Projection.Class.lint('x-post', '   ')).toEqual(['the text is empty']);
  });

  it('plain() strips the subset to what X accepts', () => {
    expect(Projection.Class.plain('## H\n\n**b** _i_ `c` [l](https://u)\n\n- one\n- two\n\n> q')).toBe(
      'H\n\nb i c l https://u\n\n• one\n• two\n\nq',
    );
  });
});
