import { Static } from 'ivue/extras';

// One stored format, many renderings. A body is a markdown subset;
// each kind declares what survives: plain-text platforms keep
// paragraphs, line breaks and bare URLs; markdown platforms keep the
// subset; rich platforms add images. Derived kinds regenerate from the
// piece's base through one function each (derive). The lint blocks
// approval, never typing.
class $Projection {
  static readonly PLAIN_KINDS: readonly string[] = [
    'x-segment',
    'x-post',
    'x-long',
    'x-card',
    'bluesky',
    'mastodon',
    'threads',
    'linkedin',
    'hn',
    'email',
    'note',
  ];
  static readonly MARKDOWN_KINDS: readonly string[] = ['reddit', 'devto', 'article'];
  static readonly RICH_KINDS: readonly string[] = ['x-article', 'linkedin-article'];
  static readonly PARENT_KINDS: readonly string[] = ['x-thread', 'x-cards'];
  static readonly DERIVABLE_KINDS: readonly string[] = [
    'x-thread',
    'x-post',
    'x-long',
    'x-article',
    'x-cards',
    'linkedin',
    'linkedin-article',
    'reddit',
    'devto',
    'article',
    'hn',
    'email',
  ];
  static readonly KINDS: readonly string[] = [
    'x-thread',
    'x-segment',
    'x-post',
    'x-long',
    'x-article',
    'x-cards',
    'x-card',
    'linkedin',
    'linkedin-article',
    'reddit',
    'devto',
    'article',
    'hn',
    'bluesky',
    'mastodon',
    'threads',
    'email',
    'note',
  ];
  /** character limits by kind (X-weighted where X counts) */
  static readonly LIMITS: Record<string, number> = {
    'x-segment': 280,
    'x-post': 280,
    'x-card': 280,
    bluesky: 300,
    mastodon: 500,
    threads: 500,
    linkedin: 3000,
    hn: 80,
  };
  /** the X fold: what the timeline shows before "Show more" */
  static readonly X_FOLD = 280;
  static readonly LINKEDIN_FOLD = 210;
  static readonly URL_WEIGHT = 23;
  static readonly MAXIMUM_CARDS = 4;
  static readonly SEGMENT_RULE = /\n[ \t]*---[ \t]*\n/;
  static readonly URL_PATTERN = /https?:\/\/[^\s<>)]+/g;
  /** the same pattern without the global flag — safe for .test() */
  static readonly URL_TEST = /https?:\/\/[^\s<>)]+/;
  /** the platform a kind posts to (mirrors add their own) */
  static readonly PLATFORMS: Record<string, string> = {
    'x-thread': 'x',
    'x-segment': 'x',
    'x-post': 'x',
    'x-long': 'x',
    'x-article': 'x',
    'x-cards': 'x',
    'x-card': 'x',
    linkedin: 'linkedin',
    'linkedin-article': 'linkedin',
    reddit: 'reddit',
    devto: 'devto',
    article: 'other', // a markdown adaptation for a venue without its own kind: Habr, juejin, Zenn
    hn: 'hn',
    bluesky: 'bluesky',
    mastodon: 'mastodon',
    threads: 'threads',
    email: 'email',
    note: 'other',
  };

  static isKind(kind: string): boolean {
    return this.KINDS.includes(kind);
  }

  static isParentKind(kind: string): boolean {
    return this.PARENT_KINDS.includes(kind);
  }

  static childKind(kind: string): string {
    return kind === 'x-thread' ? 'x-segment' : 'x-card';
  }

  static isDerivable(kind: string): boolean {
    return this.DERIVABLE_KINDS.includes(kind);
  }

  static platformOf(kind: string): string {
    return this.PLATFORMS[kind] ?? 'other';
  }

  /** the base split on its `---` rules — the thread's shape */
  static segments(base: string): string[] {
    return base
      .split(this.SEGMENT_RULE)
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  /** the base with the rules dropped — one long text */
  static joined(base: string): string {
    return this.segments(base).join('\n\n');
  }

  /** markdown subset → what a plain-text platform accepts */
  static plain(markdown: string): string {
    return markdown
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images go
      .replace(/^#{1,6}\s+/gm, '') // headings become their text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2') // links: label then bare URL
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(^|[^*\w])[*_]([^*_\n]+)[*_](?=[^*\w]|$)/g, '$1$2')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/^[ \t]*[-*][ \t]+/gm, '• ')
      .replace(/^[ \t]*\d+\.[ \t]+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static markdown(body: string): string {
    return body.trim();
  }

  /** X-weighted length: a URL counts a fixed 23 */
  static count(text: string): number {
    const weighted = text.replace(
      this.URL_PATTERN,
      'x'.repeat(this.URL_WEIGHT),
    );
    return [...weighted].length;
  }

  static limitOf(kind: string): number | null {
    return this.LIMITS[kind] ?? null;
  }

  /** what a kind may hold; empty = fine. Blocks approval, never typing. */
  static lint(
    kind: string,
    body: string,
    meta: Record<string, unknown> = {},
  ): string[] {
    const problems: string[] = [];
    if (this.PLAIN_KINDS.includes(kind)) {
      if (/(\*\*|__).+?\1/.test(body)) problems.push('bold does not survive on this platform');
      if (/^#{1,6}\s/m.test(body)) problems.push('headings do not survive on this platform');
      if (/^\s*([-*]|\d+\.)\s+/m.test(body)) problems.push('lists do not survive on this platform');
      if (/!\[[^\]]*\]\(/.test(body)) problems.push('images do not survive on this platform');
      if (/\[[^\]]+\]\([^)]+\)/.test(body)) problems.push('links must be bare URLs on this platform');
      if (/`[^`\n]+`/.test(body)) problems.push('code spans do not survive on this platform');
    }
    const limit = this.limitOf(kind);
    if (limit !== null) {
      const length = kind === 'hn' ? [...body.trim()].length : this.count(body);
      if (length > limit) problems.push(`${length} characters, the limit is ${limit}`);
    }
    if (this.RICH_KINDS.includes(kind) && !String(meta.cover ?? '').trim())
      problems.push('an article needs a cover image');
    if (!body.trim() && !this.PARENT_KINDS.includes(kind)) problems.push('the text is empty');
    return problems;
  }

  /**
   * Regenerate a derived expression from the piece. Parent kinds return
   * their children as `segments`; everything else returns one body.
   */
  static derive(
    kind: string,
    piece: Projection.Source,
    meta: Record<string, unknown> = {},
  ): Projection.Derived {
    const base = piece.base;
    const link = piece.links[0]?.url ?? '';
    switch (kind) {
      case 'x-thread': {
        const segments = this.segments(base).map((segment) => this.plain(segment));
        // the link rides the last segment unless one already carries a URL
        if (link && !segments.some((segment) => this.URL_TEST.test(segment)) && segments.length)
          segments[segments.length - 1] += `\n${link}`;
        return { body: segments.join('\n\n---\n\n'), segments };
      }
      case 'x-cards': {
        const cards = this.cards(base);
        return { body: cards.join('\n\n---\n\n'), segments: cards };
      }
      case 'x-post':
        return { body: this.plain(this.segments(base)[0] ?? ''), segments: null };
      case 'x-long':
      case 'linkedin':
        return { body: this.plain(this.joined(base)), segments: null };
      case 'x-article':
      case 'linkedin-article':
        return { body: this.markdown(this.joined(base)), segments: null };
      case 'reddit':
      case 'devto':
      case 'article': {
        const body = this.markdown(this.joined(base));
        return {
          body: link ? `${body}\n\nOriginally published at ${link}` : body,
          segments: null,
        };
      }
      case 'hn':
        return { body: piece.title.trim(), segments: null };
      case 'email': {
        const greeting = String(meta.greeting ?? 'Hi,').trim();
        const signoff = String(meta.signoff ?? '— Evgeny').trim();
        return {
          body: `${greeting}\n\n${this.plain(this.joined(base))}\n\n${signoff}`,
          segments: null,
        };
      }
      default:
        return { body: this.plain(this.joined(base)), segments: null };
    }
  }

  /** one card per `## ` heading, or per segment without headings, up to four */
  static cards(base: string): string[] {
    const headed = base.split(/^(?=##\s)/m).map((part) => part.trim()).filter(Boolean);
    const source =
      headed.length > 1 && headed.every((part) => /^##\s/.test(part))
        ? headed
        : this.segments(base);
    return source.slice(0, this.MAXIMUM_CARDS).map((part) => this.plain(part));
  }
}

export namespace Projection {
  export const $Class = Static($Projection);
  export let Class = $Class;

  export interface Source {
    title: string;
    base: string;
    links: { label: string; url: string }[];
  }

  export interface Derived {
    body: string;
    /** children for a parent kind, else null */
    segments: string[] | null;
  }
}
