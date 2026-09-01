---
venue: LearnVue
purpose: pitch-email
lang: en
source: the-options-api-everyone-wanted
status: draft-for-review
---

To: matt@learnvue.co

Subject: A Vue lesson where Options and Composition keep their wins

Matt — your Vue 3 cheat sheet puts the Options and Composition APIs side by side; this article resolves what each one was preserving.

ivue is a 1.1 kB class layer over Vue's reactivity. It makes plain TypeScript classes reactive while instances remain plain objects.

The lesson writes itself on screen: state is a ref-returning getter, derivation is a plain getter, and action is a method. The class restores the anatomy people wanted from the Options API while using Composition API primitives underneath.

Creation measured 55–253× faster than the compared model layers. Coverage is 100%, and the benchmark runs in the browser.

https://ivue.dev/blog/the-options-api-everyone-wanted

If this serves a LearnVue lesson, I can provide the repro steps. If not, no reply is needed.
