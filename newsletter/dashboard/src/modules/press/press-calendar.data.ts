// The press calendar's plan data — GENERATED from tasks/press-plan.md +
// the venue-discovery synthesis (tmp/press-briefs/out-*.md). Regenerate
// by editing here; the dashboard renders whatever this array holds.
// Checkmark state does NOT live here (localStorage owns it) — this file
// is the plan, not the progress.

export interface PressEntry {
  /** stable id: `${date}--${venue-slug}` — the checkmark key */
  id: string;
  /** YYYY-MM-DD (planned posting day; week-anchored, user may slide) */
  date: string;
  venue: string;
  url: string;
  /** channel group for filtering/coloring */
  channel: PressChannel;
  /** article slug from the blog, or NEW:/MOD: descriptor */
  article: string;
  /** one line: what to post and the angle */
  angle: string;
  /** where the paste-ready copy lives, when prepared */
  draft?: string;
  /** minutes of human work expected */
  effortMin: number;
  /** 1 = Vue launch wave, 2 = agents-story wave */
  wave: 1 | 2;
  /** language of the artifact */
  lang: 'en' | 'ru' | 'zh' | 'ja';
}

export type PressChannel =
  | 'hn'
  | 'reddit'
  | 'x'
  | 'newsletter-pitch'
  | 'podcast'
  | 'creator'
  | 'gallery'
  | 'directory'
  | 'community'
  | 'article-platform'
  | 'intl'
  | 'conference';

// Placeholder rows (W4 skeleton) — replaced by the full 6-month
// synthesis pass in the same session that lands this module.
export const PRESS_ENTRIES: PressEntry[] = [];
