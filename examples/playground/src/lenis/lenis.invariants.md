# Lenis fork invariants

The living contract for the scroll integrator the virtual scroller drives: `lenis.ts` (the fork), `virtual-scroll.ts` (the gesture listeners) and `animate.ts` (the lerp). The fork has diverged from upstream Lenis on purpose — fully-virtual mode, snap-by-speed, the speed cap, the finger trail, the pending touch — and this file holds the rules those divergences enforce. The scroller's own contract (`../examples/virtual-scroller/virtual-scroller.invariants.md`) records what the scroller asks of Lenis; this one records what Lenis guarantees a finger.

Two kinds of records, and the split is load-bearing:

- **Reality-based invariants** are forced by how phones deliver touch events. They are discovered, not chosen; a record that is reality only inside this subsystem and decided at a wider scope names that scope in `Renegotiable at`.
- **Chosen invariants** are the fork's own disciplines. Each could be otherwise and still be coherent; the scroller depends on it not drifting.

Chosen invariants stand on reality invariants, never the reverse.

## Generator

### A finger's swipe becomes the glide it meant, on every phone

**Invariant:** If a finger swipes the content and lifts, then the content glides at the velocity of the finger's last stretch, whatever shape the platform delivered the touch events in; and if a finger lands on a glide, then the content neither freezes nor jumps — it runs on until the finger moves, and the finger takes over from where the content is.

**Scope:** The fork's touch path: `onVirtualScroll` from the touchstart to the inertia `scrollTo`; `trailVelocity`, `trimTrail`, `FLICK_WINDOW_MS`; the `touchPending` and `touchTrail` state; `virtual-scroll.ts` touch listeners; `animate.ts` for the cap.

**Components:** One per gear, each delete-testable:
- [Android holds the first move back and may coalesce a swipe into one](#android-holds-the-first-move-back-and-may-coalesce-a-swipe-into-one) — why nothing about a flick may depend on the last frame or on a second move.
- [A flick's velocity is read off the finger's last stretch](#a-flicks-velocity-is-read-off-the-fingers-last-stretch) — why a coalesced swipe still glides at the finger's speed.
- [A touch on a glide keeps it running until the first move](#a-touch-on-a-glide-keeps-it-running-until-the-first-move) — why a re-flick has no stall.
- [A touchcancel flicks like a touchend](#a-touchcancel-flicks-like-a-touchend) — why a browser claiming the gesture does not freeze the content.

**Mechanism:** The touchstart seeds a trail at the animated position and marks the touch pending while the glide runs on; the first move stops the glide, drops its target for the animated position, re-seeds the trail there and syncs the finger; every move appends to the trail inside a 100 ms window with one anchor kept before it; the end or cancel reads the velocity off the trail with the span capped at the window and scrolls to the inertia distance; an end with no move is the tap that stops the glide.

**Generates:** The specs `lenis.test.ts` and `animate.test.ts`; the on-device trace (`lenis.trace`) the scroller example prints at `?touchdebug`; the LESSONS entry "Phone-only scroll bugs: trace first, theorize never".

**Impossible if true:** A re-flick that stalls. A swipe delivered as one touchmove that glides less than the same swipe delivered as five. A tap on a glide that does not stop it. A frame's velocity of zero at the touchend deciding the flick.

**Evidence:** Five on-device logs from an Android phone (2026-09-07), each naming the next gear: `trail=1` with `flickV=0.00` on every coalesced swipe; `trail=1` after the seed was trimmed; `trail=1` after the seed sat behind an early return; `flickV=1.19` with the seed at the glide's target; every flick firing and still a stall per touchstart.

**Verification:** `npx vitest run examples/playground/src/lenis` green.

**Status:** provisional

**Last refined:** 2026-09-07

## Reality-based invariants

### Android holds the first move back and may coalesce a swipe into one

**Invariant:** If a finger touches Chrome on Android, then the first touchmove arrives only past the platform's touch slop — often 100 to 260 ms after the touchstart — and a quick swipe may arrive as ONE touchmove carrying its whole travel, with the touchend 10 ms after; if the same finger touches Safari on iOS, then the moves arrive from the first pixel, every frame.

**Scope:** Every touch the fork receives; the reason for each chosen record below.

**Renegotiable at:** The platforms' gesture pipelines — Android's touch slop and event coalescing, iOS's immediate delivery. Not the fork's to change.

**Mechanism:** Android's input pipeline waits for the slop before it commits a gesture and coalesces moves the main thread has not consumed; a fast re-flick fits entirely inside that wait.

**Generates:** The trail, the pending touch, the anchor and the span cap; the trace that showed all of it.

**Rejected alternatives:** Treating the last animation frame's velocity as the flick's — zero on a coalesced swipe. Assuming a second move — a coalesced swipe has none.

**Evidence:** The on-device logs: touchstart at 10.99 s, one touchmove at 11.18 s carrying 194 px, touchend at 11.19 s; three-move swipes 30 ms apart from the same finger on the same phone.

**Impossible if true:** A flick logic that works on iOS proving anything about Android.

**Verification:** The logs above; `lenis.test.ts` carries their numbers.

**Status:** provisional

**Last refined:** 2026-09-07

## Chosen invariants

### A flick's velocity is read off the finger's last stretch

**Invariant:** If a touch ends or is cancelled, then the flick's velocity is the position change over the finger's trail — samples inside `FLICK_WINDOW_MS` (100 ms) plus one anchor kept before the window — scaled to a frame, with the span capped at the window; the trail is seeded at the touchstart at the ANIMATED position, before any early return, and re-seeded there when the finger takes over a glide; fewer than two samples, or a span under 8 ms, fall back to the frame's velocity; a pause mid-touch reads as no flick since its anchor and its move share a position.

**Scope:** `lenis.ts` `trailVelocity`, `trimTrail`, `FLICK_WINDOW_MS`, the `touchTrail` state and its seeding in `onVirtualScroll`.

**Mechanism:** The seed gives a lone coalesced move a span; the kept anchor survives the window when the move lands late; the span cap makes a held-back move read its last stretch rather than its wait, so a one-move swipe glides like a five-move one; the animated position is where the content is, where the target during a glide is hundreds of px ahead.

**Generates:** `lenis.test.ts`: the trail, the seed, the late anchor, the seed at the target versus the content, the pause.

**Rejected alternatives:** The last frame's velocity (zero at a coalesced touchend). Seeding at the target (a 336 px swipe read 1.19 px/frame). Trimming every sample older than the window (the seed vanished; `trail=1`). The true span for a held-back move (a third of the glide of a multi-move swipe).

**Evidence:** `lenis.ts` `trailVelocity`. Tests: "the flick velocity is read off the trail, and falls back to the frame velocity with too little trail", "a re-flick Android coalesced into one touchmove still flicks: the touchstart seeds the trail, so one move has a span", "an idle frame before the touchend does not zero the flick: the trail still spans the finger's moves".

**Impossible if true:** A swipe delivered as one touchmove reading a velocity of zero. A seed that is not where the content is.

**Verification:** `npx vitest run examples/playground/src/lenis/lenis.test.ts`

**Status:** provisional

**Last refined:** 2026-09-07

### A touch on a glide keeps it running until the first move

**Invariant:** If a finger lands while the content glides, then the glide runs on and the touch is pending; if that finger then moves, then the glide stops where the content is, the glide's target is dropped for the animated position, the trail is re-seeded there and the finger's sync takes over; if that finger lifts or is cancelled with no move, then the glide is reset — the tap that stops it.

**Scope:** `lenis.ts` `touchPending` and the touchstart / first-move / end branches of `onVirtualScroll`.

**Mechanism:** Stopping at the touchstart froze the content for the whole hold-back Android imposes on the first move, then the sync catch-up jumped: freeze, gap, jump, per re-flick — the stall five other fixes could not touch. Running on until the first move, the finger meets the content where it is.

**Generates:** The trace lines "touch pending: glide runs on", "finger takes over", "tap-to-stop: reset".

**Rejected alternatives:** Upstream Lenis's tap-to-stop on the touchstart — right on iOS, a stall on Android.

**Evidence:** The fifth on-device log: every re-flick firing with inertia 580 to 2609 px and still a stall felt on each; the sixth run, after this record, with none.

**Impossible if true:** A re-flick that freezes the content before the finger moves. A tap on a glide that lets it run.

**Verification:** On-device: `?touchdebug`, flick, touch again mid-glide — no stall, and the trace shows the pending and take-over lines.

**Status:** provisional

**Last refined:** 2026-09-07

### A touchcancel flicks like a touchend

**Invariant:** If the browser ends a touch with a touchcancel — Chrome on Android does when a touch-action token lets it claim the gesture — then the fork treats it as the touchend: the trail is read, the inertia fires, a pending touch counts as a tap.

**Scope:** `virtual-scroll.ts` touch listeners; `lenis.ts` `isTouchEnd`.

**Mechanism:** A cancel with no flick left the content frozen by the touchstart's reset. The vertical scroller's frame now carries `touch-action: none`, so the browser has nothing to claim there; the strip keeps `pan-y` and the cancel path stays live.

**Generates:** The `touchcancel` listener beside `touchend`.

**Rejected alternatives:** Ignoring the cancel — a glide the touchstart had frozen stayed frozen.

**Evidence:** `virtual-scroll.ts` listeners; the scroller record "The frame is never natively panned along its own axis".

**Impossible if true:** A gesture the browser claimed leaving the content frozen.

**Verification:** `npx vitest run examples/playground/src/lenis`

**Status:** provisional

**Last refined:** 2026-09-07

## Impossibility boundary — what these invariants forbid

- A re-flick that stalls — [A touch on a glide keeps it running until the first move](#a-touch-on-a-glide-keeps-it-running-until-the-first-move).
- A coalesced swipe reading a velocity of zero — [A flick's velocity is read off the finger's last stretch](#a-flicks-velocity-is-read-off-the-fingers-last-stretch).
- A flick logic proven on iOS alone — [Android holds the first move back and may coalesce a swipe into one](#android-holds-the-first-move-back-and-may-coalesce-a-swipe-into-one).
- A claimed gesture leaving the content frozen — [A touchcancel flicks like a touchend](#a-touchcancel-flicks-like-a-touchend).
