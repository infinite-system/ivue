import { Static } from 'ivue/extras';
import { X_POSTS, X_POST_GROUPS, type XPostGroup } from './x-launch-copy';

// The paste-ready copy behind every calendar entry, resolved by key. Two
// sources: markdown files bundled from the repo at build time (the press
// drafts under tasks/ and the channel posts under docs_v2/blog/), and the
// X posts in x-launch-copy.ts. A key is either a repo-relative path
// ('tasks/press-drafts/sol/01-javascript-weekly.md') or an X key —
// 'x:<group>' for the whole group as segments (the thread, the hooks) or
// 'x:<group>:<n>' for one post. Frontmatter is stripped; an X-channel
// blog post splits into its tweets on the horizontal rules.
class $ReleaseDrafts {
  static readonly FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
  static readonly SEGMENT_RULE = /\n---\n/;

  // The bundled markdown, keyed by repo-relative path. Vite inlines every
  // matching file as a string at build time; the dev server needs the
  // repo root in server.fs.allow (vite.config.ts).
  static readonly FILES: Record<string, string> = Object.fromEntries(
    Object.entries(
      import.meta.glob(
        [
          '../../../../../tasks/press-drafts/*/*.md',
          '../../../../../docs_v2/blog/{hn,x,reddit,linkedin,note}-*.md',
        ],
        { query: '?raw', import: 'default', eager: true },
      ) as Record<string, string>,
    ).map(([path, text]) => [path.replace(/^(\.\.\/)+/, ''), text]),
  );

  static resolve(key: string): ReleaseDrafts.Draft | null {
    if (key.startsWith('x:')) return this.resolveX(key);
    const text = this.FILES[key];
    if (text === undefined) return null;
    return this.fromMarkdown(key, text);
  }

  static resolveX(key: string): ReleaseDrafts.Draft | null {
    const [, group, index] = key.split(':');
    const groupLabel = X_POST_GROUPS[group as XPostGroup];
    if (!groupLabel) return null;
    const posts = X_POSTS.filter((post) => post.group === group);
    if (index === undefined) {
      if (!posts.length) return null;
      return {
        key,
        title: groupLabel,
        subtitle: `${posts.length} posts · X`,
        body: posts.map((post) => post.text).join('\n\n---\n\n'),
        segments: posts.map((post) => post.text),
        source: 'the launch-thread artifact',
      };
    }
    const post = posts[Number(index) - 1];
    if (!post) return null;
    return {
      key,
      title: groupLabel,
      subtitle: [post.label, post.rung].filter(Boolean).join(' · '),
      body: post.text,
      segments: null,
      source: 'the launch-thread artifact',
    };
  }

  static fromMarkdown(key: string, text: string): ReleaseDrafts.Draft {
    const match = this.FRONTMATTER.exec(text);
    const meta = this.parseFrontmatter(match?.[1] ?? '');
    const body = (match ? text.slice(match[0].length) : text).trim();
    const heading = /^#\s+(.+)$/m.exec(body)?.[1];
    const isThread = meta.channel === 'x' && this.SEGMENT_RULE.test(body);
    return {
      key,
      title: meta.title ?? meta.venue ?? heading ?? key.split('/').pop() ?? key,
      subtitle: [meta.purpose, meta.lang, meta.status]
        .filter(Boolean)
        .join(' · '),
      body,
      segments: isThread
        ? body
            .split(this.SEGMENT_RULE)
            .map((segment) => segment.replace(/^#\s+.+\n+/, '').trim())
            .filter(Boolean)
        : null,
      source: key,
    };
  }

  static parseFrontmatter(block: string): Record<string, string> {
    const meta: Record<string, string> = {};
    for (const line of block.split('\n')) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const value = line.slice(colon + 1).trim();
      meta[line.slice(0, colon).trim()] = value.replace(/^['"]|['"]$/g, '');
    }
    return meta;
  }
}

export namespace ReleaseDrafts {
  export const $Class = Static($ReleaseDrafts);
  export let Class = $Class;

  export interface Draft {
    key: string;
    title: string;
    subtitle: string;
    /** the whole text, ready to copy */
    body: string;
    /** per-tweet pieces when the copy is a thread, else null */
    segments: string[] | null;
    /** where the copy lives, for the reader who wants to edit it */
    source: string;
  }
}
