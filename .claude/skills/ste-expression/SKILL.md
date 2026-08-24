---
name: ste-expression
description: Express yourself in Simplified Technical English (ASD-STE100, adapted for ivue). Applies to replies, blog prose, docs prose, commit messages, and reports — never to code. Use when writing any prose for this project, when asked to make text plain, or when explaining what you did, found, or propose — the ten-year-old layer applies to every finding, fix, and claim.
---

# ste-expression — plain prose for ivue

Write short, direct sentences. The reader is busy. Adapted from
ASD-STE100 (asd-ste100.org). Cross-model tests in the source kit cut
slop by 50-74% with these rules.

## Where each mode applies

| Text | Mode |
|---|---|
| Replies and status updates to the user | flavored |
| Blog articles (see write-article for how the modes meet the voice) | flavored |
| Docs/guide prose (write-docs rules also apply) | flavored |
| Commit messages | flavored |
| Error messages and guard text in scripts | strict |
| Code, identifiers, commands, code comments | exempt — never touch |

## Rules (both modes)

WORDS
- One name for one thing. Do not rename an item mid-document.
- Use the short common word: start (not initiate), use (not utilize/leverage),
  help (not facilitate), make sure (not ensure), before (not prior to), about
  (not regarding), get (not obtain), show (not demonstrate), also (not
  additionally/furthermore).
- No marketing adjectives: seamless, robust, powerful, elegant, world-class.

VERBS
- Active voice. "The gate blocks the merge", not "the merge is blocked".
- A verb for an action. "Analyze the log", not "perform an analysis of the log".
- No hedging stacks. Not "it is important to note that this may help". Write
  "this helps X" or state the doubt plainly: "this may not hold at 500k".

SENTENCES
- One point per sentence. Aim under 20 words. Hard cap 25 in flavored mode.
- No semicolons. Write two sentences.
- Avoid the em dash. It is the top slop marker in our own output. One per
  paragraph at most. Prefer a period or a comma.

STRUCTURE
- One topic per paragraph, six sentences maximum.
- Steps go in a numbered list, one action per item, imperative form.
- Put the condition before the command: "If the gate is red, do not merge."

## Strict mode adds

- Hard cap 20 words per sentence.
- No contractions.
- Error messages name three things: what failed, why, what to do next.

## The ten-year-old layer

Plain sentences are not the same as a plain explanation. A reader can parse
every word and still not know what happened. So for anything you did, found,
or propose, add the version a ten-year-old could follow.

This is not dumbing down. It is a proof of comprehension. If you cannot say
what a thing does without the jargon, you do not yet know what it does. The
jargon was carrying the understanding for you.

HOW

- Name real things, not categories. Say "the test counted the rows on the
  screen", not "the assertion evaluated the projected row cardinality".
- Use cause and effect in order. "A ran. Then B ran on top of A. B erased A."
- Prefer things a person can picture: a click, a file, a row, a wait, a
  timer, a copy.
- Keep it to two or three sentences. If it needs ten, the thing itself is
  probably two things.
- Say what it means for the reader. "So the panel looked empty" beats "so
  the invariant was violated".

WHY IT WORKS (the generation test)

This is not an appeal to a quote. Two are usually named: an Einstein line
that has no source in his writings, and the Feynman technique, which is real
but distilled from how he taught rather than written up by him. The rule
stands on structure instead.

An invariant is proven by generating every valid instance of its domain. If
you hold the generator, you can produce ANY expression of it, and the child's
version is just one more instance. If all you hold is one memorized surface
expression, you can only replay that expression. Jargon is what a memorized
surface expression sounds like.

So "I cannot say it simply" is the generation test failing, and it names the
defect exactly: you have a description, not a generator. The fix is to reduce
until the generator appears, not to search for easier words.

The guard follows from the same rule. Simplicity here is compression, not
truncation. Drop the number and you get a shorter expression that generates
LESS, which is the opposite of reduction.

EXAMPLES from real work

- Jargon: the smoke priced host fleet state into its row counts.
  Plain: the test counted rows on the screen. One row only appears while a
  build is running on this machine. So the test passed on a quiet machine and
  failed on a busy one.

- Jargon: a pre-satisfied wait inverted the gesture.
  Plain: I clicked a button to open a menu. The menu was already open, so my
  click closed it. Then I reported that it closed by itself.

- Jargon: folder-open task launch preceded panel restoration.
  Plain: the app started the terminals first. Then it loaded the saved layout
  on top of them. The saved layout wiped out the terminals it had just made.

WHERE IT APPLIES — REQUIRED, not optional

- Blog articles: every mechanism gets its plain version before or right
  after the exact one. A benchmark table earns a sentence a ten-year-old
  could say back ("the cache reads fast, but it charges rent every time
  the value changes").
- Docs/guide prose: first use of a term of art gets its plain meaning
  in-line (this is also a write-docs rule — same rule, one name).
- Replies to the user: after any finding, fix, or refusal. Lead with the
  plain version when the reader has not seen the area today.
- Commit messages: the first line. A reader six months out has no context.

THE GUARD

The plain version is added, never substituted. Exact values, paths, hashes,
and counts stay. Write the plain sentence, then the exact one. A plain
sentence that drops the number is not an explanation. It is a mood.

## What the rules must never remove

Precision outranks brevity. Keep exact paths, exit codes, commit hashes,
counts, and names. Keep a needed 30-word constraint as one sentence if
splitting it changes the meaning. A brief that is plain but vague is worse
than a dense one that is exact.

## Self-check before returning text

1. Any sentence over the cap? Split it.
2. Any semicolon or stacked em dashes? Rewrite.
3. Passive voice with a known actor? Make it active.
4. "Perform an analysis" shapes? Use the verb.
5. The same thing under two names? Pick one.
6. Could a ten-year-old say back what happened? If not, add the plain
   version, and keep the exact one.

## The linter

```
python3 .claude/skills/ste-expression/scripts/ste-lint.py <file.md>
```

Score is violations per 100 words. Lower is cleaner. Use it as a delta signal
on drafts, not as a gate. Under 2.0 is good for our documents. Run it on
every blog draft before the banner step. The linter skips code blocks and
inline code.

The linter covers only the mechanical rules. It cannot judge whether a
sentence is true or exact. That part stays with the writer.
