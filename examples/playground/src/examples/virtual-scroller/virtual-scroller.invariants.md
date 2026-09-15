# Virtual scroller invariants

The living contract for the virtual scroller subsystem: `VirtualScroller.ts` and its `HorizontalVirtualScroller.ts` subclass, the row model `VirtualScrollerItem.ts`, and the three hosted capabilities `VirtualScrollerSelection.ts`, `VirtualScrollerSelectionTouch.ts` and `VirtualScrollerPadding.ts`. Records are unnumbered; the name is the identifier and is referenced verbatim by code annotations (`// invariant: <name> (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)`) and by the generator headers of the colocated `*.test.ts` files.

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
- [A row under the reader stays put while sizes settle](#a-row-under-the-reader-stays-put-while-sizes-settle) — why a row measuring above the reader never moves the content under them.
- [A native selection dies with the node that anchors it](#a-native-selection-dies-with-the-node-that-anchors-it) — why the selection cannot be the browser's.
- [Touch events keep firing on the node the finger landed on](#touch-events-keep-firing-on-the-node-the-finger-landed-on) — why the gesture's listeners ride the origin node.
- [The transform lerps to the target over many frames](#the-transform-lerps-to-the-target-over-many-frames) — why a target-anchored window leaves a gap to cover.
- [The frame loop runs only while there is motion](#the-frame-loop-runs-only-while-there-is-motion) — why a scroller nobody touches costs no frames.
- [Rendered offsets are rebased by whole chunks](#rendered-offsets-are-rebased-by-whole-chunks) — why a reader a million rows deep does not stutter.
- [The scroll position lands inside the scrollable range](#the-scroll-position-lands-inside-the-scrollable-range) — why no input can poison the position.
- [An unchanged window keeps its array identity](#an-unchanged-window-keeps-its-array-identity) — why a scroll inside the window does not re-render the rows.
- [The two spacers and the rendered rows sum to the extent](#the-two-spacers-and-the-rendered-rows-sum-to-the-extent) — why the scrollbar and the seek agree with the content.
- [A seek names an item not a pixel](#a-seek-names-an-item-not-a-pixel) — why a landing survives the estimate refining under it.
- [The thumb never shrinks below a grabbable fraction](#the-thumb-never-shrinks-below-a-grabbable-fraction) — why a million rows still have a scrollbar.
- [A cross-axis touch belongs to the page](#a-cross-axis-touch-belongs-to-the-page) — why a horizontal strip does not trap a vertical swipe.
- [Every axis dependency goes through a seam getter](#every-axis-dependency-goes-through-a-seam-getter) — why the horizontal scroller is a hundred lines.
- [An item captures its size once on mount](#an-item-captures-its-size-once-on-mount) — why sizes are truthful without a per-row observer, and why an unmount reads nothing.
- [Shrinking the list prunes the measurements at its new end](#shrinking-the-list-prunes-the-measurements-at-its-new-end) — why a splice cannot leave the extent stale.
- [The selection is a range over the data](#the-selection-is-a-range-over-the-data) — why the highlight survives recycling and copy reaches unmounted rows.
- [Text offsets are measured against the trimmed row text](#text-offsets-are-measured-against-the-trimmed-row-text) — why a copied row does not start three characters off.
- [The copied text is the string the row renders](#the-copied-text-is-the-string-the-row-renders) — why a copy that spans the window boundary reads as one text.
- [A long press turns the next move into a selection](#a-long-press-turns-the-next-move-into-a-selection) — why touch can select in a list where a drag means scroll.
- [A multi-click selects the word or the row under it](#a-multi-click-selects-the-word-or-the-row-under-it) — why double click still works after the native selection is taken away.
- [A list may refuse selection](#a-list-may-refuse-selection) — why the index and the peek never select a row's text.
- [The pad covers the lerp gap exactly](#the-pad-covers-the-lerp-gap-exactly) — why a flick never shows canvas.
- [Lenis is read inside the walk never tracked](#lenis-is-read-inside-the-walk-never-tracked) — why the pad costs no extra walks.
- [Hot paths read no layout](#hot-paths-read-no-layout) — why a frame's position write forces no layout.
- [A pad is released when the reader moves, never at rest](#a-pad-is-released-when-the-reader-moves-never-at-rest) — why nothing is ever unmounted while the reader is still.
- [A hosted capability reaches its owner through an interface](#a-hosted-capability-reaches-its-owner-through-an-interface) — why selection, touch and padding are each testable without a scroller.
- [A drag scrolls from inside the edge zone](#a-drag-scrolls-from-inside-the-edge-zone) — why a selection scrolls even when the frame is the page.
- [The frame is never natively panned along its own axis](#the-frame-is-never-natively-panned-along-its-own-axis) — why a selecting finger cannot pan the rows out of the clip.
- [A native selection inside the frame is adopted as the logical range](#a-native-selection-inside-the-frame-is-adopted-as-the-logical-range) — why iOS's handles and a keyboard extend the same range the chip copies.
- [A native selection changed under a held finger cancels the touch](#a-native-selection-changed-under-a-held-finger-cancels-the-touch) — why a touch selection is painted and never written until the finger lifts.
- [A touch drag paints without selecting](#a-touch-drag-paints-without-selecting) — why iOS does not take the touch away mid-drag.
- [WebKit re-rasterizes the layer on every autoscroll write](#webkit-re-rasterizes-the-layer-on-every-autoscroll-write) — why rows that mount under a held finger are not blank on iOS.
- [On a touch device the selection is drawn by the class](#on-a-touch-device-the-selection-is-drawn-by-the-class) — why a phone never enters the system's selection mode at all.
- [The feel is one nested prop complete at every depth](#the-feel-is-one-nested-prop-complete-at-every-depth) — why a page tunes one leaf and the rest stays tuned.

**Mechanism:** The prefix-sum cursor turns an estimate plus a sparse map of measured sizes into positions in O(distance); the window walk mounts the rows the container covers plus the pad and reduces everything else to two spacers; the clamp and the rebase make the rendered numbers safe before Lenis writes them; the hosted capabilities add selection, touch and adaptive padding through owner interfaces of a handful of members, so each is a class with its own statics, its own spec and its own reason to exist.

**Generates:** The colocated specs (`VirtualScroller.test.ts`, `HorizontalVirtualScroller.test.ts`, `VirtualScrollerItem.test.ts`, `VirtualScrollerSelection.test.ts`, `VirtualScrollerSelectionTouch.test.ts`, `VirtualScrollerPadding.test.ts`); the component sweep's drag-select, touch and flick probes (`docs_v2/scripts/component-sweep.cjs`); the example pages `docs_v2/examples/virtual-scroller.md` and `docs_v2/examples/horizontal-scroller.md`; the text marquee, which composes the horizontal scroller (`../text-marquee/text-marquee.invariants.md`).

**Impossible if true:** Blank canvas under the viewport after a flick. A highlight that collapses when its anchor row recycles. A copy that stops at the mounted rows. A horizontal scroller that forks the cursor or the creep. A scroll position rendered outside the extent.

**Evidence:** The Evidence fields of the component records; the nine colocated `*.test.ts` files (63 specs) and the component sweep (60 probes).

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller examples/playground/src/examples/text-marquee` green, then `node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs` clean, then `npm run sweep:components` at 60 pass.

**Status:** provisional

**Last refined:** 2026-09-06

## Reality-based invariants

### Rendered sizes are known only after a row mounts

**Invariant:** If a row has not been rendered, then its size is the estimate, and the position of every row is the sum over the rows before it of the measured size where one exists and the estimate elsewhere.

**Scope:** `VirtualScrollerGeometry.ts` whole — `positionOf`, `indexAt`, `anchoredPosition`, `contentSize`, `applySize`, the `cursor` holder and the `measuredSizes` map; `VirtualScroller.ts` `syncItemSize`, which measures and anchors around it. Applies to every row of every list the scroller renders.

**Renegotiable at:** Layout — a browser lays out only what is in the DOM; a list that knew every size up front would not need the estimate.

**Mechanism:** `measuredSizes` is sparse; `estimatedItemSize` fills the holes. `applySize` keeps `measuredSum`, `measuredCount` and the cursor's `offset === P(cursor.index)` exact in O(1); `positionOf` walks the cursor to the asked index, so the answer is the same whichever way it walks. `calibrate` swaps the assumption once, on the first wave with `CALIBRATION_ROWS` rows measured; the anchor around that wave (see [A row under the reader stays put while sizes settle](#a-row-under-the-reader-stays-put-while-sizes-settle)) absorbs the shift wherever the reader is. The model is asked, never told: it reads the items and the assumed size through its owner and nothing else, which is why it is proven without a scroller.

**Generates:** The `assumedSize` prop and the marquee's exact width seeding; the converge loop in `scrollToIndex`, which re-applies a landing as sizes refine; the geometry as its own class, since the model needs no DOM to be true.

**Rejected alternatives:** A dense positions array — O(n) on every size change, which is a burst per scroll at 100k items.

**Evidence:** `VirtualScrollerGeometry.ts` `applySize`, `positionOf`. Tests: "an item’s position is the sum of the sizes before it, measured or assumed, and the same from either direction of the walk", "the item under a pixel offset, anchored at its fraction, returns that pixel", "however far the cursor has walked, its offset is still the sum of the sizes before its index".

**Impossible if true:** Two walks to the same index returning different positions. A measured row contributing the estimate to the extent.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerGeometry.test.ts`

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

**Scope:** `VirtualScrollerSelectionTouch.ts`: `attach`, `followTouch`, `stopFollowingTouch`. Any touch gesture whose origin element a virtual list may recycle mid-gesture.

**Renegotiable at:** The Touch Events specification — the touch target is fixed at touchstart.

**Mechanism:** A detached node has no ancestors, so its events reach neither the element nor the document; listeners on the node itself still receive them. `followTouch` therefore adds touchmove, touchend and touchcancel to `event.target` at touchstart, and `stopFollowingTouch` removes them when the gesture ends.

**Generates:** The `hold.target` holder; the one non-passive listener the gesture installs.

**Rejected alternatives:** Document-level touch listeners — they never see the events of a recycled origin row, which is exactly the row a drag past the edge recycles.

**Evidence:** `VirtualScrollerSelectionTouch.ts` `followTouch`. Test: "a finger whose origin row left the DOM still extends the selection, because the listeners ride the origin node". LESSONS.md, the text selection mechanics entry.

**Impossible if true:** A document listener receiving a touchmove whose target is detached.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.test.ts -t "origin row left the DOM"`

**Status:** provisional

**Last refined:** 2026-09-06

### A native selection changed under a held finger cancels the touch

**Invariant:** If a page writes the native selection while a finger is down on iOS Safari, then the system takes the touch for its own selection UI and the page receives a touchcancel: the gesture ends where the write landed.

**Scope:** iOS Safari (WebKit on a touch device); any page that calls `setBaseAndExtent` or `Selection.extend` between touchstart and touchend. Not observed on Android Chrome, which keeps delivering the touch.

**Renegotiable at:** WebKit's touch and selection handling — a browser whose selection UI did not claim the touch would not force it.

**Mechanism:** WebKit treats a selection change under a live touch as the start of its own selection interaction — handles and loupe — and a system interaction takes the touch away from the page. A highlight registered through `CSS.highlights` is paint only: it changes no selection, so it wakes none of that.

**Generates:** The touch drag's paint-only path; the class-drawn selection that never calls the native API under a finger.

**Evidence:** Measured on an iPhone: extending the native selection during a drag ended the autoscroll and froze the range at the cancel ("the selection disappears and new rows are not selected"). WebKit 26.5: the Highlight API paints on selectable text with no cancel (3474 tinted px on the control).

**Impossible if true:** A touchmove arriving after a page-driven `setBaseAndExtent` on iOS Safari within the same gesture.

**Verification:** The sweep's touch probe on an iPhone — a drag that writes the native selection ends in a touchcancel; the painted path does not.

**Status:** provisional

**Last refined:** 2026-09-13

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

**Renegotiable at:** GPU compositing precision — single-precision floats lose sub-pixel placement past about 2^23 px. The floor is what the walk can extend BACKWARDS in one go — the pad rows plus a flick's gap — below which the leading spacer clamps at zero and the content jumps.

**Mechanism:** All scroll math stays absolute; only the two render outputs are shifted by the same bias, so their difference, everything visible, is unchanged. `loop` rebases from the ANIMATED scroll before Lenis writes the frame's transform so the spacer (this frame's flush) and the transform shift together; a write that moves the position without writing the transform (`setScrollPosition` with `translateY` false — the loop's target write) never rebases, because the target and the animated scroll can straddle a chunk boundary and a second rebase from the target flipped the bias mid-frame: the spacer on the new bias, the transform on the old, a whole chunk apart for that frame.

**Generates:** The `renderBias` ref (a ref, because the spacer binding must re-render on rebase); the `RENDER_BIAS_CHUNK` static.

**Evidence:** `VirtualScroller.ts` `updateRenderBias`, `setScrollPosition`, the `renderBias` doc comment. Tests: "deep in the list the render bias rebases the leading spacer by whole chunks", "a position write without a transform write leaves the render bias alone". Seen on the chat: one frame in a long wheel up rendered the rows 63k px off the viewport, at the tick where the target crossed a chunk the animated scroll had not.

**Impossible if true:** A leading spacer or transform rendered above about 131k px. A bias that is not a multiple of the chunk. A spacer and a transform a chunk apart within one frame.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "rebases the leading spacer"`

**Status:** provisional

**Last refined:** 2026-09-06

### WebKit re-rasterizes the layer on every autoscroll write

**Invariant:** If the selection's autoscroll writes the transform on WebKit (every iOS browser included), then the composited layer is demoted and re-promoted (`will-change: auto`, a layout read, `will-change: transform`) in the same step, so the rows that write mounted are rasterized while the finger still holds; on other engines the nudge is a no-op.

**Scope:** `VirtualScroller.ts` `nudgePaint`, `IS_WEBKIT`; `VirtualScrollerSelection.ts` `autoscrollStep`, the `nudgePaint` member of its `Owner`.

**Renegotiable at:** WebKit's compositing under an active touch — it moves a promoted layer but leaves content mounted during the move unpainted until the touch ends (seen on an iPhone as blank rows past the fold and a vanished scrollbar thumb). The Lenis fork's wheel path carries the same workaround (`IS_SAFARI` in `setScroll`); the autoscroll writes through the scroller, so it needs its own.

**Mechanism:** The will-change cycle forces the layer to be re-created and re-rasterized; the layout read between the two writes is what makes the demotion take effect before the promotion. Chrome and Firefox keep the permanent `will-change: transform` from the CSS and take the plain write — on Chrome the re-raster snaps text per frame and reads as shimmer, so the nudge is gated to WebKit.

**Evidence:** `VirtualScroller.ts` `nudgePaint`; `src/lenis/lenis.ts` `setScroll` (the Safari branch and its comment). Tests: "the paint nudge cycles will-change on WebKit and is a no-op elsewhere", "holding the pointer inside the edge zone scrolls forward at a crawl, past the frame faster, above it backward, and returning to the interior stops it" (one nudge per write).

**Impossible if true:** A row mounted by the autoscroll on iOS that stays blank until the finger lifts. A will-change write on Chrome from the autoscroll.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller -t "paint nudge|edge zone scrolls forward"`

**Status:** provisional

**Last refined:** 2026-09-06

### A row under the reader stays put while sizes settle

**Invariant:** If rows above the row under the edge the reader reads from change size — a row measuring as it mounts, a placeholder becoming its content, a batch re-measure, the estimate calibrating — then the scroll moves by exactly what the content above moved, and that row stays where the reader had it. Scrolling down the edge is the top; while actually moving up it is the bottom, so a row growing inside the view expands upward, away from what was just read; at rest the edge is the top whatever the last direction was, so a row a click opened grows downward from where the reader left it. Rows below the anchor move nothing.

**Scope:** `VirtualScroller.ts`: `captureAnchor`, `restoreAnchor`, `shiftScroll`, `contentShift`, and the paths that change sizes — `syncItemSize` on its own, the coalesced capture wave (`captureItemSize` / `flushItemSizes`) and `remeasureRenderedItems` (the wrapper's observer, anchored once around its wave). `shiftScroll` always moves the integrator WHOLE, through `lenis.shiftBy` — target, animated position, a running lerp, and the finger's flick trail. Under a running glide it also sets the position cell to the shifted target, so the clamp that follows reads the truth; a stale cell above the new limit read as out of range, adopted the limit and killed the flick. A drag used to bypass `shiftBy` entirely — it has no lerp, so the shift was written straight onto the target — and the trail it left behind then carried the content's own motion into the flick's velocity. `contentShift` sums every shift, so a reader of the position can subtract the content's motion from the reader's own. Applies to every list the scroller renders, at any scroll position but the top, where nothing sits above the anchor.

**Renegotiable at:** Layout — a list whose rows above the viewport never changed size would not need it; every virtual list's rows do, because sizes are known only after a row mounts.

**Mechanism:** `captureAnchor` names the row under the reading edge (`getIndexAtPosition` at the scroll position, or at the position plus the frame's border-box size when the last scroll went up) and its top; after the sizes land, `restoreAnchor` reads the row's new top and `shiftScroll` moves the scroll by the difference. The integrator takes the move whole in every case — mid-glide both lerp endpoints shift so the glide keeps its remaining distance, mid-drag the trail shifts so the release still reads the finger — and a seek's recorded landing shifts with it, so the converge loop does not read the move as the reader taking over.

**Generates:** Chat-shaped lists that open at the bottom and load content upward, where the estimate is never calibrated and every mounted row above the reader is a size change; the post player's paragraphs settling on a phone.

**Rejected alternatives:** Keeping an absolute scroll position — every mount above the reader moved the content under them, by a screen or more when a placeholder became a long message.

**Evidence:** `VirtualScroller.ts` `captureAnchor`, `restoreAnchor`, `shiftScroll`. Tests: "measuring rows above the anchored row moves the scroll by the same amount; rows below move nothing", "a shift under a dragging finger goes through the integrator too — a drag is not the exception".

**Impossible if true:** A row above the reader's changing size and the reader's row moving on screen. A row below the reader's changing size and the scroll position changing. A flick whose velocity carries the content's own shift because the trail stayed behind.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "anchored row"`; in the AI chat example with content pages throttled to 1.2 s, a far seek through the index and a 60,000 px fling both hold the row under the leading edge at the same pixel while pages land.

**Status:** provisional

**Last refined:** 2026-09-14

## Chosen invariants

### The frame loop runs only while there is motion

**Invariant:** If the frame loop finds nothing to paint — no input arriving (`virtualScrolling` false), no lerp remaining (`isScrolling === false` and target within half a pixel of animated), and no creep (`isAutoPlaying` false) — then it parks itself (`frame = null`) instead of requesting the next frame, and the next input wakes it; a scroller nobody touches requests no frames.

**Scope:** `VirtualScroller.ts` `loop`, `isAtRest`, `parkLoopFrame`, `restartLoop`, the wake in `onVirtualScroll`; `VirtualScrollerAutoplay.ts` keeps the creep's own frame, which is why both are cancelled together.

**Mechanism:** The loop paints `lenis.targetScroll` every frame while Lenis lerps. A seek animates through the inner element's CSS transition, not the loop, so once Lenis is at rest there is nothing for the loop to write. `onVirtualScroll` already requests a frame only when none is armed, so parking and waking need no new state. Rest depends on [A lerp completes within half a pixel of any target](../../lenis/lenis.invariants.md#a-lerp-completes-within-half-a-pixel-of-any-target): without it a glide never settles and the loop never parks.

**Generates:** A chat with the thread, the peek and a side panel open — three scrollers — costs zero frames until one is touched. The creep's own frame is unaffected.

**Rejected alternatives:** Parking on a timer after the last input (a long glide would be cut). Parking on `isScrolling` alone (a target written directly, without a lerp, still needs one paint).

**Evidence:** `VirtualScroller.ts` `loop`, `isAtRest`. Test: "the frame loop parks itself at rest and the next wheel wakes it". Measured on the chat (Chromium, `requestAnimationFrame` counted per second): 0 before the first wheel, 60 during the glide, 0 once settled; before the fix, 60 forever after the first wheel.

**Impossible if true:** A scroller at rest requesting a frame every tick. A wheel after rest that does not move the content.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "parks itself at rest"`

**Status:** provisional

**Last refined:** 2026-09-10

### The scroll position lands inside the scrollable range

**Invariant:** If any path asks to scroll to a position, then the position written is clamped into `[0, extent − container]`, and a non-finite position is refused with the last position standing; and if a rendered row shrinks while the rows above it stay put, then the position is pulled back inside the range, so the viewport never rests past the last row.

**Scope:** `VirtualScroller.ts` `setScrollPosition` — the one write path for `scrollPosition`, the transform and `lenis.targetScroll`; `scrollBy` for the selection's autoscroll; `clampScrollPosition` after every re-measure (`remeasureRenderedItems`, `syncItemSize`).

**Mechanism:** `setScrollPosition` tests `Number.isFinite` first, then clamps against `scrollExtent` and the container's border-box size, then writes. Every caller (the frame loop, seeks, the creep, the selection autoscroll) goes through it. A re-measure restores the anchor row, which moves the position by what the content ABOVE the reader changed — but the last row re-rendering shorter (a streaming reply whose partial markdown was taller than its final render, a tall card folded at the end) changes nothing above the reader, so the anchor restore shifts nothing and the position, set when the row was tall, is left past the new end: `clampScrollPosition` pulls it back after every re-measure. The container's own size is a source too: a phone's address bar folding away grows the frame and shrinks the range, and a position resting at the old end left the last row above a blank strip on a fresh Android load; a watch on the container size clamps it back, so a reader at the end stays at the end.

**Generates:** The bottom clamp the seek bar relies on; `lenis.virtualLimit`, which takes the same box.

**Rejected alternatives:** Trusting the caller — a single NaN poisons `lenis.targetScroll` and freezes the scroller until remount, and invalid transforms are silently ignored so nothing recovers.

**Evidence:** `VirtualScroller.ts` `setScrollPosition`, `clampScrollPosition`. Tests: "a scroll position is clamped into the scrollable range, and a non-finite one is refused", "a last row that shrinks pulls the position back inside the range; a row that shrinks above the reader moves nothing extra". Seen on the chat: a streaming reply left the viewport blank past its row until the reply ended, and a folded card at the end left the canvas scrolled past the last item.

**Impossible if true:** A rendered scroll position beyond the extent. A NaN reaching `lenis.targetScroll`. A viewport resting past the last row after it shrank.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "clamped into the scrollable range"`

**Status:** provisional

**Last refined:** 2026-09-10

### An unchanged window keeps its array identity

**Invariant:** If the window walk produces the same items at the same indices as the previous walk, then it returns the previous array, so the computed's equality check stops propagation and the `v-for` does not re-render.

**Scope:** `VirtualScroller.ts` `computeVisibleItems`, `visibleItemsSnapshot`, and the `visibleItems` computed.

**Mechanism:** The walk compares the new slice to the snapshot item by item (`item`, `id`, `index`) before allocating; on equality it returns the snapshot. `item.id` is read in the comparison to keep dependency parity with the build path.

**Generates:** The `// computed: expensive + render-suppression` justification on `visibleItems`; the flat frame cost of a scroll inside the window.

**Evidence:** `VirtualScroller.ts` `computeVisibleItems`. Test: "the window covers the container from the item under the scroll top, padded on both ends, and keeps its identity while unchanged". Test: "a scroll frame re-renders the thumb, never the scroller with its rows" — the thumb, the one per-frame reader, is its own component (`VirtualScrollerTrack.vue`), so a scroll frame with an unchanged window re-renders no row.

**Impossible if true:** A re-render of the rows for a scroll that did not change the window.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "keeps its identity while unchanged"`

**Status:** provisional

**Last refined:** 2026-09-06

### The two spacers and the rendered rows sum to the extent

**Invariant:** If the window walk runs, then the leading spacer is the estimated top of the first rendered row, the trailing spacer is the rest of the content, and leading plus rows plus trailing equals the extent; the trailing spacer RENDERS capped at 2,048 px while its true size feeds the extent.

**Scope:** `VirtualScroller.ts` `computeVisibleItems` (the spacer writes), `leadingSpacerPx`, `trailingSpacerPx`, `TRAILING_SPACER_RENDER_CAP`, and `lenis.virtualLimit`.

**Mechanism:** The walk writes both spacer sizes on every evaluation, even when the window is unchanged, because a size correction above the window moves only the lead. Both render FRACTIONAL: a row sum is fractional whenever a row is, the transform under it is fractional at creep and lerp-tail speeds, and a spacer rounded to the device grid would hop the visible content by its rounding error at every window move (measured up to 0.53 px on 111.375 px rows). The transform itself snaps by speed (`src/lenis/lenis.ts` `setScroll`, a device pixel or more per frame): a fractional offset at speed re-rasters the layer and snaps each row's text and edges to the grid independently, a 1 px shimmer between neighbours. The rendered tail is capped so the composited layer stays a few hundred k px regardless of list size; the scroll range comes from the computed extent through `virtualLimit`, not from the DOM.

**Generates:** The content-sized inner layer (no explicit size in `VirtualScroller.vue`); the scrollbar geometry, which is computed over the virtual position.

**Rejected alternatives:** Rendering the true tail — a ~10M px layer on a 100k-item post, felt as compositor heaviness. Snapping the leading spacer to the device grid for crisp text — only the first row would be on the grid anyway, and every window move became a sub-pixel hop.

**Evidence:** `VirtualScroller.ts` `computeVisibleItems`, `leadingSpacerPx`. Tests: "the two spacers and the rendered rows add up to the extent, and the trailing spacer renders capped", "a fractional row above the window keeps the leading spacer fractional — a snapped spacer would hop the content at every window move". Probe: 0 hops over two flicks after the change, 3 and 2 before.

**Impossible if true:** A window whose spacers plus rows sum to anything but the extent. A rendered trailing spacer above the cap. A rendered spacer that differs from its size by a rounding.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "add up to the extent|keeps the leading spacer fractional"` for the values, then `npm run sweep:components` — the step "ExampleVirtualScroller (sub-pixel continuity)" follows one row's on-screen top against the transform through a flick in a real browser and fails on any moving frame (over 2 px) where the two disagree by more than 0.1 px.

**Status:** provisional

**Last refined:** 2026-09-06

### A seek names an item not a pixel

**Invariant:** If a seek bar asks for a 0..1 fraction, then the fraction names an item plus a fraction inside it (index space), the landing rides `scrollToIndex`, and the converge loop re-applies that same anchor as sizes refine so the CONTENT stays still. A landing asked to animate glides through the tuned lerp only while the travel is within the pad's coverage; a farther one arrives, because there is no honest animation across rows nobody mounted.

**Scope:** `VirtualScrollerLanding.ts` whole — `toFraction`, `toProgress`, `toIndex`, `alignOffset`, `snapToNearest` and the converge holder; `VirtualScrollerGeometry.ts` `ratioPosition` and `anchoredPosition`, which turn a ratio into the item it names. The scroller forwards `seekToFraction`, `seekToProgress`, `scrollToIndex` and `cancelSeek` to it.

**Mechanism:** `ratioPosition` scales the fraction over `itemCount − 1` and anchors at the floor item plus the remainder; `toIndex` computes the target from the geometry on every wave and stops only after the position has been quiet for `QUIET_MS` or the reader takes over — the reader's own input, which ends the loop the moment it arrives (`onVirtualScroll` calls `cancel()`), a wheel glide, a finger on the glass, the reading creep moving on from the landing, a scroll position that no longer matches the last landing (a glide that ended between two waves), or the owner calling `cancelSeek()` because the reader acted on the content instead of scrolling (a creep that kept mounting rows shifted the target at every mount, and every shift snapped the content back under it, for as long as the creep ran). `seekToProgress` is the built-in track's inverse of `scrollbarProgress`: position space resolved to an item plus a fraction, so a marquee chunk wider than the container still reaches its tail.

**Generates:** The `endGapPx` dead-zone that keeps the promised item clear of the top edge; the `snapAlign` center placement.

**Rejected alternatives:** A raw `lenis.scrollTo` — translates the content without rebasing the window.

**Evidence:** `VirtualScrollerGeometry.ts` `ratioPosition`; `VirtualScrollerLanding.ts` `toIndex`. Tests: "a ratio names an item plus a fraction inside it, and the end gap keeps the next item’s top clear of the viewport top", "a landing re-applies its target on every size wave and lets go once the position has been quiet", "the reader moving the content ends the loop on the next wave, and nothing is re-pinned", "seeking to a fraction lands on the item that fraction names, flush to the start by default and centered when asked", "a reader's own input ends a converging seek on the spot".

**Impossible if true:** A seek landing that moves to different content when a late size wave arrives. An animated landing that slides the layer over content the walk never mounted. A reader's flick during a landing pulled back to where the landing wanted it — reported from an Android phone as a flick on arrival that bounced back to the newest message, because a drag has no lerp and the loop asked whose the position was only when the geometry next changed.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerLanding.test.ts`

**Status:** provisional

**Last refined:** 2026-09-14

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

**Invariant:** If a touch moves past 8 px and its cross-axis delta exceeds its own-axis delta by the bias (1.5×), then every later move of that touch is flagged `lenisStopPropagation` so Lenis never prevents the page's own scroll; a touch on the own axis, or merely diagonal, is kept; under the threshold nothing is decided; and a frame whose touch-action is `none` (the vertical scroller) claims every touch, since the browser has no cross-axis gesture to run over it and handing one over would only kill it — except a touch that begins inside an element that scrolls across the own axis with room to go (a code block, a table, carrying its own `touch-action: pan-x`): there the browser's pan is the default from the first move, and only a clearly own-axis move (the bias the other way) is the scroller's.

**Scope:** `VirtualScroller.ts` `onTouchStartCapture`, `onTouchMoveCapture`, `onTouchEndCapture`, `gestureOwnAxis`, `gestureAxisThresholdPx`, `crossAxisBias`, `pannableAncestor`, `gestureInPannable`; both axes; the chat's `touch-action: pan-x` on its code blocks and tables.

**Mechanism:** The capture-phase listeners decide the axis once per touch (Lenis binds on bubble) and mark cross-axis events with the flag Lenis already honours. One sample decides: Android delivers the first touchmove only past its own slop, already several px along a noisy direction, so without the bias a straight-enough second swipe mid-glide read as sideways and died — on the vertical scroller the touchstart had already frozen the glide, and the flagged swipe restarted nothing. A `'both'` gesture orientation claims everything. Inside a sideways-scrolling block the default flips and the threshold goes: a finger scrolling code sideways drifts a few px up, and the vertical scroller took that drift while the block never moved; the browser decides its own gesture on the first move and a move Lenis has prevented kills the pan for the whole touch, so the flag must be on the first move.

**Generates:** The horizontal strip's deltaX-only feel: a plain vertical wheel scrolls the page straight through.

**Rejected alternatives:** Lenis's own check — it refuses a gesture only when the cross-axis delta is exactly zero, and a finger always drifts a pixel.

**Evidence:** `VirtualScroller.ts` `onTouchMoveCapture`. Tests: "a vertical scroller claims every touch: its frame gives the browser no gesture, so there is nothing to hand to the page", "a touch that begins in a sideways-scrolling block is the browser's from its first move, unless it is clearly vertical", "a horizontal strip flags a downward touch for the page and keeps a sideways one". Test: "a touch on the track is claimed from Lenis" — the built-in track flags its touches the same way, so a thumb drag never scrolls the content under it.

**Impossible if true:** A vertical swipe over the horizontal strip that fails to scroll the page.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller -t "flags a sideways touch|flags a downward touch"`

**Status:** provisional

**Last refined:** 2026-09-06

### Every axis dependency goes through a seam getter

**Invariant:** If the class touches a DOM dimension, a transform, a padding or thumb property, a gesture delta or a track coordinate, then it does so through one of the seam members (`offsetSize`, `rectSize`, `transformFor`, `axisDelta`, `axisPaddingProps`, `axisThumbProps`, `trackPointerFraction`, `containerSize`, `containerOuterSize`, `lenisOrientation`, `lenisGestureOrientation`, `selectionAxis`), and a subclass changes axis by overriding only those.

**Scope:** `VirtualScroller.ts` (the seams) and `HorizontalVirtualScroller.ts` (the only overrides). The geometry, the clamp, the rebase, the autoplay, the landing and the padding never fork — each is one hosted class both axes share.

**Mechanism:** Vertical defaults on the base class; the horizontal subclass is the seam overrides plus one re-tuned default, and the text selection takes its axis from `selectionAxis`.

**Generates:** `HorizontalVirtualScroller.ts` at about a hundred lines; the marquee, which is composition over it.

**Evidence:** `HorizontalVirtualScroller.ts` (every member is an override of a seam). Test: "every seam names the x axis".

**Impossible if true:** A `getBoundingClientRect().height` or a `translateY` outside a seam. A horizontal override of the window walk.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.test.ts -t "every seam names the x axis"` and `grep -n "offsetHeight\|translateY\|\.height" examples/playground/src/examples/virtual-scroller/VirtualScroller.ts` shows only seam bodies.

**Status:** provisional

**Last refined:** 2026-09-06

### An item captures its size once on mount

**Invariant:** If a row mounts, then it reports its main-axis rect once, in screen pixels, and never again — not on unmount, not in between; the scroller's capture wave divides the reports by the wrapper's rect-to-layout scale once, so the size map is layout pixels under any ancestor transform.

**Scope:** `VirtualScrollerItem.ts` `capture`, its one hook; the scroller's `captureItemSize` / `flushItemSizes` (the wave and its one scale), `wrapperScale`, and `remeasureRenderedItems`, the one continuous observer, on the wrapper.

**Mechanism:** Items render in normal flow, so the browser positions them at their real size with no bookkeeping; the parent needs sizes only for spacer and estimate math. A single wrapper `ResizeObserver` re-reads the rendered window when a rendered size changes, so continuous per-item observation is unnecessary — and so an unmount has nothing to add: the observer kept the size current while the row was mounted. The unmount capture read a rect between the patch's removals, a forced layout per row; a phone profile spent 711 ms in captures over two flicks of the files list, the largest single cost of the flick. The per-row scale read was two more layout reads per row for one ratio.

**Rejected alternatives:** A `ResizeObserver` per item — bursts of callbacks during scroll at 100k items, each invalidating geometry, measured as jitter. A capture on unmount — the forced layouts above, for a size the observer already had.

**Evidence:** `VirtualScrollerItem.ts` `capture` doc comment; the CPU profile of two files-list flicks under 4x throttling. Tests: "the size is reported once, on mount, as the rect — never on unmount, never in between", "under a half-scale ancestor the item reports the rect as it is, and the scroller takes the scale out".

**Impossible if true:** A size report while no element is attached. A size report on unmount. A size map built from screen pixels under a scaled ancestor.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.test.ts`

**Status:** provisional

**Last refined:** 2026-09-13

### Shrinking the list prunes the measurements at its new end

**Invariant:** If the list's length changes, then the aggregates and the cursor are re-derived over the items that remain, measurements contiguous from the new end are dropped, and farther stale keys stay uncounted until the list regrows over them.

**Scope:** `VirtualScrollerGeometry.ts` `rederive` and `applySize`'s out-of-range branch; `VirtualScroller.ts` `updatePositionsImmediately` and the items-length watch in the constructor that calls it.

**Mechanism:** The repair runs imperatively after a splice: it prunes the contiguous run at `length`, re-sums the map over `index < length`, and re-derives the cursor offset, then bumps the geometry's one version cell. Out-of-range keys are kept for neighbor reads and resurrect if the list regrows.

**Evidence:** `VirtualScrollerGeometry.ts` `rederive`. Tests: "shrinking the list re-derives the size over what remains, prunes the measurements at the new end, and parks the farther ones" (the model), "shrinking the list re-derives the extent over what remains, prunes the measurements at the new end, and parks the farther ones" (through the scroller's items watch).

**Impossible if true:** An extent that counts a row past the list's end.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller -t "shrinking the list"`

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

**Invariant:** If a single finger holds still for 450 ms, then the word under it is selected at once — handles and chip, as the system's own long press does — and the next move extends that selection from its far end instead of scrolling (with nothing under the finger, the move lays the anchor at the resting point), the move is prevented and flagged for Lenis, and lifting the finger ends the drag; while the finger holds, the rows are non-selectable so iOS's own long-press selection finds nothing, and they are selectable again from the first move (or on release); if the finger moves past 8 px before the hold fires, then the gesture is a scroll and the owner never hears of it.

**Scope:** `VirtualScrollerSelectionTouch.ts`: `onTouchStart`, `promoteHold`, `onTouchMove`, `onTouchEnd`, `LONG_PRESS_MS`, `SLOP_PX`. Hosted by the selection; the scroller attaches it at mount.

**Mechanism:** A drag already means scroll on a touchscreen, so selection takes the browser's own convention. The hold timer promotes; slop cancels; after promotion `preventDefault` stops the page and `lenisStopPropagation` stops the list. iOS runs its own long-press selection on selectable text at about the same moment and would take the finger; `lockSelectability` makes the rows `user-select: none` for every hold, selection or not — a finger on selected text is a long press about to extend it, and iOS must not take that press — except a finger within `HANDLE_REACH_PX` of the native selection's first or last caret (`isNearSelectionHandle`), which is grabbing a handle: iOS drags it and `selectionchange` adopts the result; `farEnd` makes the extension, keeping the end farther from the press as the anchor, and a tap on the selection clears it as the system's would — and because WebKit paints no highlight in non-selectable text (native or CSS Highlight API — measured in WebKit 26.5), `unlockSelectability` runs right before `beginAt` on the first move. The gesture calls the same three primitives the mouse path calls.

**Generates:** The copy chip (`showsCopyChip`, `copy`) — a phone has no Ctrl+C.

**Evidence:** `VirtualScrollerSelectionTouch.ts`. Tests: "a still hold promotes, the first move lays the anchor at the resting point through the owner, and every move is taken from the scroll", "a button and the overlay arm nothing, a tap on the selection clears it, a swipe is a scroll". Sweep: "ExampleVirtualScroller (touch long-press + chip)".

**Impossible if true:** The page scrolling while a touch selection is being extended. A selection beginning from a moving finger. A native iOS selection starting under a held finger. A tap on the copy chip clearing the selection it is about to copy. A finger on a native selection handle locking selectability.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.test.ts`

**Status:** provisional

**Last refined:** 2026-09-06

### A multi-click selects the word or the row under it

**Invariant:** If the `selection.multiClick` knob is on (it is off by default: a long press is the touch's way into a selection, and a reader tapping a row twice to open it found a word selected) and a primary mousedown carries a click count of two, then the word around the caret is selected; if three or more, the row; both as settled ranges with no drag, and the native multi-click selection is prevented like the drag-selection is. On a touch device the double tap is the touch class's own gesture (two taps within `DOUBLE_TAP_MS` and `DOUBLE_TAP_SLOP_PX`), selecting the word as a touch range with the chip offered, and the mouse events the browser synthesizes after a touch are ignored for `MOUSE_AFTER_TOUCH_MS`.

**Scope:** `VirtualScrollerSelection.ts`: `onMouseDown` (the `event.detail` branch), `selectAt`, `wordBoundsAt`.

**Mechanism:** The `preventDefault` that removes the native drag-selection also removes the browser's double-click word and triple-click row selection; `selectAt` gives them back over the data. A caret at the end of a word belongs to that word; a caret inside whitespace selects the whitespace run, as the browser does.

**Evidence:** `VirtualScrollerSelection.ts` `selectAt`, `wordBoundsAt`. Test: "a double click selects the word under the caret and a triple click the row, as settled ranges with no drag".

**Impossible if true:** A double click over a row that selects nothing.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "double click selects the word"`

**Status:** provisional

**Last refined:** 2026-09-06

### The pad covers the lerp gap exactly

**Invariant:** If the window walk runs, then it covers a container measured from the SCROLL POSITION — not from the top of the row that contains it, which under-covers by however far the scroll has travelled into that row — and during a lerp it covers the animated position too, in PIXELS over the measured sizes — the walk extends past the target by the lerp gap (`|targetScroll − animatedScroll|`) toward the animated side, whatever the rows between measure — and on top of that the trailing pad is the gap in rows of the estimate (rounded up, capped at 160) and the leading pad is the base plus a velocity lookahead — both held with hysteresis.

**Scope:** `VirtualScroller.ts` `computeVisibleItems` (the pixel extension over `scrollGap`); `VirtualScrollerPadding.ts`: `rowsBehind`, `rowsAhead`, `split`, `settle`, `pad`; the scroller's `scrollGap`, `scrollVelocity`, `halfPaddingQuantity` and `estimatedItemSize` accessors. Speed crosses that seam in px per MILLISECOND, never per animation frame.

**Mechanism:** The reader sees the animated position while the walk starts at the target, so the rows between must be mounted. A pad counted in rows of the estimate under-covers a gap whose rows measure shorter than it — a 35px system line, a one-line question, against a 160px estimate — and the bottom of the viewport went blank on a long wheel up; the walk now extends in pixels over the measured sizes, so coverage is exact whatever the rows measure, and the row pad on top of it is the lookahead. Both pads grow the frame their reading does, hold for as long as the content moves, and shrink only at rest once the settle window has passed since they last grew, so the decay tail of a flick never unmounts a burst of rows mid-glide — a visible hitch on a phone — and keeps what the next flick needs; a reversal turns the direction and keeps the levels, since dropping them put a burst of unmounts on the very frame the finger reversed (measured: a 50 ms take-over frame on a throttled phone profile). The gap rows are held on purpose: the gap itself is exact per frame, but the rows it releases as the lerp converges were trimmed on every walk of the tail — a settle-timer walk every 350 ms, each unmounting a chunk of rows with a geometry bump and a layout per row while the content still crawled the last 200 px; measured on a phone profile as the "choke just before the end" of a flick on the files list and the chat. Held — the gap in px for the walk's pixel extension and the gap in rows for the pad alike — the rows release once, at rest, when nothing moves.

**Generates:** The `padding.before` / `padding.after` split the walk reads instead of one symmetric constant.

**Rejected alternatives:** Sizing the lookahead from a per-frame velocity — a frame is 16.7 ms only at 60 Hz, so the same motion sized a pad two thirds as long at 90 Hz and half as long at 120, which is most current Android hardware and none of the machines it was tuned on. A velocity pad alone — measured identical to no pad (21/28/35 uncovered frames of 91), because the gap is the whole story.

**Evidence:** `VirtualScroller.ts` `computeVisibleItems`, `VirtualScrollerPadding.ts` `pad`. Tests: "mid-lerp the window covers the animated position in pixels, over rows far shorter than the estimate", "rows behind cover the lerp gap exactly, rounded up and capped", "pad() holds the gap rows and the lookahead across a decaying tail and releases both at rest, reading the owner each call". Probe: 0/0/0 uncovered frames at 2000/4000/8000 px flicks (`docs_v2/examples/virtual-scroller.md`); on the chat, 120 wheel ticks up over short system rows: 0 uncovered frames, where the row pad alone left 3 with up to 243px blank at the bottom.

**Impossible if true:** A window that stops short of the viewport because the row at its top is taller than the frame. A pad that shrinks on the first frame of a flick's decay. Gap rows trimmed while the lerp still travels. Blank canvas under the viewport while the gap in rows is below the cap. A viewport bottom left uncovered mid-lerp because the rows behind the target measure shorter than the estimate.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts`; the feel itself, `npm run probe:scroller` against the docs dev server — a flick's tail unmounting a row, or a frame past 84 ms, fails it.

**Status:** provisional

**Last refined:** 2026-09-13

### Hot paths read no layout

**Invariant:** If code runs on every frame or every scroll read — the frame loop's position write, the clamp, Lenis's limit, the walk — then it reads the container's size from the resize observer's cell (`containerOuterSize`, through `containerSpan`) and never the element's `offsetHeight`, `scrollTop`, `scrollHeight` or a rect; before the observer's first report `containerSpan` falls back to the element once. A row's own capture reads one rect, on mount only; the wrapper observer reads the rendered rows' rects once per wave.

**Scope:** `VirtualScroller.ts` `containerSpan`, `setScrollPosition`, `clampScrollPosition`, the `virtualLimit` callback; `VirtualScrollerLanding.ts` `alignOffset` and `snapToNearest`; `VirtualScrollerItem.ts` `capture` (mount only); `VirtualScrollerSelection.ts` `applyHighlight` (returns before `getSelection` when nothing is shown). Three layout reads survive on purpose and are not hot paths: `wrapperScale` reads the wrapper twice per remeasure wave (once, not per row); `onScroll` reads `scrollTop` only when the browser itself nudged the frame (a find-in-page match, a selection scroll), never on a scroll of ours; and `nudgePaint` forces one read per autoscroll frame on WebKit alone, which is the point of it — [WebKit re-rasterizes the layer on every autoscroll write](#webkit-re-rasterizes-the-layer-on-every-autoscroll-write).

**Mechanism:** A layout read after a patch forces the layout the browser was going to do at paint, and forces it again for every read that a later write invalidates. A CPU profile of two flicks on a phone profile put 191 ms in live `offsetHeight` reads, 163 ms in a `scrollTop` read on the position write, 711 ms in the rows' unmount captures and 191 ms in the highlight pass reading the document selection on every window change — none of them on the walk or the render. The observer's cell is already the size; reading it costs nothing and forces nothing.

**Generates:** The `containerSpan` accessor; the mount-only capture; the highlight pass's early return.

**Rejected alternatives:** Reading the element and caching per frame — the first read of a frame still forces the layout the patch dirtied.

**Evidence:** The CPU profile in LESSONS ("Profile before spreading the work"). Tests: "the per-frame position write, the clamp and the limit read the observed size and force no layout", "with no range and nothing painted the highlight pass reads no selection; after a range it clears", "the size is reported once, on mount, as the rect — never on unmount, never in between".

**Impossible if true:** A layout read on the per-frame position write. A rect read on unmount. A window change on a plain scroll reading the document selection.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller -t "force no layout|reads no selection|never on unmount"`

**Status:** provisional

**Last refined:** 2026-09-13

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

### A pad is released when the reader moves, never at rest

**Invariant:** If the held pad is larger than the base once the reading has been still for the settle window, then it is released on the last frame the position CHANGED — the walk runs on a position change and nothing forces one afterwards, so no row is ever unmounted while the content is still.

**Scope:** `VirtualScrollerPadding.ts` `settle` and `pad`. The class holds no reactive cell and no timer: the walk's own cadence is the release's timing.

**Mechanism:** Releasing rows is a layout change: their heights fold back into the leading spacer. Blink lays out in 1/64 px, so the sum of N row boxes does not round to the single spacer box that replaces them, and every row below the change moves by the residual — measured at 3/64 px (0.0469), on every surviving row, when three rows were released. That is far too small to see as motion, and it is not the problem. The problem is the raster it forces: each text line box is snapped to the device grid independently at raster time, from the layer's new sub-pixel phase, so lines whose baselines sat near a boundary flip and their neighbours do not. While anything else is moving this is invisible. At rest it is the ONLY thing that moves, and it reads as several lines of text hopping a pixel up or down at the exact moment scrolling stops — reported from an Android phone, in every `renderSnap` setting, because it is layout and not the transform.

**Rejected alternatives:** A timer that bumped a reactive cell so the walk ran once more after the content stopped (`settledVersion`, `armSettle`, `onSettled`, `dispose`). It released the pad ~236 ms into rest, which is the tidier number and the one moment the release can be seen. Also rejected: holding the pad until the reader moves again — it never comes back to the base, so every gesture starts from the last one's pad and the window grows.

**Generates:** A padding class with no reactive cell, no timer and no dispose — the walk's cadence is the whole schedule.

**Evidence:** Measured over the chat before the change: 236 ms after a flick came to rest the window went 15 rows to 11, the leading spacer 104725 px to 106048 px, and all 11 surviving rows moved -0.0469 px with nothing else on screen in motion. After it, no frame following rest changes anything. Cost measured back-to-back against the old code on the same machine: no worse (the rig had drifted far enough by then that only a back-to-back comparison meant anything). Tests: "settle grows at once, holds through the decay, releases only while moving, and keeps its rows through a turn", "pad() holds the gap rows and the lookahead across a decaying tail and through rest, releasing only when the reader moves again".

**Impossible if true:** A row unmounting while the content is still. A line of text hopping a pixel while the reader is not scrolling.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts -t "releases only while moving|through rest"`

**Status:** provisional

**Last refined:** 2026-09-15

### A list may refuse selection

**Invariant:** If the `selection.enabled` knob is off (it is on by default), then no gesture selects — a press returns before it begins, the touch class is never attached — and the frame carries a class whose `user-select: none` refuses the native selection too; the files list keeps it on, so a file name can be copied.

**Scope:** `VirtualScroller.ts` `selectionEnabled`, `frameClass`, `SELECTION_KNOBS.enabled`; `VirtualScrollerSelection.ts` `attach`, `onMouseDown`, the owner's `selectionEnabled`; the ai-chat index and peek passing `:selection="{ enabled: false }"`.

**Mechanism:** An index or a peek is a list of controls: a press there means pick, and a drag that painted a selection over its rows was noise the reader had to clear. One knob at the scroller turns every way in off at once, and the frame's class refuses the browser's own selection on the same rows.

**Generates:** The index and the peek as pure controls; the files list keeping copyable names.

**Evidence:** `VirtualScroller.ts` `selectionEnabled`. Test: "a list that refused selection selects nothing on a press and attaches no touch gesture".

**Impossible if true:** A press on a list that refused selection starting a drag. A native selection painted over the index's rows.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "refused"`

**Status:** provisional

**Last refined:** 2026-09-13

### A drag scrolls from inside the edge zone

**Invariant:** If a selecting pointer, mouse or finger, comes within its input's zone of the frame's start or end edge along the axis — the VISIBLE edge, the frame's clipped to the viewport, since a frame taller than the screen has an edge no finger can reach — then the list scrolls that way on that input's cadence: a pointer's (`AUTOSCROLL_MOUSE`, a 32 px zone, the speed rising on past the edge to full 160 px beyond it, since a pointer is small and can leave the frame) or a finger's (`AUTOSCROLL_TOUCH`, a 96 px zone, a light 0.06 px/ms at its inner boundary, full speed a fingertip before the edge and held from there on, since a finger cannot rest on the edge — past it is the page, its own text and its zoom), each profile the scroller's `selection.autoscroll` knob, and where a profile's `rampMs` is above zero, holding in the zone lifts the speed from its depth floor to the maximum over that long, the clock restarting when the direction flips; and the focus follows the rows sliding under the pointer; in the interior nothing scrolls. If a native selection handle drags the selection's end into that zone, then the list scrolls under the handle the same way while the system keeps re-selecting beneath it, and stops when the end leaves the zone or the changes stop.

**Scope:** `VirtualScrollerSelection.ts`: `edgePenetration`, `visibleAxisEdges`, `probePoint`, `extendTo`, `autoscrollStep`, `autoscrollSpeed`, `heldInZone`, the `AUTOSCROLL_MOUSE` and `AUTOSCROLL_TOUCH` profiles as the defaults of the owner's `autoscrollProfiles`, and `autoscrollProfile`; `followHandle`, `handleAutoscrollStep`, `HANDLE_SETTLE_MS` for the native handle path; both axes; mouse, finger and system handle.

**Mechanism:** `edgePenetration` is signed and continuous from the zone's inner boundary through the edge and beyond, so one ramp serves both, and measures from `visibleAxisEdges`; `autoscrollSpeed` takes the depth floor and, with `heldInZone`'s clock, the hold ramp; `probePoint` probes at the pointer while it is inside the frame and at the edge once it has left. A rule that scrolled only past the edge could never scroll a frame with no outside — a scroller that is the whole page. A handle drag reaches the class only as `selectionchange`: `followHandle` measures the moving end's caret rect, and while it sits in the zone `handleAutoscrollStep` scrolls under it without re-pinning the native selection (the system owns it; `applyHighlight` stands down), each adopted change keeping the loop alive.

**Rejected alternatives:** Scrolling only past the edge — a page-sized frame never scrolls a selection, up or down.

**Evidence:** `VirtualScrollerSelection.ts` `edgePenetration`. Tests: "holding the pointer inside the edge zone scrolls forward at a crawl, past the frame faster, above it backward, and returning to the interior stops it", "a frame the size of the page still scrolls a selection: the zone lies inside the frame, so a pointer never has to leave it", "holding in the zone lifts the speed toward the maximum over rampMs, the hold clock restarts when the direction flips, and rampMs 0 ignores the hold", "a frame taller than the screen has its zones at the screen's edges, where a finger can reach them".

**Impossible if true:** A selection drag held 10 px from the frame's bottom edge that does not scroll. A finger at the top of the screen, over a frame that runs above it, that does not scroll up.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "edge zone|size of the page|rampMs|taller than the screen"`

**Status:** provisional

**Last refined:** 2026-09-06

### The frame is never natively panned along its own axis

**Invariant:** If a touch pans the frame along the scroller's own axis, then the browser does nothing with it natively — Lenis drives it in JS — and the browser gets only what the page needs: the frame's `touch-action` is `none` on the vertical scroller (a page does not pan sideways, and any token left on lets Chrome on Android claim a sloppy second swipe as a pan and end it with a touchcancel) and `pan-y` on the horizontal strip, whose page must scroll vertically across it; a touchcancel flicks like a touchend; and if the frame does scroll natively by any means, then Lenis never adopts that offset as the position and `onScroll` hands it to the virtual scroll and zeroes the frame.

**Scope:** `VirtualScroller.ts` `frameTouchAction` (the seam), `lenisIgnoreNativeScroll` (true on both axes), `onScroll` with the `nativeScrollOffset` / `resetNativeScroll` seams; `HorizontalVirtualScroller.ts` (the overrides), the `:style` binding on the frame in both SFCs; the fork's `onNativeScroll`.

**Mechanism:** The frame is `overflow: auto` so Lenis can adopt native scroll; without a `touch-action`, a finger that our long press has turned into a selection still pans the frame natively the moment the touchmove is no longer cancelable, moving `scrollTop` under the transformed rows so the text leaves the clip. With the own axis excluded from native panning, a selecting finger's touchmove stays ours to cancel, and on the strip a cross-axis swipe still reaches the page. The fork listens for `touchcancel` beside `touchend` and flicks on either, off the finger's trail. The second half is the teleport: the fork's `onNativeScroll` adopts `scrollTop` as the position when it is not animating, so a 30 px native nudge under a touch became "scroll 30" and the rows, the thumb and the copy chip left the frame together (seen on an iPhone as rows that never appear past the fold). Both axes now refuse adoption, and `onScroll` converts whatever native offset arrives — a focused input, a find-in-page match, a selection nudge — into `scrollBy` and zeroes the frame.

**Generates:** The touch selection surviving on iOS; the `-webkit-touch-callout: none` on the frame, since the copy chip is the affordance.

**Evidence:** `VirtualScroller.ts` `frameTouchAction`. Tests: "the vertical seams read the y axis: translateY and deltaY", "every seam names the x axis".

**Impossible if true:** The frame's `scrollTop` moving under a touch selection. Lenis adopting a native scroll offset as the position on either axis. A native scroll of the frame that is neither zeroed nor turned into a virtual one.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller -t "vertical seams|every seam names the x axis"`

**Status:** provisional

**Last refined:** 2026-09-06

### A native selection inside the frame is adopted as the logical range

**Invariant:** If the native selection changes to a range inside the mounted rows by a means that is not ours — iOS's selection handles after a long press or a double tap, shift+arrows on a keyboard — then it becomes the logical range, so the chip's count and the copied text follow what the reader sees; our own re-pins are recognised by their signature and ignored, and a live drag owns the range.

**Scope:** `VirtualScrollerSelection.ts`: `onSelectionChange`, `positionOfNode`, `selectionSignature`, the `native.applied` holder; the `selectionchange` listener installed by `attach`.

**Mechanism:** `applyHighlight` records the signature of what it wrote; `selectionchange` events whose signature matches are echoes, and so is any native range that equals the logical range clamped to the mounted window (`isClampedEcho`), however the browser re-seated its nodes — the native selection only ever covers the mounted rows, so adopting that would shrink a range that runs past the window. Anything else inside the wrapper is converted node by node through `offsetInRow`, the same translation the drag uses. A collapse is read the same way: one of our own making (`collapseNative` marks it — a range scrolled out of the window, a clear) or one that happens while a finger holds (the selectability lock hides the native selection) is ignored; any other dismissal of a natively pinned range, a tap on iOS, clears the logical range and its chip.

**Evidence:** `VirtualScrollerSelection.ts` `onSelectionChange`. Test: "a native selection the reader makes inside the frame becomes the logical range, while our own re-pins are ignored as echoes, re-seated or not".

**Impossible if true:** A chip label that disagrees with the native highlight. An adopted range from a selection outside the frame. A range that runs past the window shrinking to the mounted rows on a selectionchange. A copy chip outliving the highlight the reader dismissed.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "adopted|echoes"`

**Status:** provisional

**Last refined:** 2026-09-06

### A touch drag paints without selecting

**Invariant:** If a touch drag is live and the browser has the CSS Custom Highlight API, then the range is painted through `CSS.highlights` and the native selection is not touched until the finger lifts, when the finished range becomes the native selection; a mouse drag pins the native selection throughout, and a browser without the API falls back to it for touch too.

**Scope:** `VirtualScrollerSelection.ts`: `applyHighlight`, `clearCssHighlight`, the `input` holder, `beginAt`'s input parameter, `endDrag`; `TOUCH_HIGHLIGHT_NAME`, `supportsCssHighlight`; the `::highlight(virtual-scroller-selection)` rule in `VirtualScroller.vue`.

**Mechanism:** A native selection written under a held finger costs the page the gesture — [A native selection changed under a held finger cancels the touch](#a-native-selection-changed-under-a-held-finger-cancels-the-touch) — so the drag paints instead and writes the selection once, after the finger is gone. `beginAt(x, y, 'touch')` marks the drag; every `applyHighlight` while it lives builds a `Range` over the mounted carets and registers it as a `Highlight`; `endDrag` re-runs `applyHighlight` with the mark cleared, which pins the native selection (the copy chip and iOS's handles need one) and drops the paint. Ctrl+C is a mouse affordance and keeps the native selection from the first move.

**Evidence:** `VirtualScrollerSelection.ts` `applyHighlight`. Test: "a finger’s drag paints the range through the CSS Highlight API and leaves the native selection alone until release, when the range becomes the native selection". WebKit 26.5: the Highlight API is present and paints on selectable text (measured, 3474 tinted px on the control).

**Impossible if true:** A `setBaseAndExtent` call while a finger drags in a browser with the Highlight API.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts -t "paints the range through the CSS Highlight API"`

**Status:** provisional

**Last refined:** 2026-09-06

### On a touch device the selection is drawn by the class

**Invariant:** If the device has a touch point, then a finger never creates a native selection: the rows are non-selectable for as long as a finger is down, a range a finger made is painted by `VirtualScrollerSelectionTouch` as boxes from the mounted DOM range's client rects, laid whole inside the items wrapper (the frame clips them), two handles of its own sit beside the range's ends, the start above the first line and the end below the last, offset outward — shown while its spot is on screen or within the nudge reach (the offset plus the knob's radius) outside it, nudged inside the edge by the knob's radius, hidden further out, so a handle never glides in pinned to an edge, a handle beside an edge line is in view, and a marquee chunk hundreds of px wide keeps its handle at its visible end — a handle drag begins at once from the other end through `beginFromEnd`, and a touch the class claims — a handle, a promoted long press, a double tap — holds any glide where the content is through the owner's `holdScroll` (its moves are flagged for Lenis to skip, so Lenis's pending touch would never see the move that takes over); selected text is no different from any other — a swipe over it scrolls, a tap on it clears, a long press extends it; a mouse on the same device keeps the native selection and Ctrl+C; on a device with no touch point the class is inert and the native selection paints as before.

**Scope:** `VirtualScrollerSelectionTouch.ts` whole; `VirtualScrollerSelection.ts` `$touch`, `applyHighlight` (the `paintsSelection` branch), `visibleDomRange`, `beginFromEnd`, `itemsWrapperElement`; the overlay rules in `VirtualScroller.vue`. The earlier implementation, which rode the system's selection, is gone; the tag `touch-selection-native-rollback` marks the last build that used it.

**Mechanism:** The system's own touch selection contends with the list's touch scroll for one finger under rules that are the system's and undocumented, and it anchors to DOM nodes a virtual list recycles; writing it under a finger costs the gesture outright — [A native selection changed under a held finger cancels the touch](#a-native-selection-changed-under-a-held-finger-cancels-the-touch). Owning the whole of it removes the contest. `attach` lays the overlay inside the wrapper, so the boxes move with the transform for free; every touchstart locks the frame's selectability and every release unlocks it, so the system's long press finds nothing while a mouse between touches finds everything; `applyHighlight` hands the mounted DOM range to `paint` on every move and window change while the range is a finger's (`input.touch`), `followTouch` re-places the two handles on every scroll from the last paint's spots and one rect read (the boxes move with the rows; a handle shows only while its spot is on screen), and the highlight is native otherwise; a touch on a handle calls `beginFromEnd` with the opposite end and rides `extendTo`, so the edge zone scrolls the list with the loop the mouse uses; the copy chip copies from the logical range, keeps the selection (a reader may widen it and copy again, as the system's own copy does), reads "Copied ✓" for `COPIED_MS`, shrinks under the finger, and falls back to a textarea copy where the clipboard API is absent (plain http).

**Generates:** The overlay and handle CSS; the `beginFromEnd` and `visibleDomRange` primitives; the sweep's touch probe driving a handle to the edge.

**Rejected alternatives:** Riding the system's selection (locks, adoption, handle reach, paint nudges) — nine rounds of arbitration on an iPhone, each fix a rule about who yields, and the edge never scrolled.

**Evidence:** `VirtualScrollerSelectionTouch.ts`. Tests: "with a touch point the rows are non-selectable and the overlay with its two handles is laid inside the wrapper; dispose removes both", "painting a range lays one box per non-empty rect and puts the handles at the ends; painting null hides it all", "a finger on the end handle drags from the start at once, and on the start handle from the end", "on a touch device the highlight is the touch class’s overlay and the native selection is never created".

**Impossible if true:** A native selection created by a touch. A handle drag that starts over instead of extending. A box that does not move with the rows. A box painted outside the frame. A handle shown for an end that is not on screen. A swipe over selected text changing the selection instead of scrolling. A mouse on a touch-capable device losing its native selection or its Ctrl+C.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.test.ts`

**Status:** provisional

**Last refined:** 2026-09-06

### A hosted capability reaches its owner through an interface

**Invariant:** If a capability needs what only the scroller knows, then it receives an `Owner` object of a handful of members through its constructor, reached by the scroller through one `$`-getter, and the capability never imports or types the scroller class.

**Scope:** `VirtualScrollerSelection.Owner`, `VirtualScrollerSelectionTouch.Owner`, `VirtualScrollerPadding.Owner`; the `$selection`, `$touch` and `$padding` getters.

**Mechanism:** The owner interface names the exact boundary; a plain object satisfies it, which is what makes each capability testable without a scroller and swappable by overriding one getter. The selection hosts the touch gesture the same way the scroller hosts the selection.

**Generates:** The owner doubles in `VirtualScrollerSelection.test.ts`, `VirtualScrollerSelectionTouch.test.ts` and `VirtualScrollerPadding.test.ts`; the seam a grid or a tree would implement to get selection.

**Rejected alternatives:** Passing the scroller instance — the capability then reaches into everything, and its spec needs a scroller.

**Evidence:** The three `Owner` interfaces. Tests: "a drag begins at a logical position, extends by logical positions in either direction, and survives its anchor row leaving the DOM", "lifting the finger ends the drag and reports selected exactly when the owner holds a selection; a cleared selection drops the chip", "pad() follows the lerp gap frame by frame and holds the lookahead across a decaying tail, reading the owner each call".

**Impossible if true:** An import of `VirtualScroller` inside a hosted capability file.

**Verification:** `grep -L "from './VirtualScroller'" examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.ts examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.ts examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.ts` lists all three.

**Status:** provisional

**Last refined:** 2026-09-06

### The feel is one nested prop complete at every depth

**Invariant:** If a page passes `scroll` or `selection` as a partial object at any depth, then the class reads a complete object: every leaf the page supplied, every leaf it left out the tuned default — `scroll.wheel` a gain, a follow (the lerp) and a `maxPxPerMs` cap (0 uncapped); `scroll.touch` a gain, a `carry` (the throw, in frames of the finger's own speed) and a `launch` (the multiple of that speed the glide leaves at), from which the lerp is DERIVED as `launch / carry` rather than set, `selection.autoscroll.mouse` and `.touch` each an autoscroll profile — and Lenis is tuned from those leaves at mount and again whenever they change; the content never moves faster than its input's cap on a gesture, while a programmatic seek is uncapped.

**Scope:** `VirtualScroller.ts`: the `scroll` and `selection` props, `SCROLL_KNOBS`, `SELECTION_KNOBS`, the constructor's `nestedProps` seam, `lenisMotion`, `tuneMotion`, `autoscrollProfiles`; `Lenis.ts` `tune`, `wheelMaxPxPerMs`, `touchMaxPxPerMs`, `lastInputTouch`; `Animate.ts` `maxPxPerMs`; `VirtualScroll.ts` `tune`; `ivue/extras` `nestedProps`.

**Mechanism:** Vue resolves a prop's default only when the prop is absent, so a supplied object arrives exactly as passed and its missing leaves are gone; the fill is possible because the defaults are a value the class owns (`propsDefaults`), where a compiler-only default has nothing to fill from. `nestedProps(props, propsDefaults)` fills in place — lodash's `defaultsDeep` with arrays taken whole: for every prop whose value and default are both plain objects, each leaf the supplied object lacks is written into it from the default, recursively, and a leaf it has is kept; Vue's props proxy is shallow, so the nested objects are the parent's own and are written directly, the props object itself untouched and returned typed complete. The parent passes a stable object (a constant inline literal is hoisted by Vue's compiler; a ref's value; a store field). `lenisMotion` derives Lenis's vocabulary from the merged leaves; the mount passes it and a watch over it calls `tune`. The cap lives in `Animate.advance`: a frame moves the value no more than the cap times the elapsed time and is never the last frame, so the lerp keeps running at the cap until it arrives; Lenis picks the cap by the last gesture's input and passes none for a programmatic scroll.

**Rejected alternatives:** A touch lerp and an inertia as two free knobs — they are not free: a flick's first frame moves `v x inertia x lerp` while the finger moved `v`, so their PRODUCT is the launch ratio and setting them apart chooses it by accident. The shipped pair, an inertia of 35 under a 0.065 lerp, was a launch of 2.28x that nobody had named. Merging in a getter per read — the class should read complete props, not merge them. A Proxy or a getter-per-key view over the props — machinery to do what a fill does, bought for the one case a fill does not cover (an object built anew on every parent render), which the stable-object rule covers instead. Lodash `mergeWith` with an array customizer — the same semantics (verified case for case), but `ivue/extras` carries no dependency; an app that has lodash may use it as well.

**Evidence:** Tests: "a nested knob left out reads as its tuned default at every depth, a supplied leaf wins, and Lenis reads the merged leaves" and "the flick's lerp is derived from its throw and its launch, so the ratio cannot be set by accident" (`VirtualScroller.test.ts`), "a capped lerp moves at most cap × elapsed per frame, keeps running while capped, and still arrives" (`../../lenis/Animate.test.ts`), `lib/__tests__/nestedProps.vitest.spec.ts`.

**Impossible if true:** A page passing `{ wheel: { gain: 2 } }` and losing the touch defaults. A wheel scroll under a cap that jumps further in one frame than the cap allows.

**Verification:** `npx vitest run examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts -t "nested knob"` and `npx vitest run examples/playground/src/lenis/Animate.test.ts`

**Status:** provisional

**Last refined:** 2026-09-06

## Impossibility boundary — what these invariants forbid

- Blank canvas under the viewport during a flick whose gap is below the cap — [The pad covers the lerp gap exactly](#the-pad-covers-the-lerp-gap-exactly).
- A scroller at rest requesting a frame every tick — [The frame loop runs only while there is motion](#the-frame-loop-runs-only-while-there-is-motion).
- A highlight that collapses when its anchor row recycles — [The selection is a range over the data](#the-selection-is-a-range-over-the-data).
- A copy that stops at the mounted rows — [The selection is a range over the data](#the-selection-is-a-range-over-the-data).
- A rendered scroll position outside the extent — [The scroll position lands inside the scrollable range](#the-scroll-position-lands-inside-the-scrollable-range).
- A rendered offset above about 131k px — [Rendered offsets are rebased by whole chunks](#rendered-offsets-are-rebased-by-whole-chunks).
- A horizontal scroller that forks the cursor, the clamp or the creep — [Every axis dependency goes through a seam getter](#every-axis-dependency-goes-through-a-seam-getter).
- The page scrolling while a touch selection extends — [A long press turns the next move into a selection](#a-long-press-turns-the-next-move-into-a-selection).
- A double click over a row that selects nothing — [A multi-click selects the word or the row under it](#a-multi-click-selects-the-word-or-the-row-under-it).
- A capability that imports the scroller — [A hosted capability reaches its owner through an interface](#a-hosted-capability-reaches-its-owner-through-an-interface).
- A selection drag near the edge that does not scroll — [A drag scrolls from inside the edge zone](#a-drag-scrolls-from-inside-the-edge-zone).
- The frame's scrollTop moving under a touch selection — [The frame is never natively panned along its own axis](#the-frame-is-never-natively-panned-along-its-own-axis).
- A native selection changing under a held finger — [A touch drag paints without selecting](#a-touch-drag-paints-without-selecting).
- A native selection created by a touch — [On a touch device the selection is drawn by the class](#on-a-touch-device-the-selection-is-drawn-by-the-class).
- A partial knob object that drops the defaults beside it — [The feel is one nested prop complete at every depth](#the-feel-is-one-nested-prop-complete-at-every-depth).
