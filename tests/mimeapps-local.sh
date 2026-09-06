#!/bin/sh
set -eu

repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
fail() { printf 'not ok - %s\n' "$1" >&2; exit 1; }

run_setup() {
	HOME=$1 sh "$repo/55-mimeapps.sh"
}

fresh=$tmp/fresh
mkdir -p "$fresh"
run_setup "$fresh"
[ ! -L "$fresh/.config/mimeapps.list" ] || fail 'fresh MIME defaults are a shared symlink'
grep -Fq 'x-scheme-handler/https=firefox.desktop' "$fresh/.config/mimeapps.list" || \
	fail 'fresh install does not seed Firefox'

sed -i 's/firefox\.desktop/helium.desktop/g' "$fresh/.config/mimeapps.list"
run_setup "$fresh"
grep -Fq 'x-scheme-handler/https=helium.desktop' "$fresh/.config/mimeapps.list" || \
	fail 'rerunning setup overwrites this host default browser'

legacy=$tmp/legacy
mkdir -p "$legacy/.config" "$tmp/shared"
printf '%s\n' '[Default Applications]' 'x-scheme-handler/https=helium.desktop' \
	>"$tmp/shared/mimeapps.list"
ln -s "$tmp/shared/mimeapps.list" "$legacy/.config/mimeapps.list"
run_setup "$legacy"
[ ! -L "$legacy/.config/mimeapps.list" ] || fail 'legacy shared MIME config remains linked'
grep -Fq 'x-scheme-handler/https=helium.desktop' "$legacy/.config/mimeapps.list" || \
	fail 'legacy host browser choice was not preserved'

printf 'ok - each host keeps its own default applications\n'
