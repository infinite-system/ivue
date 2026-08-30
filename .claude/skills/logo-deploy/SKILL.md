# logo-deploy — propagate a change to the ivue mark everywhere

The ivue mark (gradient tile + infinity stroke) lives in MULTIPLE
rendered artifacts. Changing it in one place and not the others ships a
brand fork. This skill is the full propagation pipeline; run it top to
bottom whenever the mark's colors, stroke, gradient, or treatments
change. Nothing here auto-syncs — every step is explicit.

## The four SVG sources (edit ALL of them, identically)

The mark's geometry/gradient/stroke is duplicated in four files that
must stay visually in sync:

1. `docs_v2/public/logo.svg` — site nav + favicon source. **Fully
   flat** (viewBox `0 0 48 48`, no internal filters, no CSS glow):
   Safari smears SVG filters at 24px, so the nav renders the mark with
   no effects at all. The shadow + white-glow infinity treatment
   exists only in the rendered PNGs (lockups, hero, banners), never in
   this file.
2. `docs_v2/public/bimi.svg` — BIMI avatar. **SVG Tiny-PS**: must keep
   `baseProfile="tiny-ps"`, a `<title>`, NO filters/effects — flat
   full-bleed gradient rect (0,0,48,48) + the infinity stroke.
   Gradients are allowed; drop-shadows are not.
3. `.claude/skills/blog-banner/lockup/lockup.html` — the full lockup
   (tile + "ivue" + "INFINITE VUE") source. Only used if the lockup is
   ever rebuilt whole; day-to-day the composite below is used instead
   so typography never drifts.
4. `.claude/skills/logo-deploy/tile-only.html` — the 452×384 tile-only
   render used by the lockup composite. Tile svg 336px at (24,24);
   `.tile path` carries the shadow + white-glow infinity treatment.
   **No tile glow here**: a glow baked into the canvas dies at its
   24px edge and reads as cut off — the hero's tile glow is a CSS
   radial (`.ivh-lockup-wrap::before` in IvueHero.vue), where nothing
   clips it.

Current mark (as of the sky-gradient iteration): tile gradient `#6366F1
→ #34D399` (id `g`/`ivg`), infinity stroke gradient id `inf` `#BAE6FD →
#FFFFFF` (x1=10 y1=16 x2=38 y2=32, userSpaceOnUse), stroke-width 3.2,
round caps/joins.

## Step 1 — favicons

```bash
node docs_v2/scripts/favicon-generator.mjs
```

Reads `docs_v2/public/logo.svg`, normalizes the viewBox to `0 0 48 48`
(the padded viewBox otherwise renders the favicon smaller than other
sites' — this bit once), renders full-bleed variants (gradient rect
expanded to `x=-2 y=-2 w=52 h=52`) for apple-touch-icon and the
maskable icon, and packs `favicon.ico`. Outputs land in
`docs_v2/public/`.

## Step 2 — brand lockups (the composite — typography is FROZEN)

`brand-lockup-{dark,light}.png` (993×384) are used by every banner and
OG. The "ivue / INFINITE VUE" typography pixels are **never
re-rendered** — a from-scratch rebuild changed the font once and had to
be rolled back. Instead: extract the original typography from git
history, re-render only the tile, composite.

```bash
# one-time per session: extract frozen typography (commit 9c4d778^ is
# the last one with the original type render)
git show 9c4d778^:docs_v2/public/brand-lockup-dark.png  > /tmp/orig-dark.png
git show 9c4d778^:docs_v2/public/brand-lockup-light.png > /tmp/orig-light.png

# render the tile (transparent, 452×384)
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 452, height: 384 } });
  await p.goto('file://' + process.cwd() + '/.claude/skills/logo-deploy/tile-only.html');
  await p.screenshot({ path: '/tmp/tile-only.png', omitBackground: true });
  await b.close();
})();"

# composite: typography cropped from x=440, nudged DOWN 2px (approved
# alignment), tile alpha-composited over the top-left
python3 - <<'EOF'
from PIL import Image
tile = Image.open('/tmp/tile-only.png').convert('RGBA')
for theme in ('dark', 'light'):
    orig = Image.open(f'/tmp/orig-{theme}.png').convert('RGBA')
    W, H = orig.size
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(orig.crop((440, 0, W, H - 2)), (440, 2))
    out.alpha_composite(tile, (0, 0))
    out.save(f'docs_v2/public/brand-lockup-{theme}.png')
EOF
```

## Step 3 — blog banners (embed the dark lockup)

Every banner HTML references `brand-lockup-dark.png`, so all must be
re-rendered:

```bash
for f in .claude/skills/blog-banner/banners/*.html; do
  slug=$(basename "$f" .html)
  npm run render:banner --silent -- "$f" "docs_v2/public/blog/$slug.png"
done
```

## Step 4 — page OG images

```bash
npm run render:page-og
```

Outputs to `docs_v2/public/og/` (~54 images).

## Step 5 — in-app inline copies of the mark

- `docs_v2/.vitepress/theme/components/NewsletterSignup.vue` — the
  "ivue blog newsletter" card's `.newsletter__mark` SVG duplicates the
  tile + stroke gradients inline (dynamic `useId()` gradient ids).
  Update its stops/stroke when the mark changes.
- The nav logo has NO glow by decision — `logo.svg` is flat and there
  is no `.VPNavBarTitle .logo` filter (Safari smeared it; it was then
  removed for all browsers). Don't reintroduce one casually.

## Verification (mandatory before showing the user)

- Read `docs_v2/public/brand-lockup-dark.png` — typography must be
  pixel-identical to before (only the tile changes).
- Screenshot the dev-server home hero in BOTH themes (headless needs
  `reducedMotion: 'no-preference'`).
- Read `docs_v2/public/favicon-32.png` and one regenerated banner.
- BIMI preview: circle-crop `bimi.svg` rendered to PNG (mail clients
  crop to a circle) — inline as data URI, `file://` imgs don't load in
  `setContent` pages.

## Out-of-band consumers (no action, but know they exist)

- **Newsletter emails** use the blog banner PNGs (rendered at SITE
  build into `blog-index.json`) — a site push ships the new mark, no
  Worker deploy.
- **BIMI DNS** (user-side, not yet live): needs DMARC `p=quarantine`+
  and `default._bimi.ivue.dev TXT "v=BIMI1; l=https://ivue.dev/bimi.svg;"`.
- The newsletter signup page's own inline `brand-glyph` SVG (in
  `newsletter/` templates) is a separate copy — check it if the mark
  change should reach the signup page too.

## Don'ts

- Never rebuild the lockup from `lockup.html` for a tile-only change —
  the composite exists precisely because a rebuild altered typography.
- Never add filters to `bimi.svg` (Tiny-PS validation fails silently at
  mail providers).
- Never hand-run playwright for banners — `npm run render:banner` is
  the reproducibility contract.
- Don't commit any of it until the user approves the look — brand
  iterations are explicitly approval-gated.
