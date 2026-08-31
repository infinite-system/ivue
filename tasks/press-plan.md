# Press & distribution plan — gap analysis and workstreams

**Status: planning. This document is the working surface — edit it as
decisions land. Nothing here is built until its workstream says so.**

The asymmetry being fixed: the blog and site are production-grade
machines (48 posts, drip newsletter, deterministic everything); press
is a one-day firework (a launch kit with no week-2). Distribution
should get the same treatment as content: pre-written, versioned,
validated at build, fired on a calendar.

## What exists (the inventory)

Private channel posts in `docs_v2/blog/` (dev-only, validated by
channel/prefix):

| artifact | state |
| --- | --- |
| `hn-show-hn-launch` | strong — title + first comment with deliberate self-criticism |
| `reddit-r-vuejs-launch`, `reddit-r-javascript-launch` | written |
| `linkedin-launch` | written — discovery-arc voice |
| `x-launch-thread` | written — 9 segments, char counts in dev |
| `note-launch-plan` | strong — posting order, tone-per-room, secondary channels, podcast framing |
| `note-tc39-signals-discussion` | written — data-first draft for tc39/proposal-signals |

Machinery: X composer in the dashboard (thread builder: greedy packer,
code/demo shots attached by marker, banner on first segment, per-tweet
editing, schedule + ledger). Newsletter drip is live and independent.

## The gaps

1. **One-shot, not a pipeline.** 48 posts, channel copy for ~4. Rooms
   tolerate ~1 submission / 2–3 weeks per author — the missing asset
   is a calendar mapping posts to rooms across weeks, with copy
   pre-written.
2. **Weak first tweet, single angle.** The composer's segment 1 is
   title + the article's opening paragraph — written for a reader
   already on the page, not for a feed. And one hook per article
   wastes articles that have 2–3 genuinely different angles.
3. **Releases ship silent.** 2.5.0 went out with zero social copy.
   Release channel copy should be a step in the release skill, not an
   afterthought.
4. **Planned-but-unwritten artifacts.** dev.to cross-post, lobsters
   submission, Vue newsletter pitches — named in the launch plan, no
   drafts exist.
5. **No localization.** RU and ZH are unusually good markets for Vue
   content and both are unserved.

## Workstreams

### W1 — xHooks: 2–3 pre-written angles per article

The design (agreed in discussion):

- Frontmatter `xHooks:` — a YAML list of 2–3 hooks, each a DISTINCT
  angle (rule: if two hooks would attract the same reader, one is
  filler). Hooks obey the title doctrine — the reader's win, concrete,
  numbers where true.
- Hooks ride `blog-index.json` at build. Build validation: each hook
  within the weighted X limit (~270 to leave numbering room), none
  opening with a backtick (YAML trap).
- Composer: hook picker above the thread builder; segment 1 = chosen
  hook + banner; body packs behind; title + link close the thread.
  Fallback chain `xHooks[0]` → `description`. The tweets ledger greys
  hooks already used for the slug (re-promotion weeks later with a
  FRESH angle is the point).
- Doctrine lands in the write-article skill: after the title, write
  the hooks — at write time, when the sharpest claims are hot.
- Backfill: only the calendar posts (W4) + all new posts. Not all 48.

### W2 — the release tank (copy + video are part of "released")

A release is not released until its distribution exists. The release
skill's pipeline extends: gates → notes **+ channel copy + video** →
tag → publish → verify-publish → fire the calendar slot. Authored
BEFORE the tag, same commit as the notes — the tagged tree carries its
own ammunition; nothing downstream waits on inspiration.

Per release, written alongside the notes:

- an X thread (3–5 segments: what shipped, the one code receipt, link)
  with a release video where one exists (W7)
- a short Reddit-comment-shaped blurb (r/vuejs / r/typescript
  depending on content)
- a LinkedIn paragraph when the release carries a story

Stored as private channel posts (`x-release-X-Y-Z`, …). Retroactive
first case: 2.5.0 — definePropTypes + the private ban is an
r/typescript conversation waiting to happen.

### W3 — first-tweet fix is W1 (superseded)

The earlier single-`xHook` idea is absorbed by W1 — same wiring, list
instead of scalar. No scalar version gets built.

### W4 — the channel calendar

A `note-channel-calendar` private post mapping the strongest articles
to rooms across ~6 weeks post-launch. Draft mapping to refine:

| week | room | article | angle |
| --- | --- | --- | --- |
| 0 | HN + r/vuejs + X + LinkedIn | introducing-ivue | the launch kit as written |
| 1 | lobste.rs | bulletproof-class-modules | article-first, no pitch |
| 1 | dev.to (canonical link) | the-options-api-everyone-wanted | full cross-post |
| 2 | r/typescript | ban-private | the protected/override doctrine |
| 2 | Vue newsletters (pitch) | the-options-api-everyone-wanted | submission email |
| 3 | HN (second shot) | what-native-signals-should-steal | TC39 angle |
| 3 | tc39/proposal-signals | note-tc39-signals-discussion | as drafted |
| 4 | r/vuejs | a-million-rows-twelve-divs | perf receipts |
| 4 | X re-promotion pass | week 0–2 articles | UNUSED xHooks angles |
| 5 | r/javascript | reactivity-is-an-allocator | language angle |

Copy for each row gets written batch-wise as private channel posts.
Rule kept from the launch plan: answer every technical comment with
numbers or a repo link, never adjectives.

### W5 — Russian (high confidence: author reviews natively)

- **Habr** — full translation of the flagship article (pick after the
  English launch shows which story wins; default: the-options-api-
  everyone-wanted). Habr rewards depth + measured numbers — the house
  voice translates well.
- **Telegram** — short blurbs for the Vue/frontend channel ecosystem;
  list target channels first.
- Workflow: agent drafts RU, author does the native pass. Artifacts as
  private channel posts (`channel: habr`, `channel: telegram` — new
  labels, same machinery).

### W6 — Chinese (humbler entry: no native reviewer yet)

- One tight **juejin.cn (掘金)** piece — the introducing-ivue story,
  linking to the English blog for depth. Zhihu later.
- **zh section in the README** — cheap, standard practice.
- The unlock for going bigger is a native reviewer from the community;
  until then, keep artifacts short where tone risk is low.
- NOT doing: site i18n. Habr/juejin host content natively — translated
  articles live on-platform and link back; zero hreflang/maintenance
  tax.

### W7 — video pipeline (deterministic, silent-first)

Videos are code, like the banners: a scripted Playwright session
(recordVideo) → webm → ffmpeg (static binary, no root needed) → mp4 in
X's spec + a square feed crop. Same input, same video; re-render after
a brand change exactly like banners re-render.

**Design rule: judged on MUTE.** X autoplays silent — motion, big
type, and on-screen numbers carry the hook. Music is an optional
polish layer for the tap-to-unmute minority, license-clean only
(CC0/royalty-free; X rights-matching flags commercial tracks).

The reel, ranked by silent-hook strength:

1. **Hero typewriter** — the capability lines cycling ("One
   kilobyte." / "Mock-free tests." / "Real object graphs."), 12–15s
   seamless loop. Copywriting already in motion — the flagship clip.
2. **1M scroller / book marquee** — scrub, land pixel-exact at the end
   of a 400,000-char book.
3. **CreationBench running live** — benchmark numbers climbing on
   camera; nobody shows their benchmark RUNNING.
4. **Drip strip** — envelopes opening, Delivered stamps (best for the
   newsletter push specifically).
5. **20M-cell flyweight grid** free-scroll.

Artifacts committed (short mp4s, a few MB each) under a press/ or
public/x/ directory. V1 constraint: the composer's X upload is
image-only today — videos attach manually; the chunked video upload
(INIT/APPEND/FINALIZE) is a later composer upgrade, not a blocker.

### Sequencing

1. W1 machinery (feeds everything; mechanical)
2. W7 flagship clip (hero typewriter) — proves the video pipeline and
   feeds the launch thread itself
3. W2 + retroactive 2.5.0 copy (release is a day old — still fresh)
4. W4 calendar agreed → batch-write missing copy (+ clips 2–3)
5. W5 after English launch signals the winning story
6. W6 last, smallest surface

## Open questions (to settle in discussion)

- Launch date/window for week 0 — everything sequences from it.
- X cadence between article promotions: does the drip also auto-post
  every new article's thread, or is X manual-only via the composer?
- Habr flagship: options-api story vs introducing-ivue vs win-by-
  reduction? (Default: decide from English launch data.)
- Telegram: which channels, and does the author have posting
  relationships or is it cold submission?
- Dev.to account + canonical setup — exists?
- New channel labels to add to the validator/CHANNEL_LABELS:
  `habr`, `juejin`, `telegram`, `devto`, `lobsters`?
