# agent-tmux — reliable driver for interactive agents in tmux

`scripts/agent-tmux.sh` drives an interactive CLI agent (`claude` / `codex`) inside a tmux session
so a caller — a human, the fleet/director, a test — can launch it, send turns, wait, peek, and reap
**without re-rolling the fragile send-keys recipe** every time. It is the mechanism the fleet uses to
run workers (see `fleet.design.md`); the codex-review skill's hand-followed recipe is now this script.

## Why it exists

Driving an interactive agent through `tmux send-keys` is fragile in four ways, and every caller
re-derives (and re-breaks) the same fixes. This script bakes them in once, tested:

1. **Send races** — text + `Enter` in one call lands `Enter` mid-paste. → split: text, then the
   submission key, and confirm that the bottom-anchored composer structure returned to empty.
2. **Not-at-the-prompt** — startup + approval dialogs (MCP / trust) must be dismissed first, and the
   idle prompt must be detected. → wait for the idle footer (`for shortcuts` _or_ `for agents`),
   dismissing real dialogs — but **never** the persistent `bypass permissions on` footer (treating
   that as a dialog loops forever; the test suite caught exactly this).
3. **"Is the turn done?"** — guessing with a fixed sleep is wrong. → poll the busy indicator
   (`esc to interrupt`) in a capped loop.
4. **Reading** — capture a **bounded** window, not the whole scrollback.

It does **not** remove tmux's architectural limits: a pty is still required, and a live session is
**single-owner** (you can't drive it from two places at once).

## Verbs

```
agent-tmux launch <name> [--cwd D] [--timeout S] [--profile claude|codex] [--ready RE] [--busy RE] -- <cmd...>
agent-tmux send       <name> "<msg>"        # split-send + Enter, nudge if it didn't submit
agent-tmux wait       <name> [cap_seconds]  # block until idle (default 300) → idle|timeout|dead
agent-tmux send-wait  <name> "<msg>" [cap]  # send, wait for idle, return the reply
agent-tmux peek       <name> [lines]        # bounded capture-pane (default 40), plain text
agent-tmux status     <name>                # idle | busy | starting | dead
agent-tmux kill       <name>
agent-tmux list                             # logical names of live agent-tmux sessions
```

Sessions are namespaced `at_<name>` (override with `$AGENT_TMUX_PREFIX`). Per session the ready/busy
regexes are stored as tmux options, so every verb is profile-aware.

## Example — drive a claude worker

```bash
agent-tmux launch w1 --cwd "$PWD" -- claude --model haiku --dangerously-skip-permissions
agent-tmux send-wait w1 "Run the api typecheck and report pass/fail."
agent-tmux send w1 "Now fix the first error and re-run."
agent-tmux status w1            # busy | idle
agent-tmux peek   w1 60
agent-tmux kill   w1
```

The `claude` profile launches **persisted + promoted** (`env -u CLAUDE_CODE_CHILD_SESSION
CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1`), so the session survives a tmux/host death and can be
`--resume`d. Interactive sessions bill the **interactive** quota bucket (not the Agent-SDK pool,
which is `claude -p` only). A human can `tmux attach -t at_w1` to watch/steer any worker live.

## Profiles

- **`claude`** — verified (ready/busy markers, dialog dismissal, and bare/dim empty-composer forms).
- **`codex`** — verified with `^›` as ready and `esc to interrupt` as the common busy marker.
- **generic** — any binary; pass `--ready <regex>` (and optionally `--busy <regex>`).

## Tests

`scripts/agent-tmux.test.sh` (uses `test-lib.sh`):

```bash
bash scripts/agent-tmux.test.sh            # unit + real-tmux mechanics against a bash session (no quota)
AGENT_TMUX_LIVE=1 bash scripts/agent-tmux.test.sh   # also a live claude (haiku) smoke
```

The suite covers both send polarities. A real submitted turn must confirm. Literal input with
submission keys suppressed must exit 1 and report `NOT CONFIRMED`.
