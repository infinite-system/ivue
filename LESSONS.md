# LESSONS.md — hard-won lessons that must not perish

Knowledge base for humans and AI agents working on this repo. When a
session learns something the hard way (a broken build, a wrong published
number, a shell trap), it gets a bullet here — with the failure that
taught it. Sessions append; periodic curation merges and retires
superseded entries (history stays in git). Read this before touching
benchmarks, docs, deploys, or releases.

## Benchmarking — the escape-proof protocol

Three published tables were wrong before these rules existed. Every wrong
number was a **harness artifact, not library behavior** — when a number
"seems wrong", suspect the harness first.

- **Retain what you create.** Instances created but never read get elided by
  the JIT — `reactive()` once showed 0.0ms for 100k creations. Push every
  instance into a retained array and do a liveness read pass after timing.
- **Measure heap _observed_, not at rest.** Reading state outside an effect
  flatters proxies: `reactive()`'s dependency storage only allocates when the
  first observer subscribes, so at-rest it looks smaller than ivue — which is
  impossible in real apps. Protocol: read every property inside a
  per-instance subscribing effect, then snapshot heap.
- **Loop inside the timed region.** Calling the measured op through a fresh
  per-iteration closure adds uniform overhead that masks real gaps — it hid a
  3× difference (dotted method ~4ns vs hoisted ~1.4ns).
- Heap standard: **100k instances** (1M OOMs the VM), 10 refs + 30 derivations.
- Published numbers always carry method + environment. Never publish a number
  not re-run under this protocol.

## VitePress (docs_v2) traps

- The markdown-it base-prefix pass must rewrite **`href` only, never `src`** —
  VitePress resolves image `src` (public dir + base) itself; prefixing src
  breaks the Rollup build ("failed to resolve /ivue/...png").
- Frontmatter values starting with `"` or a backtick break YAML — single-quote
  or rephrase.
- Literal `{{ }}` in prose SSR-compiles as interpolation — rephrase or `v-pre`.
- Scope wide CSS to `.VPDoc`: `.benchmarks-wide .content` once matched the
  navbar's `.content` and broke it.
- Dead in-page anchors do NOT fail the build — check linked anchors in built HTML.
- **Deployment 404 recovery must observe client-side route failures.** VitePress
  catches a missing page chunk, retries its cached `hashmap.json`, and can render
  its 404 component without re-running any startup script. A document-load-only
  404 check therefore misses the exact stale-deployment failure that a manual
  refresh fixes. Hook `router.onAfterRouteChange`, and distinguish a stale
  failure from a genuine 404 by checking whether the requested route exists in
  the current `__VP_HASH_MAP__`; hard-reload a known route once, with a session
  guard.
- Code-block scrolling: the `div[class*='language-']` wrapper owns
  `max-height` + `overflow-y: auto`; the inner `pre` must stay
  `overflow-y: visible` — otherwise double scrollbars and desynced line numbers.
- After ANY docs change: `npm run build:docs` must pass before claiming done.

## Shell / environment (Parallels Linux VM, shared macOS node_modules)

- **Never rebuild native binaries / `npm ci`** — node_modules is shared with
  the macOS host; rebuilding breaks the other side.
- `pkill -f 'vite demo'` matches and kills its own invocation (exit 144) —
  always bracket the pattern: `pkill -f '[v]ite demo'`.
- Foreground `sleep` is blocked in the agent sandbox (exit 144), and
  `curl --retry-delay` sleeps too — run waiting commands in the background.
- **Backticks inside `git commit -m "..."` execute as commands** (yields
  `ivue: command not found` + a truncated message). Single-quote messages.
- `echo 'x' >> file` glues onto the last line when the file lacks a trailing
  newline — check before appending (this once corrupted .gitignore).
- Docs dev server runs at `localhost:5174/ivue/` — the `/ivue/` base matters.
- Adding pure-JS deps: `npm install --ignore-scripts` (no native
  rebuilds against the shared node_modules); re-run tests + builds after.
  Lockfile policy lives in "Deployment & CI" below.

## Library / packaging

- **The exports map is a release gate.** `ivue/hmr-plugin` was once
  unresolvable (only `"."` exported) AND shipped as raw TS that node can't
  load from a vite.config. Subpaths must be compiled (`dist/*.mjs` + `.d.ts`)
  and exported. Test `import('ivue/subpath')` from a packed tarball
  (`npm pack`) before publishing.
- `import.meta.env.DEV` must stay a static **dotted** read so production DCE
  works; `import.meta.env['TEST']` must stay a **bracket** read — vitest
  statically inlines the dotted form and creates untestable phantom branches.
- v8 coverage quirks: `??` remaps to phantom branches (prefer statement-level
  `if`); the test transform strips comments, so source-scanner comment paths
  are only reachable via `new Function` raw sources.
- String processing on user source (hmrNormalize): a state-tracking scanner
  beats regex — the regex version collapsed whitespace **inside string
  literals**, silently corrupting semantics.
- **Native `#private` brands change on every class evaluation, even when the
  source is identical.** Class HMR must treat the presence of a native private
  member as rebuild-required and invalidate the owner boundary; grafting donor
  methods onto old branded instances throws. Source detection must ignore `#`
  inside strings, templates, comments, and regex literals.
- Production size gate: the engine is ~1.1 KB gzipped — re-verify the build
  size after any engine edit; DCE regressions are silent.

## Component authoring (fields, props architecture)

- **Shared prop-descriptor mutation was a live bug.** `{ ...baseParamsTypes }`
  copies the outer object but every inner `{ type }` descriptor stays shared;
  a mutating `propsWithDefaults` then rewrote the BASE component's defaults
  when a wrapper applied different ones (every plain ChooseField silently
  inherited ContactField's `fetchPath: '/contact'` and listed contacts).
  `propsWithDefaults` is now non-mutating (copies descriptors) and the spec
  asserts non-mutation. Cost: engine 1,131 → 1,148 B gzipped.
- **A standalone app absorbed into another app must shed its global CSS.**
  The flyweight sketch's `body`/`h1`/`:root{color-scheme}` rules rode into
  the docs bundle and painted the whole site dark in light mode. Scope every
  absorbed app's chrome under its root class (`.fw-page`).
- Quasar in a host app: import `quasar.css` inside a CSS `@layer` — layered
  rules lose to the host's unlayered ones, so Quasar's body-level resets
  can't restyle the shell while `.q-*` components keep their look. Portals
  (menus/dialogs) stay styled because the layer is still global.

## Design stances (deliberate — do not "fix")

- **Dark-first is intentional.** The docs' light mode is supported but
  second-class by design (the audience lives in dark mode); don't spend
  polish budget there unprompted.
- **The API reference is thin because the API is thin.** Small surface is
  the product claim — never pad the reference to look substantial.
- StackBlitz boot + deep links verified working end-to-end (2026-07-13).

## Docs writing (full rules: `.claude/skills/write-docs/SKILL.md`)

- Timeless present — never contrast against a draft state the reader never
  saw ("it is Y, not X" where X never shipped).
- Never reference by number ("Principle #4") — numbering changes; link by name.
- One name per concept everywhere (it's an "invariant", never law/rule/principle).
- Every code block follows the ivue skill; blocks with a filename comment are
  full-canon templates; class files are PascalCase.
- Live demos import the SAME files the page shows as code blocks.
- The ivue skill file is the source; `docs_v2/guide/standard.md` is a spliced
  mirror — never edit the mirror directly.
- Theme styles every guide blockquote as an invariant card — reserve `>` for
  statements that deserve it.

## Big lists (the 1M-row scroller)

- A million items stay memory-sane by sharing ~24 body-string variants and
  rendering the row number from a `position` field — unique strings per row
  cost hundreds of MB. Measured result: 12 DOM rows, ~201 MB total page heap.

## Unified playground (examples/playground)

- **Playground example order MUST match the docs sidebar example order.**
  The `examples` array in `examples/playground/src/examples/index.ts` drives
  the StackBlitz/playground sidebar; keep it in the SAME order the docs
  `config.ts` lists them (Basic Examples top → Advanced Examples), so a
  visitor arriving from a docs page finds the playground laid out the same
  way. Adding an example = update both, in the same slot.

- **Everything in an example is written in ivue — including the bootstrap.**
  Route SFCs, demo templates, the app shell that displays an example: all of
  it uses the class + namespace + state-destructure standard, never plain
  script-setup ref soup. The examples ARE the advertisement; a wrapper
  written the "ordinary" way undercuts the claim on the page.

- **The playground must be self-contained.** StackBlitz's github import
  mounts ONLY `examples/playground/` — any import reaching outside that
  folder works locally and breaks on StackBlitz. Engine access goes through
  the synced `src/ivue.ts`; everything else lives under `src/examples/`.
- **A nested `tsconfig.json` with a relative `extends` poisons vite builds.**
  Absorbing a standalone vite app into another app's `src/` tree makes
  esbuild pick up the nested tsconfig and fail on its now-wrong `extends`
  path — delete the absorbed app's chrome (tsconfig, vite.config,
  index.html, main.ts, env.d.ts); the host app provides all of it.
- The v1 Quasar fields (BlChooseField/BlChooseContactField/BlMediaField,
  in git history at `be701dd:docs/docs/components/field/`) are ~4,900 lines
  coupled to the Blackline app (API services, stores, auth, axios boot) —
  porting them is a stub-the-backend project, not a file conversion.
- **The app shell must have a HARD viewport height — the virtual scroller
  requires a bounded container.** Switching `.shell` to `min-height` (for a
  sticky sidebar) made the stage's height content-driven, and the scroller
  sizes its render window from its container: bigger container → more rows
  rendered → bigger container. Measured runaway: 2,565 → 5,265 DOM items in
  12s of autoplay. Tall examples scroll inside `.stage-body`
  (`overflow-y: auto`), never by growing the page; Lenis wraps its own
  element, so nothing in the playground needs body scroll. The narrow
  (column) layout needs `min-height: 0` on `.stage` too — a flex item's
  automatic minimum size is its content height, so without it `flex: 1`
  cannot bound the stage and the same runaway returns ONLY under 720px
  (the StackBlitz narrow preview pane) while desktop tests pass.

## Process

- **Verify before claiming**: browser-drive every live embed, screenshot both
  themes for design changes, run a 375px horizontal-overflow check after
  layout changes.
- CLI `--all`-style flags detect-and-equip existing tool footprints; they
  never scaffold vendor folders the project doesn't use (see `bin/ivue.mjs`).
- **Teardown must survive user cleanup failures.** A throwing `stopEffects()`
  hook once prevented the instance scope from stopping and left cached cells
  alive. The hook itself was later removed (ivue auto-calls NOTHING — richer
  cleanup composes as an ordinary method calling `$stopEffects()`), but the
  discipline stays: keep scope shutdown and cache deletion in `finally` paths
  so a throwing `scope.stop()` can never leak cached cells.

## Deployment & CI (Cloudflare Workers)

Two git-connected Workers Builds projects deploy on push to `main`
(branch pushes get preview URLs). Their config lives in the CF
dashboard — the one unversioned piece — so it is recorded here:

- **Site** — project `ivue`, assets-only Worker (root `wrangler.jsonc` +
  `docs_v2/public/_headers`: `!` detach then immutable for `/assets/*`).
  Build command:
  `npm install --prefix docs_v2 && npm install --prefix examples/playground && npm run build:docs`,
  env `SKIP_DEPENDENCY_INSTALL=1` (docs need NO root install). Deploy
  command pinned: `npx wrangler@4.120.1 deploy`.
- **Newsletter** — root directory `newsletter/`, watch paths
  `newsletter/**`, deploy command
  `npx wrangler@4.120.1 d1 migrations apply ivue-newsletter --remote && npx wrangler@4.120.1 deploy`.
  Ops manual: `newsletter/README.md`.

Lessons that shaped this setup:

- **Deploys are atomic; the in-page recovery script is load-bearing.**
  Old content-hashed chunks vanish at the instant of deploy, so a tab
  opened before a deploy 404s on its next lazy import. The recovery
  layer in docs_v2 config + theme (`vite:preloadError` reload,
  static-404 + route-not-found + unhandledrejection handling with a
  session-guarded hard reload) is the ONLY defense — never remove it
  while lazy chunks exist. (The gh-pages era solved this with an
  append-only asset-retention script, retired with the CF move.)
- **Pin every tool in the deploy path — versions AND defaults.** Three
  incidents, one family: Cloudflare's yarn-sniffing broke on a fossil
  yarn.lock; `actions/setup-node@v5` turned on lockfile-requiring cache
  BY DEFAULT (fix: `package-manager-cache: false`); unpinned
  `npx wrangler deploy` broke when wrangler@4.121.0 shipped with an
  unpublished miniflare dep (fix: pin 4.120.1; bump deliberately). An
  unpinned default breaks on the TOOL's release schedule, not ours.
- **The repo root has NO lockfile — deliberately (2026-08-10).** The
  fossil yarn.lock triggered yarn detection against an npm-evolved
  package.json; `packageManager` in package.json pins the manager.
  Never commit a root package-lock.json (root installs are dev-only
  against the shared node_modules). `docs_v2/` and
  `examples/playground/` DO carry npm lockfiles — those are what CI
  installs.
- **Wrangler resolves the NEAREST wrangler.jsonc.** Root = the site's
  assets Worker; `tail`/`deploy` for the newsletter run from
  `newsletter/`. Site fast-lane deploy from the root is legit
  (`npm run build:docs && npx wrangler@4.120.1 deploy`) — always build
  first; push remains the source of truth.
- CI (`.github/workflows/ci.yml`) runs `npm run coverage`, NEVER
  `npm run test` (interactive `--ui`, hangs headless). CI must not grow
  a deploy job — Workers Builds owns deploys.

## Terminal-grid SVG screenshots: vectorize box-drawing glyphs (2026-08-12)

- The pty→SVG screenshots showed "dashed" splitters/borders: `│ ─ ╭╮╰╯`
  were emitted as SVG *text*, and font glyphs don't span the full cell.
  Real terminals special-case box-drawing characters and stretch them to
  cell edges — the SVG generator must do the same (vector rects/paths).
  Fixed in invar's `scripts/harness/screenshot-svg.ts` (`boxShape()`);
  background rects also carry `shape-rendering="crispEdges"` to prevent
  antialiasing seams between rows at fractional scales. No overdraw
  needed — crispEdges + exact geometry renders clean.
- Debugging trap: the user's "still broken" sightings were the DEPLOYED
  site serving pre-fix files (commits unpushed). Before tuning a visual
  fix further, confirm which build the reporter is actually looking at —
  local dev, local build, or production.

## Newsletter launch debugging chain (2026-08-16)

Four faults, each invisible until instrumented — the fix each time was
logging the VERDICT, not just the failure:

- Mail-adjacent DNS records must be DNS-only (grey cloud). A proxied
  CNAME (pm-bounces → pm.mtasv.net) serves Cloudflare proxy IPs, so the
  provider's verifier never sees the target — and bounce routing would
  break even if verification passed. TXT records (DKIM) are immune.
- Turnstile keys both start 0x — `invalid-input-secret` after a working
  widget almost always means the SITE key was pasted as the secret. The
  secret needs a reveal click in the dashboard.
- Postmark scopes streams AND tokens per SERVER. Error 1235 ("stream
  does not exist") with a stream you can see in the dashboard means the
  token belongs to a different server than the stream.
- Wrangler picks up the nearest wrangler.jsonc: `tail`/`deploy` from the
  repo root hits the site's assets-only Worker. Newsletter commands run
  from newsletter/ (or --config newsletter/wrangler.jsonc).

## Deploy-race blank page: VitePress swallows the failure — guard BEFORE navigation

Symptom: a tab running an old build navigates after a deploy and lands
on a blank/broken page. Rescue handlers on `vite:preloadError` and
`unhandledrejection` NEVER fire for this: VitePress's router catches
the failed page import internally (`loadPage` catch), refetches
hashmap.json, retries, and either renders the not-found fallback or
mixes new chunks into the old app. After-the-fact rescue is the wrong
layer.

The fix that works (`docs_v2/.vitepress/theme/deploy-guard.ts`): every
page inlines `__VP_HASH_MAP__` and the server serves `/hashmap.json`
with max-age=0 — navigation breaks EXACTLY when they disagree. Gate
`router.onBeforeRouteChange` (awaited + cancelable) on that comparison
against the map SNAPSHOTTED AT BOOT (VitePress overwrites
`window.__VP_HASH_MAP__` on its retry, so the live global lies);
if stale, cancel and `location.assign` — a full load onto the new
build. Background checks on `visibilitychange` and bfcache `pageshow`
pre-arm the verdict. Fail OPEN on network errors.

Testing traps: (1) a quick deploy-A/deploy-B test can FALSE-PASS —
hashed chunks are immutable-cached, so the old chunk URL often still
resolves from edge/browser cache minutes after a deploy; assert the
MECHANISM (probe variable wiped by full reload + guard state), not
just "page rendered". (2) An 800ms timeout on the pre-nav check
fail-opened in the first live test; 2500ms is the shipped value.
Field debugging: `__ivueDeployGuard.state()` / `.check()` in any tab.

## GitHub releases go out via gh (2026-08-23)

`gh` (GitHub CLI) is installed on this machine and the user knows how
to authenticate it (`gh auth login -h github.com`; the keyring token
occasionally invalidates — `gh auth status` tells you). Release
tags follow `ivue@X.Y.Z`, matching npm.

The whole release-post flow, after the notes file exists and main is
pushed:

    gh release create ivue@X.Y.Z --target main \
      --title "ivue@X.Y.Z — <headline>" \
      --notes-file releases/ivue@X.Y.Z.md

One command creates the remote tag AND publishes the release with the
committed notes (they render as markdown). No separate `git tag` /
push-tags step. The USER runs it — same rule as `git push` and
`npm publish`: outward publishes are theirs. Agent prepares the notes
file (`releases/ivue@X.Y.Z.md`), bumps `package.json`, verifies tests
+ gzip size, commits, syncs dates, deploys the docs; the user pushes,
publishes to npm, and runs the `gh release create`.

## filter: blur() on large elements is an iOS Safari killer

Symptom: opening the mobile menu on the HOME page felt heavy on
iPhone Safari — guide/blog/community pages were fine, and the menu is
identical everywhere. Cause: the hero's two glow blobs carried
`filter: blur(90px)`. iOS re-rasterizes a gaussian that size on every
repaint of the region, and the menu opening over the hero forces
exactly that repaint. Desktop Chromium (even at 6x CPU throttle)
barely shows it — do NOT trust Chromium timings for iOS paint costs.

Fix: delete the filter. The blobs were already radial gradients
fading to transparent, so the blur was visually redundant. The rule
going forward: soft glows are PRE-SOFTENED with gradients, never
produced by `filter: blur()` on large boxes.

Diagnostic method that found it (after animations, Turnstile,
transitions, tap-delay and :has() were all falsified): binary-search
by PAGE, not by feature — "which pages feel slow?" localized it to
the one page, then the one above-the-fold section, then one property.
Also learned along the way, all still true and kept: Turnstile defers
to first form interaction (was mounting an iframe on page load AND
inside the mobile menu); no `body:has(...)` rules (whole-document
restyle every time the target mounts); `touch-action: manipulation`
on tap targets; `content-visibility: auto` on below-fold home
sections.

## Kill your test servers — the CPU-cap incident

A session left running at once: two `wrangler dev` instances (workerd +
miniflare + esbuild watchers EACH), an `npx serve`, and an orphaned
headless Chromium (a Playwright script threw after launch, so
`browser.close()` never ran — node exits on uncaught rejection and the
browser survives as an orphan). Together they capped the VM's CPUs and
forced a reboot.

Rules: one dev server at a time, kill by port when done
(`kill $(lsof -t -i:PORT)`); wrap Playwright drives in try/finally so
the browser closes on error; before ending any session that started
background processes, sweep:
`ps aux | grep -E "wrangler|workerd|serve|chrom" | grep -v grep`.

- **VitePress intercepts link clicks on `window` in the CAPTURE phase** (`router.js`): it runs before any element handler, so `event.preventDefault()` / `stopPropagation()` in a Vue `@click` are too late — the router still `go(href)`s, and a `history.go(-n)` you fire afterwards walks back from the NEW entry (symptom: wrong page + history length grows by one). To own a click on an internal `<a>`, put `vp-raw` on the anchor (the router skips `.closest(".vp-raw")`), or use a `<button>` (it skips `closest("button")` too). `BlogBackLink.vue` is the reference.

- **Never patch a large generated/authored TS file with ad-hoc sed/python splices** — two rounds of "replace this block" scripts left `check-standard.ts` with duplicated regions and phantom syntax errors that cost more than the file was worth. When a multi-hundred-line file needs structural surgery, truncate and re-Write it whole from the known-good content; `Edit` with unique anchors for small changes only. Corollary: a script that computes slice indices must assert `findIndex !== -1` before slicing — a `-1` fed to `slice(end+1)` silently duplicates the whole file.

- **Bun exits before draining microtasks scheduled from a `beforeExit` handler** — a `process.once('beforeExit', () => main().then(code => process.exit(code)))` bootstrap loses the exit code under Bun: the process exits 0 before the `.then` runs, so every refusal reports success (the purest silent-instrument failure — CI green forever). Node drains those microtasks; Bun 1.4 does not. Fix: hold the loop open with a `setInterval` keep-alive until `main` resolves, then `clearInterval` + `process.exit(code)`. Applies to every deferred-main CLI bootstrap (ivue-standards-check.ts, invariants-check.ts); ALWAYS verify a CLI's nonzero exit paths with `cmd >/dev/null 2>&1; echo $?` — piping through `tail` reports the pipe's exit, not the command's, which is how this hid twice.

- **Lenis adopts native scroll on animation COMPLETE, not just on native scroll events** — `reset()` (called when a lerp finishes) sets `targetScroll = actualScroll`, and in a fully-virtual scroller the wrapper's native scrollLeft/scrollTop is pinned 0, so the first completed wheel lerp teleports the content back to origin. The vertical scroller never hit it in years because its autoplay creep re-targets before any lerp completes. Fix: `ignoreNativeScroll` option in the fork (reset keeps `animatedScroll`; onNativeScroll returns early) — and remember the fork's constructor DESTRUCTURES options: an unknown key silently vanishes (`lenis.options.myFlag === undefined` is the tell). Debug technique that found it: `Object.defineProperty(lenis, 'targetScroll', {set(v){log(stack)}})` — watch the mutation, not the symptom.

- **Headless Chromium reports `prefers-reduced-motion: reduce` by default** — every motion-gated feature (the drip showcase's autoplay, any `matchMedia('(prefers-reduced-motion: reduce)')` early-return) silently no-ops in a Playwright probe, and the symptom reads exactly like a regression you just introduced (transform never moves). Cost a debugging loop that ended with probing PRODUCTION to prove the "breakage" was pre-existing. Rule: pass `reducedMotion: 'no-preference'` in `browser.newPage()` for any drive that expects animation. Related: `el.__vueParentComponent` probes only work on DEV builds — on a built site the property is absent, so exposed-instance probes return null without meaning anything.

- **A mechanical rename can eat CSS properties and Vue style-binding keys** — the scroller's axis-neutral rename (height→size) converted `.virtual-scroller { height: 100% }`, the spacer bindings `:style="{ height: ... }"`, the thumb height and a transition property into `size:` — which is NOT a CSS property, so the browser silently ignored all of them. Result: spacers rendered at 0px, the scroller element grew with its content, `containerSize` tracked that growth, and the visible-window walk extended forever — thousands of rows accumulating in the DOM, dragging the whole page's frame rate down (diagnosed as "marquee is choppy"; the marquee was fine — the broken demo above it was flooding the page). Rules: rename identifiers, never string-replace across CSS/template-style territory; after any rename touching a layout word (height/width/top/left/size), grep the diff for it inside `<style>` blocks and `:style` bindings; and verify long-running behavior (window size over 15+ seconds), not just first paint — this bug looked perfect in every screenshot.

- **Playwright's synthesized shift+wheel never becomes deltaX** — the shift+wheel → horizontal-scroll conversion happens in the real browser's input pipeline, BEFORE the page event; `page.mouse.wheel(0, N)` with Shift held arrives as `{deltaX: 0, deltaY: N, shiftKey: true}` and a `gestureOrientation: 'horizontal'` lenis refuses it. Worse, the test can silently "pass": the strip keeps moving under its own autoplay creep, so a before/after transform delta reads as a successful scrub that never happened (this invalidated two earlier scrub verifications). To drive a horizontal-gesture surface in a harness, dispatch the converted event yourself: `el.dispatchEvent(new WheelEvent('wheel', {deltaX: N, deltaY: 0, bubbles: true, cancelable: true}))` — and prove any input test with a probe the autonomous motion can't satisfy (event counters, lenis.targetScroll).

## Playground typecheck and gate (2026-09-05)

- There is no `vue-tsc` in this repo. To typecheck the playground's
  class files run `npx tsc --noEmit -p examples/playground/tsconfig.json`
  — it carries ~45 pre-existing errors (`.vue` module resolution, a few
  nullability spots in VirtualScroller). The useful signal is the DIFF
  of the error set, compared with line numbers stripped
  (`sed -E 's/\(([0-9]+),([0-9]+)\)//'`), before and after a change.
  SFC `<script setup>` lines are NOT typechecked by it — `npm run
  build:docs` compiles the scroller/marquee SFCs and is the runtime
  gate for those.
- The standards gate runs on the playground with explicit roots
  (`npm run gate -- --source-root examples/playground/src/examples/<dir>`);
  it has ~187 pre-existing findings there. Diff findings before/after
  (`git stash -u`, run, `git stash pop`, run) and fix only the delta.
- The playground vendors `Static` at `examples/playground/src/Static.ts`
  (imported as `'../../Static'`), beside the synced `src/ivue.ts` — the
  vendored engine does NOT export `Static`.
- The gate's anchor rule is the tie-breaker for the contract-as-statics
  shape: any class that DECLARES a static (including a subclass that
  overrides one) anchors with `Static()`; a subclass that only inherits
  stays raw.

## Invar numbers come from its census (2026-09-05)

- Every public Invar statistic (source lines, classes, contracts,
  `computed()` count, commits) is read from `~/dev/invar/scripts/census.sh
  --json`, never from memory or an older post. The 2026-09-03 census:
  107,670 source lines / 412 files / 41 modules, 384 classes, 91
  `Reactive()` + 211 `Static()`, 39 contracts, 12 `computed()`, 5,131
  commits. Public copy rounds to "108,000-line"; tables carry the exact
  figure and the census date.
- When the census moves, sweep with grep for the OLD number across
  `docs_v2/blog`, `docs_v2/examples`, `docs_v2/guide`, `README.md`,
  `.claude/skills/my-voice`, the banner sources under
  `.claude/skills/blog-banner/banners` (then re-render those PNGs),
  `docs_v2/scripts/blog-email-renderer.mjs` (the welcome email), and
  `tasks/press-*`. Dated measurements inside a story (the 26k / 69k
  snapshots, "292 commits") stay as history; present-tense claims move.

## The namespace is identity and types only — gated (2026-09-05)

- New gate check `the_namespace_holds_identity_and_types_only`: inside a
  class file's namespace, anything but `export const $Class`, `export let
  Class`, and type declarations is a finding. It caught the parallel
  worlds the sweep missed: `ITEM_COUNT` + `buildItems()` on the two
  scroller examples, the newsletter form's endpoint and keys, the drip
  strip's items, the workspace seed dataset (a data-only namespace → a
  `Static()` class with getters), and the two store singletons
  (`use()` as a namespace function over a `let singleton`).
- A module singleton store is a `protected static get $shared()` that
  returns `new X.Class()` plus `static use()`; consumers call
  `X.Class.use()` through the slot. `LazyShared` is NOT for this — it is
  for a registry several receivers (subclasses) must share; a store has
  one receiver, the slot.
- Proof arms for a new gate check: `npm run gate -- --prove <name>`;
  `--prove` alone runs the whole constitution.

## Examples and guides are one tree (2026-09-05)

- Every `docs_v2/examples/*.md` page ends its prose with "## The guides
  behind it" (the guide pages for its concepts) and every guide page
  that has a demonstration ends with "## See it running" (the example
  pages). Add both sides when adding either kind of page; the
  write-docs self-review has the line.
- Example renames: `git mv` the playground dir + route SFC + docs page,
  update `manifest.ts` (slug, docsPath), `examples/index.ts`, both
  sidebar entries in `config.ts`, `docs_v2/examples/index.md`, the theme
  demo imports (`@examples/<dir>/…`), the StackBlitz link on the page,
  and add a 301 to `docs_v2/public/_redirects`.
- Every example page's code group carries two tabs beside the model
  files: `[example]` (the route's model class) and ONE `[template]` —
  the SFC that actually renders the demo. When the docs component is a
  real demo (`Demo*.vue`), that is the template; when the docs component
  only wraps the playground route (the field embeds, class-store,
  extensible-kernel, workspace-platform), the playground route SFC is
  the template and the wrapper is not shown. Never both — two SFCs
  side by side read as duplication.

## `this.$watch` inside a raw class body is typed by declaration merging (2026-09-05)

- `Reactive()` installs `$watch` / `$watchEffect` / `$stopEffects` after the
  class was typed, so a raw `$Class` body cannot see them. The idiom is
  ONE line beside the class, zero runtime: `interface $X extends
  ReactiveHelpers {}` (`ReactiveHelpers` is exported by the engine; the
  playground gets it through `sync:examples`). Never `(this as any)`,
  never per-member `declare` lines. The residents check treats the merge
  interface named after the file's own class as the class's second half.


## The docs build runs the gate as a ratchet (2026-09-05)

`npm run build:docs` now starts with `npm run gate:docs`: the standard
gate over `docs_v2/.vitepress/theme/components` and
`examples/playground/src` with `skills/ivue/ivue-docs-skip.json` as a
BASELINE skip-list (one row per path + check, 161 rows covering 699
pre-existing findings on 2026-09-05). Why a baseline and not a hard
gate: 49 rows are site chrome (BlogComments, BlogIndex, PerfSlider…)
that CLAUDE.md says migrates opportunistically, never in a sweep.

How the ratchet works — both arms proven at wiring time:
- any NEW finding (a new file, or a new check firing on a file that
  had none of that check) fails the build;
- fixing a file's last finding of a check makes its row STALE, and the
  gate refuses stale rows — so the fix must delete the row, and the
  baseline only ever shrinks.

Before: the two inheritance demos carried 8 template-logic findings for
weeks because nothing ran the gate over docs components. Run
`npm run gate:docs` before claiming docs code is clean; grep-filtering
its output to the checks you just added is how findings hide.

## The deploy build has no root toolchain (2026-09-05)

Cloudflare's build runs `npm install --prefix docs_v2 && npm run
build:docs` — ONLY docs_v2's dependencies exist there. Anything in
`build:docs` that needs a root devDependency (vite-node, typescript,
@vue/compiler-sfc, playwright…) fails the deploy with `sh: 1: <bin>: not
found`. That is exactly how wiring `gate:docs` into `build:docs` broke a
prod deploy the same day it landed.

Rule: a root-toolchain step inside `build:docs` goes through a shim that
detects the missing toolchain and skips with a message
(`scripts/gate-docs.mjs`), and the REAL enforcement lives in
`.github/workflows/ci.yml`, which installs the root. Local `build:docs`
and CI run the gate; the deploy build does not, and does not need to —
the commit it deploys was already gated twice.

## The component sweep — every component, one real interaction (2026-09-05)

`npm run sweep:components` (docs_v2/scripts/component-sweep.cjs) drives
the BUILT docs site and the BUILT playground in headless Chromium and
asserts a real interaction per component — a counter increments, a
range moves a derived label, the pointer pad follows the mouse, the
benchmark builds and switches arms, the formula grid edits A1, the
share button reads "Copied!" with the URL on the clipboard, every
playground route renders and its first button changes the stage. Run it
after any theme/playground change; the header lists the two servers it
expects. Probe lessons that cost time: scroll the target into view
before acting (below-the-fold pads and buttons silently no-op); the
arm tabs have no accessible name, use `.gb-tab`; `type=range` inputs
reject `fill()` — set `.value` and dispatch `input`; StackBlitz never
reaches networkidle, load with `waitUntil: 'load'`.

## Playground CSS is global in the docs bundle (2026-09-05)

VitePress bundles every imported stylesheet into one `style.css`, so a
playground SFC imported by a docs embed makes its CSS site-wide. A dead
`.text` rule in `example-pane.css` put a border around every sidebar link
(VitePress's link label is `<span class="text">`). Rules in shared
playground CSS must be scoped (`.pane .x`) or use names VitePress cannot
own; never `.text`, `.item`, `.link`, `.title`, `.caption`, `.content`.
Check with the sidebar screenshot after adding any docs embed.

## The playground baseline is gone — the skip-list is reasons only (2026-09-05)

`skills/ivue/ivue-docs-skip.json` holds 11 rows and none is dated debt:
vendored Lenis (`lenis/*`), the vendored engine copy (`src/ivue.ts`),
and the creation benchmark's competitor arms (`creationBench.ts`, where
`reactive(new PlainBox())` IS the measured thing). Every other file under
the docs components and the playground passes the gate unmodified.

How the last 174 went, for the next sweep of this kind:
- Member ORDER is an AST move, never a hand edit: parse the class, rank
  members (statics, constructor, getters/fields, methods), re-emit each
  group in original order with a blank line between members, and prove
  the result is a pure move by comparing sorted non-whitespace characters
  before/after (`scratchpad/reorder.ts` pattern). 17 classes, zero
  behavior risk.
- Renames are METHOD-scoped, never file-wide: find the enclosing block
  by brace balancing and rename inside it with a `(?<![\w$.])name(?![\w$])`
  guard. Two collisions to expect: a loop variable renamed to a name the
  body already declares (`i` → `index` where `const index = …` exists —
  pick `slot`), and object KEYS that share the variable's name
  (`{ r, c }`, `['fn']`) — rename the key everywhere or leave it.
- A `computed()` the demo exists to show (a computed chain, the
  getter-vs-computed demo, the ONE hot cell value) is justified with the
  `// computed: expensive | render-suppression | stable-handle` token
  and its body delegates to a level-specific method (`computeBaseTotal`,
  `computeDiscountedTotal` — never one name overridden down the chain, or
  the base computed dispatches to the child and recurses).
- Non-reactive bookkeeping (timers, a dep tracer on a hot path) lives in
  a `readonly` holder object (`readonly timers = { census: null, … }`),
  NOT a shallowRef: a `.value` read inside cell evaluation would make
  every cell depend on the tracer.
- A store that outlives components gets `dispose() { this.$stopEffects() }`
  even if nothing calls it yet — the gate wants the path to exist.
- A module that exports a behavioral OBJECT (`export const Api = { … }`)
  becomes a Static class with its types in the namespace; a transport
  object becomes a factory function (`createMockServerTransport()`), which
  keeps its module a plain module.

## Text selection over a virtual list (2026-09-05)

A native selection is anchored to DOM nodes; a virtual list recycles
them, so the selection collapses when a row scrolls out, copy sees only
the mounted fragment, and the browser's own drag-autoscroll fights the
transform-driven scroll (the thumb and the inner position jump). The
fix is to OWN the selection: `preventDefault` the mousedown (no native
drag-selection → no native autoscroll), keep anchor/focus as logical
`{ index, offset }` positions over the DATA, re-pin the native highlight
with `setBaseAndExtent` on the mounted rows after every window change
(a `flush: 'post'` watch on `visibleItems`), autoscroll with a signed
frame loop that writes `lenis.targetScroll` directly (an upward drag
must not read as the reader taking over), and answer `copy` from the
items. Split: `VirtualScrollerSelection` (Static, pure, DOM-free spec)
+ three refs and the handlers on the scroller. The row's text must be
the same whether mounted (textContent, trimmed of template whitespace)
or not (the `selection-text` prop) — or copy differs across the window.
Sweep probe: drag past the edge, copy, assert lines === selected rows >
mounted rows and the first line starts mid-row. Playwright's
`Control+C` fires the copy event; grant clipboard permissions to read.

## Virtual scroller: the window walk is anchored at the scroll TARGET

The frame loop hands the window walk `lenis.targetScroll`, not the
animated position. During a wheel lerp the mounted window already sits at
the destination while the viewport is still travelling toward it — so a
"blank canvas during a flick" is never an under-padding problem and
velocity-sized padding alone changes nothing (measured: 21/28/35 uncovered
frames of 91, identical with and without a 60-row velocity pad). The
variable that covers it is the lerp gap, `targetScroll - animatedScroll`,
converted to rows on the trailing end of the window; it is exact per frame
and needs no hysteresis. `VirtualScrollerPadding` owns both terms. Two
traps: (1) read Lenis inside the walk, never track it — the walk already
reruns on every position write; (2) a flick that stops autoplay stops the
walk too, so the last pad stays mounted unless the pad class bumps a ref
after its settle window to force one more walk. Probe scripts: sample
`requestAnimationFrame` for 1.5 s after four `mouse.wheel` bursts and count
frames where the mounted rows' union does not cover the frame rect.

## Colocated specs bind to contracts — the testing method

Playground classes are proven by `X.test.ts` BESIDE `X.ts` (the invariants
checker resolves generator headers and source tripwires against the
sibling `X.ts`; a spec under `__tests__/` or named `*.vitest.spec.ts` is
invisible to it). Each spec opens with a generator header; every test
carries its claim above it; records live in a `<subsystem>.invariants.md`
beside the code and are cited verbatim from source enforcement points.
The root vitest include collects `examples/**/*.test.ts` too. Method and
worked example: `docs_v2/guide/testing.md`. Traps found writing the nine
scroller specs: (1) a bare `new` of a class whose constructor registers
hooks warns and drops them — host it in a throwaway component
(`virtual-scroller/hosted.ts`); (2) a test-double getter named after an
EXISTING field (`frame` vs the scroller's rAF handle) is silently
shadowed by the instance field — check the class before naming a probe
getter; (3) `TextChunker`'s width cache is per font and process-wide — a
spec that measures with a stubbed canvas leaves 8 px/char cached for
later specs, so read the average instead of assuming 7.5; (4) jsdom logs
a "not implemented" error for every `getContext` — stub it to null for
the fallback path; (5) the checker's exit code, like every CLI's, must be
read directly — piping into `tail` hid 22 pre-existing problems behind
exit 0 (dist/ artifacts, GitHub-URL contract links in
`docs_v2/reference/invariants.md`, a newsletter test, the constitution's
sibling rule). Born-red discipline: plant one defect per spec file
(`cp X.ts X.ts.bak`, sed the plant, run the spec, `mv` back) and record
the red count — every one of the nine went red on its plant.

## Spacers never snap — the sub-pixel hop

The docs scroller had a subtle, intermittent ~1 px hop during otherwise
smooth wheel glides. Cause: `leadingSpacerPx` was device-pixel snapped
(filed under "landings snap") while the transform under it was fractional
and the rows are 111.375 px tall — at every window move the spacer's
rounding error changed and the visible content hopped by it (measured
−0.157/+0.25/−0.531 px, each on a window-moved frame with an integer
spacer). The realized post player never snapped anything. Rule: only the
transform snaps, and only when a seek lands; spacers are fractional like
the row sums they are. Probe: follow one row's `getBoundingClientRect().top`
per frame and compare its delta to the transform's delta on frames moving
more than 2 px — a difference above 0.1 px is a hop (the docs page reports
up to 0.09 px of noise even on moving frames; the real hops were 0.15–0.53),
and the frame's
`windowMoved` flag names the cause. Do NOT judge creep-speed frames
(0.1–0.2 px/frame): the rect reports the sub-pixel transform quantized,
up to 0.09 px, which the compositor filters into the glide by design —
the first sweep version flagged 22 of those as hops. Permanent instrument:
the sweep step "ExampleVirtualScroller (sub-pixel continuity)".
Frame-timing and velocity-series probes could NOT see this; position
continuity could.

## The transform snaps by speed — the wheel-scroll shimmer

After the spacer hop was gone, wheel scrolls still showed "some elements
shifting by 1 px" while the creep looked perfect. Layout was stable (every
mounted row's `rect.top − transform` constant through a flick, LayoutUnit
noise of 0.011 px aside), so the shift is PAINT: rows sit at fractional
layout tops, and a fractional transform at speed makes Chrome re-raster
the layer at new sub-pixel offsets, snapping each text line and box edge to
whole device pixels independently — neighbours flip by a pixel relative
to each other. Fix in `src/lenis/lenis.ts` `setScroll`: write the transform
on the device-pixel grid when |velocity| ≥ 1 device px/frame, fractional
below (the slow tail and the creep need fractional motion or they tick).
The old realized post player rounded the transform always and felt
solid; the fork went fully fractional for the tail's sake — the answer
is both, split by speed. Rects cannot see this class of defect; only eyes
or a screenshot diff can.

## Touch selection on iOS — three things it needs

(1) The frame must exclude its OWN axis from native panning
(`touch-action: pan-x` on the vertical scroller, `pan-y` on the strip —
a seam getter, `frameTouchAction`). The frame is `overflow: auto` for
Lenis's native-scroll adoption, so without it a finger our long press has
promoted still pans the frame natively once iOS stops honouring
`preventDefault` — `scrollTop` moves under the transformed rows and "all
the text disappears". (2) Autoscroll must begin INSIDE the frame (a 48 px
edge zone, ramping through the edge) — a finger cannot leave a frame that
is the page. (3) iOS shows native selection handles for any programmatic
selection and the reader WILL drag them: adopt `selectionchange` ranges
inside the wrapper into the logical range (signature-guarded against our
own re-pins), or the chip copies something else than the highlight.
(4) iOS runs its OWN long-press text selection on selectable text at
about the same moment our hold promotes, and from then on the finger
belongs to it — our touchmove never fires ("nothing scrolls or extends").
The rows must be `user-select: none` for the length of the hold and
selectable again from the first move. Measured in WebKit 26.5
(Playwright's webkit, needs `libnice10` on this VM): WebKit paints NO
highlight in non-selectable text, neither the native selection
(toString() is even "") nor the CSS Custom Highlight API — so blanket
`user-select: none` on touch is not an option. (5) A native selection changing under a
held finger (our per-frame `setBaseAndExtent`) hands the touch to iOS's
selection handling — the page's touch is cancelled, the autoscroll dies,
the range freezes ("selection disappears, new rows not selected, scroll
up and the old rows are still highlighted"). Paint a touch drag through
the CSS Custom Highlight API (WebKit 26.5 has it; paints on selectable
text) and pin the native selection only on release. (6) Any touchstart that locks
selectability kills an EXISTING native selection and its handles under the
finger — skip the lock when a selection exists. (7) A tap on iOS collapses
the native selection without touching the page: read a collapse we did not
make as a dismissal and clear the logical range, or the copy chip outlives
the highlight. (8) Blind iteration on a phone is the expensive loop — the
docs demo has an on-device log: open `/examples/virtual-scroller?touchdebug`
and every selection call, touch event and thrown error prints under the
stats (`VirtualScrollerExample.attachTouchDebug`). None of this is
testable in jsdom or headless Chromium beyond the unit arms; the iPhone
is the instrument.
