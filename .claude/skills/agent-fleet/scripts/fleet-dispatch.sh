#!/usr/bin/env bash
# Dispatch one press-venue discovery agent, invar-conductor style:
#   step 1 — launch bare interactive agent (codex/claude) in tmux;
#   step 2 — MECHANICALLY paste the full preload via tmux paste-buffer
#            (no argv limit, no "please read X") and submit it;
#   step 3 — caller sends the /goal gate afterwards.
# Usage: dispatch-press-agent.sh <name> <engine>
set -euo pipefail

name="$1"; engine="$2"
repo="/home/parallels/dev/ivue"
briefs="$repo/tmp/press-briefs"
session="ivue/$name"

model_for() { case "$1" in sol|terra|luna) echo "gpt-5.6-$1";; esac; }

# --- deterministic preload dump (single file, fixed section order) ---
preload="$briefs/PRELOAD-$name.md"
{
  cat "$briefs/COMMON.md"
  echo; echo "---"; echo
  cat "$briefs/ANGLE-$name.md"
  echo; echo "---"; echo
  echo "# PRELOADED SECTION 1/4 — the 48-article inventory"
  echo '```'
  cat "$briefs/article-inventory.txt"
  echo '```'
  echo; echo "# PRELOADED SECTION 2/4 — the existing press plan (do NOT duplicate its venues)"
  echo; cat "$repo/tasks/press-plan.md"
  if [ "$engine" = "codex" ]; then
    echo; echo "# PRELOADED SECTION 3/4 — IBR (your reasoning framework; adopt internally, write plain language)"
    echo; cat "$repo/.claude/skills/ibr/IBR.md"
  else
    echo; echo "# PRELOADED SECTION 3/4 — IBR: already injected into your SYSTEM PROMPT; adopt it."
  fi
  echo; echo "# PRELOADED SECTION 4/4 — the ivue engineering standard (what the product IS)"
  echo; cat "$repo/.claude/skills/ivue/SKILL.md"
  echo; echo "---"
  echo "END OF PRELOAD. Begin now: absorb, then execute your angle brief."
  echo "Your output file: tmp/press-briefs/out-$name.md (repo-relative). Work autonomously."
} > "$preload"
echo "preload built: $preload ($(wc -c < "$preload") bytes)"

# --- step 1: launch bare interactive agent ---
tmux kill-session -t "$session" 2>/dev/null || true
if [ "$engine" = "codex" ]; then
  tmux new-session -d -s "$session" -x 220 -y 50 -c "$repo" \
    "codex --dangerously-bypass-approvals-and-sandbox -m $(model_for "$name") -c model_reasoning_effort=high -c model_context_window=1000000 -c model_auto_compact_token_limit=900000"
  ready_re='^›'
else
  tmux new-session -d -s "$session" -x 220 -y 50 -c "$repo" \
    "claude --dangerously-skip-permissions --model opus --system-prompt USE_IBR_FOR_REASONING --append-system-prompt-file=$repo/.claude/skills/ibr/IBR.md"
  ready_re='for agents|bypass permissions'
fi

# wait for the composer to appear
for i in $(seq 1 60); do
  sleep 1
  pane="$(tmux capture-pane -t "$session" -p 2>/dev/null || true)"
  if printf '%s' "$pane" | grep -qE "$ready_re"; then break; fi
  if ! tmux has-session -t "$session" 2>/dev/null; then echo "DIED at startup"; exit 1; fi
done

# --- step 2: mechanical paste of the preload, then submit ---
tmux load-buffer -b "preload-$name" "$preload"
tmux paste-buffer -d -b "preload-$name" -t "$session"
sleep 6
# The TUI can stay inside bracketed-paste mode after a huge paste (Enter
# then gets EATEN as paste content — observed live on sol). Close the
# paste explicitly with the bracketed-paste END sequence ESC[201~, then
# submit.
tmux send-keys -t "$session" -H 1b 5b 32 30 31 7e
sleep 2
tmux send-keys -t "$session" C-m
sleep 6
# confirm the turn started (busy footer) — retry once if not
pane="$(tmux capture-pane -t "$session" -p)"
if ! printf '%s' "$pane" | grep -qiE 'esc to interrupt|Working'; then
  tmux send-keys -t "$session" -H 1b 5b 32 30 31 7e; sleep 1
  tmux send-keys -t "$session" C-m
  sleep 5
fi
pane="$(tmux capture-pane -t "$session" -p)"
if printf '%s' "$pane" | grep -qiE 'esc to interrupt|Working'; then
  echo "SUBMITTED — $name is working (attach: tmux attach -t $session)"
else
  echo "WARNING: busy footer not observed for $name — inspect: tmux attach -t $session"
fi
