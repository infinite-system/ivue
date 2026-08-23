#!/usr/bin/env bash
# agent-tmux.test.sh — tests for agent-tmux.sh.
#   ./agent-tmux.test.sh           unit + tmux-mechanics (bash session) — no quota
#   AGENT_TMUX_LIVE=1 ./…          also a live claude (haiku) smoke (spends a little quota)
#
# Sources agent-tmux.sh (its source-guard suppresses the dispatcher) to call functions
# directly. Runs WITHOUT errexit, like the other suites.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export AGENT_TMUX_PREFIX="att_" # isolated namespace so tests never touch real at_ sessions
# shellcheck source=agent-tmux.sh
source "$HERE/agent-tmux.sh"

test_pass_count=0
test_failure_count=0
ok() {
  printf '  PASS  %s\n' "$1"
  test_pass_count=$((test_pass_count + 1))
}
bad() {
  printf '  FAIL  %s\n        expected: %s\n        actual:   %s\n' "$1" "$2" "$3"
  test_failure_count=$((test_failure_count + 1))
}
eq() {
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "$2" "$3"; fi
}
report() {
  printf '\nagent-tmux: %s passed, %s failed\n' "$test_pass_count" "$test_failure_count"
  [ "$test_failure_count" -eq 0 ]
}

command -v tmux >/dev/null 2>&1 || { echo "tmux not installed — skipping"; exit 0; }

echo "── unit: profiles & naming ──"
_profile claude
eq "claude READY_RE" "for shortcuts|for agents" "$READY_RE"
eq "claude BUSY_RE" "esc to interrupt" "$BUSY_RE"
[ -n "$LAUNCH_ENV" ] && ok "claude launch env sets persistence/promotion" || bad "claude LAUNCH_ENV" "non-empty" "empty"
case "$LAUNCH_ENV" in *FORCE_SESSION_PERSISTENCE*) ok "launch env forces persistence" ;; *) bad "persistence flag" "present" "$LAUNCH_ENV" ;; esac
_profile codex
[ -n "$READY_RE" ] && ok "codex READY_RE present (stub)" || bad "codex READY_RE" "non-empty" "empty"
READY_OVERRIDE="ZZZ"; _profile claude; eq "--ready override wins" "ZZZ" "$READY_RE"; READY_OVERRIDE=""
eq "_sess namespacing" "att_foo" "$(_sess foo)"

echo "── unit: claude composer structure ──"
claude_divider="────────────────"
claude_footer="  bypass permissions on · ← for agents"
eq "bare claude composer is empty" "claude-empty" \
  "$(_claude_empty_composer_signature_from_rows $'\033[39m❯ ' "$claude_divider" "$claude_footer")"
eq "dim claude placeholder is empty" "claude-empty" \
  "$(_claude_empty_composer_signature_from_rows $'\033[39m❯ \033[2mTry something\033[0m' "$claude_divider" "$claude_footer")"
eq "ordinary claude composer text is pending" "" \
  "$(_claude_empty_composer_signature_from_rows $'\033[39m❯ UNSUBMITTED' "$claude_divider" "$claude_footer")"
eq "composer-like output outside the bottom frame is not empty" "" \
  "$(_claude_empty_composer_signature_from_rows $'\033[39m❯ ' "ordinary output" "$claude_footer")"

echo "── mechanics: real tmux against a bash session (no quota) ──"
N="mech$$"
cmd_kill "$N" >/dev/null 2>&1
out="$(cmd_launch "$N" --profile codex --ready '^›' --busy '' --timeout 15 -- env PS1='› ' bash --norc -i 2>&1)"
eq "launch reaches the bash prompt" "ready" "$out"
eq "status: idle at prompt" "idle" "$(cmd_status "$N")"

dying_launch_name="dying-launch-$$"
dying_launch_boot_log="$(mktemp /tmp/agent-tmux-dying-launch-XXXXXX.log)"
dying_launch_token="AGENT-TMUX-BOOT-DEATH-${$}-${RANDOM}"
cmd_kill "$dying_launch_name" >/dev/null 2>&1
dying_launch_output="$(cmd_launch "$dying_launch_name" --profile codex --ready '^›' --busy '' \
  --timeout 5 --boot-log "$dying_launch_boot_log" -- \
  bash -c "printf '%s\\n' '$dying_launch_token'; exit 42" 2>&1)"
dying_launch_exit_code=$?
eq "dying launch exits one" "1" "$dying_launch_exit_code"
case "$dying_launch_output" in
  *"session died during startup"*"$dying_launch_boot_log"*) ok "dying launch names its boot log" ;;
  *) bad "dying launch names its boot log" "death and $dying_launch_boot_log" "$dying_launch_output" ;;
esac
if grep -qF "$dying_launch_token" "$dying_launch_boot_log"; then
  ok "dying launch boot log captures output before death"
else
  bad "dying launch boot log captures output before death" "$dying_launch_token" "$(tr '\n' '|' < "$dying_launch_boot_log")"
fi
cmd_kill "$dying_launch_name" >/dev/null 2>&1
rm -f "$dying_launch_boot_log"

SENT="HELLO_${$}_${RANDOM}"
send_output="$(cmd_send "$N" "echo $SENT" 2>&1)"
send_exit_code=$?
eq "submitted send exits zero" "0" "$send_exit_code"
eq "submitted send confirms" "submitted" "$send_output"
sleep 1
if cmd_peek "$N" 30 | grep -q "$SENT"; then ok "send → peek roundtrip (output appeared)"
else bad "send/peek roundtrip" "$SENT in pane" "$(cmd_peek "$N" 5 | tr '\n' '|')"; fi

# Drop only submission keys. Literal input still reaches the real tmux pane and stays in the
# composer, which proves the negative polarity without touching an agent session.
drop_submission_keys=1
tmux() {
  if [ "$drop_submission_keys" = "1" ] && [ "${1:-}" = "send-keys" ]; then
    case " $* " in *" Enter "*|*" Tab "*) return 0;; esac
  fi
  command tmux "$@"
}
unsubmitted_output="$(cmd_send "$N" "UNSUBMITTED_${$}_${RANDOM}" 2>&1)"
unsubmitted_exit_code=$?
eq "unsubmitted send exits one" "1" "$unsubmitted_exit_code"
eq "unsubmitted send reports NOT CONFIRMED" \
  "send: NOT CONFIRMED — composer never returned to its pre-send state and no new queued marker" \
  "$unsubmitted_output"
drop_submission_keys=0
unset -f tmux

cmd_kill "$N" >/dev/null
eq "status: dead after kill" "dead" "$(cmd_status "$N")"
eq "kill of missing session" "no session 'nope$$'" "$(cmd_kill "nope$$")"
eq "status of missing session" "dead" "$(cmd_status "nope$$")"

if [ "${AGENT_TMUX_LIVE:-0}" = "1" ] && command -v claude >/dev/null 2>&1; then
  echo "── live smoke: claude (haiku) ──"
  L="live$$"; cmd_kill "$L" >/dev/null 2>&1
  out="$(cmd_launch "$L" --timeout 70 -- claude --model haiku --dangerously-skip-permissions 2>&1)"
  eq "claude launch reaches prompt" "ready" "$out"
  TOK="PONG_${$}_${RANDOM}"
  reply="$(cmd_send_wait "$L" "Reply with exactly this token and nothing else: $TOK" 120 40)"
  if printf '%s' "$reply" | grep -q "$TOK"; then ok "live send-wait → token echoed back"
  else bad "live send-wait" "$TOK in reply" "$(printf '%s' "$reply" | tail -3 | tr '\n' '|')"; fi
  cmd_kill "$L" >/dev/null
else
  echo "── live smoke skipped (set AGENT_TMUX_LIVE=1 to run) ──"
fi

report
