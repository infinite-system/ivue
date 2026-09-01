---
venue: devtools.fm
purpose: pitch-email
lang: en
source: the-zeros-didnt-move
status: draft-for-review
---

Subject: Guest application — the 1.1 kB layer under a 94,000-line IDE

Andrew and Justin — devtools.fm interviews the people behind the tool, so this episode would be the design reduction rather than a release tour.

ivue is a 1.1 kB class layer over Vue's reactivity. An AI-agent fleet used it to build Invar, a terminal IDE with 94,000 lines of editor source.

At the 68,936-line checkpoint, the repo had zero cycle-breaking workarounds, two `computed()` calls, 1,371 tests, and 16,087 assertions. The mechanism is a one-time prototype transform: ref-returning getters become lazy state, plain getters derive, and methods bind once.

I can run the browser benchmark and the repository census during the recording.

https://ivue.dev/blog/the-zeros-didnt-move

If the tool does not fit the show, no reply is needed.
