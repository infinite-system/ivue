---
venue: Bytes
purpose: pitch-email
lang: en
source: the-options-api-everyone-wanted
status: draft-for-review
---

To: hello@bytes.dev

Subject: A 1.1 kB class layer creates models 55–253× faster

Tyler — Bytes can do more with “253×” than I can, so I am leaving the joke slot open.

ivue is a 1.1 kB class layer over Vue's reactivity. Plain TypeScript classes become reactive models; the instances remain plain objects.

The article's claim is that the Options API's real benefit was anatomy, not its object syntax. State becomes a ref-returning getter. Derivation becomes a plain getter. Methods stay methods and bind once.

In retained-instance benchmarks, creation measured 55–253× faster than the compared model layers. The engine has zero dependencies and 100% test coverage.

https://ivue.dev/blog/the-options-api-everyone-wanted

Use it if the numbers earn a slot. If they do not, no reply is needed.
