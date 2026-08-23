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

## Gaps — docs-sourced post pipeline
B1 Production parity is the feature (no dev runtime)  → guide/hmr (promote page first), node-class-hmr, modules
B2 State born valid (computed seed; Invar SplitterModel origin) → computed-seed, state, inheritance
B3 The third state shape (keyed version signals)      → keyed-version-signals, backend, flyweight
B4 The fork trap: when a cache must not be a cache    → caches-and-registries, static
B5 Teardown you can prove (deactivate → re-activate)  → lifecycle-teardown, examples/lifecycle
B6 Props that inherit (propsWithDefaults/ExtractEmitTypes/ExtendSlots) → extensible-components, media-field
B7 Reactivity on the server                            → backend, keyed-version-signals, namespace-pattern
B8 The ladder: self vs unchecked constructor casts     → caches-and-registries, static

## C2 — Invar-sourced post ideas
1. The thunk that survives the cycle (LazyShared full story + cycle guard) → caches-and-registries, namespace-pattern
2. The census must read zero (retiring the pinned-reads allowlist)         → caches-and-registries, static
3. Knobs, not pins (ScrollPhysics live static getters + subclass retune)   → static, caches-and-registries
4. Checkers that refuse to run until they catch a plant (positive controls)→ state, reference/invariants, computed-watch
5. The contract lives in the file (GENERATOR/SPEC codas, 39 contracts)     → reference/invariants, standard
6. A bug the tests called a flake (Replay hover + clamp-order wedge)       → lifecycle-teardown, computed-watch
7. Three minds, one repo (conductor / observer / adversarial review)       → standard; follows uniformity + field-not-rules
8. Parse, don't grep (ast-query over 345 uniform classes)                  → standard, namespace-pattern

## Fix-before-linking flags
- exclude stackblitz + examples/index; minimal example pages cap 1-2 links
- guide/hmr: promote the production-parity section (half the page is generic Vite troubleshooting) before B1 anchors to it
- guide/node-class-hmr: hedged sections want a pass
- guide/model-layer: re-verify competitor version claims
- long pages (standard 1069 lines, model-layer 611): block goes end-of-page
