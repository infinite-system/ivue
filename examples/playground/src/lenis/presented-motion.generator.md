# Presented motion — the generator, what fell out, what was refused

The record of how the scroller's motion reached native parity on two
phones: the one invariant everything derives from, the forms it
generates, the forms that were tried and did not survive, and the
platform facts found along the way. The contract that binds the code to
specs is `lenis.invariants.md` (with the scroller's own
`../examples/virtual-scroller/virtual-scroller.invariants.md` for the
heights and the window); this file is the reasoning behind the
presentation records in it, kept so the refused forms are not
rediscovered and the accepted ones are not re-argued.

Every claim below was executed: the specs named are in the tree, the
numbers were measured, the frame logs were copied off the devices with
the feel strip's own button, and the judgments that only a hand can make
were made on a Galaxy S22 Ultra and an iPhone 16 Pro Max, the iPhone at
its default 60 Hz and at 120 Hz with the Safari flag off, the glide and
the creep on the chat and on the 1M-row example.

## The generator

> A presented frame is exact when the state it shows was computed for the
> moment it is shown. The error in a frame is speed × the offset between
> the moment its state was computed for and the moment it is presented.

Everything else is a consequence. Written out:

- At rest the speed is zero, so no timing fault can show. This is why
  every fault below was invisible until something moved, and why the
  shimmer — a spatial fault of phase, not a temporal one — was a
  different invariant entirely.
- A constant offset is a constant shift and invisible. This is why a
  glide driven from a callback at even 16.7 ms gaps was perfect on the
  Galaxy, and why the compositor's fixed sub-frame phase never matters.
- Judder is speed × the *variation* of the offset. Safari's callback
  arriving 5 ms late every twelfth frame is 5 ms of variation; at 3.6 px
  per ms that is an 18 px error on one frame in twelve, read as a doubled
  edge on the moving text.
- A state produced in a callback is a side effect of that callback's
  clock. Wherever the callback's clock and the panel's diverge, the offset
  varies, and nothing computed inside the callback can present a frame
  the browser shows at the wrong time.
- A sequence authored for presentation moments has no offset by
  construction: the presenter samples it on its own clock, the same clock
  that presents it. That is the arrangement native uses for a fling, and
  it is the only one the generator admits.

## What it generates

Each of these is a record in `lenis.invariants.md`; the link is the
record, this is the why.

### The screen gets the grid, the model keeps the fraction

[The layer is written where the model says](lenis.invariants.md#the-layer-is-written-where-the-model-says).
A drawn layer is rasterised once, its glyphs snapped to the device grid
relative to the layer; the compositor places that raster at the
transform. On a whole device pixel every glyph lands on a pixel again;
on a fraction the compositor resamples and every glyph smears by the
fraction's phase. At speed the smear is motion. As a glide slows, the
phase creeps frame to frame and text alternates between crisp and soft —
the shimmer at the slow tail. So the write lands on the grid. The model
never rounds, because a drag re-targets from the finger each frame and a
rounded target walked the content under the thumb in whole steps.

Scope boundary, found by the creep: at a constant speed *below* one
device pixel per frame (the reading creep, ~0.11 CSS px per frame) the
fraction is the motion, because the compositor's filtering of it reads as
a glide and a snapped write reads as a tick every several frames. A
1x desktop shows this; a 3x phone cannot. The creep is fractional; a
glide is snapped; the boundary is a number.

### One raster, moved whole

[The frame write leaves the layer promoted](lenis.invariants.md#the-frame-write-leaves-the-layer-promoted).
The Safari workaround that cycled `will-change` before every write forced
the text layer to re-rasterise each frame, snapping glyphs from that
frame's own phase — a shimmer source of its own and a full raster per
frame. It had been kept against two observations that did not reproduce
with the write on the grid. Off since 2026-09-17.

### The callback's moment is honest

[A frame advances by the reported gap](lenis.invariants.md#a-frame-advances-by-the-reported-gap).
Safari at 120 Hz reports gaps of 13 then 3 ms, and those are true: the
callback fired late and the next on time. Content moved by the true gap
is where its frame wanted it; content stepped by an assumed even
interval is 4–8 ms off its own frame. The refusal below carries the log.

### The panel's rate is the platform's vote

[A glide renders at the rate the platform grants a page](lenis.invariants.md#a-glide-renders-at-the-rate-the-platform-grants-a-page).
Safari caps page animation at 60 Hz on a ProMotion panel by default;
Chrome on Android asks for 120 Hz under a finger and for its own fling
and gives a page's loop 60 the moment the finger lifts. Half the frames
at the same speed is twice the sample-and-hold blur, only in motion.
Scoped now to the JavaScript-timed path: the compositor sequences
below appear to earn the panel's rate on both phones, inferred from the
eye because the log cannot see compositor frames.

### The presenter plays the sequence

[A glide plays on the compositor as held snapped keyframes](lenis.invariants.md#a-glide-plays-on-the-compositor-as-held-snapped-keyframes).
At a flick's release the integrator's remaining curve — its own friction
or exponential arithmetic — is sampled once per 120 Hz step, snapped,
one keyframe per distinct value, each held to the next, and handed to the
layer as one Web Animation. Held, not interpolated, because a linear
interpolation between snapped keyframes lands on fractions at the
compositor's phase. The model keeps running for the window and the
events; no inline write reaches the DOM while the compositor owns the
layer; any new motion takes the layer back at the value the compositor
is showing; an anchor shift rebuilds the remaining curve from the
shifted model; the render-bias rebase waits. Measured: build 0.04–0.13
ms, parse 0.2–0.4 ms per flick, an exponential glide's 509 keyframes
merged to 309; per frame cheaper than before.

[The creep plays on the compositor as one linear run](lenis.invariants.md#the-creep-plays-on-the-compositor-as-one-linear-run).
A creep runs to the end of the content as one animation: linear between
two fractional endpoints, by the scope boundary above, and one because
the layer carries text. Where one animation ends and the next begins,
Chrome re-rasterises the text layer with its translation snapped to the
pixel grid, and every boundary is a 1 px shift of the whole layer — seen
on the Galaxy at every 2-second chunk, at every 5 seconds when the chunk
was made 5 seconds, and never on the iPhone. A speed change releases the
layer at the shown value and the next frame hands over a fresh run. A
stage composing tracks over the run cuts it into pieces itself, aligned
to the run's start on the document timeline: its layers carry no text.

## The ladder — how it was found

The order is the lesson: each rung was invisible until the one before it
was removed.

1. **The heights.** Rows recorded a few hundredths of a pixel taller
   than drawn (`wrapperScale` over a rounded `offsetHeight`). Every
   window change moved the content below by the summed error, and the
   re-raster hopped a line. One question — "don't you already know the
   heights?" — and 537 lines of machinery built to hide it came out.
   Recorded in the scroller's contract.
2. **The grid.** With the heights exact, the slow tail still shimmered.
   The contract had rejected a device-pixel snap on a trial that judged
   it at flick speed, where blur hides the phase, with the per-frame
   re-raster in play on the iPhone. Reopened with one question — "maybe
   it was tried imperfectly?" — the snap won on both phones.
3. **The raster.** The Safari reset came out; the iPhone moves one
   raster.
4. **The frame rate.** Both phones drew the glide at 60 Hz while native
   ran at 120. A meter on the feel strip and a copy-log button made it
   visible; the log cannot see what the page did not draw.
5. **The moment.** At 120 Hz the iPhone still showed emphasis on moving
   text. The log showed the callback 5 ms late every 100 ms. Stepping by
   an assumed interval made it worse and proved the timestamps honest.
6. **The presenter.** The only arrangement with no offset is the
   compositor playing a sequence authored for its own frames. The glide
   went first, the creep followed, and the reader's word on both phones
   was "perfection".

## What was refused, with its trial

- **A fractional write at every speed** — the state of the contract until
  2026-09-16, resting on a rejected snap whose default flavour (`auto`)
  snapped only while fast. Judged in the regime where it cannot show.
- **A snap of the target** — discards the gesture's sub-pixel; the content
  walks under the thumb.
- **Holding the refresh vote from the page** with a 1 px compositor
  animation (`22083d3f`, out in `9426026a`) — every glide frame stayed
  at 16.7 ms on the Galaxy.
- **Stepping the JavaScript glide by whole panel intervals**
  (`c7174f48`, out in `f6a1bcf9`) — the moves came out perfectly even
  and the reader saw more nudging, which is only consistent with honest
  timestamps: even steps at uneven moments. The log that "convicted" the
  clock was describing correct behaviour. The lesson in LESSONS: the log
  shows what the page computed, never what the panel presented.
- **Interpolated compositor keyframes** — the compositor would present
  fractions at its phase and the shimmer would return.
- **The creep in chained 2-second chunks** (`f3759c0c` to `2431c358`) —
  seamless in its values and on the iPhone; on the Galaxy a 1 px shift of
  the whole text layer at every boundary, the interval following the
  chunk length when it was changed to 5 seconds. Chrome re-rasters a text
  layer where one animation ends and the next begins.
- **A window-hysteresis knob** holding 200 rows so a glide mounted nothing
  — never committed; cleared mounting as the cause in one tap on each
  phone. Recorded in the grid record's evidence as an uncommitted trial.

## Impossible if the generator holds

- A glide that is exact in its numbers and judders on screen for a reason
  inside the integrator, once its frames are presented by the compositor.
- A visible seam at a chunk boundary of the creep.
- A handoff — grab, wheel, anchor shift — that shows a value the
  compositor was not showing.
- A timing fault that is visible at rest.
- A shimmer at the slow tail of a glide with the write on the grid and
  the layer promoted once.

## What it makes possible next

The scroller's position is a fraction the model owns, presented on the
grid by a sequence the compositor plays. That is a playhead. Every
consequence below is the generator applied one level up, and none of it
needs a new trial of the timing question:

- **A scene keyed to the scroll is a sibling track**, not a side effect.
  A scene's keyframes are computed from the same value list the glide
  was, on the same timeline, started at the same moment, so the scene and
  the text cannot drift: nothing sits between them to drift.
- **An address is a moment.** Row plus fraction maps every scroll value
  to a step of the sequence, exact where the row is measured, without the
  global total ever needing to exist.
- **Open-ended motion is one run for a text layer, pieces for the rest.**
  Anything that runs without an end — a creep, a channel of scenes, a
  played book — is handed to the presenter as far as it can see; a layer
  that carries text takes it whole, because the presenter re-rasters text
  where animations meet, and layers without text take it in pieces
  aligned to the run's own start.
- **A bounce, a snap point, a choreography** are motion laws over the
  same number, each a sequence the presenter plays, each continuous at
  its handoff — the same continuity rule that made the glide's release
  invisible.

## Judged

2026-09-19, on the built site — a static server over the docs' output,
because dev mode's logging and module loads sit on the main thread and a
main-thread stall is the one thing that can still look like a scroll
fault — on the Galaxy S22 Ultra at 60 Hz and the iPhone 16 Pro Max at
120 Hz, on two pages that share nothing but the mechanism: the AI chat
(ten thousand fetched rows, selection, autoplay) and the scroll flight
(35 composed tracks, interludes, 3D crossings, a worker-painted flock).
The reader's word on both was native parity. That is the cross-domain
survival the method asks for: the six records above are established,
not tuned to one page. Judgement from here on is made on the built site.

## Open

- Whether Chrome votes the panel's full rate for the compositor sequence
  is inferred from the eye on the Galaxy; the log cannot measure it.
- An anchor shift under a running glide rebuilds the animation (one more
  parse, ~0.3 ms). A second layer absorbing shifts as one inline write
  would let the animation never restart; not earned at that cost.
