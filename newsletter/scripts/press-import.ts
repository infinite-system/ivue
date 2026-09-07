// The one-shot import — parses the press drafts, the channel posts, and
// the launch-thread artifact's copy into the batch shape the press API
// inserts (POST /admin/press/import). Files are read HERE; the Worker
// parses nothing. Run with vite-node from the repo root:
//
//   npx vite-node newsletter/scripts/press-import.ts > /tmp/press-batch.json
//   node newsletter/scripts/press.mjs import /tmp/press-batch.json --dry-run
//
// Everything imports as AUTHORED: these texts were written before any
// base existed, so derivation is for what gets written from here on.
// The launch thread's per-segment approvals from the artifact database
// are carried as a note — a thread is approved whole in the press.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { X_POSTS, type XPost } from '../dashboard/src/modules/release/x-launch-copy';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface ImportExpression {
  kind: string;
  mode: 'authored';
  label?: string;
  venue?: string;
  body?: string;
  segments?: string[] | null;
  meta?: Record<string, unknown>;
  mirrors?: string[];
  approved?: boolean;
}

interface ImportPiece {
  title: string;
  slug?: string | null;
  claim?: string;
  links?: { label: string; url: string }[];
  banner?: string | null;
  base?: string;
  wave?: number;
  notes?: string;
  expressions: ImportExpression[];
}

const pieces = new Map<string, ImportPiece>();

function pieceFor(key: string, seed: Partial<ImportPiece> & { title: string }): ImportPiece {
  let piece = pieces.get(key);
  if (!piece) {
    piece = { expressions: [], ...seed };
    pieces.set(key, piece);
  }
  return piece;
}

function frontmatter(text: string): { meta: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const meta: Record<string, string> = {};
  if (match)
    for (const line of match[1].split('\n')) {
      const colon = line.indexOf(':');
      if (colon > 0) meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  return { meta, body: (match ? text.slice(match[0].length) : text).trim() };
}

function segmentsOf(body: string): string[] {
  return body
    .split(/\n[ \t]*---[ \t]*\n/)
    .map((segment) => segment.replace(/^#\s+.+\n+/, '').trim())
    .filter(Boolean);
}

/* ---- the blog articles the drafts cite: one piece per slug ---- */

function articlePiece(slug: string): ImportPiece {
  const path = resolve(root, 'docs_v2/blog', `${slug}.md`);
  const seed: Partial<ImportPiece> & { title: string } = { title: slug, slug, wave: 1 };
  if (existsSync(path)) {
    const { meta } = frontmatter(readFileSync(path, 'utf8'));
    seed.title = meta.title || slug;
    seed.claim = meta.description || '';
    seed.banner = `/blog/${slug}.png`;
    seed.links = [{ label: seed.title, url: `https://ivue.dev/blog/${slug}` }];
  }
  return pieceFor(`slug:${slug}`, seed);
}

/* ---- the channel posts under docs_v2/blog ---- */

const CHANNEL_KINDS: Record<string, string> = { hn: 'hn', x: 'x-thread', reddit: 'reddit', linkedin: 'linkedin', note: 'note' };

for (const file of readdirSync(resolve(root, 'docs_v2/blog'))) {
  const match = /^(hn|x|reddit|linkedin|note)-(.+)\.md$/.exec(file);
  if (!match) continue;
  // planning notes are not copy; the tc39 note is a discussion draft
  if (match[1] === 'note' && !file.includes('tc39')) continue;
  const { meta, body } = frontmatter(readFileSync(resolve(root, 'docs_v2/blog', file), 'utf8'));
  const channel = match[1];
  const piece =
    channel === 'note'
      ? pieceFor(`note:${match[2]}`, { title: meta.title || match[2], wave: 1, notes: 'planning note' })
      : articlePiece('introducing-ivue');
  const kind = CHANNEL_KINDS[channel];
  const label = meta.title || file;
  if (kind === 'x-thread') {
    piece.expressions.push({ kind, mode: 'authored', label, segments: segmentsOf(body), venue: 'X' });
  } else if (kind === 'reddit') {
    const venue = /r-([a-z]+)/.exec(file)?.[1] ?? '';
    piece.expressions.push({ kind, mode: 'authored', label, body, venue: venue ? `r/${venue}` : 'Reddit', meta: { title: meta.title } });
  } else if (kind === 'hn') {
    // the file holds the submission title and the first comment
    const titleMatch = /\*\*Submission title[^*]*\*\*\s*\n+([^\n]+)/.exec(body);
    piece.expressions.push({
      kind: 'hn',
      mode: 'authored',
      label,
      body: (titleMatch?.[1] ?? meta.title ?? '').replace(/^`|`$/g, '').trim(),
      venue: 'Hacker News',
      meta: { firstComment: body },
    });
  } else {
    piece.expressions.push({ kind, mode: 'authored', label, body, venue: kind === 'linkedin' ? 'LinkedIn' : '' });
  }
}

/* ---- the press drafts under tasks/press-drafts ---- */

const DRAFT_KIND_BY_PURPOSE: Record<string, string> = {
  'pitch-email': 'email',
  'warm personal message': 'email',
  'message mirror': 'email',
  'short announcement': 'note',
  'full article adaptation': 'article',
  'tightened article adaptation': 'article',
  'technical article adaptation': 'article',
  'one-screen project section': 'article',
  'text post': 'reddit',
  'canonical-ready cross-post': 'devto',
  'submission title + first comment': 'note',
  'four image-card texts': 'x-cards',
  'long post': 'x-long',
  'PR one-liners': 'note',
  'gallery blurbs': 'note',
  'card-text': 'note',
  thread: 'x-thread',
  post: 'note',
};

const draftsRoot = resolve(root, 'tasks/press-drafts');
if (existsSync(draftsRoot))
  for (const folder of readdirSync(draftsRoot)) {
    const folderPath = resolve(draftsRoot, folder);
    for (const file of readdirSync(folderPath)) {
      if (!file.endsWith('.md') || file === 'INDEX.md') continue;
      const { meta, body } = frontmatter(readFileSync(resolve(folderPath, file), 'utf8'));
      const source = (meta.source || '').trim();
      const slug = /^[a-z0-9-]+$/.test(source) ? source : null;
      const piece = slug
        ? articlePiece(slug)
        : pieceFor(`draft:${folder}/${file}`, { title: meta.venue ? `${meta.venue} — ${basename(file, '.md')}` : basename(file, '.md'), wave: 1, notes: source });
      const purpose = (meta.purpose || '').split('(')[0].trim();
      const kind = DRAFT_KIND_BY_PURPOSE[purpose] ?? (purpose.startsWith('thread') ? 'x-thread' : purpose.startsWith('post') ? 'note' : 'note');
      const venue = (meta.venue || '').split(';')[0].trim();
      const expression: ImportExpression = {
        kind,
        mode: 'authored',
        label: basename(file, '.md'),
        venue,
        meta: { source: `tasks/press-drafts/${folder}/${file}`, lang: meta.lang || 'en', purpose: meta.purpose || '' },
      };
      if (kind === 'x-thread' || kind === 'x-cards') expression.segments = segmentsOf(body);
      else expression.body = body;
      piece.expressions.push(expression);
    }
  }

/* ---- the launch-thread artifact's copy ---- */

const artifactApprovals: Record<string, { approved: boolean; to: string[] }> = existsSync(resolve(root, 'newsletter/scripts/press-artifact-approvals.json'))
  ? JSON.parse(readFileSync(resolve(root, 'newsletter/scripts/press-artifact-approvals.json'), 'utf8'))
  : {};

const launch = articlePiece('introducing-ivue');
const byGroup = new Map<string, XPost[]>();
for (const post of X_POSTS) byGroup.set(post.group, [...(byGroup.get(post.group) ?? []), post]);

const threadPosts = byGroup.get('thread') ?? [];
const approvedSegments = threadPosts.filter((post) => artifactApprovals[post.key.replace(/^x:/, '')]?.approved).map((post) => post.label);
launch.expressions.push({
  kind: 'x-thread',
  mode: 'authored',
  label: 'launch thread (artifact)',
  venue: 'X',
  segments: threadPosts.map((post) => post.text),
  mirrors: ['bluesky', 'mastodon'],
  meta: { source: 'artifact ivue Launch Thread', segmentsApprovedInArtifact: approvedSegments },
});
for (const post of byGroup.get('single') ?? [])
  launch.expressions.push({ kind: 'x-post', mode: 'authored', label: post.label, venue: 'X', body: post.text, mirrors: ['bluesky', 'mastodon'] });
for (const post of byGroup.get('long') ?? [])
  launch.expressions.push({ kind: 'x-long', mode: 'authored', label: post.label, venue: 'X', body: post.text });
for (const post of byGroup.get('hooks') ?? [])
  launch.expressions.push({ kind: 'x-post', mode: 'authored', label: `hook ${post.label}`, venue: 'X', body: post.text });

const VOICE_TITLES: Record<string, string> = { voice: 'Voice post', deeper: 'From the papers', field: 'Field theory' };
for (const group of ['voice', 'deeper', 'field'])
  for (const post of byGroup.get(group) ?? []) {
    const title = `${VOICE_TITLES[group]} ${post.label}`;
    const piece = pieceFor(`x:${post.key}`, {
      title,
      wave: group === 'voice' ? 1 : 2,
      base: post.text,
      notes: [post.rung, 'from the launch-thread artifact'].filter(Boolean).join(' · '),
    });
    const approval = artifactApprovals[post.key.replace(/^x:/, '')];
    piece.expressions.push({
      kind: 'x-post',
      mode: 'authored',
      label: post.label,
      venue: 'X',
      body: post.text,
      mirrors: approval?.to?.filter((platform) => ['bluesky', 'mastodon', 'threads'].includes(platform)) ?? [],
      approved: approval?.approved ?? false,
    });
  }

process.stdout.write(JSON.stringify({ pieces: [...pieces.values()] }, null, 2));
