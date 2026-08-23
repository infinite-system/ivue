# Related-posts curation ledger (agent scan, 2026-08-22)
#
# The LIVE map is the `relatedPosts:` frontmatter in the pages
# themselves — this file records the scan that seeded it, plus the
# parts that have no other home: the post-idea pipeline (gaps + C2)
# and the fix-before-linking flags. Update it when a pipeline post
# ships or a new scan runs.

## Guide
guide/introduction: introducing-ivue, the-whole-story-in-small-words, one-kilobyte-feature
guide/getting-started: introducing-ivue, reactive-framework-for-the-ai-era, the-whole-story-in-small-words
guide/design: the-object-graph-they-took, the-options-api-everyone-wanted, win-by-reduction
guide/principles: the-object-should-tell-the-truth, computed-is-a-cache, one-kilobyte-feature
guide/standard: reactive-framework-for-the-ai-era, uniformity-is-a-measuring-device, patterns-the-author-never-wrote
guide/state: the-object-should-tell-the-truth, computed-is-a-cache, this-method-era
guide/computed-watch: computed-is-a-cache, the-object-should-tell-the-truth
guide/computed-seed: patterns-the-author-never-wrote   # weak — gap B2 replaces
guide/keyed-version-signals: reactivity-is-an-allocator, twenty-million-cells, patterns-the-author-never-wrote
guide/flyweight: twenty-million-cells, measured-not-promised, a-million-rows-twelve-divs
guide/performance: measured-not-promised, one-kilobyte-feature, twenty-million-cells
guide/benchmarks: measured-not-promised, twenty-million-cells, a-million-rows-twelve-divs
guide/model-layer: reactive-is-all-you-need, vscode-hand-rolled-decade, the-object-graph-they-took
guide/modules: circular-imports-dissolved, initialization-order-solved, module-level-state
guide/namespace-pattern: module-level-state, bulletproof-class-modules, circular-imports-dissolved
guide/caches-and-registries: bulletproof-class-modules, module-level-state, the-test-is-a-subclass  # dedupe inline link
guide/static: module-level-state, discovered-not-invented, the-test-is-a-subclass
guide/inheritance: inheritance-exile, circular-imports-dissolved
guide/components: the-options-api-everyone-wanted, organs-not-skeletons, rented-objects
guide/extensible-components: the-options-api-everyone-wanted, inheritance-exile
guide/lifecycle-teardown: rented-objects, reactivity-is-an-allocator, organs-not-skeletons
guide/backend: reactivity-is-an-allocator, what-becomes-buildable, module-level-state
guide/hmr: (none — see gap B1; page needs promotion first)
guide/node-class-hmr: what-javascript-becomes, circular-imports-dissolved

## Examples (thin pages: 1 link max where noted)
examples/counter: introducing-ivue, the-whole-story-in-small-words
examples/derived: computed-is-a-cache, the-object-should-tell-the-truth
examples/lifecycle: rented-objects, reactivity-is-an-allocator
examples/inheritance: inheritance-exile
examples/pointer: organs-not-skeletons
examples/class-store: reactive-is-all-you-need, module-level-state, rented-objects
examples/workspace-platform: the-object-graph-they-took, what-becomes-buildable, reactive-is-all-you-need
examples/extensible-kernel: most-linted-superpower, bulletproof-class-modules, inheritance-exile
examples/choose-field: computed-is-a-cache, the-options-api-everyone-wanted
examples/media-field: inheritance-exile, the-options-api-everyone-wanted
examples/virtual-scroller: a-million-rows-twelve-divs
examples/formula-grid: twenty-million-cells, computed-is-a-cache, measured-not-promised
examples/flyweight-grid: twenty-million-cells, measured-not-promised
examples/invar: introducing-invar, agents-built-an-editor, the-zeros-didnt-move
# examples/index, examples/stackblitz: exclude

## Top-level
engine: computed-is-a-cache, discovered-not-invented, introducing-ivue
index: introducing-ivue, the-whole-story-in-small-words, what-becomes-buildable
reference/invariants: the-field-not-the-rules, win-by-reduction, uniformity-is-a-measuring-device
api/index: one-kilobyte-feature
# community: none

## Gaps — docs-sourced post pipeline (full theses)

B1 **"Production parity is the feature" (no dev-only runtime)** — guide/hmr documents an unusual design: one Reactive() execution path across dev, test, SSR and production, no dev-only runtime, no HMR accept boundary of ivue's own, and bound-method identity stable within a generation. Every other class-reactivity system ships a dev shim; the absence of one is a claim worth a post, and no post makes it. Pairs: guide/hmr (promote the parity section out of the generic Vite troubleshooting first), guide/node-class-hmr, guide/modules.

B2 **"State born valid" (the computed seed)** — a complete, unusual mechanism: a ref-getter seeded through the instance's own logic, lazy, inheritance-aware, valid from first read, with a crisp boundary ("a seed runs once, untracked"). Real origin story: Invar's SplitterModel, a renderer-free drag model whose bounds contract is enforced by invariant records. Largest fully-unnarrated page on the site. Pairs: guide/computed-seed, guide/state, guide/inheritance.

B3 **"The third state shape" (keyed version signals)** — the sharpest single idea in the docs: reads get-or-create, writes peek-only, so unobserved keys cost literally nothing; plus coarse/fine tiers and the "this is cache invalidation" backend reframe. Currently only a beat inside reactivity-is-an-allocator (92 version signals) — deserves its own mechanism post with the asymmetry diagrammed. Pairs: guide/keyed-version-signals, guide/backend, guide/flyweight.

B4 **"The fork trap: when a cache must not be a cache"** — a registry in a $-cache forks per subclass and nothing throws: silent, load-order-dependent, with a one-line remedy ("the field IS the pin") plus the self read idiom. bulletproof-class-modules covers LazyShared and the value-kind taxonomy but never tells the fork trap as a defect narrative. Pairs: guide/caches-and-registries, guide/static.

B5 **"Teardown you can prove" (deactivate, then re-activate)** — $stopEffects as a full reset rather than a destroy, the detached-by-design instance and the bridge back to component lifetime, and the explicit "why not just effect.stop()" argument. rented-objects argues WHY you want objects that outlive components; nothing narrates the machinery. Pairs: guide/lifecycle-teardown, examples/lifecycle.

B6 **"Props that inherit"** — propsWithDefaults(), ExtractEmitTypes, ExtendSlots: the answer to "classes extend, so the component surface must extend too," and the explicit rejection of withDefaults(defineProps<T>()) which cannot survive a subclass. The blog is model-layer-heavy; this is the one component-author page with no adjacent narrative, and media-field already demonstrates it at production scale. Pairs: guide/extensible-components, examples/media-field, guide/components.

B7 **"Reactivity on the server"** — four fully-worked patterns (config that propagates instead of restarting, structurally-invalidated caches, live queries over SSE/WebSocket, self-reporting operational state) and one hard boundary (one process). reactivity-is-an-allocator is Invar-in-a-terminal; the general server argument is missing, for readers who will never open Invar. Pairs: guide/backend, guide/keyed-version-signals, guide/namespace-pattern.

B8 **"The ladder" (self vs unchecked constructor casts)** — why `this.constructor as typeof $X` casts are unchecked class-name assertions and what `self` replaces them with, including the measured failure ("a subclass setting 0.1 still reads 0.4" through the Class-slot shape). Pairs: guide/caches-and-registries, guide/static.

## C2 — Invar-sourced post ideas (full theses)

1. **"The thunk that survives the cycle"** — LazyShared in full: an eagerly-stored, dependency-free cell whose thunk runs at first read after every import cycle resolves, memoization sealed INSIDE the cell so no receiver can fork it — and the cycle guard that turns "cell read during its own construction" into a named, retryable error instead of a bare stack overflow. Pairs: guide/caches-and-registries, guide/namespace-pattern.

2. **"The census must read zero"** — Invar deleted its allowlist of pinned static reads on a ruling that read-site pinning protects nothing: fixed identity belongs to the declaration form, not the call site. All thirteen pinned reads flipped to plain receiver reads, with a planted-pin positive control proving the checker still fires. The story of retiring an exception ledger rather than growing it. Pairs: guide/caches-and-registries, guide/static.

3. **"Knobs, not pins"** — ScrollPhysics's motion constants were pinned to the base class; they became live (non-$) static getters, and a subclass-override test proves a child can retune the curve while product identity stays guarded by proof-bound specs. The cleanest small illustration of the $-cached vs live static-getter split. Pairs: guide/static, guide/caches-and-registries.

4. **"Checkers that refuse to run until they catch a plant"** — check-reactive-observation.ts walks the tsc program (not syntax) for three shapes that freeze a live read: constructor-captured Ref reads, module-scope-captured reads, in-place mutation of a shallowRef payload. Report-only against repo code, but it REFUSES to execute until its positive-control plants all flag. Reactivity correctness as a compile-time census. Pairs: guide/state, reference/invariants, guide/computed-watch.

5. **"The contract lives in the file"** — Invar source files carry === GENERATOR === / === SPEC === codas: goal, domain-invariant lines stating impossibility, spec lines naming the exact test that proves each one. 39 invariant contracts across modules, checked mechanically, links carrying record anchors. Documentation that cannot drift because a checker reads it. Pairs: reference/invariants, guide/standard.

6. **"A bug the tests called a flake"** — the Replay hover "flake" was a real product bug (Replay lived outside the root pointer path); and closing a workspace tab wedged because the active-index clamp ran AFTER the entries shrink, so a sync-flushed reader in the gap threw every frame — deterministic in the compiled binary, invisible in dev, caught by a born-red sync-reader regression test. Two war stories about reactive read ordering. Pairs: guide/lifecycle-teardown, guide/computed-watch.

7. **"Three minds, one repo"** — Invar runs a conductor (delegates, merges, verifies by driving), an always-on observer (thirteen lenses, prediction scoring, hard no-execute lines), and an independent structural-adversarial review arm that files its findings as its own tasks. The org chart that makes agent-built software landable, and why it only works on a uniform substrate. Pairs: guide/standard; follows uniformity-is-a-measuring-device and the-field-not-the-rules.

8. **"Parse, don't grep"** — with one structural idiom repeated 345 times, ast-query answers census questions grep cannot: every construction site, every member kind, every deviation from the class template. Uniformity turns the codebase into a queryable database, and agents use that instead of reading files. Pairs: guide/standard, guide/namespace-pattern.

## Fix-before-linking flags
- exclude stackblitz + examples/index; minimal example pages cap 1-2 links
- guide/hmr: promote the production-parity section (half the page is generic Vite troubleshooting) before B1 anchors to it
- guide/node-class-hmr: hedged sections want a pass
- guide/model-layer: re-verify competitor version claims
- long pages (standard 1069 lines, model-layer 611): block goes end-of-page
