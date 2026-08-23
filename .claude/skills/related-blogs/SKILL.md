---
name: related-blogs
description: Use when a new blog post is published, a docs page is added or renamed, or the "From the blog" related-posts blocks need curating — the rules for mapping docs pages to blog posts via relatedPosts frontmatter, and the machinery behind the blocks.
---

# related-blogs — curating the "From the blog" blocks

Every docs page can carry a `relatedPosts` frontmatter key. The
`RelatedPosts` component renders those posts twice per page: compact
thumb+title+date rows under the TOC (`aside` variant) and a small card
grid at the end of the content (`doc` variant — the only one narrow
viewports see). Pages without the key render nothing.

## The machinery (do not duplicate it)

- Component: `docs_v2/.vitepress/theme/components/RelatedPosts.vue`
  (two variants, wired in `theme/index.ts` at `aside-outline-after`
  and `doc-after`; self-gates on frontmatter presence).
- Data: `docs_v2/blog/blog-lite.data.mjs` — slug/title/date/banner
  ONLY. Never import `blog.data.mjs` (the full loader) into the theme:
  it carries ~5 KB of search text per post and belongs to the blog
  index alone.
- Unknown slugs filter silently — a bad slug degrades to a missing
  card, not a build failure. That is a footgun as much as a feature:
  verify slugs against `docs_v2/blog/*.md` filenames when curating.
- Curation history: `tmp/related-posts-map.md` (when present) holds
  the last full scan — map, gaps, and fix-before-linking flags.

## Frontmatter form

```yaml
relatedPosts: [measured-not-promised, one-kilobyte-feature, twenty-million-cells]
```

Inline array, exact slugs (= blog filenames without `.md`), inside the
page's existing frontmatter block.

## Curation rules

1. **Up to 3 posts, ranked by genuine topical fit.** A related-posts
   block with a stretched link is worse than none — never force a
   match to fill slots. Real fit means: shared subject matter, the
   post narrates what the page references, or the page's mechanism is
   the post's story.
2. **Thin pages carry 1–2 links, not 3.** Minimal example pages
   ("what to notice + source", under ~80 lines) must not be outweighed
   by their own footer.
3. **Excluded pages stay excluded**: `examples/index`,
   `examples/stackblitz`, `community`, and the home page (`index.md`
   is a home layout — no doc slots).
4. **Dedupe against inline links.** If the page body already links a
   post prominently, prefer different posts in the block.
5. **Story/essay posts are not filler.** Project-history and
   agent-story posts (`three-years-to-reduce`, `agents-built-an-editor`
   and kin) belong only where the page is genuinely about that story
   (e.g. `examples/invar`).

## When a NEW BLOG POST publishes

Ask: which docs pages does this post narrate? Add its slug to those
pages' `relatedPosts` (respecting the 3-slot ranking — it may displace
a weaker match). A post born from a gap in the pipeline usually has
its target pages named in `tmp/related-posts-map.md` already.

## When a NEW DOCS PAGE lands

Curate its `relatedPosts` before or with the page's first deploy, and
give it 1 sentence of thought against rule 1. A page with no honest
match ships without the key — that is a signal the page may deserve a
new post (add the idea to the gap pipeline), not a reason to stretch.

## When a BLOG SLUG is renamed

`npm run rename:blog-slug -- <old> <new>` already rewrites every
`relatedPosts` reference (its cross-reference pass sweeps all of
docs_v2's markdown). Nothing manual — but verify with
`grep -rn "<old-slug>" docs_v2 --include=*.md | grep -v dist`.

## Verify after curating

1. `npm run build:docs` must pass (loader validates at build).
2. Spot-check one edited page live or in dist: aside rows AND the
   end-of-content grid both render, thumbs load, links resolve.
3. Slug typo check: a missing card in the rendered block means a slug
   that matched nothing — compare against `docs_v2/blog/` filenames.
