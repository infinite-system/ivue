---
name: agent-tmux
description: >-
  Drive an interactive CLI agent (claude / codex) inside tmux — launch it, send prompts/turns, ask
  whether its turn is really over, peek its output, steer it, resume it, reap it. Use this WHENEVER you
  need to run, watch, or converse with a nested claude/codex session (the fleet, cross-model review, or
  steering a long-running builder). Do NOT hand-roll `tmux send-keys`, and do NOT launch with
  `codex exec` / `claude -p` — both are encapsulated in scripts/agent-tmux.sh beside this file. Read
  this before driving any agent in tmux.
---

# Driving interactive agents in tmux — use `scripts/agent-tmux.sh`

**Rule: don't hand-roll `tmux send-keys`.** Every caveat below was learned by getting it wrong in
production on 2026-07-28; the script encapsulates the fixes.

```
agent-tmux launch <name> [--cwd D] [--profile claude|codex] [--ready RE] [--busy RE] -- <cmd...>
agent-tmux send       <name> "<prompt>"      split-send + Enter, then CONFIRM it submitted
agent-tmux state      <name> [window]        TRUST THIS — busy | idle | starting | dead | idle-unconfirmed
agent-tmux status     <name>                 pane-only, cheap, CAN LIE (see below)
agent-tmux rollout    <name> [window]        producer-side growth: grew | quiet | unknown
agent-tmux wait       <name> [cap]           block until idle
agent-tmux send-wait  <name> "<msg>" [cap]   send + wait + return the reply
agent-tmux peek       <name> [lines]         bounded capture, plain text
agent-tmux kill <name> · agent-tmux list
```

Sessions are namespaced `at_<name>` (override with `AGENT_TMUX_PREFIX=ivue/` for
`tmux attach -t ivue/<name>`). In THIS repo the primary consumer is the article-art
pipeline — see `.claude/skills/article-art/SKILL.md` for driving codex image
generation through these verbs.

## Interactive, never `exec` / `-p`

`codex exec` and `claude -p` are one-shot with **no input loop**. Three amendments were appended to a
live builder's `TASK.md` and then sent with `tmux send-keys`; **none reached it**, because nothing was
listening. It would have finished on a superseded brief.

Two traps made that look like it had worked:

- **A file is not a channel.** `dispatch.sh` writes the brief to three homes AT LAUNCH — the one
  moment a file works. After launch the only live channel is the session's stdin.
- **`pipe-pane` captures your own echoed keystrokes.** Grepping the transcript for the message you
  just sent proves an ECHO, not receipt. It "confirmed" a delivery that never happened.

Interactive also means a human can `tmux attach` and type, which is the reason to use tmux at all.

## Turn state: use `state`, not `status`

`status` reads the pane — a PROXY for what the agent DISPLAYS. It lied twice within one hour:

- a marker built on codex's **permanently visible** `gpt-<ver>-sol high · ~/path` line is always true,
  so `status` was structurally incapable of answering anything but `idle`; it called a mid-turn
  session idle;
- a narrow busy marker (`Working \(`) missed a SECOND busy footer,
  `Waiting for background terminal (58s · esc to interrupt)`, so it called a blocked session idle —
  `wait` would have returned on an unfinished turn.

`state` requires two independent sources to agree before reporting idle: the pane marker AND
quiescence of codex's append-only rollout at `~/.codex/sessions/<Y>/<M>/<D>/rollout-*.jsonl` — the
producer's own record, unaffected by rendering, redraws, or unsubmitted composer text.

**Honest limit.** That rollout carries `task_started` per turn and a `token_count` stream during one,
but **no turn-complete event**, so it cannot prove idleness either. `state` is a conjunction, not a
proof: two independent sources failing the same way is far less likely than one. When the rollout
can't be identified it returns `idle-unconfirmed` rather than silently upgrading an unverifiable
answer to `idle`. Prefer a false `busy` (costs a poll) over a false `idle` (corrupts a result).

## Profiles

**claude** — verified. The idle footer keeps `for agents` in both normal and
`--dangerously-skip-permissions` modes (the latter replaces `? for shortcuts` with
`⏵⏵ bypass permissions on …`). Launches promoted + persisted, so a worker survives a tmux/host death
and is `--resume`-able. Interactive sessions bill the **interactive** quota bucket; `claude -p` bills
the small Agent-SDK pool, which is a second reason not to use it.

**codex** — verified 2026-07-28 against live interactive codex (gpt-5.6-sol), both directions:
- `BUSY_RE='esc to interrupt'` — deliberately the substring COMMON to every observed busy footer.
  Reported `busy` mid-turn and `idle` after.
- `READY_RE='^›'` — **non-discriminating alone**: codex keeps a hint in the composer, so the prompt
  glyph is always present. Idle means "matches READY and NOT BUSY", which works only because the verbs
  test BUSY first. Get BUSY right or both lie.

## Sending — and the key that submits DEPENDS ON WHETHER A TURN IS RUNNING

**While codex is mid-turn, `Enter` is a no-op. `Tab` is what queues.** The footer says so —
`tab to queue message` — and that footer is the state signal. Nudging Enter at a busy session, any
number of times, leaves the text sitting in the composer. This cost a whole steering message on
2026-07-28: `send` typed ~1900 characters, pressed Enter ten times, printed `submitted`, and the text
was still visibly unsent when the human looked at the pane. One `Tab` queued it instantly.

`send` therefore re-checks the affordance on every iteration (a turn can start or end while you
nudge) and presses `Tab` or `Enter` accordingly. It confirms on one of two POSITIVE outcomes and
`return 1`s otherwise:

- **queued** — the count of `↳` markers INCREASED. Counting matters: the mere presence of a `↳` only
  proves some earlier message was queued.
- **submitted** — the engine-specific composer structure returned to empty. Codex compares its stable
  `›` line. Claude checks the bottom-anchored composer frame and accepts its bare or dim-placeholder
  empty forms. Pending Claude input is ordinary text, not a dim placeholder.

The detector this replaced recognised unsent text only as `[Pasted Content N chars]`. Text typed with
`send-keys -l` renders as **ordinary visible composer lines** with no placeholder at all, so it found
nothing, concluded "not pending" on the first poll, and reported success. Pending text has more than
one rendering; a check that knows one of them is a check with one reachable outcome.

## What each delivery check actually proves — the ladder

Three sends failed in one morning, each because a check could report only one answer. Confirming
delivery to a nested agent has FIVE distinguishable levels, and it matters which one you have:

| check | proves |
|---|---|
| the text appears in the pane | **nothing** — an unsubmitted composer looks identical |
| the pane went busy | **nothing when it was ALREADY busy** — passes trivially |
| `pipe-pane` transcript contains the text | **nothing** — it captures your own echoed keystrokes |
| no `[Pasted Content]` placeholder | **nothing** — typed text never produces one; this read as "sent" for a composer full of visible text |
| the bottom-anchored composer structure is empty | the input was **consumed** |
| the `↳` marker COUNT increased, or a transcript TURN | it is **accepted and will run** / it **ran** |

Claude output cannot impersonate the check by printing the same words. Its output stays above the
bottom composer frame, while the check reads that frame and its text style.

`send` confirms at the composer-empty level, which is where a sender can honestly stop, and it now
**fails loudly** (`return 1`) if the composer never empties. The version it replaced polled for busy
and returned success unconditionally — so against an already-busy session it reported a delivered
message that was sitting in the composer as `[Pasted Content 1022 chars]`.

Note the asymmetry that makes the naive checks so tempting: all three useless ones are cheap and
usually correlate with success. They only diverge in the exact situation you care about — steering a
builder that is already mid-turn.

## Resuming — a killed builder is not lost work

`codex resume <SESSION_ID>` restores full context, and **an `exec` run leaves a resumable rollout**
despite the flag saying "interactive". Find the session by matching the worktree path inside
`~/.codex/sessions/.../rollout-*.jsonl`, then relaunch:

```
agent-tmux launch <name> --cwd <worktree> --profile codex \
  -- codex resume <SESSION_ID> --dangerously-bypass-approvals-and-sandbox
```

Verified: a resumed session recited its own prior reasoning verbatim, including in-flight conclusions.
WIP-commit the worktree first — files survive a kill regardless, but commit so the state is named.

## Watching a builder

An interactive agent **does not exit when it finishes** — it goes idle. A monitor keyed on process
death never fires. Wake on: the READY artifact appearing, `state` reporting idle for two consecutive
polls (turn ended — finished, or blocked and ASKING), or session death.

**Single-owner:** a live session has one owner; a human attaches to watch and steer, but don't expect
two drivers. **Verdicts come from artifacts** (`/tmp/<name>-READY.md`, `git`), never from the pane.

Reference: `scripts/agent-tmux.readme.md`. Tests: `scripts/agent-tmux.test.sh`
(`AGENT_TMUX_LIVE=1` for the live smoke).
