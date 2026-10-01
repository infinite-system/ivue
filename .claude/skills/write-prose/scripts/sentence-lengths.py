#!/usr/bin/env python3
"""Report sentence lengths in markdown prose and list the long ones.

Pass 5 of the write-prose skill. Split every sentence of 20 words or more;
aim for a mean near 10 and a maximum under 20.

  sentence-lengths.py docs_v2/engine.md
  sentence-lengths.py --max 16 'docs_v2/blog/*.md'
  cat draft.md | sentence-lengths.py

Exits 1 when any file has a sentence at or over the threshold, so it works
as a gate in a loop or a hook.
"""
import glob
import os
import re
import sys

DEFAULT_MAX = 20

# Markdown that is not prose and must not be measured.
FENCE = re.compile(r"^```.*?^```", re.S | re.M)
FRONTMATTER = re.compile(r"\A---\n.*?\n---\n", re.S)
HTML_BLOCK = re.compile(r"<[^>]+>")
TABLE_ROW = re.compile(r"^\s*\|")
HEADING = re.compile(r"^\s{0,3}#")
INLINE_CODE = re.compile(r"`[^`]*`")
LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
BOLD_ITALIC = re.compile(r"[*_]{1,3}")
LIST_MARKER = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+")

# A period inside these must not end a sentence.
ABBREV = re.compile(r"\b(?:e\.g|i\.e|etc|vs|approx|Dr|Mr|Ms|Fig|No)\.", re.I)
# Fixed-width lookbehind only in Python, so spell both cases: a terminator,
# or a terminator followed by one closing quote or bracket.
SPLIT = re.compile(r"(?:(?<=[.:!?])|(?<=[.:!?][\"'\)\]]))\s+")


def prose(text):
    """Strip everything that is not running prose, then return sentences."""
    text = FRONTMATTER.sub("", text)
    text = FENCE.sub("", text)
    kept = []
    for line in text.split("\n"):
        if HEADING.match(line) or TABLE_ROW.match(line):
            continue
        kept.append(LIST_MARKER.sub("", line))
    text = " ".join(kept)
    text = LINK.sub(r"\1", text)          # keep link text, drop the URL
    text = INLINE_CODE.sub("CODE", text)  # one token, never a sentence break
    text = HTML_BLOCK.sub(" ", text)
    text = BOLD_ITALIC.sub("", text)
    text = ABBREV.sub(lambda m: m.group(0).replace(".", "\x00"), text)
    out = []
    for raw in SPLIT.split(text):
        sentence = " ".join(raw.replace("\x00", ".").split())
        if sentence and re.search(r"[A-Za-z]", sentence):
            out.append(sentence)
    return out


def measure(text, limit):
    sents = prose(text)
    lens = [len(s.split()) for s in sents]
    if not lens:
        return None
    return {
        "n": len(lens),
        "mean": sum(lens) / len(lens),
        "max": max(lens),
        "long": [(n, s) for n, s in zip(lens, sents) if n >= limit],
    }


def main(argv):
    limit = DEFAULT_MAX
    args = []
    i = 0
    while i < len(argv):
        if argv[i] == "--max":
            limit = int(argv[i + 1])
            i += 2
        else:
            args.append(argv[i])
            i += 1

    if not args:
        report = measure(sys.stdin.read(), limit)
        return emit("stdin", report, limit)

    files = []
    for a in args:
        files += sorted(glob.glob(a)) if any(c in a for c in "*?[") else [a]

    failed = 0
    for f in files:
        with open(f) as fh:
            failed |= emit(os.path.basename(f), measure(fh.read(), limit), limit)
    return failed


def emit(name, report, limit):
    if report is None:
        print(f"{name:32} no prose found")
        return 0
    print(
        f"{name:32} sentences={report['n']:4d} "
        f"mean={report['mean']:5.1f} max={report['max']:3d} "
        f"over_{limit}={len(report['long']):3d}"
    )
    for n, s in report["long"]:
        print(f"  {n:3d}  {s}")
    return 1 if report["long"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
