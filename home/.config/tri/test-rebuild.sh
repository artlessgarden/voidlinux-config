#!/bin/sh
set -eu

tri_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/tri-rebuild-test.XXXXXX")
cleanup() {
	rm -rf -- "$tmp_dir"
}
trap cleanup EXIT HUP INT TERM

invalid=$tmp_dir/not-an-elf
printf 'not an executable\n' >"$invalid"
if TRI_REBUILD_TEST_FILE=$invalid "$tri_dir/rebuild.sh" >/dev/null 2>&1; then
	echo 'rebuild accepted a non-ELF artifact' >&2
	exit 1
fi
