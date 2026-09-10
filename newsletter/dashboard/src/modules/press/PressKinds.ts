import { Static } from 'ivue/extras';
import { Projection } from '../../../../src/modules/press/Projection';

// What the dashboard says about a kind: its label, its platform, which
// card frames it, and the choices the add-expression menu offers. The
// rules themselves (limits, folds, counts, lint, derivation) are the
// Worker's Projection, imported here so the card counts what the server
// counts.
class $PressKinds {
  static readonly LABELS: Record<string, string> = {
    'x-thread': 'X thread',
    'x-segment': 'tweet',
    'x-post': 'X post',
    'x-long': 'X long post',
    'x-article': 'X article',
    'x-cards': 'X image cards',
    'x-card': 'card',
    linkedin: 'LinkedIn post',
    'linkedin-article': 'LinkedIn article',
    reddit: 'Reddit',
    devto: 'dev.to',
    article: 'Article',
    hn: 'Hacker News',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon',
    threads: 'Threads',
    email: 'Email',
    note: 'Note',
  };
  static readonly PLATFORM_LABELS: Record<string, string> = {
    x: 'X',
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    devto: 'dev.to',
    hn: 'Hacker News',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon',
    threads: 'Threads',
    email: 'Email',
    other: 'other',
  };
  /** the card frame each kind renders in */
  static readonly FRAMES: Record<string, string> = {
    'x-thread': 'x-thread',
    'x-post': 'x-post',
    'x-long': 'x-post',
    'x-article': 'article',
    'x-cards': 'cards',
    linkedin: 'linkedin',
    'linkedin-article': 'article',
    reddit: 'reddit',
    devto: 'devto',
    article: 'article',
    hn: 'hn',
    bluesky: 'x-post',
    mastodon: 'x-post',
    threads: 'x-post',
    email: 'email',
    note: 'plain',
  };
  /** the add menu, in the order it offers kinds; derived where derivable */
  static readonly MENU: readonly { kind: string; mode: 'derived' | 'authored' }[] = [
    { kind: 'x-thread', mode: 'derived' },
    { kind: 'x-post', mode: 'authored' },
    { kind: 'x-long', mode: 'derived' },
    { kind: 'x-article', mode: 'derived' },
    { kind: 'x-cards', mode: 'derived' },
    { kind: 'linkedin', mode: 'derived' },
    { kind: 'linkedin-article', mode: 'derived' },
    { kind: 'reddit', mode: 'derived' },
    { kind: 'devto', mode: 'derived' },
    { kind: 'article', mode: 'derived' },
    { kind: 'hn', mode: 'derived' },
    { kind: 'email', mode: 'derived' },
    { kind: 'bluesky', mode: 'authored' },
    { kind: 'mastodon', mode: 'authored' },
    { kind: 'threads', mode: 'authored' },
    { kind: 'note', mode: 'authored' },
  ];
  static readonly STATUS_LABELS: Record<string, string> = {
    draft: 'draft',
    approved: 'approved',
    scheduled: 'scheduled',
    due: 'due',
    sent: 'sent',
    archived: 'archived',
  };
  static readonly ET_ZONE = 'America/New_York';

  static label(kind: string): string {
    return this.LABELS[kind] ?? kind;
  }

  static platformLabel(kind: string): string {
    return this.PLATFORM_LABELS[Projection.Class.platformOf(kind)] ?? Projection.Class.platformOf(kind);
  }

  static frame(kind: string): string {
    return this.FRAMES[kind] ?? 'plain';
  }

  static statusLabel(status: string): string {
    return this.STATUS_LABELS[status] ?? status;
  }

  static isParent(kind: string): boolean {
    return Projection.Class.isParentKind(kind);
  }

  static childKind(kind: string): string {
    return Projection.Class.childKind(kind);
  }

  static count(text: string): number {
    return Projection.Class.count(text);
  }

  static limit(kind: string): number | null {
    return Projection.Class.limitOf(kind);
  }

  static lint(kind: string, body: string, meta: Record<string, unknown> = {}): string[] {
    return Projection.Class.lint(kind, body, meta);
  }

  static plain(markdown: string): string {
    return Projection.Class.plain(markdown);
  }

  static segments(base: string): string[] {
    return Projection.Class.segments(base);
  }

  static get xFold(): number {
    return Projection.Class.X_FOLD;
  }

  static get linkedinFold(): number {
    return Projection.Class.LINKEDIN_FOLD;
  }

  /** a time in Eastern, the launch clock, beside the local one */
  static easternTime(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleString('en-US', {
      timeZone: this.ET_ZONE,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

export namespace PressKinds {
  export const $Class = Static($PressKinds);
  export let Class = $Class;
}
