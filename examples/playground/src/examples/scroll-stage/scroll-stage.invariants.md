# Scroll stage invariants

The living contract for the stage that composes scenes on the scroll: `ScrollStage.ts` (the mechanism — slots, pieces, interludes, the media, the announcements it hears), `ScrollFlight.ts` (the worlds, the planes, the flock, the tap) and `BirdFlock*.ts` (a time-linked layer on its own clock). It stands on the integrator's contract, `../../lenis/lenis.invariants.md`, whose presented-motion records are the floor: a layer that moves with the scroll is a track over the scroll's own sequence, played by the compositor. These records were held in the specs' generator headers until 2026-09-19 and are written here, before the theater refactor extracts the mechanism, so the checker can hold and migrate them.

Two kinds of records, and the split is load-bearing:

- **Reality-based invariants** are forced by how the compositor rasters and composites layers. Discovered, not chosen.
- **Chosen invariants** are the stage's own disciplines. Each could be otherwise and still be coherent; every world and rail depends on it not drifting.

Chosen invariants stand on reality invariants, never the reverse.

## Generator

The stage's mechanism is one clock: every scroll-linked layer is a formatter over the one number, composed alongside the scroll's sequence ([A scene is what the presenter shows computed for its frame](#a-scene-is-what-the-presenter-shows-computed-for-its-frame)) in pieces aligned to a run's start ([A run is cut into pieces aligned to its start and to chapter boundaries](#a-run-is-cut-into-pieces-aligned-to-its-start-and-to-chapter-boundaries)), interpolated ([A scenery track interpolates through its samples and only the text layer holds](#a-scenery-track-interpolates-through-its-samples-and-only-the-text-layer-holds)), constants written once ([A track constant over a piece is written once](#a-track-constant-over-a-piece-is-written-once)) over geometry derived once per batch ([Geometry is derived once per batch](#geometry-is-derived-once-per-batch)); every time-linked layer owns a clock and is gated by presence ([A time-linked layer owns a clock gated by presence](#a-time-linked-layer-owns-a-clock-gated-by-presence), [A video plays only while present](#a-video-plays-only-while-present)); the stage prepares what it draws from the position it is told, every frame, and nothing else ([The stage hears every frame the layer moves](#the-stage-hears-every-frame-the-layer-moves), [An interlude is present while its span owns the frame](#an-interlude-is-present-while-its-span-owns-the-frame)); the layers it moves are rasters drawn once ([A raster is drawn once and moved](#a-raster-is-drawn-once-and-moved)) and a model in 3D is never faded ([A 3D model never takes opacity](#a-3d-model-never-takes-opacity)); a tap, not a drag, reaches the birds ([A startle is a tap](#a-startle-is-a-tap)).

STUDY ALSO: [Presented motion — the generator](../../lenis/presented-motion.generator.md) — the reasoning behind the floor these records stand on, its "Two clocks" consequence in particular.

### A scene is what the presenter shows computed for its frame

**Invariant:** If a layer of the stage moves with the scroll, then its position at every presented frame is a function of the scroll value the compositor is showing at that frame and of nothing else — composed as keyframes over the scroll's own sequence, or written in the same callback that wrote the scroll — so no scene layer can drift against the text by a frame.

**Scope:** `ScrollStage.ts` `trackList`, `buildTracks`, `composeTracks`, `onSequence`, `writeTracks`; every `Track.formatOf`.

**Components:** [The stage hears every frame the layer moves](#the-stage-hears-every-frame-the-layer-moves) · [A run is cut into pieces aligned to its start and to chapter boundaries](#a-run-is-cut-into-pieces-aligned-to-its-start-and-to-chapter-boundaries) · [A scenery track interpolates through its samples and only the text layer holds](#a-scenery-track-interpolates-through-its-samples-and-only-the-text-layer-holds) · [A track constant over a piece is written once](#a-track-constant-over-a-piece-is-written-once) · [Geometry is derived once per batch](#geometry-is-derived-once-per-batch) · [An interlude is present while its span owns the frame](#an-interlude-is-present-while-its-span-owns-the-frame) · [A video plays only while present](#a-video-plays-only-while-present) · [A time-linked layer owns a clock gated by presence](#a-time-linked-layer-owns-a-clock-gated-by-presence) · [A startle is a tap](#a-startle-is-a-tap) · standing on [A 3D model never takes opacity](#a-3d-model-never-takes-opacity) and [A raster is drawn once and moved](#a-raster-is-drawn-once-and-moved).

**Mechanism:** The generator's: a frame is exact when its state was computed for the moment it is shown. A track composed alongside the scroll's animation is sampled by the compositor on the same vsync as the text; a track written in the scroll's callback carries the same offset as the text. Anything between them would be a second clock.

**Evidence:** `ScrollStage.test.ts` "composes every changing track"; judged native with the text on both phones, built site, 2026-09-19.

**Impossible if true:** A scene layer read from a scroll listener while the compositor owns the layer. A track composed over any values but the scroll's own.

**Verification:** `npx vitest run src/examples/scroll-stage`.

**Status:** established

**Last refined:** 2026-09-19

## Reality-based invariants

### A 3D model never takes opacity

**Invariant:** If an element establishes a 3D context (`transform-style: preserve-3d`) and its planes stand out of its own plane, then no opacity below one is ever set on it or on an ancestor while it is shown, because opacity below one flattens the 3D context and every plane standing out of it becomes edge-on.

**Renegotiable at:** the CSS transforms specification's grouping properties — opacity, filter, clip, mask, overflow — each of which flattens; not the stage's to change.

**Scope:** `ScrollFlight.ts` `planeAlong`, `JET_PATH`, `SEAPLANE_PATH`, `PLANE_PARKED`, `buildTracks` (no opacity track on a plane); the planes' CSS.

**Mechanism:** A grouping property forces the element's rendering into a 2D group; a wing rotated 90° out of the fuselage's plane is then projected flat and vanishes. The planes lost their wings over the last 22% of every crossing, the fade, on both phones and headless. A crossing enters and leaves by its path instead: from off-frame nearer than the screen to a dot in the distance, or from a dot at the horizon to past the frame's edge.

**Evidence:** `ScrollFlight.test.ts` "never faded"; screenshots 2026-09-18 before and after; the reader's word that the wings stayed.

**Impossible if true:** A plane with an opacity track. A 3D model faded by an ancestor.

**Verification:** `npx vitest run src/examples/scroll-flight`; screenshot a plane at the end of its crossing.

**Status:** established

**Last refined:** 2026-09-19

### A raster is drawn once and moved

**Invariant:** If a composited layer is large — a picture, a scene slot, a row's box over the scene — then nothing asks it to re-raster per frame: no scale from one keyframe to the next, no backdrop filter under a moving layer, no mask that changes shape; it is drawn once at its largest and translated or faded.

**Renegotiable at:** the compositor's raster policy — a transform moves a texture, a scale or a filter or a changed mask re-rasters it; not the stage's to change.

**Scope:** `ScrollStage.ts` `mediaTransform` (translate only, fractional); the media box and row CSS (no backdrop filter, no scale); the ridge tiles' fixed overhang.

**Mechanism:** Measured on the Galaxy: a scale on the picture per held keyframe was a re-raster per frame and read as a choppy fade; a backdrop blur under every row re-sampled the scene each frame. A translation moves the raster; a fade blends it.

**Evidence:** LESSONS 2026-09-18 (the media ride, the GPU pass); `ScrollStage.test.ts` "translates only".

**Impossible if true:** A media track that changes scale between keyframes. A backdrop filter on a row over a moving scene.

**Verification:** `npx vitest run src/examples/scroll-stage`; the phone's frame meter through a picture's fade.

**Status:** established

**Last refined:** 2026-09-19

## Chosen invariants

### The stage hears every frame the layer moves

**Invariant:** If the layer moves — by the integrator's own frame, by an adopted write (a thumb, a seek), or by the creep mirroring the compositor's run — then the stage's scroll handler runs for that frame with the model's position, and everything the stage prepares (scenes, interludes, the video's play state) is a function of that announced position and nothing else — never of a sequence's start alone.

**Scope:** `ScrollStage.ts` `onScrollerChange`, `onScroll`, `prepareScenes`, `prepareInterludes`, `syncMedia`; `Lenis.ts` `adoptExternalScroll`, `announceScroll`; `VirtualScrollerAutoplay.ts` `creepStep`.

**Mechanism:** Two sources of truth about where the reader is were both bugs found on the phones: the model drifting from the compositor's run (fixed by mirroring), and scenes prepared once at a run's start so a picture reached by autoplay stayed unseen (fixed by announcing each creep frame). One announced position per frame, prepared from, leaves the class of bug nowhere to live.

**Evidence:** `VirtualScrollerAutoplay.test.ts` "mirrors the value the compositor shows … announces"; `Lenis.test.ts` "an adopted write is heard"; headless autoplay with no touch, 2026-09-19: the first picture's source set and its opacity rising.

**Impossible if true:** A creep frame on the compositor that no scroll listener hears of. A scene or interlude prepared for a sequence's end rather than the position announced. A layer moved by the consumer's own write that a listener never hears of.

**Verification:** `npx vitest run src/examples/virtual-scroller/VirtualScrollerAutoplay src/lenis`; on a device, autoplay from the top past the first picture without touching.

**Status:** established

**Last refined:** 2026-09-19

### A run is cut into pieces aligned to its start and to chapter boundaries

**Invariant:** If the scroll plays a linear run on the compositor, then the stage's tracks are composed in pieces of `TRACK_CHUNK_MS`, each aligned on the document timeline to the run's start plus its offset (waiting on the run's `ready` promise when the start is not yet known), two in flight, the next composed as one finishes, cut short at the next chapter boundary so no piece spans a step in a slot's role, and every piece's values lie on the run's line.

**Scope:** `ScrollStage.ts` `onSequence`, `composePiece`, `onRunStarted`, `onPieceFinish`, `composeTracks`, `TRACK_CHUNK_MS`, `TRACK_SAMPLE_MS`; `Lenis.ts` `composeSequence` (`alongside`, `offsetMs`, `durationMs`).

**Mechanism:** The text layer plays one run because an animation ending under text re-rasters it; a scenery layer carries no text, and a held or sampled track over a ten-minute run would be thousands of keyframes, so the stage cuts the run itself — never chaining on the text layer. A piece composed before the browser assigned the run its start time lost its offset and covered the first piece: it waits on `ready`.

**Evidence:** `ScrollStage.test.ts` "a linear run is cut into pieces"; headless sampling of piece start times 2026-09-18.

**Impossible if true:** A piece of a run whose start is not the run's start plus its offset. A piece that spans a chapter boundary. A piece moving at a rate other than the run's.

**Verification:** `npx vitest run src/examples/scroll-stage`.

**Status:** established

**Last refined:** 2026-09-19

### A scenery track interpolates through its samples and only the text layer holds

**Invariant:** If a track belongs to the stage — a ridge, a cloud, a plane, a picture, a bar — then it is composed linear through samples taken every `TRACK_SAMPLE_MS` of a run (every `GLIDE_SUBSAMPLE`-th of a glide's own), never held at the compositor's step; held snapped keyframes are for a layer written on the device grid, which no scenery layer is.

**Scope:** `ScrollStage.ts` `composeTracks` (`linear: true`), `TRACK_SAMPLE_MS`, `GLIDE_SUBSAMPLE`; `Lenis.ts` `composeSequence` linear form.

**Mechanism:** A track held at 120 Hz steps and presented at 60 Hz shows one, two or three steps a frame — a judder by the layer's speed, invisible on a ridge at 2 px/s and plain on a picture riding at the text's speed, never on a 120 Hz iPhone. That was the choppy fade, found after every property of the layer had been cleared.

**Evidence:** `ScrollStage.test.ts` (easing linear on every frame); the reader's word on the Galaxy 2026-09-18: no stutter.

**Impossible if true:** A stage track with a held (step-end) keyframe. A track sampled at the compositor's step over a run.

**Verification:** `npx vitest run src/examples/scroll-stage`; the fade of a picture on a 60 Hz Android.

**Status:** established

**Last refined:** 2026-09-19

### A track constant over a piece is written once

**Invariant:** If every sample of a track over a piece formats to the same value, then the track is written inline once for that piece and no animation is composed for it; the test is exact equality of every formatted sample with the first.

**Scope:** `ScrollStage.ts` `composeTracks`, `writeTrack`.

**Mechanism:** Most tracks are constant most of the time — the waiting slot's whole scene, a parked plane, the media between interludes. Composing them was 37 tracks × 240 keyframes a piece and a 200 ms main-thread stall; written once they cost nothing, and the inline value is exactly what the compositor would have held.

**Evidence:** `ScrollStage.test.ts` "writes the constant ones once"; long-task counts under a 6× throttled CPU, 2026-09-18.

**Impossible if true:** An animation composed for a track whose value does not change over the piece.

**Verification:** `npx vitest run src/examples/scroll-stage`.

**Status:** established

**Last refined:** 2026-09-19

### Geometry is derived once per batch

**Invariant:** If a batch of formatting runs — a piece, a glide, an inline write — then each scroll value's chapter, text-local progress, and each interlude's span are derived from the scroller's lookups at most once in that batch and memoised until the next begins; a formatter never re-derives what another formatter of the same batch already has.

**Scope:** `ScrollStage.ts` `memo`, `beginBatch`, `localOf`, `textLocalOf`, `textEnd`, `interludeSpan`.

**Mechanism:** Thirty-seven formatters over the same values re-deriving the same chapter through the scroller was the other half of the 200 ms stall. The batch is the unit because geometry may move between batches (a row measuring), never inside one.

**Evidence:** the throttled-CPU measurement 2026-09-18: 8,880 lookups a piece became 240.

**Impossible if true:** A formatter calling the scroller's lookup for a value another formatter of the batch already derived.

**Verification:** `npx vitest run src/examples/scroll-stage`; a profile of a piece under throttling.

**Status:** established

**Last refined:** 2026-09-19

### An interlude is present while its span owns the frame

**Invariant:** If a row carries media, then its presence is 0 until the row's span has entered most of the frame, rises to 1 as the span fills it, holds while the span alone is in the frame, and falls from the moment the next row enters — 0 once that row has taken most of the frame; the interlude the frame is at or before lives in the media slot of its parity, the next in the other, loaded once; the media rides with its span (translate only, fractional) and settles at the centre; its bar runs over the hold alone.

**Scope:** `ScrollStage.ts` `interludeSpan`, `interludePresence`, `interludeAt`, `mediaOpacity`, `mediaTransform`, `mediaProgressTransform`, `prepareInterludes`, `drawInterlude`, `INTERLUDE_FADE_FRACTION`, `MEDIA_SLOTS`.

**Mechanism:** Presence measured against the span's own height held the picture full while the next chapter's heading arrived; measured against the frame and keyed to the next row's entry it is gone before the paragraph is readable. The ride keeps the rows off the picture while it is faint. (In the theater this becomes presence against the APERTURE — the same curve with the aperture's edges in place of the frame's.)

**Evidence:** `ScrollStage.test.ts` "an interlude is pulled in"; screenshots 2026-09-18.

**Impossible if true:** An interlude's media shown while its span is outside the frame. A picture still full while the next row is readable.

**Verification:** `npx vitest run src/examples/scroll-stage`.

**Status:** established

**Last refined:** 2026-09-19

### A video plays only while present

**Invariant:** If an interlude is a video, then it is loaded when its slot is prepared and PLAYS only while its presence is above zero, paused otherwise, told on a change and never every frame.

**Scope:** `ScrollStage.ts` `syncMedia`, `drawInterlude`.

**Mechanism:** A looping video decodes every frame whether or not it is shown, and a held slot is loaded a chapter early and kept a chapter late — on a phone that was continuous 1080p decode for a third of the scroll at opacity zero.

**Evidence:** `ScrollStage.test.ts` "a video interlude plays only while present".

**Impossible if true:** A video decoding while its interlude is not present.

**Verification:** `npx vitest run src/examples/scroll-stage`.

**Status:** established

**Last refined:** 2026-09-19

### A time-linked layer owns a clock gated by presence

**Invariant:** If a layer's motion is linked to time and not to the scroll — a wingbeat, a startle, rain, a propeller — then it runs on its own clock (a canvas loop, a CSS animation), is gated by its layer's presence, is moved by a track like any layer, and its canvas is painted in a worker when the browser can hand it over; it is never asked to be at a point of its timeline because the reader is at a point of the scroll.

**Scope:** `BirdFlock.ts`, `BirdFlockPainter.ts`, `bird-flock.worker.ts`; the rain, waves and propeller CSS.

**Mechanism:** The generator's clock split: a scroll-linked motion drawn from a callback is a frame late; a time-linked motion composed as a track would run backwards under the reader's hand. The worker isolates the two threads' stalls from each other.

**Evidence:** `BirdFlock.test.ts`, `BirdFlockPainter.test.ts`; headless: the worker spawns, the canvas is transferred, the birds draw and scatter.

**Impossible if true:** A wingbeat that changes with the scroll position. A flock drawn on the main thread in a browser that can hand its canvas to a worker. A worker asked to measure a layout.

**Verification:** `npx vitest run src/examples/scroll-flight`.

**Status:** established

**Last refined:** 2026-09-19

### A startle is a tap

**Invariant:** If a pointer lands on the frame and lifts within `TAP_SLOP_PX` and `TAP_MS` of landing, then the flock is startled from where it landed; a pointer that moved farther, took longer, or was cancelled startles nothing — a drag is the reader scrolling.

**Scope:** `ScrollFlight.ts` `onFramePointerDown`, `onFramePointerUp`, `onFramePointerCancel`, `TAP_SLOP_PX`, `TAP_MS`.

**Mechanism:** The startle raises the wingbeat 1.6× and settles over a second; fired on any landing, a drag to resume reading startled the flock, read as "wings too fast, then settle".

**Evidence:** `ScrollFlight.test.ts` "a tap startles"; the reader's report 2026-09-19.

**Impossible if true:** A drag on the frame that startles the flock.

**Verification:** `npx vitest run src/examples/scroll-flight`.

**Status:** established

**Last refined:** 2026-09-19

## Impossibility boundary — what these invariants forbid

A scene layer read from a scroll listener while the compositor owns the layer · a scene prepared for a sequence's end rather than the announced position · a creep frame no listener hears of · a piece not aligned to its run's start · a held scenery keyframe · an animation for a constant track · a re-derived geometry inside a batch · a picture full while the next row is readable · a video decoding unseen · a 3D model faded · a large raster scaled or blurred per frame · a drag that startles.
