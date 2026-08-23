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
- **Private / channel posts** (launch artifacts — HN posts, X threads,
  Reddit/LinkedIn copy, planning notes) live in `docs_v2/blog/` with
  frontmatter `private: true` plus `channel: hn|reddit|x|linkedin|note`
  AND the matching slug prefix (`hn-…`, `x-…`); the build validator
  fails when channel and prefix disagree. They are dev-server-only:
  production pages, blog-index.json (newsletter), blog-dates.json,
  prev/next nav, the archive rail, and related-posts all exclude them
  (`isPrivatePost` in `docs_v2/scripts/channel-posts.mjs` is the one
  gate). QA them via the blog index "See all" toggle on the dev
  server; `channel: x` threads split tweets on `---` and get
  per-segment character counts.
- **Article art** (free-form illustrations): drive a codex agent in
  tmux via `.claude/skills/agent-tmux` and follow
  `.claude/skills/article-art/SKILL.md` — images land in
  `docs_v2/public/blog/art/<slug>-art-<n>.png`, embed as standalone
  markdown image lines, and flow into the newsletter automatically
  (the email renderer ships every standalone body image; only the
  banner line is skipped). Curation ledger:
  `.claude/skills/article-art/art-opportunities.md`.
- **Page OG banners**: every non-blog page gets a templated OG image
  (`npm run render:page-og`, committed to `docs_v2/public/og/`, wired
  per-page in config.ts transformHead). Re-run locally when a page's
  title/description changes; blog posts keep bespoke banners.
- **Code shots** capture EVERY code-group tab (panels forced visible,
  document order), and plain-text `[code]` markers are 1:1 with them;
  emails render all tabs inline via shiki.
- **New blog post workflow**: TITLE FIRST per .claude/skills/write-article/SKILL.md (generative — the reader's win, never the mechanism) → write md (with `tags:` frontmatter) →
  banner (blog-banner skill, view the PNG) → `npm run render:embeds` if
  the post embeds a demo (local-only; commit PNGs) → `npm run
  build:docs` → commit → `npm run sync:blog-dates` → commit dates.
- **Screenshotting**: the Playwright MCP server doesn't connect here —
  drive playwright via `node -e "require('playwright')…"`, serving the
  built site with `npx serve docs_v2/.vitepress/dist -l 5188`.
- Run git commits from the repo root (cwd resets bite path-specs), and
  never `git push` / `npm publish` — the user does both.
