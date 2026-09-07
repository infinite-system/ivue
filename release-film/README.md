# ivue — Infinite by design

A 48-second release film and a 16-second **Objects are back** cut. The infinity
block is a lit, beveled 3D mesh. The main film uses staggered jumps between
bricks, rounded triangles, and discs to connect objects to shared behavior
and state created on first access.

The short cut follows one block through three clockwise flips: the ivue square
becomes an amber rounded triangle, then a violet sphere, then the standard
indigo-green ivue block. Its infinity mark follows the sphere's curved surface.
The final block holds still beneath the brand lockup.

## Watch

The rendered files live in `output/`:

- `ivue-intro-1080p.mp4` — 48-second release film, 1920 × 1080, 30 fps.
- `ivue-objects-1080p.mp4` — 16-second clockwise-flipping objects cut, same format.
- `intro-soundtrack.wav` and `objects-soundtrack.wav` — original stereo scores.
- `intro-*.png` and `objects-*.png` — chapter stills.
- `intro-render.json` and `objects-render.json` — export settings and browser errors.

For the interactive preview, from the repository root:

```sh
node release-film/serve.mjs
```

Open <http://127.0.0.1:5198>. Play starts sound and motion; the timeline scrubs,
and the version link switches cuts. No animation or sound autoplays. On a
slower machine, watch the MP4 for full-speed playback. The live preview uses
WebGL and may render below 30 fps on a software graphics driver.

## Render

Prerequisites: Node.js, the repository's Playwright installation with Chromium,
and FFmpeg with libx264 and AAC. No install or change to the library dependencies
is needed. The film's pinned Three.js runtime and fonts are vendored locally;
the preview and export do not request external resources.

```sh
node release-film/render.mjs
node release-film/render.mjs --objects
node release-film/render.mjs --stills --width=1280
node release-film/render.mjs --objects --stills --width=1280
node release-film/render.mjs --audio-only
node --test release-film/timeline.test.mjs
node release-film/verify.mjs
```

Default output is H.264, YUV 4:2:0, 1080p at 30 fps, with AAC stereo audio
normalized toward −16 LUFS and a −1.5 dB true-peak target. MP4 uses fast-start
metadata. `--width=3840 --fps=60` requests a 4K/60 export; that size is optional
and takes longer. Width must be divisible by 16. Supported frame rates are
24, 30, and 60.

Every frame is sampled at its absolute timestamp, independent of browser speed.
The export streams frames to FFmpeg rather than storing thousands of images.
The renderer closes its browser and local server on completion or error.
Rendering a cut replaces that cut's generated files in `output/`.

## Editorial structure

| Time | Picture and idea |
| --- | --- |
| 0–6 s | Macro reveal: “What if scale began with less?” |
| 6–12 s | The infinity block: “Plain classes. Full reactivity.” |
| 12–18 s | Expanding outline layers: “Behavior. Shared once.” |
| 18–25 s | Brick → triangle → circle: “One foundation. Different forms.” |
| 25–32 s | Dormant instances light up: “State. On first touch.” |
| 32–39 s | Layers contract to the core: “Less machinery. More possibility.” / “1.1 kB” |
| 39–48 s | Original brand lockup, “Infinite by design,” install command, ivue.dev |

The visuals explain the architecture metaphorically; the objects are animation
meshes, not a benchmark or a recording of reactive allocations. No comparative
performance numbers appear in the film.

## Sources and rights

- Brand: exact copies of `docs_v2/public/logo.svg` and
  `docs_v2/public/brand-lockup-dark.png`. The four cubic infinity segments in
  `film.mjs` match the SVG source. The tile becomes a three-dimensional object;
  the final lockup remains the original image.
- Typeface: the homepage's Geist, copied from the existing brand-banner font.
  Its SIL Open Font License is in `assets/Geist-LICENSE.txt`.
- Architecture and wording: `docs_v2/index.md`, `docs_v2/guide/introduction.md`,
  and `docs_v2/guide/principles.md`. “1.1 kB” is the documented rounded core
  gzip size, not the size of this video renderer. Vue is the host peer dependency.
- 3D rendering: [Three.js](https://threejs.org/docs/), pinned to 0.170.0,
  MIT-licensed; the license accompanies the vendored runtime.
- Music and sound design: original deterministic oscillator synthesis in
  `score.mjs`. No sampled music, commercial recordings, generated voice, or
  third-party sound library is used.

The film lives outside the documentation and package builds. Nothing is
published, no homepage behavior changes, and no video dependency enters ivue.

## Editing

`timeline.mjs` owns durations, chapter boundaries, bounce timing, and shape
sequence. `film.mjs` owns the camera, meshes, lighting, typography, and player.
`score.mjs` owns the score. `render.mjs` owns export. The two 1080p MP4 masters
are committed explicitly. Other generated media in `output/` is ignored by Git.

Changing copy or timing requires re-rendering both the relevant video and its
stills. Use `verify.mjs` after a final render to inspect the encoded media, not
just the source configuration.
