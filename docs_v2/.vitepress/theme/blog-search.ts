// ONE ranking for every blog search box (the index page's and the
// sidebar rail's): a title hit beats a tag hit beats an excerpt hit
// beats a body mention — so typing words from a title surfaces that
// post first. Ties fall back to newest-first.
export interface SearchablePost {
  title: string;
  excerpt: string;
  tags: string[];
  searchText: string;
  timestamp: number;
}

export function searchScore(post: SearchablePost, query: string): number {
  const title = post.title.toLowerCase();
  const excerpt = post.excerpt.toLowerCase();
  const words = query.split(/\s+/).filter((word) => word.length > 1);
  let score = 0;
  if (title.includes(query)) score += 100;
  if (title.startsWith(query)) score += 40;
  for (const word of words) {
    if (title.includes(word)) score += 30;
    if (post.tags.some((tag) => tag.includes(word))) score += 15;
    if (excerpt.includes(word)) score += 8;
    if (post.searchText.includes(word)) score += 2;
  }
  if (post.tags.some((tag) => tag.includes(query))) score += 20;
  if (excerpt.includes(query)) score += 12;
  if (post.searchText.includes(query)) score += 5;
  return score;
}

/** Posts matching `rawQuery`, best first; every post when the query is blank. */
export function rankPosts<T extends SearchablePost>(posts: T[], rawQuery: string): T[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return posts;
  return posts
    .map((post) => ({ post, score: searchScore(post, query) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.post.timestamp - first.post.timestamp,
    )
    .map((entry) => entry.post);
}
