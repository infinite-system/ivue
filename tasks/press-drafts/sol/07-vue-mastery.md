---
venue: Vue Mastery
purpose: pitch-email
lang: en
source: the-options-api-everyone-wanted
status: draft-for-review
---

To: team@vuemastery.com

Subject: Lesson pitch — state, derivation, and action become class anatomy

Gregg and team — Vue Mastery's weekly lessons move from API use into design patterns; this can be taught as one model-layer decision.

ivue is a 1.1 kB class layer over Vue's reactivity. It turns plain TypeScript classes into reactive models without wrapping instances in proxies.

Learners get one shape they can inspect: a ref-returning getter is state, a plain getter is derivation, and a method is action. `computed()` becomes an earned cache rather than the default derivation node.

The measured result is 55–253× creation versus the compared model layers, with zero dependencies and 100% test coverage.

https://ivue.dev/blog/the-options-api-everyone-wanted

If this fits a lesson or article, the code and browser benchmark are ready. If not, no reply is needed.
