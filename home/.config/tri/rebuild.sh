#!/bin/sh
set -e
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
zig build test
stage_dir=$(mktemp -d "$PWD/.tri-build.XXXXXX")
cleanup() {
	case "$stage_dir" in
	"$PWD"/.tri-build.*) rm -rf -- "$stage_dir" ;;
	esac
}
trap cleanup EXIT HUP INT TERM

zig build -Doptimize=ReleaseSafe --prefix "$stage_dir"
mkdir -p zig-out/bin
if [ -x zig-out/bin/tri ]; then
	cp -p zig-out/bin/tri zig-out/bin/tri.previous
fi
mv "$stage_dir/bin/tri" zig-out/bin/tri.next
mv zig-out/bin/tri.next zig-out/bin/tri
cleanup
trap - EXIT HUP INT TERM
echo "built zig-out/bin/tri"
