#!/usr/bin/env bash
# Conventions gate for the newsletter Worker + admin dashboard — extracted
# from ../invar's scripts/conventions-gate.sh (the operative subset for an
# ivue Reactive/Static codebase). Mechanical checks only; exit 1 on any
# violation. Run from anywhere: paths resolve relative to this script.
#
# Matchers that can silently rot carry POSITIVE CONTROLS: a known-bad line
# the matcher must detect before its silence about the real tree is
# trusted. A check that cannot fail is worse than no check.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0

worker_sources="src/modules"
dashboard_sources="dashboard/src/modules"

# 0) TYPECHECK — a tsc error HARD-BLOCKS the gate ("measured != enforced").
if ! npx tsc -p tsconfig.json >/tmp/newsletter-gate-tsc.$$.log 2>&1; then
  echo "CONVENTIONS FAIL: Worker tsc reported type errors:"
  head -20 /tmp/newsletter-gate-tsc.$$.log
  fail=1
fi
rm -f /tmp/newsletter-gate-tsc.$$.log
if ! npx tsc -p dashboard/tsconfig.json >/tmp/newsletter-gate-dashboard-tsc.$$.log 2>&1; then
  echo "CONVENTIONS FAIL: dashboard tsc reported type errors:"
  head -20 /tmp/newsletter-gate-dashboard-tsc.$$.log
  fail=1
fi
rm -f /tmp/newsletter-gate-dashboard-tsc.$$.log
if ! npx tsc -p tsconfig.test.json >/tmp/newsletter-gate-test-tsc.$$.log 2>&1; then
  echo "CONVENTIONS FAIL: test-suite tsc reported type errors:"
  head -20 /tmp/newsletter-gate-test-tsc.$$.log
  fail=1
fi
rm -f /tmp/newsletter-gate-test-tsc.$$.log

# 0.5) TESTS — the unit suite rides the gate (real migrations, real SQL).
if ! npx vitest run >/tmp/newsletter-gate-tests.$$.log 2>&1; then
  echo "CONVENTIONS FAIL: unit tests failed:"
  tail -20 /tmp/newsletter-gate-tests.$$.log
  fail=1
fi
rm -f /tmp/newsletter-gate-tests.$$.log

# 1) TS-ONLY SFCs: every dashboard component is a TypeScript script-setup SFC.
if ! printf '%s\n' '<script setup lang="ts">' | grep -qF '<script setup lang="ts">' ||
  printf '%s\n' '<script setup>' | grep -qF '<script setup lang="ts">'; then
  echo "CONVENTIONS FAIL: TypeScript SFC matcher failed its positive control"
  fail=1
fi
while IFS= read -r component; do
  if ! grep -qF '<script setup lang="ts">' "$component"; then
    echo "CONVENTIONS FAIL: $component is not a TypeScript script-setup SFC"
    fail=1
  fi
done < <(find "$dashboard_sources" -name '*.vue' -type f)

# 2) NO JAVASCRIPT SOURCE anywhere in Worker or dashboard modules.
javascript_sources=$(find "$worker_sources" "$dashboard_sources" -type f -name '*.js' -print)
if [ -n "$javascript_sources" ]; then
  echo "CONVENTIONS FAIL: JavaScript source in a TypeScript-only tree:"
  echo "$javascript_sources"
  fail=1
fi

# 3) HASH-PRIVATE BAN: Static() publishes a subclass receiver, which cannot
#    access a #private name declared by its superclass; TS `private` also
#    blocks subclass override. `protected` is the floor.
hash_private=$(grep -rnE '(^|\s)(static\s+)?#[A-Za-z]' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' --include='*.vue' || true)
if [ -n "$hash_private" ]; then
  echo "CONVENTIONS FAIL: #private member (breaks Static() subclass access):"
  echo "$hash_private"
  fail=1
fi

# 4) IMMUTABLE INHERITANCE ANCHOR: extends must never snapshot the mutable
#    Class slot — extend the const $Class anchor.
if ! printf '%s\n' 'class $Child extends Other.Class {' \
  | grep -qE 'extends [A-Za-z_][A-Za-z0-9_]*\.Class\b'; then
  echo "CONVENTIONS FAIL: extends-.Class matcher failed its positive control"
  fail=1
fi
mutable_class_extends=$(grep -rnE 'extends [A-Za-z_][A-Za-z0-9_]*\.Class\b' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' --include='*.vue' || true)
if [ -n "$mutable_class_extends" ]; then
  echo "CONVENTIONS FAIL: extends uses a mutable Class slot — extend the immutable \$Class anchor:"
  echo "$mutable_class_extends"
  fail=1
fi

# 5) THE Class SLOT STAYS MUTABLE: `Class` is the swappable slot (a test
#    double or downstream customization replaces it in place); the immutable
#    anchor is $Class (always const). `const Class` freezes the seam.
frozen_class_slot=$(grep -rnE '^\s*(export )?const Class\b\s*=' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' || true)
if [ -n "$frozen_class_slot" ]; then
  echo "CONVENTIONS FAIL: the Class slot is const — must be \`export let Class = …\`:"
  echo "$frozen_class_slot"
  fail=1
fi

# 6) THE WRAPPER LIVES AT THE ANCHOR: Static() returns a NEW SUBCLASS, so
#    `Class = Static(...)` leaves $Class unwrapped and `extends X.$Class`
#    inherits uncached $-getters. Required: $Class = Static($Raw); Class = $Class.
#    (NOT applicable to Reactive(), which transforms in place.)
if ! printf '%s\n' 'export let Class = Static($Broken);' \
  | grep -qE '^\s*export (const|let) Class = Static\('; then
  echo "CONVENTIONS FAIL: wrapper-off-anchor matcher failed its positive control"
  fail=1
fi
wrapper_off_anchor=$(grep -rnE '^\s*export (const|let) Class = Static\(' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' || true)
if [ -n "$wrapper_off_anchor" ]; then
  echo "CONVENTIONS FAIL: Static() wraps at the Class slot, leaving \$Class unwrapped."
  echo "Use: export const \$Class = Static(\$Raw); export let Class = \$Class;"
  echo "$wrapper_off_anchor"
  fail=1
fi

# 7) ATOMIC-BIND: a file exporting `namespace X { … Static($/Reactive($ }`
#    MUST be named X.ts — convert-without-rename is an incomplete conversion.
mismatch=""
while IFS= read -r file; do
  [ -z "$file" ] && continue
  namespace=$(grep -oE '^export namespace [A-Za-z0-9_]+' "$file" | head -1 | awk '{print $3}')
  base=$(basename "$file" .ts)
  if [ -n "$namespace" ] && [ "$namespace" != "$base" ]; then
    mismatch="$mismatch$file (namespace=$namespace, expected $namespace.ts)"$'\n'
  fi
done < <(grep -rlE 'Static\(\$|Reactive\(\$' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' | grep -vE '\.test\.ts')
if [ -n "$mismatch" ]; then
  echo "CONVENTIONS FAIL: namespace+Static/Reactive file(s) not named after their namespace (atomic-bind):"
  echo "$mismatch"
  fail=1
fi

# 8) $-RAW-FORM: the '...Implementation' backing-member suffix is banned.
impl_suffix=$(grep -rnE '[A-Za-z0-9_]+Implementation\b' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' --include='*.vue' \
  | grep -vE '\.test\.ts' || true)
if [ -n "$impl_suffix" ]; then
  echo "CONVENTIONS FAIL: '...Implementation'-suffixed member(s) — the raw form is \$name:"
  echo "$impl_suffix"
  fail=1
fi

# 9) NAMING: banned abbreviation identifiers (declarations only; word-bounded).
if ! printf '%s\n' 'const idx = 0' \
  | grep -qE '\b(const|let|var) (ed|ws|gp|cl|pal|idx|opts|prev|cur|repo|msg|cmd|btn|len|el|fn|cb|err|res|req|sub|unsub|num|str|arr|obj)\b *='; then
  echo "CONVENTIONS FAIL: abbreviation matcher failed its positive control"
  fail=1
fi
abbreviations=$(grep -rnE '\b(const|let|var) (ed|ws|gp|cl|pal|idx|opts|prev|cur|repo|msg|cmd|btn|len|el|fn|cb|err|res|req|sub|unsub|num|str|arr|obj)\b *=' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' --include='*.vue' || true)
if [ -n "$abbreviations" ]; then
  echo "CONVENTIONS FAIL: abbreviated identifier declaration(s):"
  echo "$abbreviations"
  fail=1
fi

# 10) PAIR-COMPLETENESS: every Worker namespace-class file has a colocated
#     X.test.ts. Dashboard MODELS ride a shrinking allowlist (below) until
#     each gains its test; the list only ever SHRINKS.
untested_dashboard_models_allowlist="
dashboard/src/modules/app/AppModel.ts
dashboard/src/modules/subscribers/SubscribersModel.ts
dashboard/src/modules/posts/PostsModel.ts
dashboard/src/modules/send/SendModel.ts
dashboard/src/modules/sends/SendsModel.ts
dashboard/src/modules/drip/DripModel.ts
dashboard/src/modules/stats/StatsModel.ts
dashboard/src/modules/platform/Api.ts
dashboard/src/modules/platform/Format.ts
"
while IFS= read -r class_file; do
  [ -z "$class_file" ] && continue
  test_file="${class_file%.ts}.test.ts"
  if [ ! -f "$test_file" ]; then
    if grep -qx "${class_file}" <<<"$untested_dashboard_models_allowlist"; then
      echo "conventions-gate: RATCHET — $class_file still lacks $test_file (allowlisted; list only shrinks)"
    else
      echo "CONVENTIONS FAIL: $class_file has no colocated $test_file"
      fail=1
    fi
  fi
done < <(grep -rlE 'Static\(\$|Reactive\(\$' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' | grep -vE '\.test\.ts')

# 11) LATE READS ONLY: no module-level instantiation of another namespace's
#     Class (top-level `new X.Class` outside a class body or function is an
#     eager snapshot; cross-module deps resolve late, in members).
top_level_new=$(grep -rnE '^(export )?(const|let|var) [A-Za-z_][A-Za-z0-9_]* = new [A-Z][A-Za-z0-9_]*\.Class\(' \
  "$worker_sources" "$dashboard_sources" --include='*.ts' || true)
if [ -n "$top_level_new" ]; then
  echo "CONVENTIONS FAIL: module-level construction of a namespace Class (read late instead):"
  echo "$top_level_new"
  fail=1
fi

[ "$fail" = 0 ] && echo "conventions-gate: PASS"
exit "$fail"
