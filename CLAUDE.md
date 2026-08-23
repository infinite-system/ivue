# ivue — agent instructions

- **Read `LESSONS.md` before working** — it is the append-only knowledge base
  of hard-won lessons (benchmark protocol, VitePress traps, shell/VM traps,
  packaging gates, docs rules). When a session learns something the hard way,
  append it there — never store repo knowledge only in private agent memory.
- Docs are written per `.claude/skills/write-docs/SKILL.md`; ivue code per
  `.claude/skills/ivue/SKILL.md` (its mirror is `docs_v2/guide/standard.md` —
  never edit the mirror).
- After docs changes: `npm run build:docs` must pass. After engine changes:
  re-verify the ~1.1 KB gzipped production size and 100% test coverage.
- **Newsletter** (`newsletter/` — Worker + D1 + Postmark): the ops manual
  is `newsletter/README.md` (command reference + debug decoder ring at
  the bottom — read before operating). Two invariants: email CONTENT is
  rendered at SITE build time (`blog-email-renderer.mjs` →
  `blog-index.json`), so template changes ship via site push, never
  Worker deploy; and all newsletter wrangler commands run FROM
  `newsletter/` — the repo-root `wrangler.jsonc` is the site's
  assets-only Worker. Wrangler pinned to 4.120.1 everywhere.
- **Channel posts** (private launch/distribution artifacts — HN posts,
  X threads, Reddit/LinkedIn copy, planning notes) live in
  `docs_v2/blog/` with frontmatter `channel: hn|reddit|x|linkedin|note`
  AND the matching slug prefix (`hn-…`, `x-…`); the build validator
  fails when they disagree. They are dev-server-only: production
  pages, blog-index.json (newsletter), and blog-dates.json all exclude
  them. QA them via the blog index "See all" toggle on the dev server;
  `channel: x` threads split tweets on `---` and get per-segment
  character counts.
- **New blog post workflow**: write md (with `tags:` frontmatter) →
  banner (blog-banner skill, view the PNG) → `npm run render:embeds` if
  the post embeds a demo (local-only; commit PNGs) → `npm run
  build:docs` → commit → `npm run sync:blog-dates` → commit dates.
- **Screenshotting**: the Playwright MCP server doesn't connect here —
  drive playwright via `node -e "require('playwright')…"`, serving the
  built site with `npx serve docs_v2/.vitepress/dist -l 5188`.
- Run git commits from the repo root (cwd resets bite path-specs), and
  never `git push` / `npm publish` — the user does both.
