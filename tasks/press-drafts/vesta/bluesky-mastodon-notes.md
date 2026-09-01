---
venue: Bluesky, Mastodon (front-end.social / Fosstodon / Hachyderm)
purpose: post
lang: en
source: x-launch-thread, launch-thread-alt, xhooks
status: draft-for-review
---

# Porting notes — X threads to Bluesky and Mastodon

ivue, a 1.1 kB class layer over Vue's reactivity, posts the same threads
in three places. The threads are not identical, and the differences are
mechanical rather than editorial. Here is every rule, and every rewrite
the current threads need.

## The three limits that drive everything

| platform | per-post limit | link cost | what changes |
| --- | --- | --- | --- |
| X (free) | 280 characters | a URL counts as a fixed 23 characters however long it is | link goes LAST — the feed penalizes link-outs |
| X (Premium long post) | 25,000 characters, but only the first 280 render in the timeline | same 23 | first paragraph must stand alone as the preview |
| Bluesky | 300 characters | counts the visible text | link goes in post 1 |
| Mastodon | 500 characters (standard instance default) | URLs count as 23 characters | link in post 1; segments merge |

## Rule 1 — the link moves to post 1

On X the link is punished, so it closes the thread. On Bluesky and
Mastodon it is not, so it opens. Do not port the X ordering blindly: a
mirrored thread that hides its link in post 8 is strictly worse on both
networks, because the reader who bounces at post 2 leaves with nothing.

Concretely, for both launch threads: take the URL out of the final
segment and append it to segment 1 on Bluesky and Mastodon. The final
segment keeps `npm i ivue vue` and loses the URL.

## Rule 2 — Mastodon's 500 characters merge segment pairs

Segment lengths in `launch-thread-alt.md` (X, measured): 237, 236, 249,
227, 189, 244, 231, 161. Mastodon at 500 characters merges adjacent
pairs wherever the sum plus a blank line stays under 500.

| Mastodon post | merges X segments | characters | note |
| --- | --- | --- | --- |
| 1 | 1 + link | 237 + 23 = 260 | banner attached; URL appended |
| 2 | 2 + 3 | 236 + 249 = 485 + separator | the claim and its four-item proof land together — the strongest merge in the thread |
| 3 | 4 + 5 | 227 + 189 = 416 | the heap table and the creation number belong in one post; the second is the first's consequence |
| 4 | 6 | 244 | left alone: merging 6 into 5 would put three separate numbers in one post and none would land |
| 5 | 7 + 8 | 231 + 161 = 392 | auditability plus the close |

Eight X segments become five Mastodon posts. Do NOT merge on Bluesky —
at 300 characters, only segment 8 has headroom, and merging 7+8 would
overflow.

## Rule 3 — first-post rewrites, per thread

A first post that says "1/8" reads as a fragment on a network where
threads are less of a native habit. Both first posts get a
self-contained rewrite. No numbering, no "a thread".

**`x-launch-thread` (the written launch thread), first post, Bluesky and
Mastodon version:**

> Plain TypeScript classes, fully reactive, 1.1 kB gzipped. Instances
> stay plain objects — nothing wraps them. 1,000,000 created in 22 ms.
> Zero dependencies, 100% test coverage.
>
> Every number re-runs in your browser: https://ivue.dev

**`launch-thread-alt` (the subtraction thread), first post, Bluesky and
Mastodon version:**

> The whole engine is 1,120 bytes gzipped. Lazy state, method binding,
> reactive inheritance with super, teardown, watchers. Zero
> dependencies, 100% coverage.
>
> Not a compression trophy — a diagnosis: https://ivue.dev

Both are under 300 characters with the URL counted, so the same text
works on Bluesky and Mastodon without a second edit.

## Rule 4 — hooks port unchanged, alt text does not

The 34 hooks in `xhooks.md` are all ≤270 characters, so every one fits
Bluesky's 300 and Mastodon's 500 with no rewrite. What does not port for
free: **image alt text**. Both networks treat missing alt text as a
quality signal, and Mastodon users say so in replies. Every banner,
code shot and article card carries alt text describing what the image
shows — for a code shot, the plain text of the code.

## Rule 5 — same day, then stay

The plan's standing rule is same-day mirroring. Add one thing: on
Mastodon, boosts come from people, not an algorithm, so the first
thirty minutes of replies decide the reach. Answer them there before
returning to X.

## Rule 6 — one account per instance, not one post per instance

Do not cross-post the same thread to front-end.social, Fosstodon and
Hachyderm from three accounts. Federation shows the same content three
times to anyone following two of them. Pick one home instance, post
there, and let boosts do the rest.
