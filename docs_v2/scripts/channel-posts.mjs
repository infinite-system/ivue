// Channel posts: private distribution artifacts (HN posts, X threads,
// Reddit/LinkedIn copy, planning notes) that live in docs_v2/blog/
// beside real posts but are NEVER built into production — they exist
// so the dev server shows everything ever written in one timeline.
//
// The contract has two halves with one owner each:
//   - frontmatter `channel: hn|reddit|x|linkedin|note` is the SEMANTIC
//     owner — it drives exclusion from production, the newsletter
//     pipeline, and the dev-only chips;
//   - the filename prefix (`hn-…`, `x-…`) is the HUMAN convention —
//     it keeps the clean slug namespace reserved for public posts
//     (slugs are permanent identity: URLs, 301s, the D1 sends ledger).
// check-related-posts.mjs fails the build when the two disagree.
export const CHANNELS = ['hn', 'reddit', 'x', 'linkedin', 'note'];

const CHANNEL_PATTERN = new RegExp(
  `^channel:\\s*(${CHANNELS.join('|')})\\s*$`,
  'm',
);

/** The channel declared in a markdown source's frontmatter, or null. */
export function channelOf(source) {
  const frontmatter = source.match(/^---\n[\s\S]*?\n---/)?.[0] ?? '';
  return frontmatter.match(CHANNEL_PATTERN)?.[1] ?? null;
}

/** The channel a slug's filename prefix claims, or null. */
export function channelOfSlug(slug) {
  return CHANNELS.find((channel) => slug.startsWith(`${channel}-`)) ?? null;
}

/**
 * Whether a post is private (excluded from production, the newsletter,
 * and every public surface): `private: true` frontmatter, or any
 * `channel:` — channel posts are private by definition, and carry the
 * explicit flag too as belt-and-suspenders.
 */
export function isPrivatePost(source) {
  const frontmatter = source.match(/^---\n[\s\S]*?\n---/)?.[0] ?? '';
  return /^private:\s*true\s*$/m.test(frontmatter) || channelOf(source) !== null;
}
