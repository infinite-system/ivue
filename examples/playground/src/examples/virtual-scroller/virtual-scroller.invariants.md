# Virtual scroller invariants

The living contract for the virtual scroller subsystem: `VirtualScroller.ts` and its `HorizontalVirtualScroller.ts` subclass, the row model `VirtualScrollerItem.ts`, and the three hosted capabilities `VirtualScrollerSelection.ts`, `TouchSelectionGesture.ts` and `VirtualScrollerPadding.ts`. Records are unnumbered; the name is the identifier and is referenced verbatim by code annotations (`// invariant: <name> (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)`) and by the generator headers of the colocated `*.test.ts` files.

Two kinds of records, and the split is load-bearing:

- **Reality-based invariants** are forced by how the browser, the compositor and the scroll integrator actually work. They are discovered, not chosen; a record that is reality only inside this subsystem and decided at a wider scope names that scope in `Renegotiable at`.
- **Chosen invariants** are the subsystem's own disciplines. Each could be otherwise and still be coherent; the subsystem depends on it not drifting.

Chosen invariants stand on reality invariants, never the reverse.

## Generator

The records below are gears. This section is the mechanism they form, in
invariant form, so a scan of this file alone carries the deep picture.

STUDY ALSO: [Testing ivue Classes](../../../../../docs_v2/guide/testing.md) —
the guide that reads these records back as the spec discipline: which
tier each record is proven at, and how the colocated tests bind to it.

### A window of a few dozen rows renders any list at the exact pixel

**Invariant:** If the rows a viewport can show are mounted between two spacers whose sizes are prefix sums over measured-or-assumed row sizes, the scroll position is clamped and rebased before it is rendered, and every capability that needs the DOM is hosted behind an owner interface, then a list of any length scrolls, seeks, selects and copies as one continuous document at the cost of the rows on screen.

**Scope:** The virtual scroller subsystem: vertical and horizontal, mouse and touch, selection and padding. The goal vector is a million-item list that behaves like a short one.

**Components:** One per gear, each delete-testable:
- [Rendered sizes are known only after a row mounts](#rendered-sizes-are-known-only-after-a-row-mounts) — why positions are prefix sums over an estimate that refines.
- [A native selection dies with the node that anchors it](#a-native-selection-dies-with-the-node-that-anchors-it) — why the selection cannot be the browser's.
- [Touch events keep firing on the node the finger landed on](#touch-events-keep-firing-on-the-node-the-finger-landed-on) — why the gesture's listeners ride the origin node.
- [The transform lerps to the target over many frames](#the-transform-lerps-to-the-target-over-many-frames) — why a target-anchored window leaves a gap to cover.
- [Rendered offsets are rebased by whole chunks](#rendered-offsets-are-rebased-by-whole-chunks) — why a reader a million rows deep does not stutter.
- [The scroll position lands inside the scrollable range](#the-scroll-position-lands-inside-the-scrollable-range) — why no input can poison the position.
- [An unchanged window keeps its array identity](#an-unchanged-window-keeps-its-array-identity) — why a scroll inside the window does not re-render the rows.
- [The two spacers and the rendered rows sum to the extent](#the-two-spacers-and-the-rendered-rows-sum-to-the-extent) — why the scrollbar and the seek agree with the content.
- [A seek names an item not a pixel](#a-seek-names-an-item-not-a-pixel) — why a landing survives the estimate refining under it.
- [The thumb never shrinks below a grabbable fraction](#the-thumb-never-shrinks-below-a-grabbable-fraction) — why a million rows still have a scrollbar.
- [A cross-axis touch belongs to the page](#a-cross-axis-touch-belongs-to-the-page) — why a horizontal strip does not trap a vertical swipe.
- [Every axis dependency goes through a seam getter](#every-axis-dependency-goes-through-a-seam-getter) — why the horizontal scroller is a hundred lines.
- [An item captures its size once in and once out](#an-item-captures-its-size-once-in-and-once-out) — why sizes are truthful without a per-row observer.
- [Shrinking the list prunes the measurements at its new end](#shrinking-the-list-prunes-the-measurements-at-its-new-end) — why a splice cannot leave the extent stale.
- [The selection is a range over the data](#the-selection-is-a-range-over-the-data) — why the highlight survives recycling and copy reaches unmounted rows.
- [Text offsets are measured against the trimmed row text](#text-offsets-are-measured-against-the-trimmed-row-text) — why a copied row does not start three characters off.
- [The copied text is the string the row renders](#the-copied-text-is-the-string-the-row-renders) — why a copy that spans the window boundary reads as one text.
- [A long press turns the next move into a selection](#a-long-press-turns-the-next-move-into-a-selection) — why touch can select in a list where a drag means scroll.
- [A multi-click selects the word or the row under it](#a-multi-click-selects-the-word-or-the-row-under-it) — why double click still works after the native selection is taken away.
- [The pad covers the lerp gap exactly](#the-pad-covers-the-lerp-gap-exactly) — why a flick never shows canvas.
- [Lenis is read inside the walk never tracked](#lenis-is-read-inside-the-walk-never-tracked) — why the pad costs no extra walks.
- [A pad never outlives its flick](#a-pad-never-outlives-its-flick) — why a resting list mounts its base rows only.
- [A hosted capability reaches its owner through an interface](#a-hosted-capability-reaches-its-owner-through-an-interface) — why selection, touch and padding are each testable without a scroller.

**Mechanism:** The prefix-sum cursor turns an estimate plus a sparse map of measured sizes into positions in O(distance); the window walk mounts the rows the container covers plus the pad and reduces everything else to two spacers; the clamp and the rebase make the rendered numbers safe before Lenis writes them; the hosted capabilities add selection, touch and adaptive padding through owner interfaces of a handful of members, so each is a class with its own statics, its own spec and its own reason to exist.

**Generates:** The colocated specs (`VirtualScroller.test.ts`, `HorizontalVirtualScroller.test.ts`, `VirtualScrollerItem.test.ts`, `VirtualScrollerSelection.test.ts`, `TouchSelectionGesture.test.ts`, `VirtualScrollerPadding.test.ts`); the component sweep's drag-select, touch and flick probes (`docs_v2/scripts/component-sweep.cjs`); the example pages `docs_v2/examples/virtual-scroller.md` and `docs_v2/examples/horizontal-scroller.md`; the text marquee, which composes the horizontal scroller (`../text-marquee/text-marquee.invariants.md`).

**Impossible if true:** Blank canvas under the viewport after a flick. A highlight that collapses when its anchor row recycles. A copy that stops at the mounted rows. A horizontal scroller that forks the cursor or the creep. A scroll position rendered outside the extent.

**Evidence:** The Evidence fields of the component records; the nine colocated `*.test.ts` files (63 specs) and the component sweep (60 probes).

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller examples/playground/src/examples/text-marquee` green, then `node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs` clean, then `npm run sweep:components` at 60 pass.

**Status:** provisional

**Last refined:** 2026-09-06

## Reality-based invariants

### Rendered sizes are known only after a row mounts

**Invariant:** If a row has not been rendered, then its size is the estimate, and the position of every row is the sum over the rows before it of the measured size where one exists and the estimate elsewhere.

**Scope:** `VirtualScroller.ts`: `syncItemSize`, `getIndexPosition`, `getIndexAtPosition`, `getAnchoredPosition`, `computeScrollExtent`, the `cursor` holder and the `measuredSizes` map. Applies to every row of every list the scroller renders.

**Renegotiable at:** Layout — a browser lays out only what is in the DOM; a list that knew every size up front would not need the estimate.

**Mechanism:** `measuredSizes` is sparse; `estimatedItemSize` fills the holes. `syncItemSize` keeps `measuredSum`, `measuredCount` and the cursor's `offset === P(cursor.index)` exact in O(1); `getIndexPosition` walks the cursor to the asked index, so the answer is the same whichever way it walks. `maybeCalibrateEstimate` swaps the assumption once, near the top, where the change lands entirely in the trailing spacer.

**Generates:** The `assumedSize` prop and the marquee's exact width seeding; the converge loop in `scrollToIndex`, which re-applies a landing as sizes refine.

**Rejected alternatives:** A dense positions array — O(n) on every size change, which is a burst per scroll at 100k items.

**Evidence:** `VirtualScroller.ts` `syncItemSize`, `getIndexPosition`. Tests: "an item’s position is the sum of the sizes before it, measured or assumed, and the same from either direction of the walk", "the item under a pixel offset, anchored at its fraction, returns that pixel".

**Impossible if true:** Two walks to the same index returning different positions. A measured row contributing the estimate to the extent.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "sum of the sizes before it|anchored at its fraction"`

**Status:** provisional

**Last refined:** 2026-09-06

### A native selection dies with the node that anchors it

**Invariant:** If a selection is two DOM positions and the list recycles the node holding one of them, then the selection collapses and copy reaches only the mounted fragment.

**Scope:** Every virtual list, in every browser. Inside this subsystem it is why `VirtualScrollerSelection.ts` exists.

**Renegotiable at:** The DOM Selection API — anchored to nodes by specification.

**Mechanism:** `Selection.anchorNode` is a live node reference; a removed node has no position in the document, so the range it bounded is gone. The native drag-selection also autoscrolls the nearest scrollable ancestor, which a transform-driven list is not, so the browser moves the wrong element.

**Generates:** [The selection is a range over the data](#the-selection-is-a-range-over-the-data); the `preventDefault` on mousedown in `VirtualScrollerSelection.onMouseDown`; [A multi-click selects the word or the row under it](#a-multi-click-selects-the-word-or-the-row-under-it), which gives back what that `preventDefault` takes away.

**Evidence:** `VirtualScrollerSelection.ts` header comment. Test: "a drag begins at a logical position, extends by logical positions in either direction, and survives its anchor row leaving the DOM". The blog post `docs_v2/blog/select-text-across-a-million-rows.md`, "Why it breaks".

**Impossible if true:** A native selection surviving the removal of its anchor node.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "survives its anchor row leaving the DOM"`

**Status:** provisional

**Last refined:** 2026-09-06

### Touch events keep firing on the node the finger landed on

**Invariant:** If a finger lands on a node and that node leaves the DOM, then the finger's later touchmove and touchend events still fire on that node and nowhere above it.

**Scope:** `TouchSelectionGesture.ts`: `attach`, `followTouch`, `stopFollowingTouch`. Any touch gesture whose origin element a virtual list may recycle mid-gesture.

**Renegotiable at:** The Touch Events specification — the touch target is fixed at touchstart.

**Mechanism:** A detached node has no ancestors, so its events reach neither the element nor the document; listeners on the node itself still receive them. `followTouch` therefore adds touchmove, touchend and touchcancel to `event.target` at touchstart, and `stopFollowingTouch` removes them when the gesture ends.

**Generates:** The `hold.target` holder; the one non-passive listener the gesture installs.

**Rejected alternatives:** Document-level touch listeners — they never see the events of a recycled origin row, which is exactly the row a drag past the edge recycles.

**Evidence:** `TouchSelectionGesture.ts` `followTouch`. Test: "a finger whose origin row left the DOM still extends the selection, because the listeners ride the origin node". LESSONS.md, the text selection mechanics entry.

**Impossible if true:** A document listener receiving a touchmove whose target is detached.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/TouchSelectionGesture.test.ts -t "origin row left the DOM"`

**Status:** provisional

**Last refined:** 2026-09-06

### The transform lerps to the target over many frames

**Invariant:** If a wheel input moves the scroll target, then the transform reaches it over many frames while the frame loop hands the window walk the target, so between the two the viewport shows rows behind the mounted window.

**Scope:** `VirtualScroller.ts` `loop` and the wheel path of Lenis (`src/lenis`), and `VirtualScrollerPadding.ts`, which covers the gap.

**Renegotiable at:** Lenis's smooth wheel lerp — a scroller that snapped the transform to the target every frame would have no gap and no glide.

**Mechanism:** `loop` calls `setScrollPosition(-lenis.targetScroll)` each frame, so the window is computed at the destination; Lenis writes `animatedScroll` to the transform, which lags by the lerp. The gap `targetScroll − animatedScroll` is known exactly every frame.

**Generates:** [The pad covers the lerp gap exactly](#the-pad-covers-the-lerp-gap-exactly); the scroller's `scrollGap` owner accessor.

**Evidence:** `VirtualScroller.ts` `loop`; LESSONS.md "the window walk is anchored at the scroll TARGET" (measured: 21/28/35 uncovered frames of 91, identical with and without a 60-row velocity pad). Test: "rows behind cover the lerp gap exactly, rounded up and capped".

**Impossible if true:** A blank-canvas frame during a flick whose gap in rows is smaller than the trailing pad.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts -t "lerp gap exactly"`

**Status:** provisional

**Last refined:** 2026-09-06

### Rendered offsets are rebased by whole chunks

**Invariant:** If the scroll passes a chunk of 65,536 px, then a bias one chunk below the current chunk is subtracted from both the leading spacer and the applied transform in the same frame, so the rendered numbers stay below about 131k px at any depth.

**Scope:** `VirtualScroller.ts`: `renderBias`, `updateRenderBias`, `leadingSpacerPx`, `setScrollPosition`, `loop`, and `lenis.renderOffset`.

**Renegotiable at:** GPU compositing precision — single-precision floats lose sub-pixel placement past about 2^23 px.

**Mechanism:** All scroll math stays absolute; only the two render outputs are shifted by the same bias, so their difference, everything visible, is unchanged. `loop` rebases before Lenis writes the frame's transform so the spacer (this frame's flush) and the transform shift together.

**Generates:** The `renderBias` ref (a ref, because the spacer binding must re-render on rebase); the `RENDER_BIAS_CHUNK` static.

**Evidence:** `VirtualScroller.ts` `updateRenderBias`, the `renderBias` doc comment. Test: "deep in the list the render bias rebases the leading spacer by whole chunks".

**Impossible if true:** A leading spacer or transform rendered above about 131k px. A bias that is not a multiple of the chunk.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "rebases the leading spacer"`

**Status:** provisional

**Last refined:** 2026-09-06

## Chosen invariants

### The scroll position lands inside the scrollable range

**Invariant:** If any path asks to scroll to a position, then the position written is clamped into `[0, extent − container]`, and a non-finite position is refused with the last position standing.

**Scope:** `VirtualScroller.ts` `setScrollPosition` — the one write path for `scrollPosition`, the transform and `lenis.targetScroll`; `scrollBy` for the selection's autoscroll.

**Mechanism:** `setScrollPosition` tests `Number.isFinite` first, then clamps against `scrollExtent` and the container's border-box size, then writes. Every caller (the frame loop, seeks, the creep, the selection autoscroll) goes through it.

**Generates:** The bottom clamp the seek bar relies on; `lenis.virtualLimit`, which takes the same box.

**Rejected alternatives:** Trusting the caller — a single NaN poisons `lenis.targetScroll` and freezes the scroller until remount, and invalid transforms are silently ignored so nothing recovers.

**Evidence:** `VirtualScroller.ts` `setScrollPosition`. Test: "a scroll position is clamped into the scrollable range, and a non-finite one is refused".

**Impossible if true:** A rendered scroll position beyond the extent. A NaN reaching `lenis.targetScroll`.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "clamped into the scrollable range"`

**Status:** provisional

**Last refined:** 2026-09-06

### An unchanged window keeps its array identity

**Invariant:** If the window walk produces the same items at the same indices as the previous walk, then it returns the previous array, so the computed's equality check stops propagation and the `v-for` does not re-render.

**Scope:** `VirtualScroller.ts` `computeVisibleItems`, `visibleItemsSnapshot`, and the `visibleItems` computed.

**Mechanism:** The walk compares the new slice to the snapshot item by item (`item`, `id`, `index`) before allocating; on equality it returns the snapshot. `item.id` is read in the comparison to keep dependency parity with the build path.

**Generates:** The `// computed: expensive + render-suppression` justification on `visibleItems`; the flat frame cost of a scroll inside the window.

**Evidence:** `VirtualScroller.ts` `computeVisibleItems`. Test: "the window covers the container from the item under the scroll top, padded on both ends, and keeps its identity while unchanged".

**Impossible if true:** A re-render of the rows for a scroll that did not change the window.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "keeps its identity while unchanged"`

**Status:** provisional

**Last refined:** 2026-09-06

### The two spacers and the rendered rows sum to the extent

**Invariant:** If the window walk runs, then the leading spacer is the estimated top of the first rendered row, the trailing spacer is the rest of the content, and leading plus rows plus trailing equals the extent; the trailing spacer RENDERS capped at 2,048 px while its true size feeds the extent.

**Scope:** `VirtualScroller.ts` `computeVisibleItems` (the spacer writes), `leadingSpacerPx`, `trailingSpacerPx`, `TRAILING_SPACER_RENDER_CAP`, and `lenis.virtualLimit`.

**Mechanism:** The walk writes both spacer sizes on every evaluation, even when the window is unchanged, because a size correction above the window moves only the lead. The rendered tail is capped so the composited layer stays a few hundred k px regardless of list size; the scroll range comes from the computed extent through `virtualLimit`, not from the DOM.

**Generates:** The content-sized inner layer (no explicit size in `VirtualScroller.vue`); the scrollbar geometry, which is computed over the virtual position.

**Rejected alternatives:** Rendering the true tail — a ~10M px layer on a 100k-item post, felt as compositor heaviness.

**Evidence:** `VirtualScroller.ts` `computeVisibleItems`, `trailingSpacerPx`. Test: "the two spacers and the rendered rows add up to the extent, and the trailing spacer renders capped".

**Impossible if true:** A window whose spacers plus rows sum to anything but the extent. A rendered trailing spacer above the cap.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "add up to the extent"`

**Status:** provisional

**Last refined:** 2026-09-06

### A seek names an item not a pixel

**Invariant:** If a seek bar asks for a 0..1 fraction, then the fraction names an item plus a fraction inside it (index space), the landing rides `scrollToIndex`, and the converge loop re-applies that same anchor as sizes refine so the CONTENT stays still.

**Scope:** `VirtualScroller.ts` `seekToFraction`, `seekToProgress`, `getRatioPosition`, `getAnchoredPosition`, `scrollToIndex`, `snapAlignOffset`.

**Mechanism:** `getRatioPosition` scales the fraction over `itemCount − 1` and anchors at the floor item plus the remainder; `scrollToIndex` computes the target from `getIndexPosition` on every wave and stops only after the position has been quiet for 600 ms or the reader takes over. `seekToProgress` is the built-in track's inverse of `scrollbarProgress`: position space resolved to an item plus a fraction, so a marquee chunk wider than the container still reaches its tail.

**Generates:** The `endGapPx` dead-zone that keeps the promised item clear of the top edge; the `snapAlign` center placement.

**Rejected alternatives:** A raw `lenis.scrollTo` — translates the content without rebasing the window.

**Evidence:** `VirtualScroller.ts` `getRatioPosition`, `scrollToIndex`. Tests: "a ratio names an item plus a fraction inside it, and the end gap keeps the next item’s top clear of the viewport top", "seeking to a fraction lands on the item that fraction names, flush to the start by default and centered when asked".

**Impossible if true:** A seek landing that moves to different content when a late size wave arrives.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "a ratio names an item|seeking to a fraction"`

**Status:** provisional

**Last refined:** 2026-09-06

### The thumb never shrinks below a grabbable fraction

**Invariant:** If the content is taller than the container, then the thumb is the container's share of the extent floored at 0.08 of the track, and progress is the position's share of `extent − container`; if the content fits, there is no thumb.

**Scope:** `VirtualScroller.ts` `scrollbarThumbFraction`, `scrollbarProgress`, `scrollbarThumbStyle`, `scrollbarVisible`, and the axis seam `axisThumbProps`.

**Mechanism:** Native `scrollTop` stays 0 by design, so a native scrollbar can never exist; the geometry is computed over the virtual position, and the floor keeps a million-item list's thumb grabbable.

**Generates:** The built-in track in `VirtualScroller.vue`; `seekToProgress` as the drag's inverse.

**Evidence:** `VirtualScroller.ts` `scrollbarThumbFraction`. Test: "the thumb is the container’s share of the content with a floor, progress is the position’s share of the travel, and both render on the vertical axis".

**Impossible if true:** A thumb thinner than 8% of the track. A thumb on content that fits.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "grabbable|container’s share"`

**Status:** provisional

**Last refined:** 2026-09-06

### A cross-axis touch belongs to the page

**Invariant:** If a touch moves past 8 px and its larger delta is on the axis the scroller does not own, then every later move of that touch is flagged `lenisStopPropagation` so Lenis never prevents the page's own scroll; a touch on the own axis is kept; under the threshold nothing is decided.

**Scope:** `VirtualScroller.ts` `onTouchStartCapture`, `onTouchMoveCapture`, `onTouchEndCapture`, `gestureOwnAxis`, `gestureAxisThresholdPx`; both axes.

**Mechanism:** The capture-phase listeners decide the axis once per touch (Lenis binds on bubble) and mark cross-axis events with the flag Lenis already honours. A `'both'` gesture orientation claims everything.

**Generates:** The horizontal strip's deltaX-only feel: a plain vertical wheel scrolls the page straight through.

**Rejected alternatives:** Lenis's own check — it refuses a gesture only when the cross-axis delta is exactly zero, and a finger always drifts a pixel.

**Evidence:** `VirtualScroller.ts` `onTouchMoveCapture`. Tests: "a vertical scroller flags a sideways touch for the page, keeps a downward one, and decides nothing under the threshold", "a horizontal strip flags a downward touch for the page and keeps a sideways one".

**Impossible if true:** A vertical swipe over the horizontal strip that fails to scroll the page.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller -t "flags a sideways touch|flags a downward touch"`

**Status:** provisional

**Last refined:** 2026-09-06

### Every axis dependency goes through a seam getter

**Invariant:** If the class touches a DOM dimension, a transform, a padding or thumb property, a gesture delta or a track coordinate, then it does so through one of the seam members (`offsetSize`, `rectSize`, `transformFor`, `axisDelta`, `axisPaddingProps`, `axisThumbProps`, `trackPointerFraction`, `containerSize`, `containerOuterSize`, `lenisOrientation`, `lenisGestureOrientation`, `selectionAxis`), and a subclass changes axis by overriding only those.

**Scope:** `VirtualScroller.ts` (the seams) and `HorizontalVirtualScroller.ts` (the only overrides). The cursor, the clamp, the rebase, the creep, the converge loop and the padding never fork.

**Mechanism:** Vertical defaults on the base class; the horizontal subclass is the seam overrides plus one re-tuned default, and the text selection takes its axis from `selectionAxis`.

**Generates:** `HorizontalVirtualScroller.ts` at about a hundred lines; the marquee, which is composition over it.

**Evidence:** `HorizontalVirtualScroller.ts` (every member is an override of a seam). Test: "every seam names the x axis".

**Impossible if true:** A `getBoundingClientRect().height` or a `translateY` outside a seam. A horizontal override of the window walk.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.test.ts -t "every seam names the x axis"` and `grep -n "offsetHeight\|translateY\|\.height" examples/playground/src/examples/virtual-scroller/VirtualScroller.ts` shows only seam bodies.

**Status:** provisional

**Last refined:** 2026-09-06

### An item captures its size once in and once out

**Invariant:** If a row mounts or is about to unmount, then it reports its main-axis size once each time, in layout pixels (its rect divided by the parent's rect-to-layout scale), and never in between.

**Scope:** `VirtualScrollerItem.ts` `capture`, its two hooks; the scroller's `remeasureRenderedItems`, which is the one continuous observer, on the wrapper.

**Mechanism:** Items render in normal flow, so the browser positions them at their real size with no bookkeeping; the parent needs sizes only for spacer and estimate math. A single wrapper `ResizeObserver` re-reads the rendered window when a rendered size changes, so continuous per-item observation is unnecessary.

**Rejected alternatives:** A `ResizeObserver` per item — bursts of callbacks during scroll at 100k items, each invalidating geometry, measured as jitter.

**Evidence:** `VirtualScrollerItem.ts` `capture` doc comment. Tests: "the size is reported once on mount and once on unmount, and never in between", "under a half-scale ancestor the reported size is the rect doubled back to layout pixels".

**Impossible if true:** A size report while no element is attached. A size map built from screen pixels under a scaled ancestor.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.test.ts`

**Status:** provisional

**Last refined:** 2026-09-06

### Shrinking the list prunes the measurements at its new end

**Invariant:** If the list's length changes, then the aggregates and the cursor are re-derived over the items that remain, measurements contiguous from the new end are dropped, and farther stale keys stay uncounted until the list regrows over them.

**Scope:** `VirtualScroller.ts` `updatePositionsImmediately`, the items-length watch in the constructor, and `syncItemSize` for out-of-range writes.

**Mechanism:** The repair runs imperatively after a splice: it prunes the contiguous run at `length`, re-sums the map over `index < length`, and re-derives the cursor offset, then bumps `geometryVersion`. Out-of-range keys are kept for neighbor reads and resurrect if the list regrows.

**Evidence:** `VirtualScroller.ts` `updatePositionsImmediately`. Test: "shrinking the list re-derives the extent over what remains, prunes the measurements at the new end, and parks the farther ones".

**Impossible if true:** An extent that counts a row past the list's end.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "shrinking the list"`

**Status:** provisional

**Last refined:** 2026-09-06

### The selection is a range over the data

**Invariant:** If text is selected over the list, then the selection is two logical positions `{ index, offset }` over the items, the native highlight is re-pinned to the mounted part of that range after every move and every window change, and copy assembles its text over the index span.

**Scope:** `VirtualScrollerSelection.ts`: `anchor`, `focus`, `range`, `applyHighlight`, `assembleText`, `selectedText`, `clampToWindow`, the `visibleItems` watch in the constructor.

**Mechanism:** Because the range is index-based, nothing is lost when a boundary row unmounts; `applyHighlight` clamps to the mounted window and calls `setBaseAndExtent` on the rows that exist. Copy asks the owner for every row's text in the span, mounted or not.

**Generates:** `VirtualScroller.rowText` and the `selectionText` prop; the copy chip on touch; the per-frame follow loop (`followPointer`) that re-pins while content slides under a still pointer.

**Evidence:** `VirtualScrollerSelection.ts` `applyHighlight`, `assembleText`. Tests: "assembleText copies the first row from its offset, every row between in full, the last row to its offset, reading rows the DOM never held", "a drag begins at a logical position, extends by logical positions in either direction, and survives its anchor row leaving the DOM". Sweep: "ExampleVirtualScroller (drag-select + copy)" — 46 rows over an 18-row window.

**Impossible if true:** A selection that changes when a row it spans recycles. A copy shorter than the row span.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "reading rows the DOM never held|survives its anchor row"`

**Status:** provisional

**Last refined:** 2026-09-06

### Text offsets are measured against the trimmed row text

**Invariant:** If a row's template carries whitespace and several text nodes, then a selection offset is measured against the trimmed `textContent`, and a caret converts to that offset and back without loss for every offset in the row.

**Scope:** `VirtualScrollerSelection.ts`: `rowText`, `leadingWhitespaceLength`, `offsetInRow`, `caretInRow`.

**Mechanism:** The raw DOM offset sums text-node lengths before the caret's node; subtracting the leading whitespace gives the text offset; `caretInRow` spends the offset plus the leading whitespace back across the nodes. The copied string and the measured offsets agree because both use the trimmed text.

**Evidence:** `VirtualScrollerSelection.ts` `offsetInRow`, `caretInRow`. Test: "a row’s text is the trimmed textContent, and every offset survives the DOM → text → DOM round trip across three text nodes".

**Impossible if true:** A copied row that starts a few characters off from where the drag began.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "round trip across three text nodes"`

**Status:** provisional

**Last refined:** 2026-09-06

### The copied text is the string the row renders

**Invariant:** If a row is mounted, then its copy text is its own trimmed DOM text; if it is not, then the `selectionText` prop's string, else the item's body, else its id — and the page passes a prop that returns the same string its template renders.

**Scope:** `VirtualScroller.ts` `rowText` and the `selectionText` / `selectionJoin` props; every page that renders the scroller (`VirtualScrollerExample.ts` `rowText`, `HorizontalScrollerExample.ts` `cardText`, the marquee's one-line chunks).

**Mechanism:** Copy spans the window boundary; if the two sources produced different strings the copied text would change wording halfway through. The card markup on the horizontal page sits on one line for the same reason: a stray newline in the template would put a character in the mounted text that the data does not have.

**Evidence:** `VirtualScroller.ts` `rowText`. Tests: "an unmounted row’s copy text falls back from the prop to the body to the id", "a row’s copy text is the locale position, a dash, and the body", "copy assembles the selected text from the owner’s row text with the owner’s join, and takes the copy event over only while something is selected".

**Impossible if true:** A copy whose wording changes at the window boundary.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller -t "falls back from the prop|locale position|owner’s join"`

**Status:** provisional

**Last refined:** 2026-09-06

### A long press turns the next move into a selection

**Invariant:** If a single finger holds still for 450 ms, then the next move extends a selection instead of scrolling, the move is prevented and flagged for Lenis, and lifting the finger ends the drag; if the finger moves past 8 px before the hold fires, then the gesture is a scroll and the owner never hears of it.

**Scope:** `TouchSelectionGesture.ts`: `onTouchStart`, `promoteHold`, `onTouchMove`, `onTouchEnd`, `LONG_PRESS_MS`, `SLOP_PX`. Hosted by the selection; the scroller attaches it at mount.

**Mechanism:** A drag already means scroll on a touchscreen, so selection takes the browser's own convention. The hold timer promotes; slop cancels; after promotion `preventDefault` stops the page and `lenisStopPropagation` stops the list. The gesture calls the same three primitives the mouse path calls.

**Generates:** The copy chip (`showsCopyChip`, `copy`) — a phone has no Ctrl+C.

**Evidence:** `TouchSelectionGesture.ts`. Tests: "a still hold promotes at the long-press mark, and every move after it extends the selection while the page and the list are told to stay put", "movement within the slop keeps the hold alive; past it, the gesture is a scroll". Sweep: "ExampleVirtualScroller (touch long-press + chip)".

**Impossible if true:** The page scrolling while a touch selection is being extended. A selection beginning from a moving finger.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/TouchSelectionGesture.test.ts`

**Status:** provisional

**Last refined:** 2026-09-06

### A multi-click selects the word or the row under it

**Invariant:** If a primary mousedown carries a click count of two, then the word around the caret is selected; if three or more, the row; both as settled ranges with no drag, and the native multi-click selection is prevented like the drag-selection is.

**Scope:** `VirtualScrollerSelection.ts`: `onMouseDown` (the `event.detail` branch), `selectAt`, `wordBoundsAt`.

**Mechanism:** The `preventDefault` that removes the native drag-selection also removes the browser's double-click word and triple-click row selection; `selectAt` gives them back over the data. A caret at the end of a word belongs to that word; a caret inside whitespace selects the whitespace run, as the browser does.

**Evidence:** `VirtualScrollerSelection.ts` `selectAt`, `wordBoundsAt`. Test: "a double click selects the word under the caret and a triple click the row, as settled ranges with no drag".

**Impossible if true:** A double click over a row that selects nothing.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "double click selects the word"`

**Status:** provisional

**Last refined:** 2026-09-06

### The pad covers the lerp gap exactly

**Invariant:** If the window walk runs during a lerp, then the trailing pad is the lerp gap in rows (`|targetScroll − animatedScroll| / rowSize`, rounded up, capped at 160), and the leading pad is the base plus a velocity lookahead held with hysteresis.

**Scope:** `VirtualScrollerPadding.ts`: `rowsBehind`, `rowsAhead`, `split`, `settle`, `pad`; the scroller's `scrollGap`, `scrollVelocity`, `halfPaddingQuantity` and `estimatedItemSize` accessors.

**Mechanism:** The gap term is exact and needs no hysteresis: it shrinks every frame as the lerp converges, and the rows it releases are behind the viewport. The lookahead grows the frame the velocity does and shrinks only after the settle window, so the decay tail of a flick does not unmount rows the next flick needs; a reversal drops the held level at once.

**Generates:** The `padding.before` / `padding.after` split the walk reads instead of one symmetric constant.

**Rejected alternatives:** A velocity pad alone — measured identical to no pad (21/28/35 uncovered frames of 91), because the gap is the whole story.

**Evidence:** `VirtualScrollerPadding.ts` `pad`. Tests: "rows behind cover the lerp gap exactly, rounded up and capped", "pad() follows the lerp gap frame by frame and holds the lookahead across a decaying tail, reading the owner each call". Probe: 0/0/0 uncovered frames at 2000/4000/8000 px flicks (`docs_v2/examples/virtual-scroller.md`).

**Impossible if true:** A pad that shrinks on the first frame of a flick's decay. Blank canvas under the viewport while the gap in rows is below the cap.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts`

**Status:** provisional

**Last refined:** 2026-09-06

### Lenis is read inside the walk never tracked

**Invariant:** If the pad reads the velocity or the gap, then it reads them as plain values inside the window walk, which already reruns on every scroll position write; no Lenis value is a reactive dependency.

**Scope:** `VirtualScrollerPadding.ts` `pad` and its `held` / `last` holders; `VirtualScroller.ts` `scrollVelocity`, `scrollGap`.

**Mechanism:** A reactive velocity would rerun the walk once per frame for no new information. The two accessors read `this.lenis` directly, which is not reactive, and the walk is the only reader.

**Generates:** The plain holder tier in the pad class; the one ref it does own (`settledVersion`) has exactly one subscriber, the walk.

**Evidence:** `VirtualScrollerPadding.ts` header comment. Test: "pad() follows the lerp gap frame by frame and holds the lookahead across a decaying tail, reading the owner each call".

**Impossible if true:** A window walk triggered by a velocity change alone.

**Verification:** `grep -n "ref(\|computed(\|shallowRef(" examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.ts` shows only `settledVersion`.

**Status:** provisional

**Last refined:** 2026-09-06

### A pad never outlives its flick

**Invariant:** If a walk pads beyond the base, then a timer bumps `settledVersion` after the settle window so the walk runs once more and the pad shrinks back, even when the flick stopped the creep and nothing else would rerun the walk; a base-only walk arms nothing, and dispose cancels.

**Scope:** `VirtualScrollerPadding.ts` `armSettle`, `onSettled`, `settledVersion`, `dispose`; the scroller's `onBeforeUnmount`.

**Mechanism:** An upward flick stops autoplay, and with no position writes the walk never reruns; the held pad would stay mounted (measured: 72 rows at rest instead of 17). The bump is read by `pad()` inside the walk, so it is exactly one more evaluation.

**Evidence:** `VirtualScrollerPadding.ts` `armSettle`. Test: "a walk that pads beyond the base arms one more walk after the settle window; a base walk arms nothing; dispose cancels". Probe: window rests at 17 rows after up and down flicks.

**Impossible if true:** A resting list mounting more than its base pad a second after the last input.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts -t "never outlives|arms one more walk"`

**Status:** provisional

**Last refined:** 2026-09-06

### A hosted capability reaches its owner through an interface

**Invariant:** If a capability needs what only the scroller knows, then it receives an `Owner` object of a handful of members through its constructor, reached by the scroller through one `$`-getter, and the capability never imports or types the scroller class.

**Scope:** `VirtualScrollerSelection.Owner`, `TouchSelectionGesture.Owner`, `VirtualScrollerPadding.Owner`; the `$selection`, `$touch` and `$padding` getters.

**Mechanism:** The owner interface names the exact boundary; a plain object satisfies it, which is what makes each capability testable without a scroller and swappable by overriding one getter. The selection hosts the touch gesture the same way the scroller hosts the selection.

**Generates:** The owner doubles in `VirtualScrollerSelection.test.ts`, `TouchSelectionGesture.test.ts` and `VirtualScrollerPadding.test.ts`; the seam a grid or a tree would implement to get selection.

**Rejected alternatives:** Passing the scroller instance — the capability then reaches into everything, and its spec needs a scroller.

**Evidence:** The three `Owner` interfaces. Tests: "a drag begins at a logical position, extends by logical positions in either direction, and survives its anchor row leaving the DOM", "lifting the finger ends the drag and reports selected exactly when the owner holds a selection; a cleared selection drops the chip", "pad() follows the lerp gap frame by frame and holds the lookahead across a decaying tail, reading the owner each call".

**Impossible if true:** An import of `VirtualScroller` inside a hosted capability file.

**Verification:** `grep -L "from './VirtualScroller'" examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.ts examples/playground/src/examples/virtual-scroller/TouchSelectionGesture.ts examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.ts` lists all three.

**Status:** provisional

**Last refined:** 2026-09-06

## Impossibility boundary — what these invariants forbid

- Blank canvas under the viewport during a flick whose gap is below the cap — [The pad covers the lerp gap exactly](#the-pad-covers-the-lerp-gap-exactly).
- A highlight that collapses when its anchor row recycles — [The selection is a range over the data](#the-selection-is-a-range-over-the-data).
- A copy that stops at the mounted rows — [The selection is a range over the data](#the-selection-is-a-range-over-the-data).
- A rendered scroll position outside the extent — [The scroll position lands inside the scrollable range](#the-scroll-position-lands-inside-the-scrollable-range).
- A rendered offset above about 131k px — [Rendered offsets are rebased by whole chunks](#rendered-offsets-are-rebased-by-whole-chunks).
- A horizontal scroller that forks the cursor, the clamp or the creep — [Every axis dependency goes through a seam getter](#every-axis-dependency-goes-through-a-seam-getter).
- The page scrolling while a touch selection extends — [A long press turns the next move into a selection](#a-long-press-turns-the-next-move-into-a-selection).
- A double click over a row that selects nothing — [A multi-click selects the word or the row under it](#a-multi-click-selects-the-word-or-the-row-under-it).
- A capability that imports the scroller — [A hosted capability reaches its owner through an interface](#a-hosted-capability-reaches-its-owner-through-an-interface).
