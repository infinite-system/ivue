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
- Production size gate: the engine is ~1.1 KB gzipped — re-verify the build
  size after any engine edit; DCE regressions are silent.

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

## Process

- **Verify before claiming**: browser-drive every live embed, screenshot both
  themes for design changes, run a 375px horizontal-overflow check after
  layout changes.
- CLI `--all`-style flags detect-and-equip existing tool footprints; they
  never scaffold vendor folders the project doesn't use (see `bin/ivue.mjs`).
