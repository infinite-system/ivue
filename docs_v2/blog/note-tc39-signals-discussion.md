---
title: 'TC39 signals — discussion post draft'
description: 'Draft for a GitHub Discussion on tc39/proposal-signals: object-layer evidence (lazy existence, zero-cost derivation, explicit release). Evgeny posts it; tone is data-first, zero pitch.'
private: true
channel: note
date: 2026-08
---

# TC39 signals — discussion post draft

**Where to post:** `tc39/proposal-signals` → Discussions (Ideas). If
Discussions are closed, an issue titled the same works, but
Discussions is the polite venue for non-spec-text input.

**Tone rules:** data first, no product pitch, no "you should adopt
ivue." The proposal README asks for evidence from practice — supply
evidence, ask design questions, stop. Link the benches and at most
two articles. Vue-adjacent people in the thread already know the
alien-signals lineage; don't lecture.

**Timing note:** posting this is launch-adjacent PR. Consider posting
AFTER the HN launch so the profile/repo look alive when committee
folks click through — or 1–2 days before, so the thread exists to
cite in the HN comments. Evgeny's call.

---

## Suggested title

> Object-layer field data: lazy cell existence, derivation without
> Computed nodes, and explicit release — measured in userland

## Body draft

The README gates advancement on evidence that signals work in
practice. We've been running a signals-on-objects layer in production
apps for ~3 years (userland, on Vue's reactivity — same
pull-lazy/auto-track model as this proposal), and recently published
benchmarks that touch three design areas this proposal currently
defers. Sharing the data in case it's useful; happy to run variations.

**1. Allocation timing for signals in classes.** The accessor-
decorator pattern allocates the backing `Signal.State` at
construction. We measured the alternative — cells materialized on
first access from a prototype-owned initializer: instance creation
runs 55–253× faster at 100k instances, and unread properties never
allocate at all (a "player + editor" model with ~90 derived
properties pays nothing for the editor half until it's opened). If
class integration is ever specified (even informally via decorator
guidance), lazy backing allocation seems worth considering as the
default semantic. Question: has lazy slot allocation been discussed
for the decorator integration path?

**2. Derivation without a Computed node.** Since the tracked read is
the primitive, a plain prototype getter reading `State` cells
auto-tracks through whatever computed/watcher reads it — zero bytes
per instance, no graph node. We measured where a Computed node
actually pays for itself: derivations doing real work (string
building over 5 deps, reduce over 100 elements) cross over at ~2
reads per dependency change; trivial derivations (`a + b`) at ~10,
saving single-digit ns; at 1 read per change (animation-frame rhythm)
the uncached getter wins every tier because invalidation costs exceed
recomputation. Data: derived-vs-computed + ratio sweep benches
(Node 26; identical shape on Vue 3.5.41 stable graph and 3.6
alien-signals graph). Implication we'd offer: ecosystem guidance
should treat `Computed` as an opt-in cache, not the default shape for
derived values — the proposal's lazy-pull design already makes the
getter idiom sound.

**3. Explicit release vs. reachability.** With closure-held signals,
one retained reference (event bus, stray closure, devtools) pins
everything: 10k leaked component models kept 85 MB permanently in our
measurement, and every GC pass traces that live graph (we measured
collections 2–3× slower). Because our layer owns a per-object cell
ledger, the object can release its cells while still referenced —
same leak, 4.7 MB residual, and faster collections. The proposal
currently has no object model so this isn't expressible; if an object
integration layer ever lands, an existence API (release/reset the
cells of a live object) has measurably different memory behavior than
relying on reachability alone. Question: is per-object cell storage
considered in-scope for any future phase, or permanently framework
territory?

Benches (reproducible, ~1 min each):
- github.com/infinite-system/ivue → `bench/derived-vs-computed.mjs`,
  `bench/derived-vs-computed-ratio.mjs`,
  `bench/disposal-vs-vue-components.mjs`

Write-ups with methodology:
- ivue.dev/blog/derivations-are-free
- ivue.dev/blog/release-what-the-gc-cant

---

**After posting:** drop the discussion URL into the launch plan note
(cite it in HN comments if the signals question comes up — it will).
