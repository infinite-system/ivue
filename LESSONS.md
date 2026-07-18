# LESSONS.md — hard-won lessons that must not perish

Append-only knowledge base for humans and AI agents working on this repo.
When a session learns something the hard way (a broken build, a wrong
published number, a shell trap), it gets a bullet here — with the failure
that taught it. Read this before touching benchmarks, docs, or releases.

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
- **This repo's lockfile is `yarn.lock`.** `npm install` (npm ≥10) silently
  REWRITES yarn.lock and prunes every package not in package.json — 307
  packages once vanished in one install. Adding pure-JS deps with
  `npm install --ignore-scripts` is safe for the shared node_modules (no
  native rebuilds), but re-run tests + all builds after, and never commit a
  package-lock.json here.

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
  Route SFCs, demo wrappers, the app shell that displays an example: all of
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
  element, so nothing in the playground needs body scroll.

## Process

- **Verify before claiming**: browser-drive every live embed, screenshot both
  themes for design changes, run a 375px horizontal-overflow check after
  layout changes.
- CLI `--all`-style flags detect-and-equip existing tool footprints; they
  never scaffold vendor folders the project doesn't use (see `bin/ivue.mjs`).
- **Teardown must survive user cleanup failures.** A throwing `stopEffects()`
  hook once prevented the instance scope from stopping and left cached cells
  alive. Keep scope shutdown and cache deletion in `finally` paths, propagate
  the original hook error, and test both outcomes together.
