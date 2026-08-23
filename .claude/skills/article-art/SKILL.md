---
name: article-art
description: >-
  Generate free-form illustrations for blog posts by driving a codex agent (image_generation
  is stable in this install) inside tmux via the agent-tmux skill — prompt conventions, file
  placement, embedding, and how art flows into the newsletter automatically. Use when a post
  needs a conceptual illustration (not a banner — that's blog-banner; not a screenshot —
  that's blog-embed-shots).
---

# article-art — free-form illustrations via codex in tmux

Banners are code (blog-banner skill). Embeds are screenshots. This skill
covers the THIRD image kind: **free-form conceptual art** rendered by an
image model — a glowing object graph, a forked path converging, a seam
being welded. Codex CLI generates these natively (`codex features list`
→ `image_generation  stable  true`) and saves straight to a path.

## The pipeline (verified end-to-end 2026-08-22)

Drive codex through `agent-tmux` — never `codex exec` (see
`.claude/skills/agent-tmux/SKILL.md` for every verb and caveat):

```bash
S=.claude/skills/agent-tmux/scripts/agent-tmux.sh
AGENT_TMUX_PREFIX="ivue/" bash $S launch art --cwd /home/parallels/dev/ivue \
  --profile codex -- codex --dangerously-bypass-approvals-and-sandbox
AGENT_TMUX_PREFIX="ivue/" bash $S send art "<image prompt — see below>"
AGENT_TMUX_PREFIX="ivue/" bash $S wait art 300        # a render takes ~1-2 min
ls -la docs_v2/public/blog/art/                        # verify the file EXISTS
```

One session renders many images — keep sending prompts to the same
agent. Reap with `kill art` when the batch is done. A human can
`tmux attach -t ivue/art` to watch.

## Prompt shape

Tell codex to *generate an image* (say "free-form illustration, not a
screenshot"), describe the scene, then give the EXACT save path and ask
it to reply with just the path:

> Generate an image (free-form illustration, not a screenshot): a
> glowing cyan-and-indigo wireframe object graph on a deep navy
> background — nodes as small rounded squares connected by luminous
> edges, one node highlighted. Wide 3:2 aspect. Save it to
> /home/parallels/dev/ivue/docs_v2/public/blog/art/<slug>-art-1.png.
> Reply with just the file path when done.

**House style — every prompt includes:** deep navy (`#050a18`-family)
background, glowing cyan/indigo accents (the site's palette), wide 3:2
aspect, **no text in the image** (models mangle text; words live in the
prose). VIEW the PNG before shipping — never embed unseen.

## Placement & naming

- Files: `docs_v2/public/blog/art/<slug>-art-<n>.png` — slug-owned,
  numbered in document order, committed (Cloudflare builds have no
  image model; these are artifacts like banners).
- Embed in the post as a standalone markdown line:
  `![<what the image shows>](/blog/art/<slug>-art-1.png)`
- Curation ledger: `art-opportunities.md` beside this file — which
  posts earn art, the prompt, and where it belongs. Cross off entries
  as they ship.

## Newsletter flow — automatic

`blog-email-renderer.mjs` renders every standalone body image as a
full-width block in the post's email (absolute-URL'd to ivue.dev), so
art ships to subscribers with zero extra steps. The one exception is
the post's own banner line (`/blog/<slug>.png`), which is skipped —
it already heads the email. Rebuild (`npm run build:docs`) regenerates
`blog-index.json`; template changes ship via site deploy, never Worker
deploy.

## After adding art to a post

1. `npm run build:docs` (re-renders the post's email with the image)
2. View the post page AND the email preview
   (`node docs_v2/scripts/blog-email-renderer.mjs <slug> > /tmp/e.html`)
3. Deploy the site Worker; commit PNG + post together.
