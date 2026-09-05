---
name: agent-fleet
description: >-
  Run a fleet of research/writer agents (codex sol/terra/luna at 1M context, claude opus)
  invar-conductor style from this repo: mechanical context preload (never "please read X"),
  two-step dispatch (brief then /goal gate), DONE CHECKLISTs with observed evidence,
  reports born as artifact files, conductor-side verification. Use whenever work fans out
  to multiple nested agents (venue research, article drafting, parallel investigation).
  Companion: the agent-tmux skill (the transport verbs); this skill is the ORCHESTRATION.
---

# agent-fleet — conductor-style multi-agent runs in the ivue repo

Adapted from invar's conductor skill (read
`../invar/.claude/skills/conductor/SKILL.md` for the full doctrine when
orchestration grows past one evening). This file carries what THIS repo
needs: launch recipes, the preload law, the two-step dispatch, and the
verification duties. Transport mechanics (send/state/peek/wait) live in
`.claude/skills/agent-tmux/SKILL.md` — read it before driving sessions.

## Launch recipes (verified 2026-09-01)

Codex, 1M context window (sol = strongest, terra, luna = cheapest;
model economy: research on luna, hard synthesis on sol):

```bash
codex --dangerously-bypass-approvals-and-sandbox \
  -m gpt-5.6-sol \
  -c model_reasoning_effort=high \
  -c model_context_window=1000000 \
  -c model_auto_compact_token_limit=900000
```

Claude opus with IBR as the SYSTEM PROMPT (the strongest seat — same
shape the user runs the main session in):

```bash
claude --dangerously-skip-permissions --model opus \
  --system-prompt USE_IBR_FOR_REASONING \
  --append-system-prompt-file=.claude/skills/ibr/IBR.md
```

Sessions are tmux, named `ivue/<agent>`, launched detached
(`tmux new-session -d -s ivue/<name> -x 220 -y 50 -c <repo> "<cmd>"`).
The worked dispatch script: `scripts/fleet-dispatch.sh` beside this
file — read it before writing a new one; it encodes every lesson below.

## THE PRELOAD LAW — dump mechanically, never instruct to read

Agents skip reading when told "read X first" — sometimes heavily. So
context is INJECTED, not requested:

- Build one deterministic preload file per agent by CONCATENATION
  (common brief + angle brief + inventories + IBR + the ivue skill),
  fixed section order, headed `# PRELOADED SECTION n/N`.
- **argv is capped at 128KB per single argument on Linux** (E2BIG hit
  live at 147KB) — a big preload cannot ride the CLI positional
  prompt. The channel that has no cap: launch the agent bare, then
  `tmux load-buffer -b <buf> <file>` + `tmux paste-buffer -d -b <buf>
  -t <session>`.
- **After a huge paste the TUI can stay INSIDE bracketed-paste mode**:
  every later keystroke (Enter included) is eaten as paste content —
  observed live: each Enter appended another [Pasted Content] chunk.
  Close the paste explicitly with the bracketed-paste END sequence,
  then submit:
  `tmux send-keys -t <s> -H 1b 5b 32 30 31 7e` → sleep → `C-m`.
- Verify submission by the BUSY FOOTER appearing (`esc to interrupt`),
  never by the text being visible (an unsubmitted composer looks
  identical — the agent-tmux ladder).
- For claude agents, IBR goes in via `--append-system-prompt-file`
  (stronger than in-turn) and the rest of the preload via paste.

## Two-step dispatch (invar law): the BRIEF, then the GOAL

1. **The brief** is the preload's head: `## In plain words` (2–3
   sentences with no jargon, direct transmission), the task, a STRICT output
   format (machine-mergeable tables), the agent's LANE (disjoint
   angles per agent — overlap only when convergence-validation is
   wanted), and `## THE DONE CHECKLIST` — numbered checkpoints
   (CP1..CPn), each requiring OBSERVED EVIDENCE (counts, strings read
   back) in a `## Checkpoint report` table in the output file. Honest
   NOT DONE rows accepted; silent omissions are not.
2. **The goal**, sent SEPARATELY after launch:
   `/goal You may not write DONE until EVERY checkpoint ... passes`
   pointing at the brief's checklist (one source of truth — never
   restate the checklist in the goal). Sent second so it's what the
   agent holds when deciding whether to stop. `/goal` works in BOTH
   codex and claude CLIs.
3. Goal delivery while the agent is mid-turn: codex queues with
   **Tab**; claude queues with **Enter**. VERIFY: codex shows
   `shift + ← edit last queued message` / a `↳` marker; claude shows
   `Press up to edit queued messages`. Text visible in the composer
   proves NOTHING (it sat unsubmitted on both claude agents tonight
   until an explicit Enter).

## Reports and verdicts

- Every agent writes its report to a DURABLE artifact file named in
  the brief (`tmp/press-briefs/out-<name>.md` tonight); last line is
  the literal `DONE`. Verdicts come from artifacts, never from panes.
- Poll with `tmux capture-pane` for the busy footer + check the out
  file's existence and tail. An interactive agent never exits when
  finished — it goes idle.
- **Conductor verification is mandatory before using results**
  (two-arms): row counts vs the checklist's claims, spot-check a
  sample of URLs yourself, dedupe across agents, and treat every
  delegated finding as a HYPOTHESIS until checked. Convergence
  between independent agents is supporting evidence, not proof.

## The wave pattern

Fan-out happens in WAVES, synthesis between them, conductor builds
while agents run: wave 1 discover (research lanes) → conductor merges
+ verifies → wave 2 produce (writers get the merged map + house voice
skills preloaded: write-article title doctrine, ste-expression,
blog voice) → conductor assembles the deliverable (data + UI + docs).
Never idle-wait on a wave: the conductor's own build work (components,
skills, synthesis scaffolding) runs between polls.

## Hygiene

- `tmux kill-session -t ivue/<name>` after reaping; never leave a
  fleet running unattended past its task.
- Preloads/briefs/outputs live under `tmp/` (gitignored); the skill
  and dispatch script are the committed knowledge.
- Steering mid-flight: one small message via the queue mechanics
  above; a file is not a channel after launch (agent-tmux law).
- Model quota: codex sessions are cheap; claude opus sessions bill
  the interactive bucket — spawn only what the task earns.
