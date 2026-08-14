---
name: blog-banner
description: Use when a docs_v2 blog post needs its 1200x630 banner image — compose an in-brand HTML file in this skill's banners/ directory and render it deterministically with npm run render:banner. Covers the design language, the pipeline, and the verification loop.
---

# blog-banner — deterministic banners for ivue.dev blog posts

Banners are **code, not paintings**: an HTML/CSS composition rendered
by headless Chromium at exactly 1200×630. Same input → same PNG. No
image model is involved; the source is the artifact.

## Where things live

- **Source of truth**: `.claude/skills/blog-banner/banners/<slug>.html`
  — one file per post, named exactly after the post's slug.
- **Rendered output**: `docs_v2/public/blog/<slug>.png` (referenced by
  the post's `![...](/blog/<slug>.png)` and the index card).
- **Renderer**: `docs_v2/scripts/brand-image-generator.mjs` `blog`
  mode, wrapped as an npm script.

## The pipeline

```bash
npm run render:banner -- \
  .claude/skills/blog-banner/banners/<slug>.html \
  docs_v2/public/blog/<slug>.png
```

The generator waits for fonts and images before screenshotting, so the
render is stable. NEVER hand-run playwright inline for a banner —
the npm script is the reproducibility contract. Commit the HTML source
together with the PNG; a banner whose source is lost cannot be
edited, only replaced.

## Design language (keep banners recognizably one family)

- **Canvas**: `1200×630`, background `#050a18` with two soft radial
  glows — indigo (`rgba(99,102,241,…)`) high, cyan
  (`rgba(34,211,238,…)`) low — plus a faint blue grid masked to the
  center (see any existing banner source for the exact recipe).
- **Type**: prose in the sans stack (`'Geist', 'DejaVu Sans', 'Inter',
  sans-serif`) — titles, subtitles, labels, footers are NOT monospace.
  The REAL Geist faces are vendored in `banners/fonts/` (latin woff2
  subsets, OFL-licensed) and every banner MUST start its `<style>` with
  the two `@font-face` blocks pointing at them (copy from any existing
  banner) — the renderer runs offline from file://, so without the
  vendored faces Chromium silently falls back to DejaVu.
  Monospace (`'Geist Mono', 'DejaVu Sans Mono'`) is reserved for CODE
  REFERENCES only: terminal-window content, expressions/chains, API
  names like `Reactive()` inside a title, lint-rule names, and the
  `∞ ivue blog` brand mark (a code identity). Use a `.mono` class for
  inline code tokens inside sans text. Headline in near-white
  `#eaf2ff` with a blue text-shadow; the ONE key phrase in glowing
  cyan `#67e8f9`. Supporting text in muted blue `#7e9cd0`/`#52688f`.
- **Motifs that already exist** (reuse before inventing): the glowing
  terminal window with traffic-light dots and real, syntax-colored
  ivue code; crossed-out concept chips funneling into a claim; the
  thin cyan beam/rule (`box-shadow` glow). The `∞ ivue blog` brand
  mark appears once, small.
- **Content rule**: the banner states the post's thesis at a glance —
  a claim plus at most one supporting line. Numbers only if they are
  the post's headline numbers. If the banner shows code, the code
  must be valid ivue-standard code (namespace pattern, real API).
- **Lockup clear zone**: the brand lockup
  (`brand-lockup-dark.png`, 178px wide at `top: 34; left: 44`) owns
  the top-left corner — its box runs to roughly `y = 96`. No content
  may overlap that box, and the FIRST content row below it (motif
  pills, terminal window, anything) starts at `top: 116px` or lower,
  so the logo always keeps ≥ 20px of clear air beneath it. Content
  that sits beside the logo (right of `x ≈ 260`) may ride higher, but
  never closer than 20px to the lockup's edge. When checking the
  rendered PNG, the logo touching or crowding content is a fail —
  re-offset and re-render.

## Verification loop (mandatory)

1. Render via the pipeline.
2. **Read the PNG** (view it — never ship unseen) and check:
   text does not overlap or clip, nothing touches the canvas edge,
   the glow phrase is the right phrase, code in the terminal motif is
   correct ivue.
3. Multi-line headlines collide with subtitles at large font sizes —
   when a headline wraps, re-measure the absolute `top` offsets of
   everything below it (this has already bitten once).
4. The post and `docs_v2/blog/index.md` card reference
   `/blog/<slug>.png` with `width="1200" height="630"`.

## Renames

If a post's slug changes: rename the HTML source, re-render to the new
PNG path, delete the old PNG, and update the post image line + index
card. The banner headline usually needs the new title too — a stale
headline in the image outlives every markdown fix.
