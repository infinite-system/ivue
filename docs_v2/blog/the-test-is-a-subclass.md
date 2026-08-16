---
title: 'The test is a subclass'
description: Invar's test harness never mocks. It substitutes full citizens — swap the capability at its Static() seam, subclass $Class to pinch one knob, plant a defect as a positive control. No mock framework, no stub drift, and the compiler checks the fakes.
date: 2026-07
tags: [patterns, architecture]
---

# The test is a subclass

<BlogPostDate />

![The test is a subclass](/blog/the-test-is-a-subclass.png)

There is no mock framework anywhere in
[Invar](/examples/invar)'s test
infrastructure. No `jest.mock`, no stub factories, no hand-rolled
objects pretending to be interfaces. And yet the harness routinely
runs the editor against a fake language server, measures the inside of
a popup from outside the process, and proves that its own checks can
fail.

It does all of this with the two exports every ivue namespace already
has: `Class` and `$Class`. The pattern shows up in three strengths.

## Strength one: swap the whole capability

Every ivue namespace is a seam. When a smoke needs the completion
popup to face exactly 5,000 deterministic items instead of a live
language server, it doesn't mock the client — it preloads a file that
substitutes the provider at the seam the product already asks:

```ts
// completion-mock-provider-preload.ts (abridged)
class $MockLanguageProvider extends LanguageClient.$Class {
  override async completion(
    document: TextDocumentModel,
    position: TextPosition,
    context: LanguageCompletionContext,
  ): Promise<LanguageCompletionList> {
    return this.deterministicItems; // 10, 1,000, or 5,000 of them
  }
}
```

The product never learns. It asks the namespace, the namespace answers
with the substitute, and — this is the part a mock framework can't
give you — **the substitute is a full citizen, type-checked against
the same contract as the real thing**. When the `LanguageProvider`
interface grew a field last week, the mock failed to compile until it
was honest again. Stub drift, the slow death of every mocked test
suite, is a compile error here.

The same move appears wherever a boundary needs a controlled far
side: a mock `RewriteProvider` stands in for a live AI model in the
inline-rewrite smoke; a mock TTS engine stands in for audio in the
voice-picker smoke. One pattern, no framework.

## Strength two: subclass to pinch one knob

Sometimes the test doesn't want a different capability — it wants the
real one with a single parameter made small enough to observe. The
PTY driver caps how much terminal output it retains, and that bound
needs testing without generating megabytes:

```ts
// PtyTestDriver.test.ts
class TinyOutputPtyTestDriver extends PtyTestDriver.$Class {
  protected static override get retainedOutputLengthLimit(): number {
    return 96;
  }
}
```

That is the entire test double. Every code path is the production
path; one protected getter is pinched. The `$Class` export makes this
a designed affordance rather than a hack — the raw class is *published
by the namespace* precisely so that extension is first-class. The same
trick instruments hot paths from outside: a measured subclass of the
popup overrides `recomputeMatches()`, calls `super`, and publishes a
counter — which is how the harness proved, through a real terminal,
that selection in a 5,000-item list does zero refiltering.

## Strength three: subclass to plant a defect

The harness's rule for its own checks: **a check that can only fail
toward "pass" is a decoration.** Every detector must be shown its
quarry at least once. So the width-agreement check feeds itself `漢`
and requires the answer 2. The coverage ratchet has a fixture file
whose only purpose is to be caught. The quiet-lock test constructs a
holder that never releases and requires the degrade warning to name
it. The machinery for most of these positive controls is the same
subclass move — take the real class, override one member to be
defective, require red.

This is the strength most test suites skip, and it is the one that
caught real instrument bugs here: a liveness probe that silently
matched nothing, a retry tally that recorded attempts instead of
outcomes. The fakes aren't just standing in for dependencies — they
are the proof that the judges can convict.

## Why this works: `Static()` classes have nothing to fake

The usual argument for mock frameworks is that constructing real
objects is expensive and entangled — so you fake the shape and hope.
ivue's `Static()` form removes the premise. A stateless capability
class has no constructor ceremony, no lifecycle, no hidden instance
state; substituting it is just answering the namespace with a
different class. The `Reactive()` form keeps state, but its
dependencies arrive through the same namespaces, so the seam is
always one substitution away.

The result is a test suite where every double is compiled against the
production contract, every override names exactly what it changes,
and the diff between fake and real is readable in five lines. When
Invar's PTY layer turned out to have a descriptor-theft bug at the
operating-system level, the fix was verified by a probe driving the
*same class* the product ships — because the harness and the product
were never two worlds to begin with.

The instrument that judges the code is built under the same law as
the code it judges. If the conventions were only good enough for the
product, that would be evidence against them.
