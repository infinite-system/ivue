---
title: 'The drip machine — wave-independent distribution'
description: 'The standing system that makes ivue adoption compound with or without a launch spike: channel tiers, the weekly engine, repurposing pipeline, 12-week calendar, and the failure-mode ledger.'
private: true
channel: note
date: 2026-08
---

# The drip machine — wave-independent distribution

**The doctrine in one line:** launches produce spikes; systems produce
floors. This plan assumes the launch wave contributes ZERO and designs
for a floor that rises every week anyway. If HN hits, that's a bonus on
top of a machine that was never waiting for it.

What makes it "unstoppable" is not any single channel — it's four
properties working together:

1. **Owned channels no one can throttle** (blog, newsletter, RSS, npm,
   GitHub) carry the baseline.
2. **A content bank measured in months** (47 published articles today)
   means the drip never depends on this week's writing energy.
3. **Channel redundancy** — no gatekeeper is load-bearing; losing any
   one costs a tributary, not the river.
4. **Compounding assets** — every article is evergreen and
   search-indexed; week 30's traffic includes week 1's posts. Progress
   is monotonic even when no individual post "performs."

Honesty clause: nothing guarantees a viral hit. What this machine
guarantees is that *zero viral hits cannot stop it* — the floor rises
on consistency and compounding alone, and spikes only change the slope.

## 1 · The asset audit (what we're sitting on)

47 public articles sort into five archetypes. The archetype determines
which channels a piece can enter without reading as self-promotion:

| archetype | examples from the bank | natural channels |
| --- | --- | --- |
| **Numbers** (benchmarks, memory, measured claims) | the-zeros-didnt-move, twenty-million-cells, a-million-rows-twelve-divs, total-memory-control, the-stack-got-faster | HN, r/javascript, lobste.rs, X |
| **Technique** (how-to that works without ivue being the point) | circular-imports-dissolved, initialization-order-solved, computed-is-a-cache, release-what-the-gc-cant, pause-watchers-keep-the-state, module-level-state | r/vuejs, dev.to, Vue newsletters, SO answers |
| **Position** (essays with a defensible thesis) | reactivity-is-an-allocator, discovered-not-invented, what-native-signals-should-steal, the-options-api-everyone-wanted, inheritance-exile | HN, X threads, LinkedIn, lobste.rs |
| **Build story** (what we built and what it cost) | agents-built-an-editor, three-years-to-reduce, monolith-to-modular-in-a-day, vscode-hand-rolled-decade | HN, LinkedIn, X |
| **Method** (AI-era workflow, invariants, gates) | the-test-is-a-subclass, most-linted-superpower, reactive-framework-for-the-ai-era, patterns-the-author-never-wrote | X, LinkedIn, HN (AI-tooling appetite), r/ExperiencedDevs |

Rule of the bank: **every drip week draws from the bank; new writing
adds to the bank.** The two are decoupled — a dry writing month never
stops the drip, and a hot writing week doesn't rush anything out.

New-material sources that refill the bank without "content ideation":
`LESSONS.md` (the Bun `beforeExit` exit-code find is a ready-made
post), the gate/checker build (the whole standards-gate arc is a
series), benchmark re-runs on new Vue/Bun versions, and every real
question a user asks.

## 2 · Channel tiers (and what each one tolerates)

### Tier 0 — owned, literally unstoppable

- **The blog + SEO.** Every article stays up, gets indexed, and
  answers a query someone types ("vue circular imports", "vue class
  components 2026", "vue memory per component"). This is the floor.
  Maintenance: each article's title/description already follows the
  generative-title doctrine; nothing to change, just never take
  anything down.
- **The newsletter.** The drip Worker already sends the archive to
  every new subscriber on their own cadence — a subscriber who arrives
  in week 40 receives the same sequence week-1 subscribers got. This
  is the single most "inevitable" asset we own: it converts every
  future reader into a recipient of the whole bank, automatically,
  forever. Job: grow the list; the Worker does the rest.
- **RSS** — feeds daily.dev, Vue feed aggregators, and readers; free
  distribution of every publish with zero per-post work.
- **GitHub** — release notes that read like mini-articles (they get
  indexed and screenshot-shared), README kept current, Discussions
  answered same-day. Stars come from usefulness visible at repo-level.
- **npm** — the README shows on the package page; treat it as a
  landing page, not a file.

### Tier 1 — continuous posting is welcome

- **X** — the composer + scheduler is BUILT. Cadence: 3–5 posts/week
  scheduled in batches (one sitting per week fills the queue). Mix:
  one thread (an article, split on `---`), two single-shot insights
  (a number, a code shot, a before/after), one reply-day engaging Vue/
  JS conversations with zero links. Threads out-earn links; the link
  goes in the last tweet or a reply.
- **dev.to** — full crossposts with `canonical_url` to ivue.dev.
  No self-promo penalty, big Vue tag audience, and each crosspost
  backlinks the canonical (SEO compound). Cadence: 1/week from the
  bank, oldest-first for evergreen pieces.
- **Bluesky** — mirror the X queue; the JS community share there is
  growing and cross-posting costs nothing.
- **LinkedIn** — 2–3/week. Build-story and method archetypes only
  (numbers bore the feed; stories travel). First-person, no link in
  the body (comment instead), 150–250 words.
- **daily.dev / Echo JS** — link submissions, no copy needed, no
  cadence limit that matters. Route every publish through them.

### Tier 2 — gatekept; enter with value or not at all

- **r/vuejs** (~120k) — cadence ceiling: 1 post/week, and at most half
  our activity may be our own content. Format that works: a TEXT post
  that teaches the technique inline (code in the post body), with the
  article linked at the bottom as "longer write-up." The technique
  archetype only — a reader who never clicks must still leave with
  the solution. Between posts: answer other people's questions
  (the 9:1 give/ask ratio is what makes week 30 posts welcome).
- **r/javascript** — self-promo rules are enforced (~10% rule).
  Cadence: 1–2/month, numbers and position archetypes, submitted as
  links with a first comment that summarizes honestly and invites
  attack on the methodology. Never argue; concede good points in
  public — the concession IS the marketing.
- **r/typescript** — 1/month; the two-chains/`self`/namespace material
  is native here.
- **HN** — cannot be scheduled, only attempted. Ration: at most one
  submission/month, and only pieces that are HN-shaped (numbers with
  reproducible method, contrarian position with receipts, build
  stories with real cost). Submit and walk away; never bring a crowd.
  A front-page hit is a bonus the plan doesn't need.
- **lobste.rs** — 1–2/month, practices/javascript tags, article over
  pitch. Small but high-quality referrers.
- **Vue newsletters** (Weekly Vue News, Michael Thiessen, Vue.js Feed,
  vuejsdevelopers.com) — they NEED submissions; this is pull, not
  push. Standing job: every Monday, submit that week's featured
  article to all four. Zero spam risk — inclusion is their editorial
  call.
- **Vue Land Discord / SO** — participation channels, not posting
  channels. Answer questions where ivue is genuinely the answer;
  link the specific technique article, not the homepage. Slow, but
  every answer is permanent SEO.

## 3 · The weekly engine (the loop that runs regardless)

One sitting each week (~2–3 hours total, batchable) runs the machine:

- **Monday — feature.** Pick the week's article from the bank (rotate
  archetypes). Submit it to the four Vue newsletters. Queue the X
  thread in the composer (already splits on `---`, already renders
  code shots). Route through daily.dev/Echo JS.
- **Tuesday — crosspost.** dev.to full crosspost with canonical_url;
  mirror to Bluesky.
- **Wednesday — LinkedIn.** Rewrite the week's piece as a first-person
  story post (not a summary — the moment it cost something).
- **Thursday — community.** The rotating gatekept slot: week A
  r/vuejs (technique, text-post format), week B r/javascript or
  r/typescript (numbers/position, link + honest comment), week C
  lobste.rs, week D HN attempt OR skip. Each community sees us at
  most monthly-ish; the rotation keeps OUR cadence weekly.
- **Friday — give-back.** 30–60 minutes answering questions (r/vuejs,
  SO, Discord, GitHub Discussions) with zero links unless the answer
  demands one. This is what buys Thursday's welcome.

Everything not listed is automated: publishing feeds the newsletter
drip, RSS, and the archive; subscribers get the sequence without any
weekly action.

**Buffer discipline (the anti-burnout invariant):** the X queue and
the Thursday post are always prepared ≥3 weeks ahead. The weekly
sitting maintains the buffer, not the current week. A skipped week
consumes buffer instead of breaking the chain — the drip survives
vacations, launches, and life.

## 4 · The repurposing pipeline (1 article → 7 assets)

Already mostly tooled:

```
article (bank)
├── newsletter email        — automatic (build-time render, drip Worker)
├── X thread                — composer: split on ---, per-segment counts
├── code shots              — npm run render:code-shots (every tab)
├── dev.to crosspost        — paste + canonical_url (5 min)
├── LinkedIn story          — 200-word rewrite (15 min)
├── reddit text post        — technique inlined, link at bottom (20 min)
└── OG banner               — already committed per post
```

The marginal cost of a channel is minutes, because the expensive part
(the article, the numbers, the images) is already banked.

## 5 · Twelve weeks concrete (the first cycle)

Rotation rule: no channel sees the same archetype twice in a row; the
flagship monthly HN attempt gets the strongest piece of that month.

| wk | featured article | Thursday slot |
| --- | --- | --- |
| 1 | circular-imports-dissolved (technique) | r/vuejs text post |
| 2 | the-zeros-didnt-move (numbers) | r/javascript link |
| 3 | computed-is-a-cache (technique) | lobste.rs |
| 4 | reactivity-is-an-allocator (position) | HN attempt |
| 5 | initialization-order-solved (technique) | r/vuejs text post |
| 6 | twenty-million-cells (numbers) | r/typescript |
| 7 | pause-watchers-keep-the-state (technique) | lobste.rs |
| 8 | the-options-api-everyone-wanted (position) | HN attempt |
| 9 | release-what-the-gc-cant (technique) | r/vuejs text post |
| 10 | a-million-rows-twelve-divs (numbers) | r/javascript link |
| 11 | the-test-is-a-subclass (method) | lobste.rs |
| 12 | what-native-signals-should-steal (position) | HN attempt |

Every week: Vue-newsletter submissions of the featured piece, X thread
+ 2 singles, dev.to crosspost, LinkedIn story, Friday give-back.
Month 2+ adds one NEW flagship/month from live material (the gate
story, the Bun exit-code find, invariants-in-practice) — the bank
grows faster than the drip drains it (47 banked, 12/quarter consumed).

## 6 · The metrics loop (15 minutes, Fridays)

Track five numbers weekly, in one row of a sheet: npm weekly
downloads, GitHub stars, newsletter subscribers, Search Console
impressions, and referral sessions by channel. Rules:

- An archetype that outperforms twice in a row gets a second slot.
- A channel that produces nothing after four honest attempts gets cut
  without sentiment (the tier system means nothing depends on it).
- Search impressions are the floor metric — they should never
  decrease; if they stall, the fix is new technique articles (they're
  the query-catchers), not more social.

## 7 · Failure-mode ledger (what could stop it → why it can't)

| threat | countermeasure already in place |
| --- | --- |
| Launch flops | The plan assumes it contributed zero. |
| Burnout / busy month | 3-week buffer + 47-article bank; the weekly sitting refills, never scrambles. |
| Subreddit ban / mod friction | Tier redundancy; give/ask ratio kept honest; text-post format means we were teaching, not linking. |
| X algorithm turns | Bluesky mirror + owned newsletter absorb; the queue costs nothing extra. |
| HN never front-pages | HN is rationed as a bonus channel; the calendar never waits on it. |
| SEO update | 47 evergreen technique pages across independent queries — breadth is the hedge. |
| "They only self-promote" reputation | Friday give-back + text-post-teaches format + public concessions; the ratio is engineered, not hoped for. |
| Content well runs dry | LESSONS.md, benchmarks re-runs, and real build arcs auto-generate material as a byproduct of normal work. |

The one true dependency left is **the weekly sitting** — two or three
hours, batchable, buffered three weeks deep. That's the entire cost of
inevitability.
