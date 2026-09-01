# Press & distribution plan — gap analysis and workstreams

**Status: planning. This document is the working surface — edit it as
decisions land. Nothing here is built until its workstream says so.**

The asymmetry being fixed: the blog and site are production-grade
machines (48 posts, drip newsletter, deterministic everything); press
is a one-day firework (a launch kit with no week-2). Distribution
should get the same treatment as content: pre-written, versioned,
validated at build, fired on a calendar.

## The strategy in five lines

1. **The rotation math**: ~12 rooms x one post per 2–3 weeks each =
   4–6 placements per week indefinitely, with no room ever seeing the
   project twice in a month. No room fatigues; the aggregate never
   goes quiet.
2. **Stockpiled ammunition**: 48 evergreen receipt-posts and growing —
   cycling never depends on writing under pressure; xHooks make each
   article 2–3 fires instead of one.
3. **Zero marginal cost**: the tank arms every post at write time;
   each later placement is a paste plus same-day comment presence.
4. **Losses are routing data**: fire broadly, watch which stories win
   rooms, then amplify the winners — localization (RU warm channel
   first), X re-angles, creator pitches all go to PROVEN stories.
5. **The drip is the metronome**: the newsletter already proves the
   cadence; press taps the same rhythm outward.

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

### W2 — the content tank (the POST is the release unit)

**The correction that reframed this workstream:** the engine is
mostly feature-complete, so npm version releases are maintenance
events — skill refinements and internal fixes ship SILENT, and
describing every one is noise nobody should be asked to care about.
The recurring unit that fires every few days is the BLOG POST (the
newsletter drip already proves the cadence). The tank = every post
leaves the factory fully armed, nothing downstream waits on mood:

Per post, at write time (extending the existing pipeline in
CLAUDE.md / write-article):

1. title (doctrine) → prose → **xHooks, 2–3 angles** (W1)
2. banner (exists) → **clip, when the post earns one** (W7 — not
   every post; the rule: a clip when the post's subject MOVES)
3. build → commit → dates (exists)
4. newsletter drip: automatic (exists)
5. X thread via composer (hook + banner/clip) → **same-day
   Bluesky/Mastodon mirror** (W8b)
6. calendar room, when the post has one (W4) — most posts are
   X+mirror+drip only; rooms are for the strongest

**npm version releases, demoted:** channel copy only when a release
carries a REAL story a stranger benefits from hearing (a new
capability, a bridge, a headline number). Rule of thumb: if the
release notes' H1 wouldn't survive the blog title doctrine as an
article title, it ships without press. When one DOES qualify, the
best form is usually a blog post ABOUT the capability (which then
rides the post tank above) — not release-notes-shaped copy.

Retroactive case check under the new rule: 2.5.0 needs no release
copy — its press-worthy content (the private ban) already has a
better vehicle, the ban-private post, which the calendar routes to
r/typescript in week 2.

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
| 1–2 | JS Weekly / Bytes / Frontend Focus / TLDR | per W8a table | submission emails |
| 1 | StackBlitz tag-team (X) | a-million-rows-twelve-divs | demo clip + @stackblitz |
| 2 | r/webdev | a-million-rows-twelve-divs or twenty-million-cells | engineering + video, not product |
| 3 | creator outreach (emails) | per W8d list | press kit ready first |
| 5 | r/programming | win-by-reduction | language story, zero launch smell |
| 5–6 | r/typescript (second entry) | the-test-is-a-subclass or the definePropTypes literal trick | TS techniques, not pitch |
| standing | Bluesky + Mastodon | every X thread, same day | links in post 1 (not punished there) |

Copy for each row gets written batch-wise as private channel posts.
Rule kept from the launch plan: answer every technical comment with
numbers or a repo link, never adjectives.

### W5 — Russian (high confidence: author reviews natively)

- **Habr** — full translation of the flagship article (pick after the
  English launch shows which story wins; default: the-options-api-
  everyone-wanted). Habr rewards depth + measured numbers — the house
  voice translates well.
- **Telegram — WARM, not cold.** The leader of the Russian Vue.js
  Telegram community (t.me/vuejs_ru) is a personal contact: he
  transferred the `ivue` npm package name to the author, free, because
  he wasn't using it — he has already materially supported the
  project. Plan: a personal message with the launch story + the Habr
  piece when it exists; he posts or advises where to post. RU is
  therefore the ONLY market with an inside channel — it can run week
  1–2 instead of waiting for English signals, since distribution risk
  is low.
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
6. **Invar driving Invar** — the 94,000-line terminal IDE in use (or
   an agent using it), rendered through the invar→SVG converter:
   terminal sessions become crisp vector frames → animated to video.
   Deterministic like the rest, and the only clip that shows the
   AI-agents story MOVING — "agents built this, agents drive it.

Artifacts committed (short mp4s, a few MB each) under a press/ or
public/x/ directory. V1 constraint: the composer's X upload is
image-only today — videos attach manually; the chunked video upload
(INIT/APPEND/FINALIZE) is a later composer upgrade, not a blocker.

### W8 — missed avenues (cheap reach), in operational detail

**W8a — general-JS newsletters.** The biggest free distribution in the
ecosystem; all take submissions. One artifact each, written as private
channel posts (`note-pitch-<outlet>`), sent week 1–2:

| outlet | how to submit | what to send | why it fits |
| --- | --- | --- | --- |
| JavaScript Weekly (Cooperpress) | **editor@cooperpress.com** (the on-site form is a 404 — verified 2026-09-01) | link + 1-sentence pitch for bulletproof-class-modules OR the-options-api-everyone-wanted | they favor measured, technical deep-dives; one inclusion ≈ the reach of a good HN run. **All Cooperpress titles (JS Weekly, Frontend Focus, Node Weekly) share ONE editor — one pitch per ~6 weeks across the family, never three in a week** |
| Bytes (ui.dev) | hello@bytes.dev | the 55–253× creation number + the 1.1 kB line, framed playfully — their voice is witty | spicy numbers with receipts are their bread |
| Frontend Focus (Cooperpress) | same Cooperpress form family | a-million-rows-twelve-divs (rendering/perf angle) | perf + DOM material is their lane |
| TLDR Web Dev | **no free submission form exists** (verified 2026-09-01; only advertise.tldr.tech) — reply to the newsletter or paid placement | introducing-ivue, one-line pitch | demoted: cannot hold a week-1 slot; reply-to is the only free path |

Pitch shape (all four): one sentence of claim with the number, the
link, no adjectives. The editor rewrites anyway — the numbers are what
survive.

**W8b — Bluesky + Mastodon mirror** (standing rule, not a calendar
row):

- **Rule**: every X thread posts same-day to Bluesky and Mastodon.
- **Handles**: register NOW, before launch, to hold the name —
  Bluesky, plus Mastodon on front-end.social (first choice) or
  Fosstodon (fallback).
- **Why it pays**: links are NOT algorithmically punished there
  (unlike X — put the link in post 1), and the audience skews
  senior/framework-skeptical, which fits the receipts voice.
- **Porting**: threads port verbatim; Mastodon's 500-char limit lets
  some X tweet-pairs merge into one post.
- **Cost**: ≈ paste twice. Manual is fine at this volume; the
  composer's ledger pattern can extend to these networks later.
- **Machinery**: add `bluesky` and `mastodon` channel labels.

**W8c — additional Reddit rooms** (rows in the W4 calendar):

- **r/webdev** — huge, demo-tolerant. Material: a-million-rows-twelve-
  divs or twenty-million-cells WITH the video clip. Frame as
  engineering ("how we render 1M rows in 12 divs"), never as product.
  **HARD GATE: non-commercial showoffs are Saturday-only (Showoff
  Saturday) — calendar this row on a Saturday or it gets removed.**
- **r/programming** — language-story posts only: win-by-reduction,
  discovered-not-invented. This room punishes anything that smells
  like a launch; the article must stand as an essay.
- **r/typescript** — supports MULTIPLE entries, spaced ~3 weeks apart,
  each framed as a TS-techniques post rather than a library pitch:
  1. ban-private (week 2 — the protected/override doctrine)
  2. the two-inheritance-chains + `self` story (already flagged in the
     launch plan as r/typescript material)
  3. definePropTypes and the `required: true` literal-preservation
     trick (generic inference vs bare-const widening)
  4. the-test-is-a-subclass

**W8d — press-kit page + creator outreach.** The unlock is the kit:
outreach without one is "please cover me"; with one it is "here is a
ready-made episode." Build `/press` on the site (or PRESS.md first —
open question) containing:

- the story in three lengths: one line, one paragraph, one page
- the numbers table with methods (creation 55–253×, 1.1 kB, 100%
  coverage, 94k-line Invar) — copy-pasteable
- logo/lockup downloads (light + dark PNG + SVG) — the logo-deploy
  pipeline already produces every asset
- the W7 clips, embeddable/downloadable
- three suggested episode/video angles, each with its receipts links
- contact + "what we'll do to help" (demo access, benchmark repro
  instructions, interview availability)

Then the outreach list — one personalized email each, NEVER a blast:

- **LearnVue (Matt Maribojoc)** — YouTube + newsletter, the largest
  Vue-tutorial audience. Angle: the Options-API story ("the class API
  Vue devs actually wanted"). A video practically scripts itself from
  the blog post + clips.
- **Alexander Lichter** — DejaVue podcast + Nuxt-core credibility.
  Angle: the Options-API story, pitched as a podcast conversation
  (the discovery arc + the invariants method). Podcast-ready framing
  already exists in note-launch-plan.
- **Vue Mastery (blog/courses)** — Angle: the teaching story — one
  document (the standard) teaches humans AND agents; 100% coverage,
  mock-free tests as course-friendly material.
- **Vue School (blog/courses)** — same teaching angle, separate
  personalized email (they are competitors; never CC).
- **Michael Thiessen** — his newsletter already sits in W4's
  Vue-newsletter row; ONE email covers both the newsletter submission
  and the creator relationship. Angle: the Options-API story with the
  measured numbers up front (his audience loves patterns + receipts).

**W8e — community drops** (each is one rules-compliant post; read the
room's rules first — every one of these bans repeat promotion):

- **Vue Land Discord, #showcase** — one post: the one-paragraph story,
  the playground link, the 1M-rows clip. Stay in the thread and answer
  questions same-day; Discord rewards presence, not the post.
- **awesome-vue PR** — one line + link under the right section.
  Passive but permanent SEO; the first place many devs search for
  "vue <thing>". Zero maintenance after merge.
- **Echo JS** — plain link drop, title = the article title (their
  culture: no pitch text).
- **daily.dev** — submit via their squad/submission flow; the
  algorithm resurfaces good posts repeatedly at zero ongoing cost.
- **vuejs.org ecosystem surfaces** — check the listing criteria once
  the repo has launch-week stars; the most durable Vue-audience
  surface that exists.

**W8e2 — r/ivue (owned room — SECURED) + the AMA**:

- **r/ivue exists and is ours.** Home base, not a launch channel — an
  empty subreddit reads "abandoned project," so it stays quiet until
  furnished.
- **Furnish before linking**: pinned welcome + receipts post, release
  notes as posts, a "start here" article guide, the FAQ answers from
  launch threads. Only then link it from the site footer / newsletter.
- **Its real value is permanence**: Reddit threads are Google-indexed
  forever — r/ivue becomes the durable "where do I ask ivue
  questions" answer (Discord chatter evaporates; these threads
  compound).
- **AMA — a traction HARVEST, not a source**: week 3–6, after the
  launch wave gives people questions. Venue: r/vuejs WITH mod
  coordination (borrowed audience), cross-posted to r/ivue as the
  archived home copy. Pitch to mods: the receipts line (1.1 kB,
  94k-line agent-built IDE, everything answered with numbers).
  Every launch comment thread before it is micro-AMA practice.

**W8f — StackBlitz tag-team**:

- The playground already boots on StackBlitz (one-click repro exists
  today — zero build work).
- Week 1: tweet the 1M-rows demo clip tagging @stackblitz with the
  one-click link.
- Their DevRel amplifies exactly this genre. Free lottery ticket,
  zero downside, zero follow-up obligation.

**W8g — Product Hunt** (optional, week 5+):

- Viable only because every asset (clips, kit, copy) exists by then —
  marginal cost is scheduling, not creation.
- HN outranks it ~10× for this audience; PH is a second-wave play,
  never the launch.
- Decision point at week 4: go only if launch momentum suggests a
  second wave is worth the calendar slot.

### W10 — X format variety (dwell time is the algorithm)

X rewards on-platform dwell and punishes link-outs — so the thread is
one format among four, rotated per post:

- **A. Thread** (exists) — the composer's hook + banner/clip + packed
  body + closing link.
- **B. Article-as-images** — the post (or its strongest section)
  rendered as 1–4 typographic cards in X's 4-image slot. Readers
  consume the WHOLE argument in-feed; the link rides the reply or the
  final card. Manufactured deterministically like banners: a
  render-article-cards script (md section → styled HTML → PNG, house
  design language, big readable type), alt text = the plain text
  (accessibility + search). High-read format; many readers prefer it.
- **C. Long post** (25,000 chars — AVAILABLE NOW on the $5 Basic
  plan; all Premium tiers have it) — renders with "Show more," no
  card presentation. Right vehicle for release-post-sized content and
  mini-articles; effectively a free blog mirror on-platform.
- **D. X Articles (rich editor + article card)** — Premium+ only
  (~$22/mo, verify in-app). Decision rule: upgrade ONLY after formats
  B/C demonstrably earn engagement — presentation upgrade, not a
  capability unlock.

Rotation guidance: threads for launch/receipts moments, image-cards
for essay-shaped posts (philosophy/story tags), long posts for
release-notes-shaped and r/ivue-grade content mirrored outward.

**W8h — directory drops** (one submission each, permanent SEO — the
awesome-vue class of asset, near-zero cost):

- **madewithvuejs.com** — submit the playground/site; screenshots +
  link, browsed by Vue devs looking for real usage.
- **vuejsexamples.com** — same class, same submission shape.
- **vue.libhunt.com** — indexes from GitHub; verify the listing picks
  up description + topics once repo surface (W12) is set.
- **alternativeto.net** — list under Pinia/Vuex/MobX alternatives;
  where "X alternative" searches land for years.

**W8h2 — design galleries** (the site itself is an asset; reaches
designers + design-curious front-end devs the rest of the plan never
touches; each placement = permanent "featured on" credential +
backlink):

- **Godly (godly.website)** — favors sleek dark dev-tool sites; the
  typewriter hero + spotlight is exactly their feed. Best single fit.
  **Mechanics (verified 2026-09-01): godly.website/submit 301-redirects
  to recent.design — submit through recent.design's work dialog.**
- **Dark Mode Design** — self-explanatory fit. **Mechanics: EMAIL
  hello@darkmodedesign.com, subject "Site Submission" (no form;
  /submit is a 404).**
- **minimal.gallery** — form at /submit; free; review takes 1–2 weeks
  (**so the gallery batch fires week 1, not week 2**); most
  submissions rejected, resubmission invited.
- **siteInspire** — /submissions rate-limited to bots (429); verify
  the form manually before the batch.
- **~~httpster~~ — SUBMISSIONS CLOSED** (its /about says so verbatim;
  verified 2026-09-01). Re-check week 4; spend the slot on Hover
  States or Dark.design (see tasks/press-venues.md).
- **Land-book** — reported to have a PAID review element (403 to
  bots, unconfirmed); re-price before submitting or move it to the
  not-paying bucket.
- **VitePress showcase** — doubly valuable: the audience is already
  Vue devs, and "best-looking VitePress site" is a winnable crown,
  not a lottery.
- **"Beautiful docs" awesome-lists on GitHub** — the awesome-vue move
  applied to docs design; permanent SEO.
- **NOT paying**: Awwwards / CSSDA / FWA (~$55+/submission, jury
  taste runs agency-flash; structural long shot for a docs site).
  Revisit only if free galleries land and the credential is wanted.
- **Pre-flight**: galleries judge the first screen in ~5s at THEIR
  thumbnail widths — one homepage QA pass at common gallery
  breakpoints, both themes, before submitting.
- Timing: rides week 1–2 with the W8h drops — same asset class
  (one-shot submission, permanent placement, zero maintenance).

**W8i — podcasts beyond DejaVue** (pitch AFTER week-2 signals; the
W8d kit makes each pitch ~15 minutes of work):

- **Views on Vue** (Top End Devs) — Vue-specific panel; angle: the
  Options-API story + the discovery arc.
- ~~JS Party (Changelog)~~ — **the show ended** (episode #350 "One last
  party", 2025-02-13; verified live 2026-09-01). Replaced by:
  **Changelog News** (changelog.com/news/submit — link queue) and the
  **Changelog episode-request form** (changelog.com/request/podcast).

### W9 — Japan (geo #3)

By Vue adoption arguably #2 after China (LINE, Rakuten; the ja docs
community predates almost everyone), with the platform-native culture
that justifies translation: **Zenn** and **Qiita** host articles the
way Habr/juejin do. Same caveat as Chinese — no native reviewer — so
the same humble entry: one tight piece, short where tone risk is high.

Mechanics: Zenn is the modern choice (markdown, GitHub-connected
publishing — fits the repo workflow; articles CAN live in a public
repo and sync), Qiita the bigger legacy reach; start Zenn, cross-post
Qiita if the first lands. Piece: the introducing-ivue story tightened
to ~800 JP words, code blocks verbatim from the English post, link to
ivue.dev for depth. Technical-JP tone is more formulaic than
conversational English — which actually LOWERS translation risk
relative to Chinese social platforms. Channel label: `zenn`.

**The localization rule (settled):** localize only where big Vue share
AND a content culture that does not default to English. That is CN,
JP, RU — full stop. Europe reads English (DE is Angular country), KR
is React-leaning, BR/VN are real Vue pockets with thinner platform
reach — revisit only on evidence.

### W11 — measurement (the missing instrument for "losses are routing data")

The strategy's feedback loop — fire broadly, amplify winners — has no
instrument. Without one, amplification decisions are vibes. Before
week 0:

- **Referrer visibility on ivue.dev** — the site is already a CF
  Worker: log Referer + path (aggregate counts only, no PII), or
  enable CF Web Analytics (free, no cookies). One afternoon.
- **Per-placement snapshots** — a small script (or manual table in a
  private note post) recording npm weekly downloads + GitHub stars +
  newsletter subscriber count at each calendar firing. Star-history
  and npm charts reconstruct the past, but signups don't — capture as
  you go.
- **Newsletter signups by day** are already in D1 with timestamps —
  the drip ledger IS the conversion metric; just read it per
  placement window.
- **Define "a story won a room" BEFORE launch**: e.g. front page /
  top-10 of subreddit / >X referrers to the article in 48h →
  qualifies for localization (W5 Habr pick) and X re-angle
  amplification. Write the thresholds here once agreed.
- **Milestone re-promotions ride the data**: a "1,000 stars — what
  worked" thread is a known-good X format and costs nothing when the
  snapshots exist.

### W12 — the repo and npm page as landing surfaces

Launch traffic's first click after any thread is github.com — audit
it like a landing page:

- **README first screen = the pitch**: claim + numbers table + one
  code block + playground link + docs link, above the fold. The
  house voice, receipts-first.
- **Social preview image** — the OG card GitHub shows wherever the
  repo is linked (Settings → social preview). The page-OG pipeline
  already manufactures these; render one for the repo.
- **Topics/tags** set (vue, reactivity, typescript, state-management,
  signals, class-based) — feeds GitHub search and libhunt (W8h).
- **Discussions decision**: OFF, with r/ivue as the durable Q&A home
  (one question surface, Google-indexed) — or ON if repo-native
  questions prove high-volume. Decide once, link consistently.
- **Pinned "start here"** issue or README section routing: docs,
  playground, blog, r/ivue, newsletter.
- **npm page** mirrors the README pitch (it renders the same file —
  verify the first screen works there too; badges: size, coverage,
  types).

### W13 — the objection bank + launch-day runbook

**Objection bank** — the comment-presence rule ("answer with numbers,
never adjectives") currently has no ammunition. Pre-write the top
~20 hostile questions once, as a private note post
(`note-objection-bank`); it feeds every launch thread, the AMA, and
podcast prep. The predictable set: classes in 2026 / "just use
Pinia" / proxy overhead vs plain objects / bundle-size skepticism /
bus factor & single maintainer / "AI wrote this" / SSR story /
Vue-version coupling (3.5 vs 3.6 alien-signals) / "another state
library" / why not composables / decorator comparisons / TC39
signals overlap / testing claims ("100% is easy on 1 kB") / license
& stewardship / typescript-only? / DevTools support / migration
cost from Pinia / what happens when Vue changes internals /
memory-leak story ($stopEffects) / "benchmarks are always rigged"
(link the live in-browser bench — the answer that ends the thread).
Each answer: 2–4 sentences, a number or a repo/docs link, zero
adjectives.

**Launch-day runbook** — one page executed under adrenaline
(`note-launch-runbook`): submission time (HN weekday morning US
Eastern), first-comment posted immediately from the prepared text,
monitoring windows (first 2h continuous, then hourly), the
do-not-argue rules (concede fair hits — the self-criticism comment
sets the tone; never fight a downvote wave; numbers or silence),
the same-day mirror checklist (X thread → Bluesky/Mastodon →
LinkedIn), newsletter mention timing, and the W11 snapshot at T+48h.

### Second wave, deliberately withheld: the agents story

The malleable-architecture / Invar control-plane story targets a
DIFFERENT audience (AI-tooling rooms, r/ClaudeAI-class subreddits,
X AI crowd) and is deliberately absent from weeks 0–6 — mixing it
into the Vue launch would blur both pitches. It is its own launch
(the malleable doc's sequencing ladder ends in one), fired after the
Vue wave establishes the receipts it builds on. Only leak permitted
meanwhile: the Invar-driving-Invar clip (W7 #6) as a teaser, framed
as receipts for the standard, not as a product announcement.

### Sequencing

0. **Pre-launch gate (new)**: W12 repo/npm surfaces + W11
   instrumentation + W13 objection bank & runbook — all three must
   exist BEFORE week 0; they are hours of work each and every
   placement leans on them.
1. W1 machinery (feeds everything; mechanical)
2. W7 flagship clip (hero typewriter) — proves the video pipeline and
   feeds the launch thread itself
3. W2 wiring is mostly W1+W7+W8b landing — no retroactive 2.5.0 copy
   (ban-private the post is the vehicle, per the demotion rule)
4. W4 calendar agreed → batch-write missing copy (+ clips 2–3);
   W8h directory drops ride week 1–2 alongside W8a
5. W5 after English launch signals the winning story (per W11
   thresholds, not vibes)
6. W6 last, smallest surface; W8i podcast pitches after week-2
   signals; agents-story second wave stays holstered until the Vue
   wave lands

## Open questions (to settle in discussion)

- Launch date/window for week 0 — everything sequences from it.
- X cadence between article promotions: does the drip also auto-post
  every new article's thread, or is X manual-only via the composer?
- Habr flagship: options-api story vs introducing-ivue vs win-by-
  reduction? (Default: decide from English launch data.)
- ~~Telegram: which channels / relationships?~~ ANSWERED: warm —
  t.me/vuejs_ru leadership is a personal contact (transferred the
  ivue npm name, free). See W5.
- Dev.to account + canonical setup — exists?
- New channel labels to add to the validator/CHANNEL_LABELS:
  `habr`, `juejin`, `telegram`, `devto`, `lobsters` — plus `zenn`,
  `bluesky`, `mastodon`, `newsletter-pitch`?
- Press-kit page: /press on the site, or a repo PRESS.md first?
- W11 analytics choice: CF Web Analytics (zero code) vs Worker-side
  referrer logging (more control) — or both?
- W11 thresholds: what counts as "a story won a room"? (Propose:
  HN front page OR subreddit top-10 OR 500+ article referrers in
  48h.)
- W12 Discussions: off (r/ivue is the Q&A home) — confirm.
