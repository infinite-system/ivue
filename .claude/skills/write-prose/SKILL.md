---
name: write-prose
description: ALWAYS use when writing or editing any prose for this project. Docs pages, blog posts, launch copy, commit messages, reports, and replies to the user. Not an on-request pass. Draft, then run every pass below before calling the text done, including when nobody asked you to shorten anything. Covers the cut list, the claim check, vocabulary, sentence length, the two reference bugs that cutting creates, and the verify loop.
---

# write-prose

Remove what does nothing. Then check that what is left still refers to
things that exist.

**This runs on everything, every time.** A first draft is never finished
text. Nobody has to ask for a reduction. The passes below are what makes a
draft done, and skipping them because the writing "reads fine" is how all
of pass 2 ships.

Where this sits next to the other skills: `ste-expression` has the sentence
rules, `write-article` has titles and structure, `my-voice` has the public
register. This one has the cut list and the verify loop.

One full run on `docs_v2/engine.md` took 1293 words to 779 and 50 lint
findings to 0. Mean sentence went from 13.6 words to 10.1. Every claim,
number, link and code block survived.

## The order

Run the passes in order. Each one exposes work the previous one hid.

1. Linters.
2. The cuts no linter can see.
3. The claim under each sentence.
4. The words the reader uses.
5. Sentence length.
6. The reference check, after any cut.

## Pass 1: linters

```sh
vale <file>
python3 .claude/skills/ste-expression/scripts/ste-lint.py <file>
```

Fix every finding. Never suppress a rule to pass. If a rule looks wrong,
rewrite the sentence anyway.

These catch em-dashes, semicolons, explainer headings, not-X-but-Y
formulas, banned words, consequence clauses, tricolons, repeated sentence
openings, and mic drops. They catch nothing in pass 2.

## Pass 2: the cuts

Read the draft cold and delete on sight. Every type below came out of one
page after the linters reported clean.

**Self-summary.** A closing section that restates the piece. Cut the
section.

**Boundary formula.** A "what I am not claiming" block. It apologises to
objectors who are not in the room. State scope once, where it is true.

**Restatement.** A sentence saying what the sentence before it said.

```text
… one expensive search sweep, one render-suppressing window snapshot, one
stable watched handle. Each of the three maps to a named exception in the
doctrine.
```

**Anecdote.** A true detail that changes nothing for the reader.

```text
A fourth was deleted when it failed the test.
```

**Tangent.** A sentence belonging to another page's argument. A
just-in-time compiler claim on a page about memory is a link wearing a
sentence.

**Crouch.** A defence against an accusation nobody made. One page held four
variants of "this adds nothing to the framework". Keep zero.

**Trivia.** Build mechanics inside a claim about something else.

**Credibility label.** Evidence makes a claim credible, so a phrase
asserting credibility only takes up room.

```text
Consequences observed in production, not projected.
The honest numbers.
```

**Move label.** A stage direction. The reader hears a script.

```text
Falsifiable:   To be clear,   The short version,   TL;DR
```

**Flourish.** A metaphor arriving after the precise sentence already made
the point.

```text
The getter is a transparent corridor.
```

**Unearned scale.** "Orders of magnitude" with no number, on a page whose
real numbers appear later.

**Padding.** A triple where a pair says it. An abstraction sitting on top
of the concrete fact it abstracts.

```text
Complexity becomes locally auditable, because each new getter's cost is
readable off its body.
```

Keep the second half.

**Grid restatement.** A table repeating the prose on both sides of it. One
table's rows fit in two clauses and read better.

## Pass 3: the claim under the sentence

A sentence can be clean and still false. Reduction is when to test the
welds.

One bullet read "10k-row virtualized lists stop paying megabytes of
bookkeeping" and cited two benchmarks. The virtual scroller builds no
instance per row, so nothing was there to save. Both benchmarks measured
something else.

When a sentence pairs a scenario with a number, open the benchmark and
confirm it measures that scenario. Replace the scenario or replace the
number. Never keep a weld you have not opened.

## Pass 4: the reader's word

Pick the word the reader uses for the thing, not the word that is most
exact.

"Closure" is correct JavaScript. A Vue developer says `setup()` and
composable instead. The page dropped "closure geometry", a term coined
there and used nowhere else in the docs.

- A coined term must earn its keep across more than one page.
- A straight swap is usually wrong. That section's code example was
  `setup()`, so a composable heading would contradict the example. Use both
  words the reader recognises.

```sh
grep -c '<term>' <file>          # eight uses in 862 words is a tic
grep -rn '<term>' docs_v2/       # used nowhere else means it is not a term
```

## Pass 5: sentence length

```sh
python3 - <<'PY'
import io,re
s=io.open('<file>',encoding='utf-8').read()
s=re.sub(r'```.*?```','',s,flags=re.S)
s=re.sub(r'^---.*?^---','',s,flags=re.S|re.M)
text=' '.join(l for l in s.split('\n') if not l.startswith('#'))
sents=[x.strip() for x in re.split(r'(?<=[.:!?])\s+',text) if x.strip()]
lens=[len(x.split()) for x in sents]
print(f"n={len(lens)} mean={sum(lens)/len(lens):.1f} max={max(lens)}")
for x in sents:
    if len(x.split())>=20: print(f"  {len(x.split()):3d}  {x}")
PY
```

Split every sentence of 20 words or more. Aim for a mean near 10 and a
maximum under 20.

The longest sentence is usually the most wrong. One 36-word bullet buried
its number inside a feature list. Split, it opens with the number.

Splitting exposes rules that long sentences hide. Consequence clauses,
negated objects and repeated openings will fire on text that was clean
before, so re-run pass 1.

## Pass 6: the reference check

Reduction damages the text here. Both of these shipped.

**Dangling pronoun.** Cutting a noun leaves the pronoun pointing at the
wrong thing.

```text
A closure has no prototype and a class does. Every requirement that forced
computed() in closures is met on one.
```

"One" has to reach past "a class" to "prototype". The reader holds "class".

**Dangling reference.** Cutting a phrase orphans the sentence pointing at
it. "Given the syntax" survived two commits after "an ergonomic syntax" was
deleted.

After any cut, grep for every back-reference and confirm each still has a
target: one, it, that, there, this, those, the former, given, with that.

## Verify

```sh
vale <file>                                          # 0 findings
python3 .claude/skills/ste-expression/scripts/ste-lint.py <file>
npm run build:docs                                   # links resolve
npm run render:page-og                               # if title or description changed
```

View the regenerated banner. A longer description truncates mid-sentence.

## What never goes

Reduction removes words, never evidence. If a pass removes a number, it was
the wrong pass.

A page ending on a link ends flat. Make the last line a sentence that
survives with no context and would still be true if the product did not
exist.

```text
The cheap mode was always in the engine. There was no way to write it down.
```
