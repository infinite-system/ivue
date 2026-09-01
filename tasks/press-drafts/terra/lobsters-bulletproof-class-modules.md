---
venue: lobste.rs
purpose: post
lang: en
source: bulletproof-class-modules
status: draft-for-review
---

## Submission title

Give every class value one home

## Suggested first comment

ivue, a **1.1 kB class layer over Vue's reactivity**, uses one question to reduce a class module: what kind of value is this, and at what scope should it exist? The resulting map has nine homes: lazy ref-getters for mutable instance state, plain getters for uncached derivations, `computed()` only for a cache, `$`-getters for per-instance services, methods for stable callbacks, live statics for tunables, `$`-statics for per-receiver memos, static fields for shared stores, and `LazyShared` for a shared value that must not construct during module load. The point is not a new taxonomy. It is to make forked registries, eager module reads, and cache allocation visible as wrong placements. The post includes the full code and a measured construction result: **100,000 instances were 55–253× faster** than the compared eager shapes. [Read the map and methods.](https://ivue.dev/blog/bulletproof-class-modules)
