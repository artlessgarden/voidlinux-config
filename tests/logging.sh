#!/bin/sh
set -eu

repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fail() { printf 'not ok - %s\n' "$1" >&2; exit 1; }

grep -Eq '(^|[[:space:]])socklog-void([[:space:]\\]|$)' "$repo/20-pkg-base.sh" ||
	fail 'the central Void logger is not installed'
grep -Fq 'ln -sfn /etc/sv/socklog-unix /var/service/socklog-unix' "$repo/40-sv-base.sh" ||
	fail 'the central syslog service is not enabled'
grep -Fq 'ln -sfn /etc/sv/nanoklogd /var/service/nanoklogd' "$repo/40-sv-base.sh" ||
	fail 'persistent kernel logging is not enabled'
grep -Fq 'touch "$target/log/down"' "$repo/40-sv-base.sh" ||
	fail 'per-service log processes are no longer disabled'
grep -Fq '[ "${service##*/}" = socklog-unix ] && continue' "$repo/40-sv-base.sh" ||
	fail 'the central log writer is disabled with per-service logs'

printf 'ok - only centralized system and kernel logging is enabled\n'
