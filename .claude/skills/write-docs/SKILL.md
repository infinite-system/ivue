---
name: write-docs
description: Use when writing or editing any documentation in this repo — docs_v2 guide pages, README, invariants docs, sketch DESIGN/RESULTS files, or doc comments meant for readers. Encodes the house documentation style — timeless present tense with no edit-history residue, unpacked concepts over compressed jargon, ivue-standard code examples, and verified claims.
---

# write-docs — how documentation is written here

Documentation serves ONE person: the reader arriving fresh. Every rule below
derives from that. The reader was not present for our decisions, our earlier
drafts, or our corrections — and must never need to be.

## Timeless present — no edit-history residue

Docs describe what IS. They never narrate how the text got that way.

- **NEVER contrast against a phantom.** The failure mode: a first draft says
  X, it gets corrected to Y, and the rewrite says "it is Y, not X" or
  "previously X, but now Y". That X never shipped — it was a draft artifact.
  The reader has never seen X; referencing it introduces a concept that
  exists nowhere, purely to dismiss it. Write Y as if it were always Y.
- The test: **would this sentence make sense to someone who has read no
  earlier version of this document?** If a sentence exists only to close a
  door the reader never saw open, delete it.
- The exception is a REAL alternative a reader might actually bring with
  them (a Vue idiom, a rejected design that shipped elsewhere, a pattern
  from another library). Contrasting against those serves the reader —
  components.md's regime-history table earns its place because those
  regimes were genuinely tried and readers know them. Contrast earns its
  place by the reader's prior knowledge, never by our drafting history.
- Same discipline at the sentence level: no "actually", "instead we now",
  "it turns out", "as mentioned above we changed" — decision ceremony reads
  as churn and makes the reader re-litigate settled questions.

## Unpack concepts — density is not clarity

Write for a competent developer who does not share our head.

- **First use of a term of art gets its plain meaning in-line**: "a POJO — a
  plain JavaScript object with no proxy or class machinery", "detached
  scope — an effect scope no parent scope will ever stop". After the first
  unpacking, the short term is free to use.
- **No hard pivots.** A sentence that lurches between three compressed
  ideas with em-dash chains and untranslated jargon serves nobody. One idea
  per sentence; the technical term AND what it means; complete sentences
  over fragment chains (`A → B → fails` is a note to self, not prose).
- Terse is fine when the words are common; terse is hostile when the words
  are load-bearing jargon. When in doubt, spend the extra clause.
- **One concept, one name, everywhere.** If the docs call it an invariant,
  no page calls it a law, a rule, or a principle. A second name for the
  same thing reads as a second thing.
- **Never reference by number** ("see Principle #4", "rule 3 above") —
  numbering changes, and the reference forces the reader to go count.
  Reference by name and link to the anchor.

## Code in docs follows the ivue skill

Every code block is teaching code — someone WILL copy it.

- Apply the **ivue skill** to every example: proper multi-line member
  bodies (no `get x() { return ref(0) }` one-liners), domain-word
  identifiers (no `inst`, `qty`, `v`/`old` — `instance`, `quantity`,
  `newValue`/`oldValue`), thin closures delegating to methods, the
  namespace export with its three inline comments, the grouped state
  destructure in SFCs.
- **Example tiers**: a block with a filename comment (`// Product.ts`) is a
  TEMPLATE — full canonical form (class files are PascalCase): namespace export, thin computeds for real
  logic, safe to copy as a file. A block without a filename is a FRAGMENT —
  the minimum that proves the point, so the mechanism stays visible; the
  reader lifts the idea, not the file. Costless conventions hold in BOTH
  tiers — `$Name` raw classes, plain getters for derivation, `computed()`
  only where it earns its bytes, domain naming, `.value`, multi-line form.
  Never write a "quick" example that models a banned pattern. One deliberate
  exception exists: Getting Started's first class uses the one-off
  `Reactive(class ...)` form and points to Modules & Imports for the
  standard.
- SFC fragments are complete SFCs: `<script setup lang="ts">` present, a
  real `<template>` — never a floating template tag in a ts fence.
- If the docs demo a component live, the demo imports the SAME files the
  page shows — the page's code blocks are the demo's actual source.
- **Every layer of an example is written in ivue itself** — the route SFC,
  the demo template, even the app shell that bootstraps it. No plain
  script-setup ref soup anywhere a reader might look: the examples are the
  advertisement, and an "ordinary" wrapper undercuts the claim on the page.

## Claims are measured, verified, current

- Numbers carry their method and environment ("Measured on Vue 3.5, 20k
  instances, one full read pass"). "Measured, not promised" is the voice.
- Never state a behavior you haven't executed. Mount the component, run the
  snippet, build the site. A claim about reactivity semantics gets a test
  before it gets a sentence.
- After ANY docs change: `npm run build:docs` must pass, and anchors you
  link to must exist in the built HTML (VitePress won't fail on a dead
  in-page anchor).

## Repo mechanics (this codebase)

- **The skill is the source; standard.md is the mirror.** Edit
  `.claude/skills/ivue/SKILL.md`, then resplice `docs_v2/guide/standard.md`
  from the `# ivue \`Reactive\`` marker and assert the
  bodies are byte-identical. Never edit the mirror directly.
- VitePress traps: literal `{{ }}` in prose SSR-compiles as interpolation
  (rephrase or v-pre); raw-HTML `href`/`src` are not base-prefixed (the
  markdown-it pass in config handles md files — Vue components use
  `withBase()`); frontmatter values starting with a backtick break YAML.
- Punchy one-line theses go in blockquotes — the theme styles every guide
  blockquote as an invariant card, so reserve `>` for statements that
  deserve it.
- Design changes are verified by screenshot (both themes) before claiming
  done; interactive demos by jsdom mount-and-drive.

## Self-review (run over your docs diff)

- [ ] No sentence references a draft state, a correction, or "the old way"
      that never shipped; everything reads timeless-present.
- [ ] Every term of art is unpacked at first use; no fragment-chain prose.
- [ ] One name per concept across all touched pages; no by-number references.
- [ ] Every code block passes the ivue skill checklist for its tier.
- [ ] Numbers have method + environment; behaviors were executed.
- [ ] Docs build passes; linked anchors exist in built HTML; skill mirror
      resynced if SKILL.md changed.
- [ ] Every example page carries a "Related guide pages" section linking
      the guide pages for its concepts, and every guide page a "See it
      running" section linking the examples that demonstrate it — the two
      trees are never disjoint.
