---
venue: internal — launch day (HN, r/vuejs, X, Bluesky, Mastodon, LinkedIn, newsletter)
purpose: post
lang: en
source: NEW (W13 launch runbook) — sequencing from note-launch-plan, gates from the press plan's W11/W12/W13
status: draft-for-review
---

# Launch day, decided in advance

ivue is a 1.1 kB class layer over Vue 3's reactivity. This page is the
script for the day it goes public — written now, executed under
adrenaline, so no decision is made while the thread is moving.

One rule above all the others: **numbers or silence.**

---

## T−1 day: the gate

Do not launch until all five are true. Each takes minutes to check and
every placement leans on it.

| # | gate | how you know it passes |
| --- | --- | --- |
| 1 | Repo first screen is the pitch | Claim, numbers table, one code block, playground link, docs link — all above the fold on github.com, checked on a phone-width window |
| 2 | Social preview image set | Repo Settings → social preview renders; paste the repo link into a Slack/X draft and see the card |
| 3 | Referrer visibility live | One test hit from an external link shows up in the Worker log or CF Web Analytics |
| 4 | Objection bank open in a tab | `objection-bank.md` — not "somewhere in the repo" |
| 5 | First comment in the clipboard | The HN author comment, verbatim, with both volunteered weaknesses still in it |

Snapshot the starting numbers into a note, by hand: npm weekly
downloads, GitHub stars, newsletter subscriber count, timestamp. The
T+48h comparison is impossible to reconstruct later for signups.

---

## The clock

Times are US Eastern, because that is the clock HN's front page runs
on.

| time | action | notes |
| --- | --- | --- |
| **08:00–10:00 ET, Tue–Thu** | Submit to HN | Title: `Show HN: Ivue – full Vue reactivity on plain TypeScript classes, in 1.1 kB` (79 chars). Never Friday, never a US holiday, never after 11:00 |
| **within 2 minutes** | Post the author first comment | Already in the clipboard. Do not rewrite it while the page loads |
| **+30 min** | r/vuejs | Same day as HN on purpose — the two audiences barely overlap |
| **+2 h** | X thread → Bluesky → Mastodon | Same day, same content. Link goes in post 1 on Bluesky and Mastodon; on X the link rides the last segment |
| **next morning** | LinkedIn | Its feed rewards fresh, not simultaneous — a day later outperforms same-day |
| **day 2** | r/javascript, lobste.rs | lobste.rs gets the article, not the pitch |
| **day 2–3** | dev.to cross-post | `canonical_url` set to ivue.dev, full text |
| **T+48 h** | Snapshot again | Same four numbers, same note. This is the row the whole amplification plan reads |

The newsletter mention waits for **T+24 h**, not launch hour: it goes
out as "here is what happened," which is a better email than "here is
what I hope happens" — and by then the thread links are worth
including.

---

## Monitoring windows

- **First 2 hours: continuous.** This is the whole game. Comment
  velocity in the first hour decides whether the submission is seen at
  all, and the author answering fast is the strongest signal available.
- **Hours 2–8: every 30 minutes.**
- **Day 1 after that: hourly.** Then twice a day for a week.
- Reddit runs on a slower clock than HN — a thread there stays alive
  for days, so an unanswered comment on day 3 still costs you.

Answer every technical question. Answer the hostile ones first: they
are read by more people than the friendly ones.

---

## Do-not-argue rules

1. **Concede fair hits immediately, in the first sentence.** The first
   comment already ships two weaknesses on purpose; matching that tone
   in replies is what makes the receipts believable.
2. **Numbers or silence.** No reply goes out without a number, a repo
   link, or a docs link. If you cannot find one in the objection bank,
   the honest answer is "I don't have a measurement for that yet."
3. **Never fight a downvote wave.** One reply, factual, then stop. A
   second reply to the same person is for their benefit only and costs
   the thread.
4. **Never argue about tone, motive, or whether the criticism is
   fair.** Answer the technical core and drop the rest.
5. **Do not defend a claim because it is yours.** If a commenter is
   right, say so in public and, where it matters, change the docs the
   same day and say that too. That exchange converts more readers than
   winning would.
6. **Zero adjectives.** No "fast", no "clean" — the measurement, the
   scale, the method.
7. **Never mention a competing library's weakness unprompted.** When
   asked directly, state the measured difference with its method and
   name the case where the other tool is the right answer.
8. **One correction per factual error, then move on.** Repeating a
   number does not make it land harder.
9. **If a thread goes bad, stop posting — do not delete.** Deleting
   turns a bad thread into a story. Silence lets it sink.

---

## The mirror checklist (tick these, do not trust memory)

- [ ] HN submitted, first comment posted
- [ ] r/vuejs posted, flair/rules checked before posting
- [ ] X thread posted (hook segment, banner on segment 1)
- [ ] Bluesky mirror posted, link in post 1
- [ ] Mastodon mirror posted, link in post 1
- [ ] LinkedIn queued for tomorrow morning
- [ ] Newsletter mention queued for T+24 h
- [ ] Every room's first comment answered within its first hour
- [ ] T+48 h snapshot written into the note

---

## What counts as a win (decide now, not after)

Write the threshold down before you can be tempted to move it. A
story **won a room** if it hits any one of:

- HN front page, or
- top 10 of the subreddit for the day, or
- 500+ referrers to the article inside 48 hours.

A room that a story won earns amplification: a translation, a second
X angle from an unused hook, a creator pitch. A room it lost earns
nothing except the routing data — which is the actual point. Losses
tell you which story to fire next, and that information is only free
if the snapshot exists.

---

## The five links, in order of use

1. https://ivue.dev/blog/introducing-ivue — the entry point, always
   first
2. https://ivue.dev/guide/benchmarks — the thread-ender: it runs in
   their browser
3. https://ivue.dev/guide/standard — the whole contract, one document
4. https://ivue.dev/guide/performance — the numbers with their methods
5. https://ivue.dev/blog/agents-built-an-editor — the 108,000-line
   receipt

If a reply needs a sixth link, it needs fewer words instead.

---

## If it goes quiet

A flat launch is data, not a verdict. The plan already assumes it:
about twelve rooms, one post per room every two to three weeks, 48
evergreen articles — which is four to six placements a week for as
long as it takes, with no room seeing the project twice in a month.
The comparison to keep in view: one recent project took two months
from launch to its first thousand stars. Day one is a sample, not the
result.

Do not re-submit the same link to the same room. Pick the next
article, keep the cadence, and let the snapshots decide what gets
amplified.
