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
- A module singleton store is a `static readonly shared = new
  LazyShared(() => new X.Class())` cell plus `static use()`; consumers
  call `X.Class.use()` through the slot. `LazyShared` is vendored at
  `examples/playground/src/LazyShared.ts` beside `Static.ts`.
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

