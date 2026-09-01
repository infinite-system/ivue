---
venue: Michael Thiessen newsletter
purpose: pitch-email
lang: en
source: the-options-api-everyone-wanted
status: draft-for-review
---

To: michael@michaelnthiessen.com

Subject: The missing author for Vue's reactivity primitives

Michael — your Advanced Reactivity work starts where most Vue content stops; this asks what should author those primitives.

ivue is a 1.1 kB class layer over Vue's reactivity. It makes plain TypeScript classes reactive while instances remain plain objects.

The article reduces the Options-versus-Composition debate to one reader benefit: code with anatomy. Ref-returning getters hold state. Plain getters derive through tracked leaf reads. Methods bind once and keep their identity. The Composition API remains the machinery underneath.

Creation measured 55–253× faster than the compared model layers. The engine has zero dependencies and 100% test coverage.

https://ivue.dev/blog/the-options-api-everyone-wanted

If it fits the newsletter or DejaVue, use whichever surface serves the argument. If not, no reply is needed.
