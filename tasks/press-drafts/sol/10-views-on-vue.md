---
venue: Views on Vue
purpose: pitch-email
lang: en
source: the-options-api-everyone-wanted
status: draft-for-review
---

Subject: Guest idea — what Vue's two APIs were both trying to preserve

Charles — Views on Vue has used open-source libraries to discuss interface boundaries; this premise begins with the boundary both Vue APIs exposed.

ivue is a 1.1 kB class layer over Vue's reactivity. Plain TypeScript classes become reactive models while instances remain plain objects.

The conversation is not “classes versus composables.” It is anatomy versus machinery. The Options API gave components a readable shape through a proxy-backed DSL. The Composition API gave Vue honest primitives. A class uses those primitives while state, derivation, and action become language members again.

The receipts are 55–253× creation, zero dependencies, 100% coverage, and a 108,000-line agent-built IDE.

https://ivue.dev/blog/the-options-api-everyone-wanted

If the premise fits the show, I can bring benchmark repros. If not, no reply is needed.
