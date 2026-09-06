---
title: Testing & Invariants
description: 'A test is the invariant written for this implementation. How ivue classes are proven in three tiers, pure statics, hosted instances and browser probes, how each spec binds to a contract record the checker holds, and the protocol that keeps a check able to fail. The virtual scroller and its five companion classes are the worked example: nine colocated specs, sixty-three tests, two contracts.'
relatedPosts: [select-text-across-a-million-rows, templates-with-nothing-to-debug, single-file-models, agents-built-an-editor]
---

# Testing & Invariants

A test here is not a check that the code runs. It is the invariant, the
one if-then a piece of code exists to hold, written out for this
implementation so that it can fail. The class carries the behavior, the
contract carries the claim, the test binds the two, and a checker refuses
the repository when any one of the three is missing.

> A test is the invariant, written for this implementation.

This page is the method, with the virtual scroller and its five companion
classes as the worked example: nine colocated spec files, sixty-three
tests, two contracts, all read by the same checker that holds the engine's
own contract.

## Three tiers, by what the claim is about

Every claim about a class falls into one of three tiers, and the tier
decides what the test needs. The class layout makes the first cut for
you: a static has no instance `this` and cannot hold state, so it is
stateless by construction.

- **Pure statics.** A function of its arguments, no DOM. The range math
  of the selection, the speed ramp, the chunker, the pad's split and
  settle rules. The test calls the static through the namespace and
  asserts the return. Nothing is mounted, nothing is stubbed.
- **Hosted instances.** A class with cells, a constructor, and an owner.
  The scroller's window walk, the selection's drag, the touch gesture's
  hold, the marquee's seeding. The test constructs the instance with a
  plain object for its owner, stubs the two or three DOM readers the
  class rests on, and drives it by calling its methods.
- **Browser probes.** Claims about what the reader sees: a wheel lerp, a
  blank frame, a chip that appears. jsdom cannot see these. They run in a
  real browser through the component sweep, and the spec file names them
  as not covered.

The tier is a property of the claim, not of the file. One spec file
usually holds all three: statics at the top, hosted tests below, and a
line in its header saying which claims went to the browser.

## What ivue gives a test

The same rules that make a class readable make it testable, because both
come from the class declaring everything it does.

**Statics are reachable through the namespace.** The pure logic sits on
`X.Class` as static members, so a spec calls it with plain values and no
setup. The selection's range math is proven this way in seven cases that
never touch a node.

```ts
const Logic = VirtualScrollerSelection.Class;
expect(Logic.normalize(at(5, 3), at(2, 9))).toEqual({ start: at(2, 9), end: at(5, 3) });
```

**Cells are refs, derivations read live.** A ref-getter returns the same
cached ref every time, so a test writes `instance.speed.value = 50` and
reads the plain getter `instance.creepMsPerPx` on the next line. There is
no render to wait for, because a plain getter is a native getter.

**An owner interface is a plain object.** A hosted capability receives
what it needs through a small interface, never the host class. The
padding class needs four fields; the selection needs eight; the touch
gesture needs three methods and a flag. A spec builds that object with
`vi.fn()` where it wants to observe calls, and the capability cannot
tell the difference.

```ts
const owner = { halfPaddingQuantity: 3, scrollVelocity: 40, scrollGap: 800, estimatedItemSize: 40 };
const padding = new VirtualScrollerPadding.Class(owner);
expect(padding.pad(0)).toEqual({ before: 23, after: 18 });
```

**A subclass is the test double.** When a class reads the DOM through
seam getters, a test subclass overrides the seams, the same shape the
horizontal scroller uses to change axis. The scroller spec pins the
container size to one ref and re-exposes the protected seams it wants to
assert. Nothing is monkey-patched; the double is a class in the same
standard as the class under test.

```ts
class $Probe extends (VirtualScroller.$Class as typeof VirtualScroller.$Class)<Row> {
  get frameSize() {
    return ref(100);
  }

  override get containerSize() {
    return this.frameSize;
  }

  probeTransform(px: number) {
    return this.transformFor(px);
  }
}
```

A static knob works the same way. The demo's row count is a static, so
the spec subclasses it to a thousand rows and runs the same class over a
smaller list.

**A constructor is setup code, so host it.** A constructor that calls
`onMounted` or a plain `watch` lands those in the component that
constructs the instance. A bare `new` in a test has no component, so the
hooks warn and drop. The harness mounts a throwaway component whose setup
is the factory, and unmount runs the teardown the class declares.

<<< ../../examples/playground/src/examples/virtual-scroller/hosted.ts

A class with no hooks is constructed directly. The selection and the pad
are; the scroller, the item and the marquee are hosted.

**Stub at the seams, not around them.** jsdom lays nothing out and has
no `elementFromPoint`, no caret API, no canvas context. The selection
spec replaces exactly those three readers with arithmetic over a fixed
row height and character width, and keeps everything else real: the text
nodes, the tree walker, the Selection object. That is why its strongest
test is a round trip, every offset of a three-node row going from DOM to
text and back.

**Fake the clock for holds and settles, and the frame for loops.** The
long press is a timer advance; the pad's settle window is a timer
advance; the autoscroll is a queue of frame callbacks the test drains by
hand with explicit timestamps. A wait in a test is a defect looking for
a slower machine.

## The spec discipline

The rules below come from Invar, the terminal IDE agents built on ivue
under one written standard, where every one of them was bought by a
real failure. They are stated here as they apply to a class.

**The header is the constitution.** A spec file opens with a generator
header before its imports. The formal register names the goal, links the
contract records the file proves, states each local claim as an if-then
on the class's symbol, and lists what would be impossible if the claims
held. The described register says what the formal lines cannot: why
this shape, what a fresh session must not simplify away, and what is
not covered here by kind.

```ts
/*
=== GENERATOR ===
Goal: Size the rows mounted beyond the visible window from the motion itself, so a flick never shows canvas and a resting list never carries a flick's pad.
[The pad covers the lerp gap exactly](virtual-scroller.invariants.md#the-pad-covers-the-lerp-gap-exactly)
// domain-invariant: $VirtualScrollerPadding — If a pad is split, then the lookahead rows sit on the end the content moves toward and the gap rows on the end it comes from; at rest both ends carry the base.
Impossible if true: A pad that shrinks on the first frame of a flick's decay.

=== GENERATOR-DESCRIBED ===
The owner is a plain object of the four fields the pad reads; the walk
is a call to pad() with an explicit clock, so the hysteresis is a
sequence of readings, not a wait.
*/
```

**Every test carries its claim, and every claim has a test.** The
annotation directly above a test names the header line it proves, and
the test name states the property as a sentence. A claim with no test is
unproven; a test whose claim is not in the header is an unexplained
assertion. The checker holds both directions.

**Impossibilities are negative tests by construction.** Each
`Impossible if true` line gets a test that approaches the forbidden state
and asserts the refusal. The scroller's spec plants a non-finite scroll
position and asserts the last position stands; the chunker's walks every
cut and asserts the character after it starts a word.

**Born red.** A check is trusted after it has failed on the defect it
claims to catch. For a pure static the red arm is permanent: the
impossibility test is the violating fixture. Where red requires editing
shipped code, the defect is planted, watched red on the value, and
removed. Each of the nine spec files on this page was planted once
before it was committed.

**Assert the observable the reader would point at.** The selection spec
asserts the range and the copied text, not the internal cell that held
them. The item spec counts emits on mount and unmount, not calls to a
method. A model-only assertion goes green while the screen is broken.

**Enumerate the zero states first.** An empty wrapper, a list of one, a
list that shrinks to nothing and regrows, a caret past the end of the
text. The states come from the surface, not from the last failure.

**Kind-match the verification.** A gesture claim needs an input event
dispatched on a node; a persistence claim needs a second launch; a
performance claim needs a paired measurement; a visual claim needs a
browser. Sixty-three green tests verify no visual claim, which is why
the flick probe and the touch chip live in the sweep.

**Name what is not covered.** One line, in the described register. The
scroller's header says the wheel lerp, the creep integrator and the
converge loop went to the browser. Silent partial coverage reads as
total.

**Specs grow only while defects stay flat.** Add a test when it proves a
component or caveat not yet proven. When a defect appears, the first
question is which claim had no spec. If none was missing, the claim
itself is wrong: refine the header first, then write the test.

## The contract, and the checker that holds it

A claim that a second file depends on graduates from a header line to a
record in a contract, a file named `<subsystem>.invariants.md` beside
the code. A record is one if-then with its scope, the mechanism that
makes it hold, the evidence, what is impossible if it holds, and a
copy-paste verification. The contract's generator section lists every
record as a gear and states the mechanism they form.

Code points back. An annotation at each enforcement point names the
record verbatim:

```ts
// invariant: The scroll position lands inside the scrollable range (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
if (!Number.isFinite(position)) return;
```

The checker reads all three homes and refuses drift in any direction: a
record no annotation references, an annotation whose record was renamed,
a header claim with no test, a test with no claim, a link whose anchor
does not resolve.

```sh
node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs
```

The two contracts on this page are `virtual-scroller.invariants.md` and
`text-marquee.invariants.md`, each beside the classes it governs and
shown in full as a source tab on the [virtual scroller](/examples/virtual-scroller)
and [horizontal scroller](/examples/horizontal-scroller) pages. The first
holds twenty-three records; five of them are reality-based, the browser
and the compositor deciding, and eighteen are chosen, the subsystem's own
disciplines standing on those five.

## The worked example

The padding class is the whole method in one short file: statics with a
permanent red arm, a hosted instance with an owner double, a fake clock,
and a header that binds every test to a record.

::: code-group
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts [VirtualScrollerPadding.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.ts [VirtualScrollerPadding.ts]
:::

The other eight spec files follow the same shape and sit beside their
classes:

| spec | tier | what it stubs |
| --- | --- | --- |
| `VirtualScroller.test.ts` | hosted | a Probe subclass pins the container size and exposes the seams |
| `HorizontalVirtualScroller.test.ts` | hosted | the same Probe over the subclass; asserts every seam names x |
| `VirtualScrollerItem.test.ts` | hosted | an element and a parent with two rect readers |
| `VirtualScrollerSelection.test.ts` | statics + instance | `elementFromPoint`, the caret API, rects; an owner object |
| `TouchSelectionGesture.test.ts` | instance | fake timers; touch events on real nodes, one detached |
| `VirtualScrollerPadding.test.ts` | statics + instance | an owner object; fake timers |
| `VirtualScrollerExample.test.ts` | instance | a static override to a thousand rows; a scroller object |
| `TextChunker.test.ts` | statics | the canvas context, once as null and once as arithmetic |
| `TextMarquee.test.ts` | hosted | a scroller object; the canvas context |

The visual claims run in the [component sweep](/examples/virtual-scroller):
the drag past the bottom edge, the touch long press and its chip, and
the flick that must never show canvas.

## The cost

A spec file is longer than a test file, because the header states what
the tests prove and the annotations repeat it above each one. That is
the price, and it is what lets a checker rather than a reviewer notice
that a claim lost its test. The other cost is discipline at the
boundary: a claim that grows a second dependent must move into the
contract, or the checker cannot see it.

A test is the invariant, written for this implementation.

## See it running

- [Virtual Scroller: 1M Items](/examples/virtual-scroller) — the class, its companions, and their specs as source tabs.
- [Horizontal Scroller: 1M Items](/examples/horizontal-scroller) — the strip and the text marquee, with the chunker's specs, a pure Static class end to end.
- [The Invariants Behind ivue](/reference/invariants) — the engine's own contract, held by the same checker.
