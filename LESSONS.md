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
text) and pin the native selection only on release. (6) The selectability lock must be UNCONDITIONAL: skipping it
when a selection exists (to keep iOS's handles grabbable) hands every
second gesture — the long press that extends, the press near the edge —
back to iOS, the exact failure of (4). Touch extends through the class
instead: a long press INSIDE the range keeps the far end as the anchor
(`farEnd`); a tap on the selection clears it; collapses of the native
selection during a hold are the lock's, never a dismissal. (7) A tap on iOS collapses
the native selection without touching the page: read a collapse we did not
make as a dismissal and clear the logical range, or the copy chip outlives
the highlight. (9) WebKit under a held touch moves a promoted layer but does not
rasterize rows mounted during the move ("blank items after #9", the
scrollbar thumb gone) until the finger lifts — the Lenis fork's Safari
will-change cycle exists for the wheel path; the selection's autoscroll
writes through the scroller and needs the same nudge (`nudgePaint`,
WebKit only — on Chrome the per-frame re-raster shimmers). (10) The fork's Lenis ADOPTS native scrollTop on axes that keep stock
`ignoreNativeScroll: false` — the vertical list did — so any native
nudge of the frame under a touch (iOS makes them) teleported the content
to "scroll 30": rows, thumb and chip left the frame together. Both axes
refuse adoption now, and `onScroll` converts any native offset into a
virtual scroll and zeroes the frame. (8) Blind
iteration on a phone is the expensive loop — the
docs demo has an on-device log: open `/examples/virtual-scroller?touchdebug`
and every selection call, touch event and thrown error prints under the
stats (`VirtualScrollerExample.attachTouchDebug`). None of this is
testable in jsdom or headless Chromium beyond the unit arms; the iPhone
is the instrument.

## Touch selection is owned outright — the system is not a partner

After nine rounds of arbitrating an iPhone's native selection against the
list's touch scroll (locks, adoption, handle reach, paint nudges; every
fix a rule about who yields; the edge never scrolled), the answer was to
stop negotiating: on a device with a touch point the native selection is
never created. `VirtualScrollerSelectionTouchCustom` makes the frame
`user-select: none`, paints the mounted DOM range's client rects as boxes
inside the items wrapper (they move with the transform for free), owns two
handles at the range ends, and hands every drag to the same primitives and
edge loop the mouse uses (`beginFromEnd` for a handle). The earlier
implementation stays in `VirtualScrollerSelectionTouch.ts`; one getter
(`$touch`) swaps them. The mouse path is untouched. Rule for next time: a
capability that must share one input with an opaque system is cheaper to
own whole than to arbitrate.

## Nested object props: Vue never merges, the class completes

- Vue resolves a prop's default ONLY when the prop is absent. A page passing
  `{ wheel: { gain: 2 } }` hands the class exactly that object; the sibling
  defaults are gone. No cloner in `propsWithDefaults` can change that — it
  decides what the default IS, never what a supplied object lacks.
- The fill is possible at all because `propsDefaults` is a value the class
  owns. `nestedProps(props, this.self.propsDefaults)` (`ivue/extras`) at
  the constructor seam fills the nested objects IN PLACE — lodash's
  `defaultsDeep` with arrays taken whole (verified case for case against
  `mergeWith({}, defaults, supplied, (a, b) => isArray(b) ? b : undefined)`).
  Vue's props proxy is shallow, so the nested objects are the parent's own
  and writable; the props object itself is never written.
- Rejected on the way: a merge in a getter (the class should READ complete
  props), a Proxy or getter-per-key view (machinery for the one case a fill
  misses: an object built anew on every parent render — covered by the
  stable-object rule instead; a constant inline literal is hoisted by the
  compiler). The scroller's `scroll` / `selection` knob props are the
  worked example; the gate's ordering rule bites if the `props` field is
  declared above the constructor — declare it right after.

## Phone-only scroll bugs: trace first, theorize never

- Five theories in a row missed an Android-only "re-flick stalls" bug that
  one on-device log named in minutes. `?touchdebug` on the scroller example
  prints Lenis's own trace (`lenis.trace` sink: every gesture event, its
  deltas, the skip flag, state, the flick decision with trail length and
  velocity) with Copy/Clear buttons — over plain http the clipboard API is
  absent, so the copy falls back to `execCommand`. Ask for a log BEFORE
  changing code; check the timestamps restart near 0 after a reload, or the
  paste is the previous capture.
- What Android does that iOS does not: the first touchmove arrives only
  past the OS touch slop, often ~200 ms after the touchstart, and a whole
  quick swipe may be coalesced into ONE touchmove. Consequences, each a
  separate fix: a per-frame velocity reads 0 at touchend (read it off a
  100 ms trail of moves, seeded at the touchstart — BEFORE any early return
  — at the ANIMATED position, with the anchor kept when it ages out of the
  window and the span capped at the window); a one-sample axis lock reads a
  straight swipe as sideways (a frame with touch-action none claims every
  touch; the strip's lock needs a 1.5× cross-axis lead); a tap-to-stop on
  the touchstart freezes the glide for the whole hold-back, then the sync
  catch-up jumps — keep the glide running until the first move, and let a
  touch that ends without a move be the tap that stops it.
- The mid-flick fixes that were real but not the cause and still stand:
  the pad shrinks only at rest (a mid-glide unmount burst is a hitch), the
  thumb is its own component (a per-frame binding re-renders its
  component, whole), a scroll re-places the handles instead of repainting
  the boxes, and a touchcancel flicks like a touchend.

## Source tabs on a docs page: `<<<` is eager, LazyCodeGroup is not

- A VitePress `<<<` snippet is rendered into the PAGE's chunk at build
  time. Nine source tabs plus seven specs and a 700-line contract put
  256 KB of gzipped HTML on the scroller example page, downloaded and
  parsed before the reader saw a row — "the scroller got heavy" was the
  page, not the classes (the startup JS was ~300 ms of long tasks, mostly
  the first rows measuring themselves).
- `LazyCodeGroup` (`docs_v2/.vitepress/theme/components/`) + the
  `lazy-source` Vite plugin (`docs_v2/.vitepress/plugins/`): one
  highlighted chunk per file, imported when its tab opens; the page
  imports only the loader map. The scroller page went 256 KB → 6.9 KB
  gzipped; a tab switch loads exactly one chunk. The markup mirrors
  VitePress's own code block (dual shiki themes, `line-numbers-mode`, the
  `button.copy` the theme's delegated handler serves), so the CSS applies
  as is. Pages pass `:files="[{ path, label }]"` with REPO-relative paths
  under the plugin's roots (`examples/playground/src`, the docs example
  components).
- Two traps: a virtual module id must not END in a real extension —
  `lazy-source:…/x.css` was claimed by vite:css and parsed as a stylesheet
  (the id carries a `.highlight` suffix); and a per-instance module
  counter for radio-group names drifts between the build's server render
  (one process, many pages) and the client — use Vue's `useId()`.
- "Hydration completed but contains mismatches" fires on EVERY page of the
  built site, component or not — pre-existing, not a signal for new work.

## One DOM event, one handler (a ruling with a gate)

- A template never binds two events to one method and a class never
  registers one method for two event types: `@pointercancel` gets
  `onTrackPointerCancel` whose body delegates to `onTrackPointerUp`, a
  track's `touchstart`/`touchmove` get `onTrackTouchStart`/`onTrackTouchMove`
  even when both only claim the touch, `@error` beside `@load` gets
  `onImageError`. The reason is the override seam: a subclass extends the
  cancel alone by name instead of re-deriving the event from its object.
  The gate check `one_handler_per_event` enforces it per element (same
  event with different modifiers to different handlers is fine); the
  benchmark grid arms are skip-listed because their identical binding IS
  what the numbers compare.
- Two more scroller rules from the same night: a thumb drag never stops
  autoplay (it re-arms the creep on release either way and starts it from
  rest when forward), and a seek's converge loop must yield to the reading
  creep — with the creep at speed a repeated "jump to 500k" alternated
  between two positions every 100 ms, each mount shifting the target and
  each shift re-pinning the landing under the creep. Reproduce such loops
  with a Playwright sampler before theorising (scratch `jump-loop2.cjs`).
- The component sweep runs in CI as an advisory job (`continue-on-error`):
  a red row without a blocked deploy.

## Shared clone and the core size budget

- Vite's final library transform can reintroduce whitespace after an input
  Terser plugin. Run Terser in `rollupOptions.output.plugins` and retain
  `format.preserve_annotations: true` so downstream PURE-based tree shaking
  still works; a comments filter alone does not preserve these annotations.
- Build core and extras independently to inline their shared `clone` source
  without introducing a shared chunk or a Vue dependency into extras. The
  build script gates imports and the 1,134-byte gzipped core budget.
- Sync `clone.ts` alongside the playground's vendored engine and nestedProps;
  the standalone playground needs all three source files.

## Release-film rendering: sample time, not the browser's frame rate

- `release-film/` renders its 3D scene at explicit timestamps and streams
  image frames into FFmpeg. Headless WebGL can run below real time without
  changing the exported duration or skipping a frame; recording a live rAF
  loop would bake the machine's slowdowns into the film.
- FFmpeg's `loudnorm` upsamples internally. Without an explicit output
  `-ar 48000`, AAC selected 96 kHz. Pin the export sample rate, then inspect
  the actual MP4 with ffprobe rather than trusting the WAV's 48 kHz header.
- The preview's representative poster is separate from playback position:
  drawing a frame at eight seconds must not make Play skip the opening.

## The release calendar: copy lives beside the entry

- The admin's launch calendar is its own top-level domain (`/release/*`,
  `newsletter/dashboard/src/modules/release/`). Every entry names its
  paste-ready copy in `drafts` — repo-relative markdown paths bundled by
  `import.meta.glob(..., { query: '?raw', eager: true })` from `tasks/` and
  `docs_v2/blog/`, or `x:<group>[:n]` keys into `x-launch-copy.ts` (the
  reviewed launch-thread artifact, extracted to data). Bundling files from
  outside the dashboard root needs `server.fs.allow` for the dev server;
  the build needs nothing. The chunk is ~93 KB gzipped and loads only on
  the Release tab.
- The standing X voice posts are generated, not hand-listed: three a week
  from launch, in the artifact's order, skipping days that already carry
  an X entry. Edit the copy module, never the schedule.
- Plan docs name their sections (xHooks, the channel calendar,
  measurement, the landing surfaces…). Never reintroduce W-numbers — a
  number sends the reader counting; a name sends them to the section.
- A clipboard fallback that selects a scratch textarea moves focus out of
  the dialog, so Escape stops working; hand focus back to the element
  that was active before the copy.
- perl `s|…|…|` with `\|` in the pattern: the escaped delimiter becomes a
  bare `|`, an ALTERNATION — the replacement lands at the first two spaces
  of the file. Use `#` as the delimiter for patterns that contain `|`,
  and a heredoc or Python for CSS blocks that contain `#` colors.

## The AI chat example: a real session, pages on demand, shiki outside its package

- Claude Code session files are JSONL with ~18 record types; only `user`,
  `assistant` and `system` carry the conversation. An assistant turn is
  several records sharing `message.id` (one per block); a `tool_result`
  lives in a user record and joins its `tool_use` by id; the structured
  result sits beside it as `toolUseResult`. In this session's 577 MB log
  the bookkeeping was a third of the records and most of the bytes. Parse
  as a stream (readline / `File.stream()`), never as one string.
- The shipped sample (`docs_v2/scripts/chat-sample.ts`, vite-node with
  `--` before the args) is built from a real session: keep, scrub, cut tool
  outputs in the middle, budget images, refuse to write if a forbidden
  pattern survives. The first key regex matched base64 and vite hashes
  (`sk…`, `rk…`); anchor key shapes to their real prefixes. A `-----BEGIN`
  that never closes still has to go. `Read` of an image stores its bytes
  as `file.base64` in the structured result — route it into the image
  budget or it dominates the sample.
- A ref read dotted in a template (`v-if="chat.loadingThread"`) is always
  truthy; the overlay stayed up over a loaded thread. Name a getter.
- The scroller needs geometry before `scrollToIndex` can land: jump to the
  latest message after `nextTick()` from setting the rows, not in the same
  tick — otherwise the thread opens at the top.
- shiki lives only in `docs_v2/node_modules`; playground files that import
  it resolve neither from the playground nor from the docs vite root.
  Alias the BARE specifier only (`{ find: /^shiki$/, replacement: <dir> }`):
  a plain `shiki: <dir>` alias rewrites shiki's own `shiki/wasm` import into
  a directory path and breaks the docs build. Use
  `createJavaScriptRegexEngine()` (no wasm fetch) and exclude shiki from
  the playground's `optimizeDeps` (esbuild stalls on its wasm chunk with a
  504). The root vitest config carries the same alias for tests.
- `.vue` imports from `.ts` (a component registry) need a `shims-vue.d.ts`
  in the playground; adding it made the scroller test's `@ts-expect-error`
  on a `.vue` import unused.
- In a built docs page, the first `.ac-batch-head` in DOM order sits above
  the frame (the thread opens at the bottom): Playwright's click on it hits
  the prose. Pick an element whose box is inside the frame.
- The standards gate on the playground: no `Static()` anchor without a
  static, statics before the constructor, getters before methods, no
  logic in templates (ternaries, `||`, built strings), `protected` never
  `private` (the docs build's private-ban check fails the pipeline), and a
  second class in a file goes to its own file. Colocated specs are
  `X.test.ts` beside `X.ts`; the header needs `=== GENERATOR-DESCRIBED ===`
  and every contract link a `// invariant: Name (path)` on a test.
- A seek's converge loop (`scrollToIndex`) re-pins its landing on every
  position shift until 600 ms of quiet. In the chat, shifts keep coming
  (pages landing, shiki colouring), so the loop outlived the reader's
  intent: a wheel glide that ended between two waves, or a card opened
  above the target, yanked the view back to the landing. Two guards, one
  in the scroller: a scroll position that no longer matches the last
  landing ends the loop, and `cancelSeek()` lets the owner end it when
  the reader acts on the content. A row that mounts as a stub and then
  grows when its page lands moves everything below it; prefetch two pages
  of margin so rows are loaded before they can mount in the padding.
- A block inserted by a "replace the first occurrence" edit can land inside
  the file's header comment when the anchor text appears there too (the
  generator header repeats each test's claim): the test silently never
  runs. Anchor on the body's `test(` line, and grep the line number after.
- The scroller kept an ABSOLUTE scroll position while rows above the reader
  measured: every mount above the viewport moved the content under them,
  by a screen or more when a placeholder became a long message — and the
  estimate never calibrates for a list opened at the bottom. The fix is
  content anchoring (`captureAnchor`/`restoreAnchor` around every size
  change): the row under the leading edge stays where it was; a glide
  keeps its lerp by shifting both endpoints; a seek's landing shifts with
  it. Under a 1.2 s page throttle, a far seek and a 60,000 px fling now
  hold the same row at the same pixel while pages land.
- Anchor on the edge the reader reads FROM: scrolling down, the top row;
  scrolling up, the bottom row — then a row growing inside the view
  expands upward, away from what was just read (the user's "flip the
  rows" instinct, without touching layout). With anchoring in place the
  estimate may calibrate anywhere, not just near the top. When measuring
  drift after a fling, wait for the lerp tail: 700 ms after the last wheel
  the glide still has ~25 px to go, and that reads as a phantom shift.
- A mid-glide compensation cannot be a field write on Lenis: the glide is
  an `Animate` object with its own origin, value and target, and its
  `onUpdate` overwrites `animatedScroll` every frame, so a shift written to
  the fields is undone on the next frame — a backward jerk in every glide
  that crossed a size change. `Lenis.shiftBy(delta)` moves the target, the
  animated position AND the running lerp (`Animate.shift`), then paints in
  the same frame (the DOM already holds the new size; a frame late shows).
  Measure glides by a row's on-screen motion tracked by id, never by the
  transform: the transform legitimately moves by every compensation.


## The kit (2026-09-10): what the fixture tree taught before the chat conversion

- **`Static()` already caches a `$`-prefixed static getter per receiver.** A `static get $kit()` needs no
  WeakMap and no static field: the engine stores the value as an own property of the class that read it.
  Corollary the spec pinned: `super.$kit` inside an override runs the parent's getter body FOR THE CHILD
  receiver, so a child's untouched entries are equal to the parent's, never the same objects. Identity
  of untouched entries holds only inside `Kit.Class.resolve`, where `merge` reads the base through the
  base class. Never assert entry identity across a subclass boundary.
- **The gate's dollar-getter rule is for INSTANCE getters.** `a_composable_is_injected_by_a_one_call_dollar_getter`
  now skips static accessors; a static `$` getter is a compute-once cache and may take several
  statements (green fixture added to `$fixtures`).
- **`wrapper.vm` from @vue/test-utils is a foreign receiver for ivue instances.** A method read through it
  reaches the engine's lazy-bound accessor with test-utils' proxy as `this`, which `resolveRaw` cannot map
  to the instance — `vm.method` comes back undefined while plain getters happen to work. Read the model
  through `wrapper.vm.$.exposed` (the object `defineExpose` received) in specs.
- **A derived class's default for a prop the view never declared never applies.** Vue defaults only the
  props the compiled view declared and `nestedProps` never writes a top-level prop, so through the base
  view a widened contract is invisible on both sides: no value in, no default out, a dev warning on emit.
  `Kit.Class.view` (a fresh component object with the class's `props`/`emits`) is the only route.
- **Vue's contract statics fuse a fresh object per read.** `X.Class.props` and `X.Class.emits` are new
  objects on every access (validators are new functions), so compare by keys/`toEqual`, never `toBe`.
- **The invariants checker wants `## Reality-based invariants` then `## Chosen invariants` exactly**, no
  `---` rules between records (they break the `Last refined` field parse), and every record linked from
  the `## Generator` record's Components list, or it reports "no mechanism claims".

## Infinite Malleability docs page (2026-09-10)

- **Class names do not survive the docs build.** esbuild minifies `class $Card` to a one-letter name, so
  an inspector that reads `constructor.name` (or walks the chain for a `$`-prefixed ancestor) prints `?`
  in production and worked only in vitest. `Kit.Class.derive` now stamps `derivedFrom` on the namespace
  it returns, and the demo names classes through a `Map<namespace, label>`. Never read class names at
  runtime in anything that ships.
- **"Hydration completed but contains mismatches" is site-wide in the built docs** — it prints on
  /guide/extensible-components, /guide/flyweight and /examples/ai-chat with no kit demo on the page.
  Pre-existing; do not chase it as a new component's fault. (Verified with tmp/drive-hydration.mjs.)
- **A docs demo of a fixture tree carries the tree's CSS.** The kit fixtures have no styles by design; the
  demo component styles `.card`, `.code[data-theme]`… under its own root class so the page owns the look.
- **A declared prop with a default beats the kit's value for it.** `ThemedCode` declares `theme` with
  default `'mono'`, so an entry's `props.theme` no longer decides; the combined demo variant drops it
  rather than show a knob that does nothing. When a subclass declares a knob as a prop, say so.
- **The malleability demo's tree lives in docs_v2 (`theme/components/examples/malleability/`), not the
  playground**, because it needs shiki and highlight.js from the docs install; highlight.js is a docs_v2
  devDependency for it (`highlight.js/lib/core` + four languages). The spec tree in `examples/playground/src/kit/`
  stays minimal on purpose. A demo tree carries its own CSS; the fixture files have none.
## The press: copy in D1, cards as editors, types in the namespace

- Types live INSIDE the namespace — `Api.PressExpression`, `Posts.Post`,
  `Scheduler.JobKind` — never beside it. The gate's
  `a_class_file_holds_only_imports_class_namespace_and_types` says so and
  had been flagging thirteen files; treating those findings as "pre-existing
  style" and copying the surrounding shape was the mistake. A gate finding
  in a file you touch is yours, whoever left it.
- The store singleton is the skill's shape: `protected static get $shared()`
  + `static use()` on the class, `Static($X)` anchor, consumers call
  `AppStore.Class.use()`. A `let singleton` in the namespace is the same
  violation as a type there.
- Segment rows follow their parent's mode. `replaceChildren` hard-coding
  `derived` made every imported (authored) thread's tweets refuse edits
  with a 400 that only showed up in the browser drive, not in tests that
  never patched a segment of an authored thread. Drive the real path.
- `return promise` inside `try` does not catch the rejection; the press
  router needed `return await` so store errors become JSON 400s. Three API
  tests failed with the raw throw before that.
- A `td` with `display: flex` breaks table layout so badly that Playwright
  reports the `<table>` intercepting the row's click. Put flex on an inner
  div.
- `import.meta.glob` of files outside the dashboard root needs
  `server.fs.allow` for the dev server and nothing for the build — and
  bundling copy that way put 93 KB of unsent posts into a public chunk.
  The press keeps copy in D1; the calendar asks the Worker by source key.
- The worktree lacked `newsletter/worker-configuration.d.ts` (gitignored,
  generated): copy it from the main tree or run `wrangler types` before
  the first tsc in a fresh worktree.
- Quasar 2.21 + `@quasar/vite-plugin` 2.x wants `@vitejs/plugin-vue` 6 and
  Vite 6+; this repo is on Vite 4, so pin `@quasar/vite-plugin@^1.12`.
  Icons: use `quasar/icon-set/svg-material-icons` instead of the font CSS
  (the ligature font showed `arrow_drop_down` as text under the dev server).
- perl `s|…|…|` with a `\|` in the PATTERN: the escaped delimiter becomes a
  bare `|`, an alternation; the replacement lands at the first two spaces
  of the file. Use `#` as the delimiter — and not when the text holds `#`
  color codes either; Python for anything with both.

## Tiptap + R2 in the press: the serializer lies, workerd outlives its parent

- `tiptap-markdown` escapes `*`, `[`, `]`, `_`, `#` on the way out and ends
  a soft line break with `\` + newline, so an untouched body would grow
  backslashes on its first keystroke and every derived tweet would carry
  them. Normalize the serializer's output (strip `\` before punctuation
  and the backslash breaks) and keep a `lastMarkdown` guard so the
  parent's echo of the emitted text never resets the document. Prove the
  round-trip with a jsdom test (`// @vitest-environment jsdom`) that loads
  the press's subset and expects the identical string back.
- A block Image node serializes without closing its block in
  `tiptap-markdown` (the next paragraph lands on the image line);
  override `storage.markdown.serialize` with a `closeBlock`. Custom nodes
  (YouTube, video) get their markdown spec the same way, and a markdown-it
  core rule turns a bare media URL paragraph into the HTML the node parses.
- `view.someProp('handleDrop', f => f(...))` returns `undefined` when the
  handler returns `false`; call `view.props.handleDrop` directly in tests.
- A new public path on the newsletter Worker must be listed in
  `assets.run_worker_first`, or the SPA fallback answers it with
  index.html (curl showed `text/html` for `/press-asset/<key>`).
- `fuser -k 8787/tcp` kills wrangler's node but the live `wrangler dev`
  respawns workerd and keeps the port; the surviving workerd then hangs
  every request. Stop the wrangler process tree by pid (`ps -eo
  pid,ppid,cmd | grep wrangler`) and restart with `run_in_background`.
- `wrangler types` only knows secrets a local `.dev.vars` lists; a fresh
  worktree without one loses `ADMIN_SECRET` & co. from `Env`. Declare
  the required secrets in `src/env-secrets.d.ts` so types hold everywhere.
- R2 is off by default on an account: `wrangler r2 bucket create` fails
  with API code 10042 until R2 is enabled once in the Cloudflare dashboard.

## The chat on the kit (2026-09-10, branch ai-chat-kit)

- **The SFC compiler cannot resolve `typeof <imported namespace>` inside a `defineProps<T>()` type.** A
  `kit?: Kit.Entry<typeof ChatMessage>` field in a Props interface kills the view with "Unresolvable type
  reference". Keep `kit?: Kit.Entry` untyped at the SFC boundary and cast at the one `new`:
  `new ((props.kit?.namespace.Class as typeof X.Class | undefined) ?? X.Class)(props)`.
- **The compiler also walks the imports of the file a Props type lives in.** Part props defined on the row
  model's namespace made two part views fail to compile while four others passed; a type-only
  `parts/Part.ts` (`Part.Props<…>`) with three type imports fixed it. Keep view prop types in files that
  import nothing but types.
- **A stale compiled-type cache survives HMR.** After changing a `.ts` that a `.vue`'s `defineProps<T>()`
  resolves, the dev server kept serving the old error until restarted. Restart vite when a props type moves.
- **The gate reads a view's model owner from `new X.Class(`.** The seam form hid it, so every class
  hosted by the scroller looked like it outlived components. `constructedNamespaceOf` now unwraps
  `((… as …) ?? X.Class)` in both `modelConstructions` and the watch-lifetime scan; green fixture added.
- **A batch renders its calls through `ToolCallPart`**, whose kit owns the card map — so one override of a
  card reaches single calls and batches. The tool base's kit has only its leaves (Head, Foot, CodeBlock,
  SubThread); importing the subclasses from the base would be a top-level cycle (`extends` needs the base
  evaluated first), which a lazy `$kit` cannot help.
- **Pages are held while the scrollbar's thumb is dragged** (`Chat.heldWindow`, released by a watch on
  `scroller.scrollbarDragging`): rows fly past as skeletons and only the drop's window loads.
- **A part the stream appends to in place never re-renders on its own.** `last.text += event.text` mutates a
  plain object; `TextPart.text` read only `props.part.text`, so a reply's words appeared all at once when the
  stream ended. The chat bumps `revision` per event: the getter reads `chat.revision.value` first, then the
  part. Any view over a mutated-in-place record needs that subscription.
- **The open sidebar tab lives in the settings store, not on the chat**, because a change of tree remounts
  the example (`ChatShell` keys on the tree id) and a ref on the chat resets with it; `ConfiguredChat` overrides
  `sidebarTab` to the store's ref. Drives that pick a tree then click the panel found this.
- **A static data table must not read another module's `$Class` at load time** — the gate's
  `cross_module_class_reads_happen_inside_bodies` flags it. `Sidebar.TABS` carries icon names; a method
  resolves them from `Icons.$Class.PATHS`.
- **Playwright's "move away" point must actually leave the element**: a peek card 320px wide beside the
  track swallowed a pointer moved 300px left of the track, and the drive read a bug that was not there.
  Instrument `pointermove` targets before touching the code.
- **Prettier runs on every Edit/Write through a PostToolUse hook** (`.claude/hooks/prettier-on-edit.mjs`,
  wired in `.claude/settings.json`): a written `.ts`/`.vue` under `examples/playground/src` or the docs
  theme components is formatted in place before the next tool call. The hook reads the tool call from
  stdin, formats only that file, and never fails the edit. After a hook reformat, `Read` before an `Edit`
  whose `old_string` spans the touched region.
- **The kit entry's view field is `view`, not `vue`.** It names the role's view; Vue is how this one is
  expressed, and the field must not carry the framework's name. The rename touched the entry key, every
  `.kit.Role.view` access, `Kit.ts`'s merge keys, the docs demo and the guide. A regex over `.vue` before
  a space also renamed file names in prose (`Gallery.vue renders it`) — property access is always
  `.kit.Name.view` / `entry.view`, a bare `Name.vue` in prose is a file; check the diff for that.
- **Prettier is configured (`.prettierrc`: printWidth 100, single quotes, no trailing commas) but nothing
  ran it.** 107 playground files drifted, 87 in ai-chat, because every file was written by hand and never
  formatted. `npm run format` (and `format:check`) now cover `examples/playground/src` and the docs theme
  components — run `format` before committing playground or docs-component code. A reformat is safe to
  verify the usual way: suites, gate, checker, tsc, docs build all held after 115 files changed.
- **A long wheel up blanked the bottom of the viewport and, once, threw the rows 63k px off.** Two
  pre-existing scroller faults found by sampling a 120-tick wheel-up (`tmp/drive-up.mjs`): the window
  walked from the lerp's TARGET and padded "rows behind" as gap ÷ estimated row size, so a gap over rows
  far shorter than the estimate (35px system lines vs a 160px estimate) went uncovered — the walk now
  extends in pixels over measured sizes to the animated position; and the loop rebased the render bias
  twice a frame, from the animated scroll and again from the target, which flipped the bias when the two
  straddled a 65,536px chunk — a position write without a transform write never rebases now. Both are
  specs; both records extended. Bisect trick that settled "is it today's change?": `git checkout <old> --
  <files>`, drive, `git checkout HEAD -- <files>`.
- **A row that shrinks at the end of the list left the viewport past the content.** The scroller's
  re-measure restores the anchor row (the one under the reading edge), which only moves the position by
  what the content ABOVE the reader changed; the last row re-rendering shorter — a streaming reply whose
  partial markdown was taller than its final render, a tall card folded at the end — changes nothing above,
  so nothing re-clamped and the viewport rested past the last row on nothing. `clampScrollPosition` now runs
  after every re-measure (spec + record on "The scroll position lands inside the scrollable range"). The
  symptom read as "the reply is blank until it finishes" and "the canvas scrolled past the last item".
  Headless drives never hit it because the sampled turns did not shrink; the user's did.
- **The scrollbar peek is a second scroller over the same rows** (`Peek`, role on `Chat.$kit`): `v-model` binds
  the chat's `rows` ref, previews and times come from the index, so a peek never fetches. The thread's section
  forwards `pointermove` to the peek, which tests `closest('.virtual-scroller__track')` — the track lives inside
  the scroller component and owns its own pointer capture during a drag.

## The role tree (2026-09-11): order, bind and the container conversion

- **A container's wrapper element is layout, not a role.** `ChatMessage.vue` had `<div class="ac-msg-body">`
  around head/parts/foot. A `v-for` over `order` cannot emit a wrapper, and a wrapper role would need its
  own class for a `<div>`. The row is a CSS grid instead: the gutter sits in column 1 row 1, everything
  after it (`.ac-msg-gutter ~ *`) in column 2, and with no gutter every section spans the row. The bubble
  tree draws its bubble as an absolutely positioned `::before` inside the row's outer padding. A grid-item
  pseudo-element spanning `1 / 1 / -1 / -1` does NOT work: auto-placed sections avoid the cells it
  occupies and land in implicit rows below the box.
- **`seam` guarantees the entry.** The design's part bind returned `{ part, chat, message }` without `kit`,
  which would leave every part view constructing its own class. `Kit.Class.seam` spreads the bind's result
  after `kit: entry` for any role with a namespace; a tag role gets only the bind. Containers delegate:
  `seamProps(role, item?, key?) { return Kit.Class.seam(this, this.kit[role], item, key) }`.
- **Annotate `$kit` when the kit's type names the owner.** `Kit.Of<Role, $ChatMessage>` puts the instance
  type inside the static's type; the instance's `kit` getter reads the static back, and tsc reports
  "referenced directly or indirectly in its own type annotation" across the whole chat (Sidebar, Peek,
  SubThread...). A declared return type (`static get $kit(): ChatMessage.Roles`) breaks the cycle. The same
  fix on `Chat.$kit` and a narrow `Chat.PeekHandle` for the peek template ref removed 77 pre-existing
  circular-type errors from the playground tsc baseline (107 lines → 30).
- **A property-typed `bind` is not assignable to a method-typed one under strictFunctionTypes.** An entry
  literal's `bind: (seam: Seam<$Strip, string>) => …` failed against `Entry<unknown, never>` until `bind`
  became a method signature in the interface (`bind?(seam): Bound`), which compares bivariantly.
- **`Kit.Class.tree` must guard cycles.** The chat's kit is cyclic (System part → SubThread → Message →
  System part); a naive recursive print overflowed the stack. The printer carries the set of classes open
  above it and prints `(a kit already printed above)` on a repeat.
- **`Static()`'s bound subclass is named `SelectedClass`** and `derive`'s subclass is anonymous, so a printed
  class name walks `Object.getPrototypeOf` until a real name appears.
- **The worktree has no `node_modules`.** Symlink the main checkout's root, `docs_v2` and
  `examples/playground` node_modules into the worktree (all three are gitignored); `npx vue-tsc` is not
  installed and the npx-cached 3.3.11 fails against the cached TypeScript, so the typecheck stays the tsc
  diff described above.
- **The Playwright tree picker must be scoped to the Tree section**: the density section also has a
  `Compact` choice, so `.ac-choice:has-text("Compact")` clicks density first.

## The role tree, second pass (2026-09-11): types that reach the child, and the render path

- **`satisfies` infers nothing per entry; a call does.** `Kit.Class.entry(Namespace, View, { bind })` infers the
  namespace from its argument and `Owner`/`Item` from the contextual return type (the kit's declared
  `X.Roles`), so a bind's result is held to `Partial<PropsOf<N>> & Attrs`. A return object literal in an arrow
  is NOT excess-property checked against a contextual return type (freshness is lost); `Kit.Exact<R, N>` maps
  every key of the inferred result that is neither a prop nor an attribute to `never`, and `derive`'s
  `patch: P & Kit.Checked<Space, P>` applies the same to nested binds and to order relations. The `P & Check<P>`
  shape never produces excess-property errors on P's own keys — a wrong anchor KEY is caught only by mapping
  P's keys to `never`, not by a `Record<Base | Added, …>` target.
- **A conditional type on a type parameter makes its variance unmeasurable.** `item: [Item] extends [never] ?
  undefined : Item` made `Entry<$Strip, string, typeof Code>` fail to assign to the loose `Kit.Entry` even
  with `bind` as a method signature. `item: Item` and `key: string | number | undefined` assign in one
  direction, which method bivariance accepts.
- **The chain is data; the report reads it.** `derive` leaves `derivedFrom`, `patch`, `layer` and stays silent;
  `KitInspect` (never imported by `Kit.ts`, never on the render path) lists contacts, warns or throws, prints
  the tree. Kit.ts went 156 → 582 → 567 lines with the types (the class body is about 300); the render path is
  `seam` alone: ~1 ns per unbound call and ~6 ns per bound call over a million calls under vite-node.
- **Declared kit types break the instance/static cycle.** `Chat.Roles` names each role's namespace explicitly so
  nested subkit binds are typed (`Message: Kit.Entry<$Chat, undefined, typeof ChatMessage>`); an inferred
  `Chat.$kit` re-entered the "referenced in its own type annotation" cycle at once.

## The kit reduction (2026-09-11): which premises held

- **A kit may hold a map of roles under a role.** `ToolCallPart.$kit` keeps its cards under `Tools`, keyed by
  tool name, so `isEntry` and the recursion in `merge` and `freeze` stay; deleting the concept broke the chat's
  printed tree at once (an entry without a `view`). Grep every `$kit` before deleting a kit concept.
- **A base `$kit` literal never carries a `subkit` in code**, so the subkit derives inside `mergeEntry` and the
  derive getter returns the one merged, frozen object. `Kit.Class.resolve` stays as a one-liner because the
  malleability guide documents the hand-written subclass form that calls it.
- **The stall is the cycle guard only if a relation also waits for its anchor to settle.** A fixpoint that applies
  any relation whose anchor is present silently applies `move Head after Foot` and `move Foot after Head` (both
  anchors are base roles). The rule "an anchor being placed by another pending relation is not settled" turns
  every cycle into a stall, and the stall's throw lists the relations that could not be placed. Measured with
  `examples/playground/src/kit/Kit.bench.js` (median of five, vite-node): the clean three-relation order went
  468 → 294 ns, the refused cycle 5566 → 2784 ns, a derive over an eight-role base 5931 → 5056 ns, `seam`
  unchanged (1.8/6.2/86.6 → 1.5/6.4/78.6 ns for unbound / bound / two layers).
- **A closure that swaps `seam.inherited` in place breaks a bind that reads `seam.inherited()` twice** (the second
  read finds the default). The plain form — a copy of the seam with the layer below's `inherited` — costs one
  object per layered call and is the one the record keeps. The spec that catches it reads `seam.inherited` off
  the seam each time; a destructured `inherited` captured the wrapper once and passed against the defect.
- **`Static()` names its raw class under `STATIC_RAW`**, so tooling prints a class by name without knowing the
  wrapper's own name; read it as an own property — inherited through the prototype chain it names the
  grandparent's raw class.

## Named exports for namespaces, default only for SFCs (2026-09-11)

Considered and refused: `namespace X {…}; export default X;` so consumers write
`import X from './X'` (TS rejects `export default namespace` outright; the
two-statement form compiles and carries the types). Refused because every
class file has a sibling `X.vue` whose only export is default, so the pair
`import { X } from './X'` / `import XView from './X.vue'` tells the reader
which of the two a line imports before the path; making both default forces an
alias at every call site. Named exports also fix one name per module (default
imports let each file invent its own), and auto-import / rename-symbol work
from the export name, which agents get right first try. Two braces saved is a
character reduction that widens the naming space — the wrong direction.

## `$kit` declares its return type, or the types cycle (2026-09-13)

`static get $kit() { return {…} satisfies Kit.Of<X.Role>; }` keeps the
literal's inferred type, which carries each view's concrete SFC component
type; a classless leaf's props name `X.Instance`, whose `kit` is that
literal — TS2615 "circularly references itself in mapped type", TS7023 on
`$kit` and `kit`, TS2502 on `model` in the leaf. The fix is a declared
return type, `static get $kit(): X.Roles`, with `Roles` naming each
entry's namespace (`Kit.Entry<$X, undefined, typeof Child>`) so typed
subkits keep their child model, and `view` typed as `Kit.View` — never the
component's own type. Only `vue-tsc` sees this, because the cycle closes
through `.vue` files: plain `tsc` on the playground is clean either way.
Run it pinned — `npx -y -p vue-tsc@2 -p typescript@5 vue-tsc --noEmit -p
examples/playground/tsconfig.json` — an unpinned `npx vue-tsc` resolves
TypeScript 7 and dies on `./lib/tsc`; and read a run to its end: on
`main` it crashes inside TypeScript and prints no errors, which is not
zero errors. Also from the same run: `Entry.namespace` is optional (a
tag role has none), so a view reads `props.kit?.namespace?.Class`, cast
to its own `typeof X.Class | undefined`; and a generic SFC is typed by
vue-tsc as a function, which `Kit.View` admits.

## `super.method()` in a static override recursed under `Static()` (2026-09-13)

`Static()` cached each bound method under `Symbol.for('ivue.staticBound.<name>')`
— one registered symbol per NAME, shared by every accessor of that name in a
hierarchy. A child's `static override greet() { return super.greet() }` read
the parent's accessor with `this` as the child, found the child's own bound
override already cached under the shared key, and called itself until the
stack blew. Same latent defect for `$`-caches (`super.$kit` could return the
child's cached value). Fix: one unregistered `Symbol(...)` per accessor; the
re-wrap guard skips `STATIC_RAW` and the issued keys explicitly instead of
matching registered-symbol prefixes. Found by proving `bind: this.bindPart`
extends through `super` — the shape that makes a named bind the true one.
The engine spec `super reaches the parent under Static()` binds it.

## After a compaction, the skill must be re-read (2026-09-13)

A context compaction leaves the ivue skill as a summary. Every standards
violation the gate caught late in this session — a getter above the
constructor, a subclass declaring a static without the `Static()` anchor,
`void item` noise — landed after a compaction and traced to editing from the
summary. The first ivue edit after any compaction starts cold: read
`.claude/skills/ivue/SKILL.md` in full, and `kit.generator.md` before a kit.
Observed from the outside through the ai-chat instrument, which is the
point of the instrument.

## A spec pasted into the generator header never runs (2026-09-13)

Three specs — the estimate calibration, the container-grows clamp, the
Lenis trail shift — sat inside the `/* === GENERATOR === … */` block
comment of their test files, green because they were comments. The
insertion anchor was a `// domain-invariant:` line, and the first
occurrence of that line is the header's claim, not the annotation above
the test. Before trusting a green run after adding a spec: count `test(`
inside the header (`awk '/=== GENERATOR ===/,/^\*\//' X.test.ts | grep -c
"^test("` must be 0) and check the suite total went up. The invariants
checker's "header domain-invariant has no annotated test" was the tell,
misread as bookkeeping.

## The docs dev server served the old scroller after edits (2026-09-13)

Playwright traces against `localhost:5174` measured the pre-edit
`VirtualScroller.ts` for two rounds: the "after" traces still showed
the per-row `syncItemSize` path. The server ran from the right worktree;
its module cache did not pick up files under `examples/playground` written
by a script. Before a Playwright verification of scroller or Lenis edits,
confirm with `curl -s "http://localhost:5174/@fs$PWD/<file>" | grep -c
<new symbol>` and restart the server (kill by port, `npm run dev:docs`)
when it reads 0.

## A phone flick's tail, traced (2026-09-13)

"Chokes just before the end" on Android was three things, none visible
without a per-frame trace (rAF logger + wrapped `computeVisibleItems`,
`shiftScroll`, `clampScrollPosition` under Pixel emulation with CDP
touch events): the pad behind the target was re-trimmed every settle
window through the lerp's crawl (a chunk of unmounts, a geometry bump and
a layout per row each time — now held with the lookahead and released at
rest); every row capture anchored, wrote the transform and forced a layout
on its own (now one coalesced wave per patch); and the first flick from a
freshly opened chat's end read a velocity of zero because the anchor
shifts of rows measuring above the reader were written into the finger's
trail (the trail now shifts with the content), then what glide there was
died on a clamp that compared a stale position cell against the new limit.

## Profile before spreading the work (2026-09-13)

The files-list flick "choked" on a phone. Two structural guesses were
measured first and both lost: a row leaf instead of inline slot rows was a
wash on the burst (the walk's re-render was never the cost), and a
per-frame mount budget with catch-up frames made it worse (more walks,
each paying the fixed per-walk overhead; max frame 167–217 ms against
67–100 at HEAD). A CDP CPU profile under 4x throttling then named the real
costs in one run: the row's unmount capture (711 ms of forced layouts over
two flicks), a live `offsetHeight` read on every frame's clamp and limit
(191 ms), a `scrollTop` read in the per-frame position write (163 ms), and
the selection's highlight pass reading the document selection on every
window change with no selection (191 ms). Removing those took the flick to
a steady 50 ms max under the same throttle. The A/B harness (`ab.tmp.sh`:
restart the server, trace three runs, print slow/max/long/rows) and the
profile script are the way to settle such a question; the row leaf stayed
for its structural benefit, not for speed.

## The scroller's feel has a command (2026-09-13)

Unit specs bind every mechanism of the day's scroller fixes, but the
thing the reader feels — a flick's tail, the first flick from a chat's
end, a reversal, a send that follows — is a number on a phone profile.
`npm run probe:scroller` drives the docs dev server (Pixel profile, CDP
touch events) and checks those numbers against thresholds with margin
over the measured values: max frame, long tasks, row unmounts during the
tail, the glide's peak and length, the reversal's latency, the gap after
a send. A breach exits 1. Run it after any change to `VirtualScroller`,
`VirtualScrollerPadding`, `Lenis` or the chat's pin, with the dev server
up; the unit suite cannot see a forced layout or a 100 ms frame.

## Measure the gate before the refactor, not after (2026-09-14)

Splitting `VirtualScroller` into hosted classes broke the standards gate
twice, the same way both times: a new method placed among the getters
(`createGeometry()`, then `onMount()` and friends) makes
`class_members_are_ordered_and_spaced` fire on EVERY getter after it —
one misplaced member, eighty findings. The count is alarming and the
cause is trivial, so the reflex to have is not panic but a baseline:
`git stash push -u -m <tag>` → run `npm run gate:docs` → `git stash
apply <sha>` → drop, which is how the 82 was shown to be 0 before the
change and therefore all mine. The same trick settled `vue-tsc`, whose
28 errors in `ChooseField.vue` and `Sidebar.Files.Row.vue` are
pre-existing Quasar slot-typing noise: capture the per-file counts to a
file first, diff after. Never report "N pre-existing errors" without
having measured N on the other side of the change.

## A hosted capability is a field, not a `$`-getter (2026-09-14)

`$geometry`, `$padding` and `$selection` were lazy `$`-cached getters,
and none of them was ever lazy in practice: the constructor's own repair
call reads the geometry, the window walk reads the pad every frame, the
selection's first watch evaluates the walk. So they are constructor-
assigned `readonly` fields built through `createX()` factories — the
form the standard's constants table already names for a constructed
dependency. Three consequences worth knowing: a plain field read beats
the `$`-cache's own-property guard on a per-frame path; a subclass swaps
a capability by overriding one method instead of reaching for the
namespace slot; and ORDER now matters — the capabilities must be built
after the inputs they read, because the selection's first watch
evaluates the window walk, which reads the container size the resize
observer was assigned two lines earlier. Building them at the top of the
constructor threw `Cannot read properties of undefined`.

## A pure refactor should measure as parity, and that is the finding (2026-09-14)

The five-class split was benchmarked honestly: same scripted 40-notch
flick on `/examples/virtual-scroller`, CDP `Performance.getMetrics`
under 6x CPU throttling, seven flicks per pass, three passes per side,
with the pre-refactor tree checked out over the same dev server. Before:
script 162–181 ms, layout 159–207 ms, style 364–474 ms. After: script
163–216 ms, layout 158–232 ms, style 348–431 ms. The run-to-run spread
is wider than any difference between the sides, so the honest headline
is parity — a structural refactor that moved no work should not get
faster, and the thing worth proving is that it did not get slower. Frame
time cannot answer this question at all: vsync pins it to 16.7 ms on
both sides. Reach for CPU metrics under throttling, and report the
spread, not a single median.

## The probe rig degrades, and a stale threshold is worse than none (2026-09-14)

`npm run probe:scroller` measured a files flick at 17–33 ms with zero long
tasks all morning, and by evening the SAME COMMIT measured 83–183 ms with
280–1,100 ms of long tasks. Nothing in the code explained it: checking out
the commit before the change under test reproduced the bad numbers exactly,
which is the only reason the change was not blamed. Nine orphaned
`playwright-mcp` processes (three sets, days old, ~600 MB RSS but 0% CPU)
accounted for part of it — killing them took long tasks from 1,101 to ~300 —
and the rest never resolved within the session.

Three rules follow. Never read a probe number without a baseline from a
commit you trust, taken in the same minutes — a `git stash push -u -m <tag>`
and a re-run costs two minutes and is the difference between a diagnosis and
a guess. The first probe after a dev-server restart is always the worst
(Vite compiles on demand); discard it. And when the rig is drifting, do not
retune a threshold to make it pass — a threshold set from a degraded rig
encodes the degradation forever, which is the one failure mode a feel gate
cannot survive.

## The dev server does not see edits outside its own root

The docs dev server (`docs_v2`, port 5174) serves the playground's
sources through `/@fs/…`. On this VM the shared filesystem delivers no
inotify events for those paths, so Vite's module graph keeps the
transform it made at startup: an edit to `examples/playground/src/**`
is on disk, passes `vitest` and `tsc`, and is still absent from the
page. Every browser measurement taken after such an edit describes the
code as it was when the server last started.

Restart the server before any measurement that is supposed to show a
change, and verify the change actually arrived — but verify with a CODE
identifier, not a comment: esbuild strips comments, so grepping the
served module for a phrase you wrote in a comment always reports
missing, even when the file is current.

```sh
curl -s "http://localhost:5174/@fs/<abs path>/Lenis.ts" | grep -c snapRendered
```

Zero means the server is stale; restart it and check again. Clearing
`docs_v2/.vitepress/cache` is not needed and does not help.

## cwd drift silently retargets git at the main checkout

Shell cwd resets to the repo root between some tool calls. A `git
checkout HEAD -- <file>` written without its own `cd` then runs in the
MAIN checkout rather than the worktree, and discards whatever was
uncommitted there — irrecoverably, since unstaged changes have no
reflog. Give every destructive git command its own absolute target:
`git -C "$WORKTREE" checkout HEAD -- <file>`. The same applies to `rm`,
`ls` and `grep`: a listing that shows files you know you created is the
tell that you are reading the other checkout.

## During a glide there is no next frame to defer to

The measure→shift→re-walk cascade a mounting row triggers runs inside the
frame that is also painting the glide, and moving it to the next frame
looked like the obvious win. It is not. The scroller's own frame loop is
a `requestAnimationFrame`, so "the next frame" is another scroll frame,
and rAF callbacks all run in the same phase — the cascade lands beside
the loop instead of after it.

Measured three runs a side, one flick, 6x CPU throttle, layout and style
FORCED inside rAF callbacks:

| | forced layout | forced style | late frames |
| --- | --- | --- | --- |
| microtask (today) | 38.4 ms | 56.6 ms | 6–8 |
| next frame (rAF) | 51.6 ms | 61.5 ms | 6–8 |

Dropped frames are indistinguishable; forced layout is consistently
worse deferred. The rig's own spread is wide (a baseline run hit 51 ms),
so take medians of three, never one run a side.

What the result actually says: while the content is moving there is no
idle frame anywhere, so per-frame work cannot be rescheduled — only made
smaller, or moved off the main thread. Deferring also breaks every spec
that flushes with `nextTick()`, which is a fair warning that the
same-frame application is load-bearing for correctness, not just habit.

## The row measure is already free; mounting an UNMEASURED row is the cost

Chasing the forced layout in the mount path turns out to chase nothing.
Switching the row's `onMounted` rect read off entirely (6x CPU throttle,
one flick, three runs a side):

| | forced layout in rAF | total layout | total task | late frames |
| --- | --- | --- | --- | --- |
| mount read on (today) | 38 ms | ~92 ms | ~1130 ms | 6–7 |
| mount read off | 0 ms | ~97 ms | ~1113 ms | 5–9 |

The forced layout vanishes and rAF time halves (236 ms -> 110 ms), while
total layout, total task time and dropped frames do not move. The read
was never extra work: the DOM changed, so the browser must lay out, and
reading inside the callback only pulls the same layout earlier. A
cheaper measurement is not a lever, and neither is CSS containment on
the frame or on the row (both measured: no effect), nor a bigger render
pad (`halfPaddingQuantity` 3 -> 10 -> 20 changed nothing, and 20 was
slightly worse).

What IS the lever, from the same runs — the same gesture over rows whose
sizes are already known versus rows being measured for the first time:

| gesture | late frames |
| --- | --- |
| into rows never measured | 5–9 |
| back over rows already measured | 1–3 |
| the native control | 2 |

Re-crossing measured rows is already at native parity. The whole cost is
the cascade a FIRST measurement triggers — geometry bump, anchor
restore, re-walk, second patch — not the measuring, and not the mount.
So the direction is to make rows already-measured before a gesture
reaches them (an idle pre-measure pass between gestures, where the time
is free), not to make measuring cheaper.

Useful ratio while sizing that work: 62-89% of mount-time measurements
during a flick are of rows the window already measured — the window
churns the same rows in and out.

## A layout change at rest is the one a reader sees

The render pad used to release its rows ~236 ms after the content stopped,
through a timer that bumped a reactive cell so the window walk ran once
more. The rows it saved were real. The timing was the bug.

Releasing rows folds their heights back into the leading spacer, and Blink
lays out in 1/64 px, so the sum of N row boxes does not round to the one
box replacing them. Measured over the chat: the window went 15 rows to 11,
the leading spacer 104725 px to 106048 px, and all 11 surviving rows moved
**-0.0469 px** — exactly 3/64. Nobody can see 3/64 of a pixel move. What
they see is the raster it forces: each text line box is snapped to the
device grid independently at raster time, from the layer's new sub-pixel
phase, so lines whose baselines sat near a boundary hop a whole pixel and
their neighbours do not.

While anything is moving this is invisible. At rest it is the only thing
on screen that moves. The fix was to delete the timer: the walk runs on a
position change, so the release lands on the last frame that moved.

Two general shapes worth keeping:

- **A sub-pixel layout shift is not a small version of a big one.** It is
  a raster trigger, and the raster quantises per line box. Chasing "is the
  motion smooth" will never find it; measure `getBoundingClientRect().top`
  of rows that SURVIVE a window change and look for movement of any size.
- **Anything scheduled to happen a few hundred ms after motion stops is
  suspect by construction.** That is the moment a reader is staring at a
  still screen. Prefer to do such work on the last moving frame, or not
  at all.

Also rejected here, with numbers: holding the pad until the reader moves
again. It never returns to the base, so each gesture starts from the last
one's pad — more than twice the frame work.

### Correction — the timer was load-bearing; deleting it broke iOS

The entry above ends with "the fix was to delete the timer". It was
not. Without the timer the release depends on the window walk running
on a frame whose reading is already still, and on an iPhone that frame
never came: the pad was never released, the window grew with every
gesture, and the scroller went choppy and stopped unloading rows. The
change was reverted.

The observation stands — a leading-side release at rest hops text lines.
The remedy does not. What is still true: the END side (rows below the
viewport) can be released at rest without moving anything, because only
the trailing spacer changes; the START side folds into the leading spacer
and shifts every row below it by the LayoutUnit residual. A release rule
that honours that split has not been built. The general shape holds:
measure a "simplification" on every platform it ships to before calling
it one, and a mechanism with a comment explaining why it exists is a
mechanism to measure the removal of, not to delete.

## Environment before code — and on a phone, restart the browser first

An iPhone went from "100%" to "choppy, slow" on the same evening, and
three bisect rounds later the exact runtime it had called 100% was also
choppy. Nothing in the code had changed the outcome. Closing Safari and
reopening it fixed everything.

Two environment facts had shifted underneath the session and neither was
checked first: the VM had rebooted (`uptime` said 22 minutes where it had
said 21 days — the "degraded rig" readings just before were a machine
going down), and the phone had crossed 20% battery and gone on charge.
Neither turned out to be the cause, but both should have been the FIRST
questions, and `uptime` takes one second.

Order of operations when a device that was fine goes bad on unchanged
code:

1. `uptime`, load, and which servers are still listening — did the machine
   or the tunnel change under you?
2. Is the device actually loading YOUR build? Put a visible fingerprint in
   every bisect build (a removed box, an added row) and ask for it.
3. **Quit and reopen the browser on the device** before any bisect. A
   day of reloads leaves tabs of earlier builds alive with their own
   frame loops, and Safari's process state does not reset on reload.
4. Battery / Low Power Mode / heat.
5. Only then, the code — and then by bisecting on the device, not by
   reasoning about which change "must" be it. Two confident guesses in
   a row here were wrong (the immediate drag, the native comparison box).

The bisect protocol itself worked and is worth keeping: check out the
known-good runtime files onto the working tree, restart the server,
confirm the fingerprint on the device, then add changes back one at a
time. Restore with `git checkout HEAD -- <files>` when done.

### The 3/64 px was ours, not Blink's

The residual in the two entries above was diagnosed as Blink's LayoutUnit
rounding of N row boxes versus one spacer box. It was not. `wrapperScale`
divided every recorded row height by `rect / offsetHeight`, and
`offsetHeight` is a whole number while the rect is not: a 1149.625 px
wrapper produced a scale of 0.999674 and every row recorded 3–6
hundredths of a pixel taller than it was laid out. The geometry disagreed
with layout by that much per row, and releasing rows into the spacer
moved everything below by the sum. Fix: under a pixel of difference the
scale is 1. Measured after: the same release, zero surviving rows moved.

The question that found it was the user's: "don't you already know the
heights?" We did. We were recording them wrong. When a residual appears
between a model and the DOM, check the model's INPUTS against the DOM
before theorising about the engine — five rows and one
`getBoundingClientRect` would have shown the 0.03–0.06 px per-row error
on the first day.


## The snap knob was scaffolding around a measurement bug

`renderSnap` — grid / fractional / auto, a Lenis option, a scroller knob, a
row of buttons — existed to stop rows hopping a pixel against their
neighbours as a fractional layer re-rastered. That hop was the scroller
recording row heights 3–6 hundredths of a pixel off (the entry above). With
the heights exact, the knob had no job left and came out: ~150 lines and a
setting a reader could get wrong. When a mechanism exists to HIDE an
observation rather than explain it, check the model's inputs first; the
observation may be a bug wearing the costume of a trade-off.

## Removing one string from history: git plumbing, not filter-repo

A Google Maps key leaked into a published sample file
(`docs_v2/public/examples/chat/sample/page-003.json`, one blob, added in
one commit). The goal was surgical: change that one blob, re-hash only
the commits that descend from it, keep every other hash.

`git filter-repo --replace-text` looked like the tool and was not.
It re-hashed 1,828 of 1,833 commits and moved 85 refs, every release tag
included. It runs history through fast-export/fast-import, which
normalises commits: a 2023 README commit that was signed and had no
final newline came back without the signature, got a new hash, and every
commit after it inherited a new parent. `--refs <range>` still passes the
range through the same export, so it is not byte-exact either.

What worked, in about two seconds: plumbing. For every commit descending
from the leak, in topological order, read the raw bytes with
`git cat-file commit`, change only the `tree` line (where the old blob
sits at that path; new tree built with a temporary `GIT_INDEX_FILE`,
`read-tree`, `update-index --cacheinfo`, `write-tree`) and the `parent`
lines (only where a parent was itself re-written), and store it with
`git hash-object -t commit -w --stdin`. An annotated tag is the same
move on its `object` line. Nothing parses or re-serialises signatures,
encodings or messages, so nothing else can change.

Procedure that held up:
1. Mirror backup (`git clone --mirror`), and a separate fresh copy to
   rewrite (`--no-local`, `refs/stash` dropped from the copy only).
2. Rewrite in the copy, then **point the copy's refs at the new commits**
   — the first attempt skipped this, so a fetch carried the old refs
   and none of the new objects.
3. Prove it in the copy before touching the live repo: the string is in
   no reachable blob; exactly the expected commits changed and every
   other hash is identical; each rewritten commit is byte-identical
   except its `tree`/`parent` lines; its tree differs only at the one
   path; the tip tree is unchanged if the file was already fixed on the
   branch; `fsck` is clean.
4. Fetch into a private namespace (`refs/rewrite/*`), check the fetched
   hashes equal the rewrite, then move each live ref with
   `git update-ref <ref> <new> <old>` so a ref that moved meanwhile is
   refused. Reset only the worktrees whose files differ. Drop the
   private refs.

The script and the old-to-new commit map for this rewrite are kept in
`~/ivue-rewrite-2026-09-15/`.

`git fsck` in this repo reports `refs/heads/._main: badRefName`. That is
a macOS AppleDouble file from 2026-07-14, not a ref and not related to
any rewrite; there are 7 `._*` files under `.git`. Git ignores them; a
mirror clone does not copy them, which is why a backup's `fsck` is clean.

## A rejected alternative is only as dead as the trial that rejected it

- The contract had rejected a device-pixel snap of the scroll transform in
  three flavours and required the fractional write. The user challenged the
  record ("maybe it was tried imperfectly?") and the history agreed twice:
  the default flavour snapped only while FAST — where motion blur hides any
  phase error — and left the slow tail fractional, the one regime where a
  snap can show; and every iPhone run had the Safari per-frame layer reset
  in play, a re-raster per frame that is itself a shimmer source, so the two
  writes were never compared clean on that device. Re-run as a single live
  A/B at the slow tail, the snap won on both phones. Before treating a
  `Rejected alternatives` line as settled, read HOW it was rejected: the
  regime it was judged in, the confounds present, and whether the default
  flavour even exercised the idea.
- Isolate by removing, not by adding. "Is mounting the roughness?" was
  answered with a window-hysteresis knob that held 200 rows so a glide
  mounted nothing: no difference, mounting cleared in one tap. The knob came
  out the same night. An experiment surface on the docs feel strip — a
  button per hypothesis, default = shipped — is the cheapest instrument for
  anything only a hand can judge.

## The embed renderer's port probe accepts any server

- `npm run render:embeds` spawns `serve` on 5189 and probes `/` until it
  answers — but a `serve` left from an earlier session (this time from an
  agent worktree, two days old) already answered on 5189 with a different
  build, so the new post was a 404 and the script died on
  `waitForSelector('.vp-doc')` with no slug in the error. Before running it,
  `ss -ltnp | grep :5189` and kill by PID; the probe cannot tell a stale
  server from its own.

## The last blur was the frame rate, and the phone never says so

- Both phones drew a JavaScript glide at 60 Hz while their native fling ran
  at 120: Safari caps page animation at 60 on ProMotion by default, and
  Chrome on Android asks the panel for 120 only under touch and for its own
  compositor scroll. The per-frame log — gap, rendered position, move — is
  what showed it: a textbook deceleration, no dropped frame, 16.7 ms every
  line, and 8.3 ms only while a finger was down. Motion blur on a
  sample-and-hold panel scales with distance per displayed frame, so half
  the frames is twice the blur, only in motion. Before hunting a softness
  during motion in the numbers, read the frame rate off rAF on the device.
- Two instrument lessons. First log the RENDERED value (Lenis's animated
  scroll), not the model's target — the first report showed a flick as one
  jump and told nothing. And `navigator.clipboard` does not exist on a
  plain-http LAN page; the copy button needs the legacy command and a
  textarea fallback or it silently does nothing on Android.

## A log that looks convicting can be describing correct behaviour

- On an iPhone at 120 Hz the frame log showed moves proportional to the
  reported gaps — 1.7× after a "13", 0.36× after a "3" — and I read it as
  a jittered clock juddering the glide, built interval stepping, and the
  moves came out perfectly even. The reader saw MORE nudging. The
  timestamps were honest: the callback really fired late and the next on
  time, and content moved by the true gap was exactly where its frame
  wanted it. Even steps at uneven moments put it 4–8 ms off. Reverted the
  same night, recorded as a rejected alternative with both logs.
- The rule that would have caught it: the log shows what the page
  computed, never what the panel presented. A "fix" that makes the numbers
  prettier must be judged on the display before it is called a fix, and a
  premise about the platform's clock ("jittered, vsync even") is a claim
  to test, not a fact to build on.
