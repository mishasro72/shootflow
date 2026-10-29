#!/usr/bin/env bash
# Runs a CI command and, if it fails, re-publishes the tail of its output as a
# GitHub annotation so the failure is readable from the Checks API alone.
# Usage: scripts/ci-run.sh "<title>" <command...>
set -uo pipefail

title="$1"
shift

log="$(mktemp)"
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  # Strip ANSI colours, keep the last 80 lines, encode newlines for the annotation.
  tail_text="$(sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g' "$log" | tail -n 80)"
  tail_text="${tail_text//'%'/'%25'}"
  tail_text="${tail_text//$'\r'/'%0D'}"
  tail_text="${tail_text//$'\n'/'%0A'}"
  echo "::error title=${title} failed::${tail_text}"
fi

rm -f "$log"
exit "$status"
